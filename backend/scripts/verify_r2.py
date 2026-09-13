#!/usr/bin/env python3
"""Write, read, and delete a tiny object to verify production R2 access."""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import storage


def main() -> int:
    client = storage.init_storage()
    if not client:
        print("FAIL: R2 is not configured.", file=sys.stderr)
        return 1

    key = f"zubite-bg/_smoke/{uuid.uuid4()}.txt"
    payload = "zubite R2 smoke check".encode("utf-8")
    try:
        result = storage.put_object(key, payload, "text/plain; charset=utf-8")
        if result != {"path": key, "size": len(payload)}:
            raise RuntimeError("unexpected upload result")
        data, content_type = storage.get_object(key)
        if data != payload or "text/plain" not in content_type:
            raise RuntimeError("downloaded object did not match upload")
        print("PASS: R2 write/read round-trip succeeded.")
        return 0
    except Exception as exc:
        print(f"FAIL: R2 smoke check failed ({type(exc).__name__}).", file=sys.stderr)
        return 1
    finally:
        try:
            client.delete_object(Bucket=storage._bucket, Key=key)
            print("CLEANUP: smoke object deleted.")
        except Exception as exc:
            print(
                f"WARNING: smoke object cleanup failed for {key} ({type(exc).__name__}).",
                file=sys.stderr,
            )


if __name__ == "__main__":
    raise SystemExit(main())
