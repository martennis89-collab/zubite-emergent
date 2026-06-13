"""Phase 3 — Image Requirements endpoints (curl-style)."""
from __future__ import annotations
import asyncio
import io
import uuid

import requests

API = "http://localhost:8001"
SECRET = "phase1-dev-secret-rotate-in-prod"

# Reuse the same valid markdown package from Phase 1 (with 2 placeholders + 1 image asset).
PACKAGE = """# ZUBITE_ARTICLE_PACKAGE

<!-- ARTICLE_META -->

Title: Тест статия за изображения {ts}
Slug: test-image-reqs-{slug}
Category: orthodontics
Tags: тест
Language: bg

<!-- ARTICLE_BODY_START -->

Параграф 1.

{{image:featured_main}}

Параграф 2.

{{image:support_1}}

Параграф 3.

<!-- ARTICLE_BODY_END -->

<!-- IMAGE_ASSETS -->

* Type: featured
  File Name: hero-main.png
  Alt: Heroic alt
  Title: Hero
  Caption: Hero caption
  Placement: top
  Placeholder: {{image:featured_main}}

* Type: support
  File Name: support-one.png
  Alt: Support alt
  Title: Support 1
  Caption: Support caption
  Placement: inline
  Placeholder: {{image:support_1}}

<!-- FAQ -->

Q: Test?
A: Yes.

<!-- CTA_BLOCK -->

Title: Готови ли сте?
Text: Започни сега.
Button: Започни
URL: /quiz
"""


def _login_cookies() -> requests.Session:
    s = requests.Session()
    r = s.post(f"{API}/api/admin/login",
               json={"username": "admin", "password": "admin123"}, timeout=10)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _import_article() -> tuple[str, list[dict]]:
    slug = uuid.uuid4().hex[:8]
    md = PACKAGE.replace("{ts}", slug).replace("{slug}", slug)
    r = requests.post(f"{API}/api/admin/content-automation/import-from-make",
                      json={"secret": SECRET,
                            "articleId": f"ART-{slug}",
                            "makeRunId": f"RUN-{slug}",
                            "markdown": md},
                      timeout=10)
    assert r.status_code == 200, r.text
    body = r.json()
    aid = body["createdArticleId"]
    return aid, body.get("validation", {}).get("placeholders", [])


def _png(name: str = "x.png") -> tuple[str, bytes, str]:
    # Minimal valid PNG header — content correctness isn't checked.
    data = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00"
        b"\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDAT\x08"
        b"\x99c\xf8\x0f\x00\x00\x01\x01\x00\x05\x00\x01\r\n-\xb4\x00\x00"
        b"\x00\x00IEND\xaeB`\x82"
    )
    return (name, data, "image/png")


def t1_list_requirements(s: requests.Session, aid: str) -> list[dict]:
    r = s.get(f"{API}/api/admin/blog/{aid}/image-requirements", timeout=10)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "requirements" in body
    assert len(body["requirements"]) >= 2
    assert body["all_attached"] is False
    types = [x["type"] for x in body["requirements"]]
    assert "featured" in types
    assert "support" in types
    # Initial status is missing
    for req in body["requirements"]:
        assert req["upload_status"] == "missing"
    # Warnings should mention missing
    assert any("missing" in w.lower() for w in body["warnings"])
    print(f"  T1 PASS — list returns {len(body['requirements'])} reqs, all missing")
    return body["requirements"]


def t2_upload_featured(s: requests.Session, aid: str, reqs: list[dict]) -> None:
    feat = next(r for r in reqs if r["type"] == "featured")
    name, data, ct = _png("hero.png")
    r = s.post(
        f"{API}/api/admin/blog/{aid}/image-requirements/{feat['id']}/upload",
        files={"file": (name, io.BytesIO(data), ct)},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"]
    assert body["requirement"]["upload_status"] == "attached"
    assert body["requirement"]["matched_by"] == "manual"
    assert body["requirement"]["uploaded_file_url"].startswith("/api/files/")
    # Verify featured image mirrored onto article doc
    r2 = s.get(f"{API}/api/admin/blog/posts/{aid}", timeout=10)
    assert r2.status_code == 200, r2.text
    assert r2.json()["featured_image"] == body["requirement"]["uploaded_file_url"]
    print("  T2 PASS — featured uploaded + mirrored to blog_posts.featured_image")


def t3_invalid_content_type(s: requests.Session, aid: str, reqs: list[dict]) -> None:
    sup = next(r for r in reqs if r["type"] == "support")
    r = s.post(
        f"{API}/api/admin/blog/{aid}/image-requirements/{sup['id']}/upload",
        files={"file": ("malicious.txt", io.BytesIO(b"hello"), "text/plain")},
        timeout=10,
    )
    assert r.status_code == 400, r.text
    assert r.json()["detail"]["code"] == "invalid_content_type"
    print("  T3 PASS — invalid content-type rejected")


def t4_bulk_upload_mixed(s: requests.Session, aid: str) -> None:
    # Fresh import for an isolated batch
    aid2, _ = _import_article()
    # 3 files: 1 exact, 1 normalized-name, 1 garbage name
    name1, d1, ct1 = _png("hero-main.png")          # exact match → featured
    name2, d2, ct2 = _png("Support One.PNG")         # normalized → support-one.png
    name3, d3, ct3 = _png("unknown-file.png")       # no match → unmatched

    files = [
        ("files", (name1, io.BytesIO(d1), ct1)),
        ("files", (name2, io.BytesIO(d2), ct2)),
        ("files", (name3, io.BytesIO(d3), ct3)),
    ]
    r = s.post(
        f"{API}/api/admin/blog/{aid2}/image-requirements/bulk-upload",
        files=files, timeout=30,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    matched_by_kinds = [a["matched_by"] for a in body["attached"]]
    assert "filename" in matched_by_kinds, body
    assert "normalized_filename" in matched_by_kinds, body
    assert len(body["attached"]) == 2
    assert len(body["unmatched"]) == 1
    assert body["unmatched"][0]["filename"] == "unknown-file.png"
    # all_attached should be True since both reqs are filled
    assert body["all_attached"] is True, body
    print("  T4 PASS — bulk: 1 exact + 1 normalized attached, 1 unmatched")
    return aid2


def t5_manual_assign(s: requests.Session) -> None:
    """Take the 'unmatched' file URL from a fresh bulk and manually assign it
    to a remaining requirement via the assign endpoint."""
    aid3, _ = _import_article()
    # Upload one wrong-named file
    name, data, ct = _png("random-shot.png")
    bulk = s.post(
        f"{API}/api/admin/blog/{aid3}/image-requirements/bulk-upload",
        files=[("files", (name, io.BytesIO(data), ct))],
        timeout=20,
    )
    assert bulk.status_code == 200, bulk.text
    un = bulk.json()["unmatched"]
    assert len(un) == 1
    file_url = un[0]["uploaded_file_url"]
    # Pick the support requirement
    list_resp = s.get(f"{API}/api/admin/blog/{aid3}/image-requirements", timeout=10)
    support_req = next(x for x in list_resp.json()["requirements"] if x["type"] == "support")
    # Assign
    asg = s.post(
        f"{API}/api/admin/blog/{aid3}/image-requirements/{support_req['id']}/assign",
        json={"uploaded_file_url": file_url, "uploaded_file_name": name},
        timeout=10,
    )
    assert asg.status_code == 200, asg.text
    assert asg.json()["requirement"]["matched_by"] == "manual"
    assert asg.json()["requirement"]["uploaded_file_url"] == file_url
    print("  T5 PASS — manual assign of previously-unmatched file works")


def t6_unauth_blocked() -> None:
    r = requests.get(f"{API}/api/admin/blog/whatever/image-requirements", timeout=10)
    assert r.status_code in (401, 403), r.text
    print(f"  T6 PASS — unauth blocked ({r.status_code})")


def t7_existing_blog_crud_intact(s: requests.Session) -> None:
    r = s.get(f"{API}/api/admin/blog/posts?limit=5", timeout=10)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "posts" in body
    print(f"  T7 PASS — existing blog list still works ({len(body['posts'])} posts)")


def main() -> None:
    s = _login_cookies()
    aid, _ = _import_article()
    reqs = t1_list_requirements(s, aid)
    t2_upload_featured(s, aid, reqs)
    t3_invalid_content_type(s, aid, reqs)
    t4_bulk_upload_mixed(s, aid)
    t5_manual_assign(s)
    t6_unauth_blocked()
    t7_existing_blog_crud_intact(s)

    # Cleanup
    async def clean():
        from database import db
        await db.blog_posts.delete_many({"automation_source": "make"})
        await db.content_automation_jobs.delete_many({})
        await db.article_image_requirements.delete_many({})
        # Drop uploaded test images
        await db.uploaded_files.delete_many({"original_filename": {"$in": [
            "hero.png", "hero-main.png", "Support One.PNG", "unknown-file.png",
            "random-shot.png", "malicious.txt"]}})

    asyncio.run(clean())
    print("ALL PHASE 3 CONTENT AUTOMATION TESTS PASS")


if __name__ == "__main__":
    main()
