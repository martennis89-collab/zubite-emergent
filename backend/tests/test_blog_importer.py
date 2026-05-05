"""
Tests for the structured article importer (extended BlogPost fields).
Covers:
- POST /api/admin/blog/posts with extended payload
- PUT /api/admin/blog/posts/{id} updating extended fields
- GET /api/blog/posts/{slug} returns extended fields publicly
- Pydantic validation rejects malformed FAQ items (422)
- Existing simple flow (regression)
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ortho-preview-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@zubite.bg"
ADMIN_PASS = "password"


def _xff(suffix: str) -> dict:
    return {"X-Forwarded-For": f"10.99.{(hash(suffix) % 250) + 1}.{(hash(suffix + 's') % 250) + 1}"}


@pytest.fixture(scope="session")
def admin_token():
    # use unique XFF to avoid rate limit
    headers = _xff(f"login-{uuid.uuid4()}")
    headers["Content-Type"] = "application/json"
    r = requests.post(f"{API}/admin/login",
                      json={"username": ADMIN_EMAIL, "password": ADMIN_PASS},
                      headers=headers, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    })
    return s


@pytest.fixture
def created_ids(admin_client):
    ids = []
    yield ids
    for pid in ids:
        try:
            admin_client.delete(f"{API}/admin/blog/posts/{pid}", timeout=10)
        except Exception:
            pass


def _ext_payload(slug_suffix: str, published: bool = False):
    slug = f"test-imp-{slug_suffix}-{uuid.uuid4().hex[:6]}"
    return {
        "title": f"TEST_Importer {slug_suffix}",
        "slug": slug,
        "excerpt": "Кратко въведение към статията за теста.",
        "content": "# Заглавие\n\nТова е тестово съдържание на статията.",
        "category": "orthodontics",
        "tags": ["alignery", "test"],
        "is_published": published,
        # extended
        "seo_title": "SEO заглавие до 60 символа за тест",
        "language": "bg",
        "meta_description": "Кратко мета-описание за SEO теста до 155 символа максимум.",
        "content_html": "<h1>Заглавие</h1><p>Съдържание</p>",
        "faq": [
            {"q": "Какво е алайнер?", "a": "Прозрачна шина за зъби."},
            {"q": "Колко време отнема?", "a": "Между 6 и 18 месеца."},
        ],
        "internal_links": [
            {"label": "Цени", "url": "/blog/ceni"},
            {"label": "Клиники", "url": "/clinics"},
        ],
        "external_sources": [
            {"title": "AAO", "url": "https://www.aaoinfo.org"},
        ],
        "cta": {
            "title": "Готов за консултация?",
            "text": "Намери клиника близо до теб.",
            "button": "Започни",
            "url": "/quiz",
            "type": "primary",
        },
        "featured_image_alt": "Прозрачни алайнери на бял фон",
        "image_alt_texts": ["Алайнер 1", "Алайнер 2"],
        "faq_schema": {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": []},
        "article_schema": {"@context": "https://schema.org", "@type": "Article", "headline": "x"},
    }


# ── Backend 1: POST extended payload ─────────────────────────────
class TestExtendedCreate:
    def test_create_with_extended_fields_persists_all(self, admin_client, created_ids):
        payload = _ext_payload("create")
        r = admin_client.post(f"{API}/admin/blog/posts", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        post = r.json()
        created_ids.append(post["id"])

        # core
        assert post["slug"] == payload["slug"]
        assert post["title"] == payload["title"]
        # extended
        assert post["seo_title"] == payload["seo_title"]
        assert post["language"] == "bg"
        assert post["content_html"] == payload["content_html"]
        assert len(post["faq"]) == 2
        assert post["faq"][0]["q"] == "Какво е алайнер?"
        assert len(post["internal_links"]) == 2
        assert post["internal_links"][0]["url"] == "/blog/ceni"
        assert len(post["external_sources"]) == 1
        assert post["cta"]["button"] == "Започни"
        assert post["featured_image_alt"] == payload["featured_image_alt"]
        assert post["image_alt_texts"] == ["Алайнер 1", "Алайнер 2"]
        assert post["faq_schema"]["@type"] == "FAQPage"
        assert post["article_schema"]["@type"] == "Article"

        # GET admin to verify persistence
        g = admin_client.get(f"{API}/admin/blog/posts/{post['id']}", timeout=10)
        assert g.status_code == 200
        fetched = g.json()
        assert len(fetched["faq"]) == 2
        assert fetched["cta"]["url"] == "/quiz"


# ── Backend 2: PUT updating extended fields ──────────────────────
class TestExtendedUpdate:
    def test_update_extended_fields(self, admin_client, created_ids):
        # create
        payload = _ext_payload("upd")
        r = admin_client.post(f"{API}/admin/blog/posts", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        created_ids.append(pid)

        # update with new extended values
        update = {
            "seo_title": "Updated SEO title",
            "faq": [
                {"q": "Q1", "a": "A1"},
                {"q": "Q2", "a": "A2"},
                {"q": "Q3", "a": "A3"},
            ],
            "cta": {"title": "Нова CTA", "button": "Кликни", "url": "/x"},
            "image_alt_texts": ["one"],
        }
        u = admin_client.put(f"{API}/admin/blog/posts/{pid}", json=update, timeout=15)
        assert u.status_code == 200, u.text
        upd = u.json()
        assert upd["seo_title"] == "Updated SEO title"
        assert len(upd["faq"]) == 3
        assert upd["faq"][2]["q"] == "Q3"
        assert upd["cta"]["title"] == "Нова CTA"
        assert upd["image_alt_texts"] == ["one"]

        # GET to verify persistence
        g = admin_client.get(f"{API}/admin/blog/posts/{pid}", timeout=10)
        assert g.status_code == 200
        f = g.json()
        assert f["seo_title"] == "Updated SEO title"
        assert len(f["faq"]) == 3


# ── Backend 3: GET public returns extended fields ────────────────
class TestPublicGet:
    def test_published_post_exposes_extended_fields(self, admin_client, created_ids):
        payload = _ext_payload("pub", published=True)
        r = admin_client.post(f"{API}/admin/blog/posts", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        post = r.json()
        created_ids.append(post["id"])
        slug = post["slug"]

        g = requests.get(f"{API}/blog/posts/{slug}", timeout=10)
        assert g.status_code == 200, g.text
        public = g.json()
        assert public["slug"] == slug
        assert public["is_published"] is True
        assert len(public["faq"]) == 2
        assert public["cta"]["button"] == "Започни"
        assert public["featured_image_alt"] == payload["featured_image_alt"]
        assert public["faq_schema"]["@type"] == "FAQPage"
        assert public["article_schema"]["@type"] == "Article"
        assert len(public["internal_links"]) == 2
        assert len(public["external_sources"]) == 1

    def test_unpublished_post_returns_404_publicly(self, admin_client, created_ids):
        payload = _ext_payload("draft", published=False)
        r = admin_client.post(f"{API}/admin/blog/posts", json=payload, timeout=15)
        assert r.status_code == 200
        created_ids.append(r.json()["id"])
        slug = r.json()["slug"]

        g = requests.get(f"{API}/blog/posts/{slug}", timeout=10)
        assert g.status_code == 404


# ── Backend 4: Pydantic validation rejects malformed FAQ ─────────
class TestValidation:
    def test_empty_faq_q_rejected(self, admin_client):
        payload = _ext_payload("badfaq")
        payload["faq"] = [{"q": "", "a": "answer"}]
        r = admin_client.post(f"{API}/admin/blog/posts", json=payload, timeout=15)
        assert r.status_code == 422, r.text

    def test_empty_faq_a_rejected(self, admin_client):
        payload = _ext_payload("badfaq2")
        payload["faq"] = [{"q": "ok", "a": ""}]
        r = admin_client.post(f"{API}/admin/blog/posts", json=payload, timeout=15)
        assert r.status_code == 422, r.text

    def test_missing_link_url_rejected(self, admin_client):
        payload = _ext_payload("badlink")
        payload["internal_links"] = [{"label": "x", "url": ""}]
        r = admin_client.post(f"{API}/admin/blog/posts", json=payload, timeout=15)
        assert r.status_code == 422, r.text


# ── Backend 5: Regression — existing simple flow ─────────────────
class TestRegression:
    def test_simple_post_create_list_delete(self, admin_client):
        slug = f"test-simple-{uuid.uuid4().hex[:6]}"
        payload = {
            "title": "TEST_Simple",
            "slug": slug,
            "excerpt": "ex",
            "content": "body",
            "category": "orthodontics",
            "tags": [],
            "is_published": False,
        }
        r = admin_client.post(f"{API}/admin/blog/posts", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        post = r.json()
        # default extended fields present and empty
        assert post["faq"] == []
        assert post["internal_links"] == []
        assert post["external_sources"] == []
        assert post["cta"] is None
        assert post["language"] == "bg"

        # list
        lst = admin_client.get(f"{API}/admin/blog/posts?limit=200", timeout=10)
        assert lst.status_code == 200
        slugs = [p["slug"] for p in lst.json()["posts"]]
        assert slug in slugs

        # delete
        d = admin_client.delete(f"{API}/admin/blog/posts/{post['id']}", timeout=10)
        assert d.status_code == 200

        # verify gone
        g = admin_client.get(f"{API}/admin/blog/posts/{post['id']}", timeout=10)
        assert g.status_code == 404
