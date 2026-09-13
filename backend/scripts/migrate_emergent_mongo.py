#!/usr/bin/env python3
"""Copy an Emergent Mongo database into a standard MongoDB target.

The source is read through MongoView's HTTPS API because Emergent's Atlas
cluster commonly blocks direct client connections. The destination is written
with normal MongoDB upserts.

Safety properties:
  * dry-run by default;
  * SOURCE_MONGO_URL is read only from the environment and never printed;
  * every source collection is saved under the git-ignored test_reports tree;
  * matching records are merged with ``$set`` so newer target-only fields stay;
  * records are matched by stable application keys, never patient attributes.

Example (PowerShell, from the repository root):
    $env:SOURCE_MONGO_URL = '<Emergent MongoDB URL>'
    python backend/scripts/migrate_emergent_mongo.py \
      --source-db orthodontics-quiz-1-test_database \
      --target-uri mongodb://127.0.0.1:27018 \
      --target-db zubite_db

Add ``--apply`` after reviewing the dry-run summary. Back up the target MongoDB
database with mongodump before applying.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from bson import ObjectId
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError


API_BASE = "https://mongoview.emergent.host/api"
PAGE_SIZE = 500  # MongoView rejects values above 500.

# Collections with a unique natural key that is safer than their generated id.
# Everything else uses the app-level ``id`` field, then Mongo ``_id``.
NATURAL_KEYS = {
    "addon_catalog_items": "add_on_id",
    "admin_users": "username",
    "blog_posts": "slug",
    "lead_access_tokens": "token_hash",
    "lead_verifications": "token",
}


def _api_json(
    method: str,
    path: str,
    *,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    retries: int = 3,
) -> Any:
    encoded = None if body is None else json.dumps(body).encode("utf-8")
    request_headers = {"Accept": "application/json"}
    if body is not None:
        request_headers["Content-Type"] = "application/json"
    request_headers.update(headers or {})
    url = f"{API_BASE}{path}"

    for attempt in range(1, retries + 1):
        request = urllib.request.Request(
            url,
            data=encoded,
            headers=request_headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            # Do not echo response bodies: they may contain connection details.
            if exc.code < 500 or attempt == retries:
                raise RuntimeError(f"MongoView returned HTTP {exc.code} for {path}") from exc
        except (TimeoutError, urllib.error.URLError) as exc:
            if attempt == retries:
                raise RuntimeError(f"MongoView request failed for {path}") from exc
        time.sleep(attempt)

    raise AssertionError("unreachable")


def _connect(app_name: str, mongo_url: str) -> str:
    result = _api_json(
        "POST",
        "/connect",
        body={"preview_app_name": app_name, "production_url": mongo_url},
    )
    if not result.get("success") or not result.get("session_id"):
        raise RuntimeError("MongoView did not create a source session")
    return str(result["session_id"])


def _collection_inventory(session_id: str, source_db: str) -> list[dict[str, Any]]:
    encoded_db = urllib.parse.quote(source_db, safe="")
    result = _api_json(
        "GET",
        f"/collections/production/{encoded_db}",
        headers={"X-Session-ID": session_id},
    )
    collections = result.get("collections")
    if not isinstance(collections, list):
        raise RuntimeError("MongoView returned an invalid collection inventory")
    return sorted(collections, key=lambda item: str(item.get("name", "")))


def _fetch_collection(
    session_id: str,
    source_db: str,
    collection: str,
    expected_count: int,
) -> list[dict[str, Any]]:
    encoded_db = urllib.parse.quote(source_db, safe="")
    encoded_collection = urllib.parse.quote(collection, safe="")
    documents: list[dict[str, Any]] = []
    skip = 0
    reported_total = expected_count

    while skip < reported_total:
        result = _api_json(
            "GET",
            (
                f"/documents/production/{encoded_db}/{encoded_collection}"
                f"?limit={PAGE_SIZE}&skip={skip}"
            ),
            headers={"X-Session-ID": session_id},
        )
        page = result.get("documents")
        if not isinstance(page, list):
            raise RuntimeError(f"Invalid document page for collection {collection}")
        if not page:
            raise RuntimeError(
                f"Collection {collection} stopped at {skip} of {reported_total} documents"
            )
        documents.extend(page)
        skip += len(page)
        reported_total = int(result.get("total", reported_total))

    if len(documents) != reported_total:
        raise RuntimeError(
            f"Collection {collection} changed while being copied "
            f"({len(documents)} fetched, {reported_total} reported)"
        )

    source_ids = [doc.get("_id") for doc in documents if doc.get("_id") is not None]
    if len(source_ids) != len(set(map(str, source_ids))):
        raise RuntimeError(f"Collection {collection} returned duplicate Mongo _id values")
    return documents


def _identity(collection: str, document: dict[str, Any]) -> tuple[str, Any]:
    preferred = NATURAL_KEYS.get(collection)
    if preferred and document.get(preferred) not in (None, ""):
        return preferred, document[preferred]
    if document.get("id") not in (None, ""):
        return "id", document["id"]
    if document.get("_id") not in (None, ""):
        value = document["_id"]
        if isinstance(value, str) and ObjectId.is_valid(value):
            value = ObjectId(value)
        return "_id", value
    raise RuntimeError(f"A {collection} document has no stable identity")


def _canonical_identity(identity: tuple[str, Any]) -> tuple[str, str]:
    field, value = identity
    return field, str(value)


def _target_identities(collection_name: str, target_collection: Any) -> set[tuple[str, str]]:
    fields = {"_id": 1, "id": 1}
    natural_key = NATURAL_KEYS.get(collection_name)
    if natural_key:
        fields[natural_key] = 1
    return {
        _canonical_identity(_identity(collection_name, document))
        for document in target_collection.find({}, fields)
    }


def _chunks(items: list[Any], size: int) -> Iterable[list[Any]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def _upsert_collection(
    collection_name: str,
    target_collection: Any,
    documents: list[dict[str, Any]],
) -> dict[str, int]:
    totals = {"matched": 0, "modified": 0, "inserted": 0}
    operations: list[UpdateOne] = []

    for source_document in documents:
        field, value = _identity(collection_name, source_document)
        update_fields = dict(source_document)
        update_fields.pop("_id", None)
        operations.append(
            UpdateOne(
                {field: value},
                {"$set": update_fields},
                upsert=True,
            )
        )

    for batch in _chunks(operations, PAGE_SIZE):
        try:
            result = target_collection.bulk_write(batch, ordered=False)
        except BulkWriteError as exc:
            details = exc.details or {}
            errors = details.get("writeErrors") or []
            codes = sorted({error.get("code") for error in errors})
            raise RuntimeError(
                f"Target rejected {collection_name} upserts (Mongo error codes: {codes})"
            ) from exc
        totals["matched"] += result.matched_count
        totals["modified"] += result.modified_count
        totals["inserted"] += len(result.upserted_ids)
    return totals


def _safe_component(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value)


def _write_snapshot(
    backup_dir: Path,
    source_db: str,
    collection: str,
    documents: list[dict[str, Any]],
) -> Path:
    db_dir = backup_dir / _safe_component(source_db)
    db_dir.mkdir(parents=True, exist_ok=True)
    path = db_dir / f"{_safe_component(collection)}.json"
    with path.open("w", encoding="utf-8") as handle:
        json.dump(documents, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-app", default="ortho-preview-2")
    parser.add_argument("--source-db", required=True)
    parser.add_argument("--target-uri", default="mongodb://127.0.0.1:27018")
    parser.add_argument("--target-db", required=True)
    parser.add_argument(
        "--backup-dir",
        type=Path,
        help="Directory for the source JSON snapshot (defaults under test_reports/backups).",
    )
    parser.add_argument("--apply", action="store_true", help="Apply upserts to the target.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_mongo_url = os.environ.get("SOURCE_MONGO_URL", "").strip()
    if not source_mongo_url:
        print("ABORT: SOURCE_MONGO_URL is empty or missing.", file=sys.stderr)
        return 2

    repo_root = Path(__file__).resolve().parents[2]
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")
    backup_dir = (
        args.backup_dir.resolve()
        if args.backup_dir
        else repo_root / "test_reports" / "backups" / f"emergent_source_{stamp}"
    )
    backup_dir.mkdir(parents=True, exist_ok=True)

    target_client = MongoClient(
        args.target_uri,
        serverSelectionTimeoutMS=10_000,
        connectTimeoutMS=10_000,
    )
    try:
        target_client.admin.command("ping")
        target_db = target_client[args.target_db]
        session_id = _connect(args.source_app, source_mongo_url)
        inventory = _collection_inventory(session_id, args.source_db)

        manifest: dict[str, Any] = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source_app": args.source_app,
            "source_db": args.source_db,
            "target_db": args.target_db,
            "mode": "apply" if args.apply else "dry-run",
            "collections": {},
        }

        print(f"mode: {'APPLY' if args.apply else 'DRY RUN'}")
        print(f"source_db: {args.source_db}")
        print(f"target_db: {args.target_db}")
        print(f"snapshot_dir: {backup_dir}")

        for item in inventory:
            collection_name = str(item["name"])
            expected = int(item.get("document_count", 0))
            documents = (
                _fetch_collection(session_id, args.source_db, collection_name, expected)
                if expected
                else []
            )
            snapshot_path = _write_snapshot(
                backup_dir, args.source_db, collection_name, documents
            )

            target_collection = target_db[collection_name]
            before = target_collection.count_documents({})
            target_keys = _target_identities(collection_name, target_collection)
            source_keys = [_canonical_identity(_identity(collection_name, doc)) for doc in documents]
            if len(source_keys) != len(set(source_keys)):
                raise RuntimeError(
                    f"Collection {collection_name} has duplicate stable application keys"
                )
            overlaps = sum(key in target_keys for key in source_keys)
            planned_inserts = len(documents) - overlaps

            applied = {"matched": 0, "modified": 0, "inserted": 0}
            if args.apply and documents:
                applied = _upsert_collection(collection_name, target_collection, documents)
            after = target_collection.count_documents({})
            expected_after = before + planned_inserts
            if args.apply and after != expected_after:
                raise RuntimeError(
                    f"Collection {collection_name} verification failed: "
                    f"expected {expected_after} target documents, found {after}"
                )

            manifest["collections"][collection_name] = {
                "source": len(documents),
                "target_before": before,
                "overlap": overlaps,
                "planned_inserts": planned_inserts,
                "target_after": after,
                "snapshot_file": str(snapshot_path),
                **applied,
            }
            print(
                f"{collection_name}: source={len(documents)} "
                f"target_before={before} overlap={overlaps} "
                f"planned_inserts={planned_inserts} target_after={after}"
            )

        manifest_path = backup_dir / "manifest.json"
        with manifest_path.open("w", encoding="utf-8") as handle:
            json.dump(manifest, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        print(f"manifest: {manifest_path}")
        return 0
    finally:
        target_client.close()


if __name__ == "__main__":
    raise SystemExit(main())
