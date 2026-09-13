"""Cloudflare R2 storage layer.

Covers the parts that need no live bucket: endpoint/bucket splitting, the
fail-closed path when R2 is unconfigured, and the return contract callers
persist onto `uploaded_files`.

The live round-trip is exercised by `_r2_smoke.py`, which is skipped here
because it needs real credentials.
"""

from __future__ import annotations

import importlib

import pytest
from fastapi import HTTPException


def test_split_endpoint_tolerates_bucket_on_the_url():
    """Cloudflare's dashboard shows the S3 API as one URL with the bucket
    appended, so pasting it verbatim into R2_ENDPOINT is the obvious
    mistake. Splitting it beats signing against `/zubitebg/zubitebg/...`.
    """
    from storage import _split_endpoint  # type: ignore

    account = "https://abc123.r2.cloudflarestorage.com"
    assert _split_endpoint(f"{account}/zubitebg", "zubitebg") == (account, "zubitebg")
    assert _split_endpoint(f"{account}/zubitebg/", "zubitebg") == (account, "zubitebg")
    assert _split_endpoint(account, "zubitebg") == (account, "zubitebg")
    # A bucket whose name merely appears elsewhere in the host must not be
    # chopped off the end.
    assert _split_endpoint(account, "abc123") == (account, "abc123")


def test_unconfigured_storage_fails_closed(monkeypatch):
    """No credentials must mean a 503 from the upload path — never a boot
    failure and never a silent success."""
    import storage  # type: ignore

    importlib.reload(storage)
    monkeypatch.setattr(storage, "_client", None, raising=False)
    monkeypatch.setattr(storage, "R2_ACCESS_KEY_ID", None, raising=False)
    monkeypatch.setattr(storage, "R2_SECRET_ACCESS_KEY", None, raising=False)

    assert storage.init_storage() is None

    with pytest.raises(HTTPException) as ei:
        storage.put_object("zubite-bg/blog/x.png", b"data", "image/png")
    assert ei.value.status_code == 503

    with pytest.raises(HTTPException) as ei:
        storage.get_object("zubite-bg/blog/x.png")
    assert ei.value.status_code == 503


def test_put_object_returns_the_shape_callers_persist(monkeypatch):
    """`routers/blog.py` and `routers/content_automation.py` write
    `result["path"]` and `result["size"]` straight onto `uploaded_files`,
    so the keys are load-bearing."""
    import storage  # type: ignore

    calls = {}

    class _FakeClient:
        def put_object(self, **kw):
            calls.update(kw)
            return {}

    monkeypatch.setattr(storage, "_client", _FakeClient(), raising=False)
    monkeypatch.setattr(storage, "_bucket", "zubitebg", raising=False)

    payload = b"1234567890"
    out = storage.put_object("zubite-bg/blog/a.png", payload, "image/png")

    assert out == {"path": "zubite-bg/blog/a.png", "size": len(payload)}
    assert calls["Bucket"] == "zubitebg"
    assert calls["Key"] == "zubite-bg/blog/a.png"
    assert calls["Body"] == payload
    assert calls["ContentType"] == "image/png"
    # The bucket must stay private — no ACL is ever sent.
    assert "ACL" not in calls


def test_get_object_returns_bytes_and_content_type(monkeypatch):
    import storage  # type: ignore

    class _Body:
        def read(self):
            return b"imagebytes"

    class _FakeClient:
        exceptions = type("E", (), {"NoSuchKey": type("NoSuchKey", (Exception,), {})})

        def get_object(self, **kw):
            return {"Body": _Body(), "ContentType": "image/webp"}

    monkeypatch.setattr(storage, "_client", _FakeClient(), raising=False)
    monkeypatch.setattr(storage, "_bucket", "zubitebg", raising=False)

    data, ctype = storage.get_object("zubite-bg/blog/a.webp")
    assert data == b"imagebytes"
    assert ctype == "image/webp"


def test_missing_key_is_404_not_502(monkeypatch):
    """A deleted/absent object is a client-visible 404; only real transport
    failures should read as a storage fault."""
    import storage  # type: ignore

    class _NoSuchKey(Exception):
        pass

    class _FakeClient:
        exceptions = type("E", (), {"NoSuchKey": _NoSuchKey})

        def get_object(self, **kw):
            raise _NoSuchKey()

    monkeypatch.setattr(storage, "_client", _FakeClient(), raising=False)
    monkeypatch.setattr(storage, "_bucket", "zubitebg", raising=False)

    with pytest.raises(HTTPException) as ei:
        storage.get_object("zubite-bg/blog/missing.png")
    assert ei.value.status_code == 404
