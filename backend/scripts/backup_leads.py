#!/usr/bin/env python3
"""One-shot backup script for the `leads` collection.

Usage (from /app/backend):
    python -m scripts.backup_leads

What it does:
    Exports every document in `db.leads` (DB_NAME from env) as JSON to
    `/app/test_reports/backups/leads_YYYY-MM-DD_HHMMSS.json`. The output
    directory is gitignored, so the backup file is NEVER committed.

Safety:
    - Aborts if DB_NAME is empty/missing.
    - Aborts if APP_ENV=production (or ENVIRONMENT/NODE_ENV=production) unless
      `--allow-production-backup` is passed explicitly.
    - Read-only: never mutates DB data.
    - Prints only metadata (path, count, DB_NAME). NO patient data, names,
      phones, emails, transcripts, or UTM strings are echoed to stdout/stderr.

Run before any destructive endpoint operation (cleanup-leads, reset, schema
migration). Keep the backup file off-box; it contains PII.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient


# ── Paths ─────────────────────────────────────────────────────────
_BACKEND_DIR = Path(__file__).resolve().parents[1]   # /app/backend
_REPO_ROOT = _BACKEND_DIR.parent                      # /app
_BACKUP_DIR = _REPO_ROOT / "test_reports" / "backups"


def _detect_env() -> str:
    return (
        os.environ.get("APP_ENV")
        or os.environ.get("ENVIRONMENT")
        or os.environ.get("NODE_ENV")
        or "development"
    ).lower().strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Backup leads collection to JSON.")
    parser.add_argument(
        "--allow-production-backup",
        action="store_true",
        help="Required to run when APP_ENV/ENVIRONMENT/NODE_ENV=production.",
    )
    args = parser.parse_args()

    # Load backend/.env so the script sees MONGO_URL + DB_NAME the same way
    # the API does, regardless of where the operator launched it from.
    try:
        from dotenv import load_dotenv
        load_dotenv(_BACKEND_DIR / ".env")
    except Exception:
        # python-dotenv is required by config.py; if it's missing the env vars
        # must already be exported by the operator's shell.
        pass

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    env = _detect_env()

    if not db_name:
        print("ABORT: DB_NAME is empty or missing.", file=sys.stderr)
        return 2
    if not mongo_url:
        print("ABORT: MONGO_URL is empty or missing.", file=sys.stderr)
        return 2

    if env == "production" and not args.allow_production_backup:
        print(
            "ABORT: refusing to back up while APP_ENV=production. "
            "Pass --allow-production-backup to override (intentionally).",
            file=sys.stderr,
        )
        return 3

    _BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")
    out_path = _BACKUP_DIR / f"leads_{ts}.json"

    client = MongoClient(mongo_url)
    try:
        coll = client[db_name]["leads"]
        count = 0
        # Stream to disk; never hold the entire dataset in memory.
        with out_path.open("w", encoding="utf-8") as fh:
            fh.write("[\n")
            first = True
            for doc in coll.find({}, {"_id": 0}):
                if not first:
                    fh.write(",\n")
                # default=str handles datetime/ObjectId fallbacks safely.
                json.dump(doc, fh, ensure_ascii=False, default=str)
                first = False
                count += 1
            fh.write("\n]\n")
    finally:
        client.close()

    # Metadata only — no PII.
    print(f"backup_file: {out_path}")
    print(f"exported_leads: {count}")
    print(f"db_name: {db_name}")
    print(f"app_env: {env}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
