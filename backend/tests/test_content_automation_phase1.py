"""Phase 1 — content automation backend tests (curl-style)."""
from __future__ import annotations
import os, asyncio, requests, uuid

API = "http://localhost:8001"
SECRET = "phase1-dev-secret-rotate-in-prod"

VALID_PACKAGE = """# ZUBITE_ARTICLE_PACKAGE

<!-- ARTICLE_META -->

Title: Боли ме зъб: какво да правя до прегледа?
SEO Title: Боли ме зъб — какво да правя
Meta Description: Кратки практични стъпки.
Excerpt: Когато боли — какво да правиш сега.
Slug: boli-me-zab-kakvo-da-pravya
Category: emergency
Tags: spешна помощ, болка
Author: Zubite
Reviewed By: dr. Петров
Last Reviewed: 2026-06-10
Language: bg
Status: draft
Focus Keyword: болка в зъб
Secondary Keywords: спешна стоматология, домашна помощ
Reading Time: 6 min

<!-- GEO_SUMMARY -->

Кратко резюме за GEO.

<!-- ENTITY_POSITIONING_BLOCK -->

Zubite.bg е консумерска платформа.

<!-- ARTICLE_BODY_START -->

Параграф 1.

{{image:support_1}}

Параграф 2.

{{image:support_2}}

Параграф 3.

<!-- ARTICLE_BODY_END -->

<!-- EXTRACTABLE_ANSWER_BLOCKS -->

* Question: Какво да направя сега?
  Short Answer: Изплакни с топла солена вода.

<!-- SOURCE_BACKED_CLAIMS -->

* Claim: Топла солена вода намалява дискомфорта.
  Source URL: https://example.org
  Confidence: medium

<!-- DECISION_FRAMEWORK -->

Patient-stage guidance:

* When this is mainly informational: лека и кратка болка.
* When to book a standard dental consultation: продължителна болка >24ч.
* When to seek urgent dental care: подуване, треска.
* What to compare before choosing a clinic: спешен прием, цена, разстояние.

<!-- FAQ -->

Q: Колко често мога да изплаквам?
A: На всеки няколко часа.

Q: Кога е спешно?
A: При треска или подуване.

<!-- INTERNAL_LINKS -->

* Label: Care Pass
  URL: /care-pass
  Context: Партньорски отстъпки за орална хигиена.

<!-- EXTERNAL_SOURCES -->

* Title: ADA — Toothache
  URL: https://www.ada.org/toothache
  Context: Общи насоки.

<!-- CTA_BLOCK -->

Title: Заяви онлайн ориентация
Text: Безплатна 25-минутна онлайн консултация.
Button: Заяви час
URL: /quiz
Type: primary

<!-- IMAGE_ALT_TEXTS -->

Featured Image Alt: Зъбобол — какво да правим
Featured Image File Name: featured-toothache.jpg
Featured Image Placement: featured

<!-- IMAGE_ASSETS -->

* Type: featured
  File Name: featured-toothache.jpg
  Alt: Зъбобол — featured
  Title: Featured
  Caption: Featured caption
  Placement: featured_image

* Type: support
  File Name: support-1-salt-water.jpg
  Alt: Изплакване със солена вода
  Title: Support 1
  Caption: Стъпка 1
  Placement: inline
  Placeholder: {{image:support_1}}

* Type: support
  File Name: support-2-cold-compress.jpg
  Alt: Студен компрес
  Title: Support 2
  Caption: Стъпка 2
  Placement: inline
  Placeholder: {{image:support_2}}

<!-- IMAGE_PROMPT_PACK -->

* Image number: 1
  Purpose: Featured
  Exact filename: featured-toothache.jpg
  Alt text: Зъбобол — featured
  Prompt: Modern clinical hero image.

<!-- FAQ_SCHEMA_JSON_LD -->

```json
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Q1","acceptedAnswer":{"@type":"Answer","text":"A1"}}]}
```

<!-- ARTICLE_SCHEMA_JSON_LD -->

```json
{"@context":"https://schema.org","@type":"Article","headline":"Боли ме зъб"}
```
"""


def t1_valid_import():
    r = requests.post(f"{API}/api/admin/content-automation/import-from-make",
                      json={"secret": SECRET, "articleId": "TOPIC-001",
                            "makeRunId": "run-aaa", "markdown": VALID_PACKAGE},
                      timeout=10)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["success"]
    assert b["status"] == "needs_images"
    assert b["slug"].startswith("boli-me-zab")
    assert b["createdArticleId"]
    print(f"  T1 PASS — draft created: {b['createdArticleId'][:8]} status={b['status']}")
    return b["createdArticleId"]


def t2_escaped_rejected():
    md = VALID_PACKAGE.replace("# ZUBITE_ARTICLE_PACKAGE", r"\# ZUBITE\_ARTICLE\_PACKAGE")
    r = requests.post(f"{API}/api/admin/content-automation/import-from-make",
                      json={"secret": SECRET, "markdown": md, "articleId": "TOPIC-X"},
                      timeout=10)
    assert r.status_code == 400 and r.json()["detail"]["code"] == "escaped_markers", r.text
    print("  T2 PASS — escaped markers rejected")


def t3_missing_section():
    md = VALID_PACKAGE.replace("<!-- ARTICLE_BODY_END -->", "<!-- WRONG_END -->")
    r = requests.post(f"{API}/api/admin/content-automation/import-from-make",
                      json={"secret": SECRET, "markdown": md, "articleId": "TOPIC-Y"},
                      timeout=10)
    assert r.status_code == 400, r.text
    assert "missing_section" in r.json()["detail"]["code"] or r.json()["detail"]["code"] == "missing_body"
    print(f"  T3 PASS — missing section: {r.json()['detail']['code']}")


def t4_idempotent_duplicate():
    aid = "TOPIC-DUP-" + uuid.uuid4().hex[:6]
    rid = "run-dup-" + uuid.uuid4().hex[:6]
    r1 = requests.post(f"{API}/api/admin/content-automation/import-from-make",
                       json={"secret": SECRET, "articleId": aid, "makeRunId": rid,
                             "markdown": VALID_PACKAGE}, timeout=10)
    assert r1.status_code == 200
    r2 = requests.post(f"{API}/api/admin/content-automation/import-from-make",
                       json={"secret": SECRET, "articleId": aid, "makeRunId": rid,
                             "markdown": VALID_PACKAGE}, timeout=10)
    assert r2.status_code == 200
    j2 = r2.json()
    assert j2.get("duplicate") is True
    assert j2["createdArticleId"] == r1.json()["createdArticleId"]
    print(f"  T4 PASS — duplicate detected, same articleId {j2['createdArticleId'][:8]}")


def t5_start_next_requires_env(token):
    # Force env empty by reading current value
    r = requests.post(f"{API}/api/admin/content-automation/start-next",
                      headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                      json={}, timeout=10)
    # In our preview, MAKE_CONTENT_AUTOMATION_WEBHOOK_URL is "" so we expect 503
    assert r.status_code == 503, r.text
    assert r.json()["detail"]["code"] == "make_not_configured"
    print("  T5 PASS — start-next surfaces make_not_configured (env empty)")


def main():
    auth = requests.post(f"{API}/api/admin/login",
                         json={"username": "admin@zubite.bg", "password": "password"},
                         timeout=10)
    token = auth.json()["access_token"]
    t1_valid_import()
    t2_escaped_rejected()
    t3_missing_section()
    t4_idempotent_duplicate()
    t5_start_next_requires_env(token)
    # Cleanup
    async def clean():
        from database import db
        await db.blog_posts.delete_many({"automation_source": "make"})
        await db.content_automation_jobs.delete_many({})
        await db.article_image_requirements.delete_many({})
    asyncio.run(clean())
    print("ALL PHASE 1 CONTENT AUTOMATION TESTS PASS")


if __name__ == "__main__":
    main()
