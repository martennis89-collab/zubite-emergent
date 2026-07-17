"""Live R2 round-trip. Needs real credentials, so it is NOT a pytest test
(the filename is underscore-prefixed so pytest never collects it).

Run inside the backend container once R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
are set in backend/.env:

    docker compose exec -T backend python tests/_r2_smoke.py

It writes a small object, reads it back, verifies the bytes and content
type survive the trip, then deletes it. Nothing is left in the bucket.
"""

from __future__ import annotations

import sys
import uuid

sys.path.insert(0, "/app")

from storage import init_storage, put_object, get_object, _bucket  # noqa: E402


def main() -> int:
    client = init_storage()
    if not client:
        print("FAIL: R2 not configured — set R2_* in backend/.env and restart.")
        return 1

    key = f"zubite-bg/_smoke/{uuid.uuid4()}.txt"
    payload = "зъби — r2 smoke ✅".encode("utf-8")

    try:
        res = put_object(key, payload, "text/plain; charset=utf-8")
        print(f"  put   -> path={res['path']} size={res['size']}")
        assert res["path"] == key and res["size"] == len(payload)

        data, ctype = get_object(key)
        print(f"  get   -> {len(data)} bytes, content_type={ctype}")
        assert data == payload, "bytes differ after round-trip"
        assert "text/plain" in ctype, f"unexpected content type: {ctype}"

        # Non-ASCII must survive — clinic names and filenames are Cyrillic.
        print(f"  body  -> {data.decode('utf-8')}")
    finally:
        try:
            client.delete_object(Bucket=_bucket, Key=key)
            print("  clean -> smoke object deleted")
        except Exception as e:
            print(f"  WARNING: could not delete {key}: {e}")

    print("R2 SMOKE PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
