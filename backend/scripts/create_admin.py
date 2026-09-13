#!/usr/bin/env python3
"""Create the first production admin without exposing a password in argv.

Run this from a Render Shell after the first successful deployment:

    python scripts/create_admin.py --username admin@zubite.bg

The password is read interactively. Existing accounts are left untouched
unless --reset-password is supplied explicitly.
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth import hash_password
from database import client, db


def _password_from_prompt() -> str:
    password = os.environ.get("ADMIN_BOOTSTRAP_PASSWORD")
    if password:
        return password
    first = getpass.getpass("New admin password: ")
    second = getpass.getpass("Confirm password: ")
    if first != second:
        raise ValueError("passwords do not match")
    return first


def _validate_password(password: str, username: str) -> None:
    if len(password) < 14:
        raise ValueError("password must be at least 14 characters")
    if password.casefold() == username.casefold():
        raise ValueError("password must not equal the username")
    if password.casefold() in {"password", "admin", "changeme", "zubite", "letmein"}:
        raise ValueError("password is too common")


async def _run(username: str, reset_password: bool) -> int:
    existing = await db.admin_users.find_one({"username": username}, {"_id": 0, "id": 1})
    if existing and not reset_password:
        print(f"Admin {username} already exists; no changes made.")
        return 0

    password = _password_from_prompt()
    _validate_password(password, username)
    password_hash = hash_password(password)

    if existing:
        await db.admin_users.update_one(
            {"username": username},
            {
                "$set": {
                    "password_hash": password_hash,
                    "password_changed_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        print(f"Password rotated for {username}.")
        return 0

    await db.admin_users.insert_one(
        {
            "id": str(uuid.uuid4()),
            "username": username,
            "password_hash": password_hash,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    print(f"Created admin {username}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or explicitly rotate a Zubite admin account.")
    parser.add_argument("--username", default="admin@zubite.bg")
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Rotate the password if the account already exists.",
    )
    args = parser.parse_args()
    username = args.username.strip().lower()
    if "@" not in username or len(username) > 254:
        print("ERROR: --username must be a valid email-like username.", file=sys.stderr)
        return 2

    try:
        return asyncio.run(_run(username, args.reset_password))
    except (ValueError, EOFError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
