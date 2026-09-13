"""
P0 security acceptance criteria — explicit checks for every bullet in
the review request (SEC-002 / SEC-003 + regression).
"""
from __future__ import annotations

import os
import requests
import pytest

BACKEND_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://ortho-preview-2.preview.emergentagent.com",
).rstrip("/")
FRONTEND_URL = "http://localhost:3000"
REVALIDATE_SECRET = "ecac179d7dbfc596febd0d350d74089dfcef8a0fc1db5c3f"

REQUIRED_HEADERS = {
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "strict-transport-security",
}


# ─── SEC-002 ─────────────────────────────────────────────────────────
class TestSEC002Revalidate:
    URL = f"{FRONTEND_URL}/api/revalidate"

    def test_post_no_body_returns_401(self):
        r = requests.post(self.URL, timeout=10)
        assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text[:200]}"

    def test_post_empty_json_returns_401(self):
        r = requests.post(self.URL, json={}, timeout=10)
        assert r.status_code == 401

    def test_post_old_fallback_secret_returns_401(self):
        r = requests.post(self.URL, json={"secret": "zubite-revalidate-secret-2024"}, timeout=10)
        assert r.status_code == 401

    def test_post_garbage_secret_returns_401(self):
        r = requests.post(self.URL, json={"secret": "garbage"}, timeout=10)
        assert r.status_code == 401

    def test_post_correct_secret_returns_200(self):
        r = requests.post(self.URL, json={"secret": REVALIDATE_SECRET, "path": "/blog"}, timeout=15)
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert body.get("revalidated") is True

    def test_get_no_secret_returns_401(self):
        r = requests.get(self.URL, timeout=10)
        assert r.status_code == 401

    def test_get_correct_secret_returns_200(self):
        r = requests.get(f"{self.URL}?secret={REVALIDATE_SECRET}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("revalidated") is True


# ─── SEC-003 ─────────────────────────────────────────────────────────
class TestSEC003BlogHeadersAndSanitizer:
    def _check_headers(self, headers: dict):
        lower = {k.lower(): v for k, v in headers.items()}
        missing = REQUIRED_HEADERS - set(lower.keys())
        assert not missing, f"missing headers: {missing}"
        assert lower["x-content-type-options"].lower() == "nosniff"
        assert lower["x-frame-options"].upper() == "SAMEORIGIN"
        assert lower["referrer-policy"] == "strict-origin-when-cross-origin"
        csp = lower["content-security-policy"]
        for needle in ("default-src", "script-src", "object-src 'none'", "frame-ancestors"):
            assert needle in csp, f"CSP missing {needle!r}: {csp}"

    def test_blog_index_200_and_headers(self):
        r = requests.get(f"{FRONTEND_URL}/blog", timeout=20)
        assert r.status_code == 200
        self._check_headers(r.headers)

    def test_blog_slug_200_and_headers_and_no_xss(self):
        bp = requests.get(f"{BACKEND_URL}/api/blog/posts?limit=1", timeout=15)
        if bp.status_code != 200:
            pytest.skip("blog API unreachable")
        data = bp.json()
        posts = data.get("posts") or data.get("items") or (data if isinstance(data, list) else [])
        if not posts:
            pytest.skip("no published posts")
        slug = posts[0].get("slug")
        if not slug:
            pytest.skip("no slug")
        r = requests.get(f"{FRONTEND_URL}/blog/{slug}", timeout=20)
        assert r.status_code == 200, f"got {r.status_code}"
        self._check_headers(r.headers)
        text = r.text.lower()
        assert "onerror=" not in text
        assert "onclick=" not in text
        assert "onload=" not in text
        assert 'href="javascript:' not in text
        # Renders a normal article element
        assert "<article" in text or "prose" in text or posts[0].get("title", "").lower() in text


# ─── Regression ──────────────────────────────────────────────────────
class TestRegression:
    def test_backend_root(self):
        r = requests.get(f"{BACKEND_URL}/api/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "running"

    def test_backend_health(self):
        r = requests.get(f"{BACKEND_URL}/health", timeout=15)
        assert r.status_code == 200

    def test_frontend_root_contains_zubite(self):
        r = requests.get(f"{FRONTEND_URL}/", timeout=20)
        assert r.status_code == 200
        assert "Zubite" in r.text or "zubite" in r.text.lower()

    def test_blog_page_contains_blog_word(self):
        r = requests.get(f"{FRONTEND_URL}/blog", timeout=20)
        assert r.status_code == 200
        assert "Блог" in r.text
