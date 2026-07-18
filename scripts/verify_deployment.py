#!/usr/bin/env python3
"""Read-only smoke check for the deployed frontend, API, and API proxy."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request


def _get(url: str, *, expect_json: bool = False) -> object:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "zubite-deployment-smoke/1.0", "Accept": "application/json,*/*"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"{url} returned HTTP {response.status}")
        body = response.read()
        return json.loads(body) if expect_json else body


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frontend", required=True, help="e.g. https://zubite.bg")
    parser.add_argument("--backend", required=True, help="e.g. https://zubite-api.onrender.com")
    args = parser.parse_args()
    frontend = args.frontend.rstrip("/")
    backend = args.backend.rstrip("/")

    checks = [
        ("backend readiness", f"{backend}/health", True),
        ("frontend home", f"{frontend}/", False),
        ("Vercel API proxy", f"{frontend}/api/cities", True),
    ]
    failed = False
    for label, url, expect_json in checks:
        try:
            result = _get(url, expect_json=expect_json)
            if label == "backend readiness":
                assert isinstance(result, dict) and result.get("database") == "connected"
            if label == "Vercel API proxy":
                assert isinstance(result, list) and len(result) > 0
            print(f"PASS  {label}: {url}")
        except (AssertionError, RuntimeError, urllib.error.URLError, json.JSONDecodeError) as exc:
            failed = True
            print(f"FAIL  {label}: {url} ({exc})", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
