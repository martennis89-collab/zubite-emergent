"""Phase 4b — confirms the optional `x-make-apikey` header is forwarded
when `MAKE_CONTENT_AUTOMATION_API_KEY` is set, and that calls still work
(or fail cleanly) when it is absent.

Strategy: spin up a tiny local HTTP stub that captures the incoming
headers, point `MAKE_CONTENT_AUTOMATION_WEBHOOK_URL` at it, hot-patch
the env via Python's os.environ, and trigger `start-next`. We are NOT
exercising the real Make.com webhook here — only the outbound call from
our backend.
"""
from __future__ import annotations
import sys
sys.path.insert(0, "/app/backend")  # noqa: E402

import asyncio
import os
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

import requests

API = "http://localhost:8001"

# Sentinel — NOT a real secret. Used only to prove header forwarding.
TEST_FAKE_API_KEY = "phase4b-test-fake-key-" + uuid.uuid4().hex[:6]

# Shared capture box for the stub server
captured: dict = {"headers": None, "body": None}


class StubHandler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        captured["body"] = self.rfile.read(length)
        captured["headers"] = {k.lower(): v for k, v in self.headers.items()}
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok": true}')

    def log_message(self, *_args, **_kwargs):
        return  # quiet


def _start_stub() -> tuple[HTTPServer, int]:
    server = HTTPServer(("127.0.0.1", 0), StubHandler)
    port = server.server_address[1]
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    time.sleep(0.1)
    return server, port


def _login_token() -> str:
    r = requests.post(f"{API}/api/admin/login",
                      json={"username": "admin", "password": "admin123"}, timeout=10)
    assert r.status_code == 200
    return r.json()["access_token"]


def _restart_backend_with_env(env_overrides: dict) -> None:
    """Rewrite /app/backend/.env, restart supervisor backend."""
    env_path = "/app/backend/.env"
    with open(env_path) as f:
        lines = f.readlines()
    keys_to_set = dict(env_overrides)
    out: list[str] = []
    for ln in lines:
        if "=" in ln and not ln.lstrip().startswith("#"):
            k = ln.split("=", 1)[0].strip()
            if k in keys_to_set:
                out.append(f"{k}={keys_to_set.pop(k)}\n")
                continue
        out.append(ln)
    for k, v in keys_to_set.items():
        out.append(f"{k}={v}\n")
    with open(env_path, "w") as f:
        f.writelines(out)
    os.system("sudo supervisorctl restart backend >/dev/null 2>&1")
    # Wait for backend to come back up
    for _ in range(30):
        try:
            r = requests.get(f"{API}/api/", timeout=2)
            if r.status_code == 200:
                return
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError("backend did not come up")


def t1_header_forwarded_when_env_set(token: str, port: int) -> None:
    captured["headers"] = None
    captured["body"] = None
    _restart_backend_with_env({
        "MAKE_CONTENT_AUTOMATION_WEBHOOK_URL": f"http://127.0.0.1:{port}/hook",
        "MAKE_CONTENT_AUTOMATION_SECRET": "phase1-dev-secret-rotate-in-prod",
        "MAKE_CONTENT_AUTOMATION_API_KEY": TEST_FAKE_API_KEY,
    })
    # Need a fresh token after restart (JWT will still be valid; same secret).
    fresh = _login_token()
    r = requests.post(f"{API}/api/admin/content-automation/start-next",
                      headers={"Authorization": f"Bearer {fresh}"},
                      json={}, timeout=15)
    assert r.status_code == 200, r.text
    # Wait briefly for the stub to record the call
    for _ in range(20):
        if captured["headers"] is not None:
            break
        time.sleep(0.1)
    assert captured["headers"] is not None, "stub never received the webhook call"
    assert captured["headers"].get("x-make-apikey") == TEST_FAKE_API_KEY, (
        f"x-make-apikey header missing or wrong, got: {captured['headers']!r}"
    )
    # Confirm JSON body still carries the secret as before
    import json as _json
    body = _json.loads(captured["body"] or b"{}")
    assert body.get("secret") == "phase1-dev-secret-rotate-in-prod", body
    print("  T1 PASS — x-make-apikey header forwarded; body.secret still present")


def t2_no_header_when_env_unset(token: str, port: int) -> None:
    captured["headers"] = None
    captured["body"] = None
    _restart_backend_with_env({
        "MAKE_CONTENT_AUTOMATION_WEBHOOK_URL": f"http://127.0.0.1:{port}/hook",
        "MAKE_CONTENT_AUTOMATION_SECRET": "phase1-dev-secret-rotate-in-prod",
        "MAKE_CONTENT_AUTOMATION_API_KEY": "",  # empty == unset
    })
    fresh = _login_token()
    r = requests.post(f"{API}/api/admin/content-automation/start-next",
                      headers={"Authorization": f"Bearer {fresh}"},
                      json={}, timeout=15)
    assert r.status_code == 200, r.text
    for _ in range(20):
        if captured["headers"] is not None:
            break
        time.sleep(0.1)
    assert captured["headers"] is not None
    assert "x-make-apikey" not in captured["headers"], (
        f"unexpected x-make-apikey header in: {captured['headers']!r}"
    )
    print("  T2 PASS — no x-make-apikey header when env var is empty")


def t3_make_not_configured_still_works() -> None:
    _restart_backend_with_env({
        "MAKE_CONTENT_AUTOMATION_WEBHOOK_URL": "",
        "MAKE_CONTENT_AUTOMATION_SECRET": "phase1-dev-secret-rotate-in-prod",
        "MAKE_CONTENT_AUTOMATION_API_KEY": "",
    })
    fresh = _login_token()
    r = requests.post(f"{API}/api/admin/content-automation/start-next",
                      headers={"Authorization": f"Bearer {fresh}"},
                      json={}, timeout=10)
    assert r.status_code == 503, r.text
    assert r.json()["detail"]["code"] == "make_not_configured"
    print("  T3 PASS — make_not_configured still surfaces (no API key required)")


def main() -> None:
    stub, port = _start_stub()
    try:
        token = _login_token()  # pre-restart sanity
        t1_header_forwarded_when_env_set(token, port)
        t2_no_header_when_env_unset(token, port)
        t3_make_not_configured_still_works()
    finally:
        stub.shutdown()
        # Restore original .env: clear webhook URL but keep API key empty
        _restart_backend_with_env({
            "MAKE_CONTENT_AUTOMATION_WEBHOOK_URL": "",
            "MAKE_CONTENT_AUTOMATION_SECRET": "phase1-dev-secret-rotate-in-prod",
            "MAKE_CONTENT_AUTOMATION_API_KEY": "",
        })

    # cleanup created jobs
    async def clean():
        from database import db
        await db.content_automation_jobs.delete_many({})
    asyncio.run(clean())
    print("ALL PHASE 4b TESTS PASS")


if __name__ == "__main__":
    main()
