#!/usr/bin/env python3
"""Reset the password on known local/dev test accounts.

Run from `/app/backend` (matches `create_admin.py`'s invocation style):

    python scripts/reset_test_credentials.py

The password is read interactively (or from TEST_CREDENTIALS_PASSWORD, for
non-interactive/CI use) and applied to a HARDCODED allowlist below — never a
broad query. This is intentionally narrower than "every demo-flagged
account": the two seeded test-clinic logins predate `is_demo` being set on
them, so a query-based reset could silently miss or over-match accounts.

Refuses to run against production (`APP_ENV=production`) — these are
`@example.com` local-dev fixtures with no real inbox behind them; there is
no legitimate reason to run this against a real deployment.
"""

from __future__ import annotations

import asyncio
import getpass
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth import hash_password
from database import client, db

# id -> (collection, human label). Add future test accounts here explicitly
# rather than widening this into a query.
TARGET_ADMIN_USERNAMES = ["admin"]
TARGET_CLINIC_IDS = ["demo-growth-clinic", "demo-verified-clinic"]


def _password_from_prompt() -> str:
    password = os.environ.get("TEST_CREDENTIALS_PASSWORD")
    if password:
        return password
    first = getpass.getpass("New password for all listed test accounts: ")
    second = getpass.getpass("Confirm password: ")
    if first != second:
        raise ValueError("passwords do not match")
    return first


async def _run() -> int:
    if os.environ.get("APP_ENV") == "production":
        print("ERROR: refusing to run with APP_ENV=production.", file=sys.stderr)
        return 2

    password = _password_from_prompt()
    if len(password) < 14:
        raise ValueError("password must be at least 14 characters")
    password_hash = hash_password(password)

    for username in TARGET_ADMIN_USERNAMES:
        res = await db.admin_users.update_one(
            {"username": username}, {"$set": {"password_hash": password_hash}}
        )
        print(f"admin_users/{username}: matched={res.matched_count} modified={res.modified_count}")

    for clinic_id in TARGET_CLINIC_IDS:
        res = await db.clinics.update_one(
            {"id": clinic_id}, {"$set": {"password_hash": password_hash}}
        )
        print(f"clinics/{clinic_id}: matched={res.matched_count} modified={res.modified_count}")

    return 0


def main() -> int:
    try:
        return asyncio.run(_run())
    except (ValueError, EOFError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
