#!/usr/bin/env python3
"""Copy the local Docker Mongo database into production MongoDB Atlas.

Local Mongo already holds a full copy of the old Emergent data (migrated
there by `migrate_emergent_mongo.py`, whose default target is local, not
Atlas). This script moves that local copy into the real production
database so Atlas stops being empty.

Safety properties (mirrors migrate_emergent_mongo.py):
  * dry-run by default;
  * ATLAS_MONGO_URL is read only from the environment and never printed;
  * every source collection is saved under the git-ignored test_reports tree;
  * matching records are merged with ``$set`` (upsert), never ``--drop``, so
    anything already in Atlas is left alone unless it shares a stable key
    with a local record;
  * records are matched by stable application keys, never patient
    attributes.

Example (PowerShell, from the repository root):
    $env:ATLAS_MONGO_URL = '<Atlas connection string>'
    python backend/scripts/migrate_local_to_atlas.py \
      --source-uri mongodb://127.0.0.1:27018 --source-db zubite_db \
      --target-db zubite

Add ``--apply`` after reviewing the dry-run summary.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from bson import ObjectId
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

PAGE_SIZE = 500

# Same natural-key table as migrate_emergent_mongo.py, so identity matching
# stays consistent across both migration hops (Emergent -> local -> Atlas).
NATURAL_KEYS = {
    "addon_catalog_items": "add_on_id",
    "admin_users": "username",
    "blog_posts": "slug",
    "lead_access_tokens": "token_hash",
    "lead_verifications": "token",
}


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
    collection_name: str, target_collection: Any, documents: list[dict[str, Any]]
) -> dict[str, int]:
    totals = {"matched": 0, "modified": 0, "inserted": 0}
    operations: list[UpdateOne] = []
    for source_document in documents:
        field, value = _identity(collection_name, source_document)
        update_fields = dict(source_document)
        update_fields.pop("_id", None)
        operations.append(UpdateOne({field: value}, {"$set": update_fields}, upsert=True))

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
    backup_dir: Path, source_db: str, collection: str, documents: list[dict[str, Any]]
) -> Path:
    db_dir = backup_dir / _safe_component(source_db)
    db_dir.mkdir(parents=True, exist_ok=True)
    path = db_dir / f"{_safe_component(collection)}.json"
    with path.open("w", encoding="utf-8") as handle:
        json.dump(documents, handle, ensure_ascii=False, indent=2, default=str)
        handle.write("\n")
    return path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-uri", default="mongodb://127.0.0.1:27018")
    parser.add_argument("--source-db", default="zubite_db")
    parser.add_argument("--target-db", default="zubite")
    parser.add_argument("--backup-dir", type=Path)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    atlas_uri = os.environ.get("ATLAS_MONGO_URL", "").strip()
    if not atlas_uri:
        print("ABORT: ATLAS_MONGO_URL is empty or missing.", file=sys.stderr)
        return 2

    repo_root = Path(__file__).resolve().parents[2]
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")
    backup_dir = (
        args.backup_dir.resolve()
        if args.backup_dir
        else repo_root / "test_reports" / "backups" / f"local_to_atlas_{stamp}"
    )
    backup_dir.mkdir(parents=True, exist_ok=True)

    source_client = MongoClient(args.source_uri, serverSelectionTimeoutMS=10_000)
    target_client = MongoClient(atlas_uri, serverSelectionTimeoutMS=15_000)
    try:
        source_client.admin.command("ping")
        target_client.admin.command("ping")
        source_db = source_client[args.source_db]
        target_db = target_client[args.target_db]

        manifest: dict[str, Any] = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source_db": args.source_db,
            "target_db": args.target_db,
            "mode": "apply" if args.apply else "dry-run",
            "collections": {},
        }

        print(f"mode: {'APPLY' if args.apply else 'DRY RUN'}")
        print(f"source: {args.source_uri} / {args.source_db}")
        print(f"target_db: {args.target_db} (Atlas)")
        print(f"snapshot_dir: {backup_dir}")

        for collection_name in sorted(source_db.list_collection_names()):
            documents = list(source_db[collection_name].find({}))
            snapshot_path = _write_snapshot(backup_dir, args.source_db, collection_name, documents)

            target_collection = target_db[collection_name]
            before = target_collection.count_documents({})
            target_keys = _target_identities(collection_name, target_collection)
            source_keys = [_canonical_identity(_identity(collection_name, doc)) for doc in documents]
            if len(source_keys) != len(set(source_keys)):
                raise RuntimeError(f"Collection {collection_name} has duplicate stable application keys")
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
                f"{collection_name}: source={len(documents)} target_before={before} "
                f"overlap={overlaps} planned_inserts={planned_inserts} target_after={after}"
            )

        manifest_path = backup_dir / "manifest.json"
        with manifest_path.open("w", encoding="utf-8") as handle:
            json.dump(manifest, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        print(f"manifest: {manifest_path}")
        return 0
    finally:
        source_client.close()
        target_client.close()


if __name__ == "__main__":
    raise SystemExit(main())
