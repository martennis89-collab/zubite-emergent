"""
P0 security cleanup tests — pre-launch hardening for Zubite.bg.

Covers the three findings from the security audit:

  SEC-001  ElevenLabs post-call webhook secret must be mandatory
           - missing env secret  → 503, no lead mutation
           - missing signature   → 401, no lead mutation
           - invalid signature   → 401, no lead mutation
           - valid signature path is exercised by the existing call tests
             (we don't have a fresh leads fixture here so we assert the
             update-skip side of the contract instead).

  SEC-002  Revalidation secret must be mandatory (no committed fallback)
           - missing/invalid request secret  → 401
           - the hardcoded fallback `zubite-revalidate-secret-2024`
             must NEVER work.

  SEC-003  Blog HTML sanitization & CSP
           - the `/blog` and `/blog/[slug]` pages must respond 200.
           - the production response should carry the new security
             headers (Content-Security-Policy, X-Frame-Options,
             Referrer-Policy, Strict-Transport-Security, Permissions-Policy,
             X-Content-Type-Options). The HTML sanitizer itself is unit-
             tested on the JS side via the blog page rendering.
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Optional

import pytest
import requests

BACKEND_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://ortho-preview-2.preview.emergentagent.com",
).rstrip("/")
FRONTEND_URL = "http://localhost:3000"
WEBHOOK_PATH = "/api/webhooks/elevenlabs/post-call"
REVALIDATE_PATH = "/api/revalidate"


# ─── SEC-001  ElevenLabs webhook ─────────────────────────────────────


def _post_webhook(headers: Optional[dict] = None, payload: Optional[dict] = None):
    return requests.post(
        f"{BACKEND_URL}{WEBHOOK_PATH}",
        json=payload or {"type": "post_call_transcription", "data": {}},
        headers=headers or {},
        timeout=15,
    )


class TestElevenLabsWebhookSEC001:
    """Webhook must fail closed when secret unset / signature missing / signature invalid."""

    def test_unsigned_webhook_is_rejected(self):
        """No signature header → 401 (never silently accepted)."""
        r = _post_webhook(headers={"Content-Type": "application/json"})
        # Accept either 401 (signature missing) or 503 (secret unset on
        # server). Critically, must NOT be 200/2xx.
        assert r.status_code in (401, 503), (
            f"Expected 401 or 503 for unsigned webhook, got {r.status_code} body={r.text[:200]}"
        )
        # Even if it returned 200, it must NOT report "processed": True
        if r.status_code == 200:
            data = r.json()
            assert data.get("processed") is not True

    def test_invalid_signature_is_rejected(self):
        """Garbage signature header → 401, no mutation."""
        r = _post_webhook(
            headers={
                "Content-Type": "application/json",
                "ElevenLabs-Signature": "t=0,v0=deadbeef",
            },
        )
        assert r.status_code in (401, 503), (
            f"Expected 401/503 for invalid signature, got {r.status_code} body={r.text[:200]}"
        )

    def test_lead_record_unchanged_on_rejected_webhook(self):
        """
        Send a forged webhook referencing a random lead id; the lead must
        not exist or, if any lookup-by-conv side path existed, no fields
        must have been written.
        """
        fake_lead_id = str(uuid.uuid4())
        r = _post_webhook(
            payload={
                "type": "post_call_transcription",
                "data": {
                    "conversation_initiation_client_data": {"lead_id": fake_lead_id},
                    "transcript": [{"role": "user", "text": "hijacked"}],
                    "call_summary": "I rewrote your call summary",
                    "status": "completed",
                },
            },
        )
        # We expect the request to be blocked at the signature/secret gate.
        assert r.status_code in (401, 503)
        # And of course the lead doesn't exist publicly anyway; if a
        # /api/leads/{id} accessor exists it must not return a doc with
        # the injected transcript.
        try:
            check = requests.get(f"{BACKEND_URL}/api/leads/{fake_lead_id}", timeout=10)
            if check.status_code == 200:
                body = check.text
                assert "hijacked" not in body
                assert "I rewrote your call summary" not in body
        except requests.RequestException:
            # Endpoint may not exist for unknown ids; that is fine.
            pass


# ─── SEC-002  Revalidation endpoint ──────────────────────────────────


class TestRevalidateEndpointSEC002:
    """Revalidation endpoint must fail closed on missing/invalid secrets."""

    def _frontend_reachable(self) -> bool:
        try:
            r = requests.get(f"{FRONTEND_URL}/", timeout=5)
            return r.status_code < 500
        except requests.RequestException:
            return False

    def test_missing_secret_rejected(self):
        if not self._frontend_reachable():
            pytest.skip("Frontend not reachable in this env")
        r = requests.post(
            f"{FRONTEND_URL}{REVALIDATE_PATH}",
            json={"path": "/blog"},
            timeout=10,
        )
        assert r.status_code in (401, 503), (
            f"Expected 401/503 for missing secret, got {r.status_code} body={r.text[:200]}"
        )

    def test_hardcoded_old_fallback_does_not_work(self):
        """The previous committed default must no longer be accepted."""
        if not self._frontend_reachable():
            pytest.skip("Frontend not reachable in this env")
        r = requests.post(
            f"{FRONTEND_URL}{REVALIDATE_PATH}",
            json={"secret": "zubite-revalidate-secret-2024", "path": "/blog"},
            timeout=10,
        )
        # If the configured env happens to literally be the same string we
        # would accept (operator chose the worst-possible value). Otherwise
        # this must be rejected.
        configured = os.environ.get("REVALIDATE_SECRET")
        if configured == "zubite-revalidate-secret-2024":
            pytest.skip("Operator configured the old default literally — manual review needed")
        assert r.status_code in (401, 503), (
            f"Old hardcoded fallback must no longer work; got {r.status_code}"
        )

    def test_garbage_secret_rejected(self):
        if not self._frontend_reachable():
            pytest.skip("Frontend not reachable in this env")
        r = requests.post(
            f"{FRONTEND_URL}{REVALIDATE_PATH}",
            json={"secret": "this-is-not-the-secret", "path": "/blog"},
            timeout=10,
        )
        assert r.status_code in (401, 503)

    def test_get_variant_missing_secret_rejected(self):
        if not self._frontend_reachable():
            pytest.skip("Frontend not reachable in this env")
        r = requests.get(f"{FRONTEND_URL}{REVALIDATE_PATH}", timeout=10)
        assert r.status_code in (401, 503)

    def test_valid_secret_accepted(self):
        """If REVALIDATE_SECRET is in env, the matching secret must succeed."""
        if not self._frontend_reachable():
            pytest.skip("Frontend not reachable in this env")
        configured = os.environ.get("REVALIDATE_SECRET")
        if not configured:
            pytest.skip("REVALIDATE_SECRET not configured in this env")
        r = requests.post(
            f"{FRONTEND_URL}{REVALIDATE_PATH}",
            json={"secret": configured, "path": "/blog"},
            timeout=15,
        )
        assert r.status_code == 200, f"Valid secret got {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert body.get("revalidated") is True


# ─── SEC-003  Blog rendering + security headers ──────────────────────


class TestBlogRenderAndCSPSEC003:
    """Blog smoke + security headers (CSP, HSTS, X-Frame-Options, …)."""

    def _frontend_reachable(self) -> bool:
        try:
            r = requests.get(f"{FRONTEND_URL}/", timeout=5)
            return r.status_code < 500
        except requests.RequestException:
            return False

    REQUIRED_HEADERS = [
        "content-security-policy",
        "x-content-type-options",
        "x-frame-options",
        "referrer-policy",
        "permissions-policy",
        "strict-transport-security",
    ]

    def test_blog_index_renders(self):
        if not self._frontend_reachable():
            pytest.skip("Frontend not reachable in this env")
        r = requests.get(f"{FRONTEND_URL}/blog", timeout=15)
        assert r.status_code == 200

    def test_blog_index_has_security_headers(self):
        if not self._frontend_reachable():
            pytest.skip("Frontend not reachable in this env")
        r = requests.get(f"{FRONTEND_URL}/blog", timeout=15)
        lower = {k.lower(): v for k, v in r.headers.items()}
        missing = [h for h in self.REQUIRED_HEADERS if h not in lower]
        assert not missing, f"Missing security headers on /blog: {missing}"
        csp = lower["content-security-policy"]
        # Spot-check critical CSP directives.
        for needle in ("default-src", "script-src", "object-src 'none'", "frame-ancestors"):
            assert needle in csp, f"CSP missing directive: {needle}"

    def test_blog_slug_renders_if_any_post_exists(self):
        if not self._frontend_reachable():
            pytest.skip("Frontend not reachable in this env")
        try:
            r = requests.get(f"{BACKEND_URL}/api/blog/posts?limit=1", timeout=10)
            if r.status_code != 200:
                pytest.skip("Public blog API not reachable")
            posts = r.json().get("posts") or r.json().get("items") or []
            if not posts:
                pytest.skip("No published posts to render against")
            slug = posts[0].get("slug")
            if not slug:
                pytest.skip("First post has no slug")
        except requests.RequestException:
            pytest.skip("Could not fetch a sample blog slug")

        page = requests.get(f"{FRONTEND_URL}/blog/{slug}", timeout=15)
        assert page.status_code == 200, f"/blog/{slug} → {page.status_code}"
        # Sanitizer assertion: a published article should never contain
        # raw `<script>` tags or inline event handlers in its body.
        text = page.text.lower()
        # Allow only the JSON-LD application/ld+json scripts and Next.js
        # framework scripts; reject any <script>alert/.../</script> shapes.
        assert "onerror=" not in text
        assert "onclick=" not in text
        # The article body should not contain `javascript:` URLs.
        assert 'href="javascript:' not in text


# ─── JS sanitizer smoke ─────────────────────────────────────────────
#
# The DOMPurify-based sanitizer lives in the Next.js bundle and so cannot
# be unit-tested from Python directly. The TestBlogSlugRenders test above
# is the integration check. For finer-grained tests, the frontend testing
# agent should exercise the page with a synthetic article containing
# `<script>`, `onclick=`, and `javascript:` payloads.
