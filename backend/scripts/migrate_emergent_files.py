#!/usr/bin/env python3
"""Copy Emergent file objects referenced by uploaded_files into Cloudflare R2.

The metadata JSON is produced by ``migrate_emergent_mongo.py``. File bytes are
downloaded from the retired Emergent backend, saved in the git-ignored backup
tree, uploaded to their existing ``storage_path`` keys, and verified with R2
``head_object`` calls. Dry-run is the default.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


DEFAULT_SOURCE_ORIGIN = "https://orthodontics-quiz-1.emergent.host"
DEFAULT_STORAGE_PREFIX = "zubite-bg/blog/"


def _env_values(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _r2_client(env_path: Path) -> tuple[Any, str]:
    config = {**_env_values(env_path), **os.environ}
    endpoint = config.get("R2_ENDPOINT", "").strip().rstrip("/")
    bucket = config.get("R2_BUCKET", "").strip()
    access_key = config.get("R2_ACCESS_KEY_ID", "").strip()
    secret_key = config.get("R2_SECRET_ACCESS_KEY", "").strip()
    if not all((endpoint, bucket, access_key, secret_key)):
        raise RuntimeError("R2 configuration is incomplete")
    if endpoint.endswith(f"/{bucket}"):
        endpoint = endpoint[: -(len(bucket) + 1)]
    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=10,
            read_timeout=120,
        ),
    )
    return client, bucket


def _safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value)


def _download(
    source_origin: str,
    file_id: str,
    destination: Path,
    expected_size: int | None,
) -> tuple[int, str, str]:
    url = f"{source_origin.rstrip('/')}/api/files/{urllib.parse.quote(file_id, safe='')}"
    request = urllib.request.Request(url, headers={"Accept": "*/*"}, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            content_type = (response.headers.get("Content-Type") or "").split(";", 1)[0]
            digest = hashlib.sha256()
            size = 0
            with destination.open("wb") as handle:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    handle.write(chunk)
                    digest.update(chunk)
                    size += len(chunk)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Source file endpoint returned HTTP {exc.code}") from exc

    if expected_size is not None and size != expected_size:
        destination.unlink(missing_ok=True)
        raise RuntimeError(
            f"Downloaded size mismatch (expected {expected_size}, received {size})"
        )
    return size, content_type, digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metadata", required=True, type=Path)
    parser.add_argument("--env-file", default=Path("backend/.env"), type=Path)
    parser.add_argument("--source-origin", default=DEFAULT_SOURCE_ORIGIN)
    parser.add_argument("--backup-dir", type=Path)
    parser.add_argument("--storage-prefix", default=DEFAULT_STORAGE_PREFIX)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    metadata_path = args.metadata.resolve()
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if not isinstance(metadata, list):
        print("ABORT: metadata must be a JSON list.", file=sys.stderr)
        return 2

    active = [item for item in metadata if not item.get("is_deleted")]
    deleted = len(metadata) - len(active)
    identities = [str(item.get("id") or "") for item in active]
    if not all(identities) or len(identities) != len(set(identities)):
        raise RuntimeError("File metadata contains missing or duplicate ids")
    for item in active:
        path = str(item.get("storage_path") or "")
        if not path.startswith(args.storage_prefix):
            raise RuntimeError("A storage path is outside the allowed prefix")

    backup_dir = (
        args.backup_dir.resolve()
        if args.backup_dir
        else metadata_path.parent / "file_objects"
    )
    backup_dir.mkdir(parents=True, exist_ok=True)

    print(f"mode: {'APPLY' if args.apply else 'DRY RUN'}")
    print(f"active_files: {len(active)}")
    print(f"deleted_records_skipped: {deleted}")
    print(f"backup_dir: {backup_dir}")
    if not args.apply:
        return 0

    client, bucket = _r2_client(args.env_file.resolve())
    manifest: list[dict[str, Any]] = []
    uploaded = 0

    for position, item in enumerate(active, start=1):
        file_id = str(item["id"])
        storage_path = str(item["storage_path"])
        expected_size = item.get("size")
        expected_size = int(expected_size) if expected_size is not None else None
        suffix = Path(storage_path).suffix
        if not suffix:
            suffix = mimetypes.guess_extension(str(item.get("content_type") or "")) or ".bin"
        local_path = backup_dir / f"{_safe_name(file_id)}{suffix}"

        size, source_content_type, sha256 = _download(
            args.source_origin,
            file_id,
            local_path,
            expected_size,
        )
        content_type = str(item.get("content_type") or source_content_type or "application/octet-stream")
        with local_path.open("rb") as handle:
            client.put_object(
                Bucket=bucket,
                Key=storage_path,
                Body=handle,
                ContentType=content_type,
            )
        try:
            head = client.head_object(Bucket=bucket, Key=storage_path)
        except ClientError as exc:
            raise RuntimeError("R2 verification failed after upload") from exc
        if int(head.get("ContentLength", -1)) != size:
            raise RuntimeError("R2 object size did not match the downloaded source")

        manifest.append(
            {
                "id": file_id,
                "storage_path": storage_path,
                "bytes": size,
                "content_type": content_type,
                "sha256": sha256,
                "backup_file": str(local_path),
            }
        )
        uploaded += 1
        if position % 10 == 0 or position == len(active):
            print(f"verified_files: {position}/{len(active)}")

    manifest_path = backup_dir / "manifest.json"
    with manifest_path.open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"uploaded_and_verified: {uploaded}")
    print(f"manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
