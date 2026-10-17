"""Clinic intake photo fields that hold page links become real photo suggestions.

Modelled on Msmile's intake: every photo field held a page of the clinic's
website (about-us, the doctor's page, the home page, a treatment page), so
the live profile showed four broken images. Network, storage and Claude are
stubbed — these tests pin the extraction, the per-slot choice, the admin
accept/reject flow and the public safety net.
"""
import io
import os
import sys

import pytest
from fastapi import HTTPException
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import clinic_photo_import as photos  # noqa: E402
import routers.clinics as clinics  # noqa: E402
from schemas import AdminUser  # noqa: E402

ADMIN = AdminUser(id="admin-1", username="ops@zubite.bg")
SITE = "https://clinic.example"


def _jpeg(w, h, color=(200, 220, 230)):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color).save(buf, format="JPEG")
    return buf.getvalue()


def _png(w, h):
    buf = io.BytesIO()
    Image.new("RGBA", (w, h), (0, 0, 0, 0)).save(buf, format="PNG")
    return buf.getvalue()


HOME = f"""<html><head>
<meta property="og:image" content="{SITE}/wp-content/uploads/logoslogan.png">
<link rel="icon" href="{SITE}/wp-content/uploads/cropped-fav-1-32x32.png">
</head><body>
<img src="{SITE}/wp-content/uploads/logo.png" alt="Клиника">
<img src="{SITE}/wp-content/uploads/team-slide-1750x625.jpg" alt="снимка на екипа в клиниката">
<img data-src="{SITE}/wp-content/uploads/room-blue.jpg" alt="снимка на кабинета">
<img src="https://booking.example/img/buttons/btn-book-large.png" alt="Запази час">
<img src="{SITE}/wp-content/uploads/service-150x150.png" alt="услуга">
<div style="background-image:url('{SITE}/wp-content/plugins/lightbox/images/next.png')"></div>
</body></html>"""

DOCTOR = f"""<html><head>
<meta property="og:image" content="{SITE}/wp-content/uploads/dr-ivanova.jpg">
</head><body><img src="{SITE}/wp-content/uploads/dr-ivanova-770x770.jpg" alt="Д-р Иванова"></body></html>"""

# Gallery photos only reachable through an escaped slider config.
ABOUT = (
    '<html><body><div class="vc_grid" data-vc-grid-settings=\'{"items":['
    '"https:\\/\\/clinic.example\\/wp-content\\/uploads\\/gallery1.jpg"]}\'></div></body></html>'
)

IMAGES = {
    f"{SITE}/wp-content/uploads/logoslogan.png": _png(548, 200),
    f"{SITE}/wp-content/uploads/team-slide.jpg": _jpeg(1750, 625),
    f"{SITE}/wp-content/uploads/room-blue.jpg": _jpeg(1600, 900),
    f"{SITE}/wp-content/uploads/dr-ivanova.jpg": _jpeg(800, 800),
    f"{SITE}/wp-content/uploads/gallery1.jpg": _jpeg(600, 400),
    "https://booking.example/img/buttons/btn-book-large.png": _png(248, 72),
}
PAGES = {f"{SITE}": HOME, f"{SITE}/team/dr-ivanova/": DOCTOR, f"{SITE}/about-us/": ABOUT}


@pytest.fixture
def web(monkeypatch):
    stored = []

    async def fake_fetch(_client, url, _max):
        if url in PAGES:
            return PAGES[url].encode(), "text/html"
        if url in IMAGES:
            return IMAGES[url], "image/jpeg"
        raise ValueError("404")

    async def fake_store(img):
        stored.append(img.url)
        return f"file-{len(stored)}"

    monkeypatch.setattr(photos, "_fetch", fake_fetch)
    monkeypatch.setattr(photos, "_store", fake_store)
    monkeypatch.setattr(photos, "ANTHROPIC_API_KEY", "")
    return stored


# ─── Finding photos on a page ───────────────────────────────────


def test_extraction_drops_logos_icons_buttons_and_theme_assets():
    urls = [c.url for c in photos.extract_candidates(SITE, HOME)]

    assert f"{SITE}/wp-content/uploads/team-slide.jpg" in urls
    assert f"{SITE}/wp-content/uploads/room-blue.jpg" in urls
    for junk in ("logoslogan", "logo.png", "cropped-fav", "btn-book", "/plugins/"):
        assert not any(junk in u for u in urls), junk


def test_extraction_prefers_the_full_size_wordpress_original():
    cands = {c.url: c for c in photos.extract_candidates(SITE, HOME)}
    team = cands[f"{SITE}/wp-content/uploads/team-slide.jpg"]
    assert team.fallback_url == f"{SITE}/wp-content/uploads/team-slide-1750x625.jpg"
    assert team.alt == "снимка на екипа в клиниката"


def test_extraction_reads_escaped_urls_inside_slider_configs():
    urls = [c.url for c in photos.extract_candidates(f"{SITE}/about-us/", ABOUT)]
    assert f"{SITE}/wp-content/uploads/gallery1.jpg" in urls


# ─── Choosing per slot ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_each_slot_gets_the_matching_photo_from_its_page(web):
    result = await photos.suggest_photos({
        "doctor_spotlight_image_url": f"{SITE}/team/dr-ivanova/",
        "team_image_url": SITE,
        "environment_image_url": SITE,
        "hero_image_url": f"{SITE}/about-us/",
    })

    assert result["doctor_spotlight_image_url"]["image_source_url"].endswith("dr-ivanova.jpg")
    assert result["team_image_url"]["image_source_url"].endswith("team-slide.jpg")
    # Same page as the team slot, so the interior slot must take a different photo.
    assert result["environment_image_url"]["image_source_url"].endswith("room-blue.jpg")
    assert result["hero_image_url"]["image_source_url"].endswith("gallery1.jpg")
    for slot, s in result.items():
        assert s["status"] == "pending", slot
        assert s["image_url"].startswith("/api/files/")
        assert s["method"] == "heuristic"


@pytest.mark.asyncio
async def test_a_direct_image_link_is_used_as_is(web):
    link = f"{SITE}/wp-content/uploads/room-blue.jpg"
    result = await photos.suggest_photos({"environment_image_url": link})
    assert result["environment_image_url"]["status"] == "pending"
    assert web == [link]


@pytest.mark.asyncio
async def test_a_page_without_a_fitting_photo_suggests_nothing(web, monkeypatch):
    monkeypatch.setitem(PAGES, f"{SITE}/empty/", "<html><img src='/wp-content/uploads/logo.png'></html>")
    result = await photos.suggest_photos({"team_image_url": f"{SITE}/empty/"})
    assert result["team_image_url"]["status"] == "not_found"
    assert web == []


@pytest.mark.asyncio
async def test_an_unreachable_page_is_reported_per_slot(web):
    result = await photos.suggest_photos({"team_image_url": f"{SITE}/gone/"})
    assert result["team_image_url"]["status"] == "failed"


@pytest.mark.asyncio
async def test_our_own_stored_photos_are_left_alone(web):
    result = await photos.suggest_photos({"hero_image_url": "/api/files/abc"})
    assert result == {}


# ─── Public safety net ──────────────────────────────────────────


@pytest.mark.parametrize("value,expected", [
    ("https://msmile.bg/about-us/", None),
    ("https://msmile.bg", None),
    ("https://msmile.bg/wp-content/uploads/2023/05/galery1.jpg", "https://msmile.bg/wp-content/uploads/2023/05/galery1.jpg"),
    ("https://cdn.example/x.webp?w=800", "https://cdn.example/x.webp?w=800"),
    ("/api/files/123", "/api/files/123"),
    ("javascript:alert(1)", None),
    ("", None),
    (None, None),
])
def test_public_payloads_only_carry_displayable_images(value, expected):
    assert photos.public_image_url(value) == expected


# ─── Admin accept / reject ──────────────────────────────────────


class Result:
    def __init__(self, matched):
        self.matched_count = self.modified_count = matched


class Collection:
    def __init__(self, docs=()):
        self.docs = [dict(d) for d in docs]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                for key, value in (update.get("$set") or {}).items():
                    target = doc
                    *path, last = key.split(".")
                    for part in path:
                        target = target.setdefault(part, {})
                    target[last] = value
                return Result(1)
        return Result(0)


class FakeDb:
    def __init__(self, applications, clinics_docs=()):
        self.clinic_applications = Collection(applications)
        self.clinics = Collection(clinics_docs)


SUGGESTED = {"status": "pending", "image_url": "/api/files/f1", "file_id": "f1",
             "source_page": "https://msmile.bg/team/d-r-monika-mateva/"}


@pytest.fixture
def admin(monkeypatch):
    async def _no_audit(*_a, **_k):
        return None

    monkeypatch.setattr(clinics, "audit_log", _no_audit)

    def install(db):
        monkeypatch.setattr(clinics, "db", db)
        return db

    return install


@pytest.mark.asyncio
async def test_accepting_puts_the_photo_on_the_application_and_the_live_clinic(admin):
    db = admin(FakeDb(
        [{"id": "app-1", "clinic_name": "Msmile", "status": "approved",
          "doctor_spotlight_image_url": "https://msmile.bg/team/d-r-monika-mateva/",
          "photo_suggestions": {"doctor_spotlight_image_url": dict(SUGGESTED)}}],
        [{"id": "clinic-1", "application_id": "app-1", "clinic_profile": {
            "doctor_spotlight_image_url": "https://msmile.bg/team/d-r-monika-mateva/"}}],
    ))

    result = await clinics.decide_photo_suggestion(
        "app-1", "doctor_spotlight_image_url", "accept", request=None, user=ADMIN)

    app = db.clinic_applications.docs[0]
    assert result["clinic_updated"] is True
    assert app["doctor_spotlight_image_url"] == "/api/files/f1"
    assert app["photo_suggestions"]["doctor_spotlight_image_url"]["status"] == "accepted"
    assert app["photo_suggestions"]["doctor_spotlight_image_url"]["replaced_value"].endswith("monika-mateva/")
    assert db.clinics.docs[0]["clinic_profile"]["doctor_spotlight_image_url"] == "/api/files/f1"


@pytest.mark.asyncio
async def test_rejecting_changes_nothing_public(admin):
    db = admin(FakeDb(
        [{"id": "app-1", "doctor_spotlight_image_url": "https://x/page/",
          "photo_suggestions": {"doctor_spotlight_image_url": dict(SUGGESTED)}}],
        [{"id": "clinic-1", "application_id": "app-1", "clinic_profile": {}}],
    ))

    await clinics.decide_photo_suggestion("app-1", "doctor_spotlight_image_url", "reject", request=None, user=ADMIN)

    app = db.clinic_applications.docs[0]
    assert app["doctor_spotlight_image_url"] == "https://x/page/"
    assert app["photo_suggestions"]["doctor_spotlight_image_url"]["status"] == "rejected"
    assert db.clinics.docs[0]["clinic_profile"] == {}


@pytest.mark.asyncio
@pytest.mark.parametrize("slot,decision,code", [
    ("logo_url", "accept", 400),
    ("hero_image_url", "publish", 400),
    ("team_image_url", "accept", 404),  # no suggestion for this slot
])
async def test_bad_decisions_are_refused(admin, slot, decision, code):
    admin(FakeDb([{"id": "app-1", "photo_suggestions": {"doctor_spotlight_image_url": dict(SUGGESTED)}}]))
    with pytest.raises(HTTPException) as exc:
        await clinics.decide_photo_suggestion("app-1", slot, decision, request=None, user=ADMIN)
    assert exc.value.status_code == code


@pytest.mark.asyncio
async def test_import_cannot_start_twice_or_without_links(admin):
    from datetime import datetime, timezone

    admin(FakeDb([
        {"id": "running", "hero_image_url": "https://x/a/",
         "photo_import": {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}},
        {"id": "nolinks", "hero_image_url": "/api/files/abc"},
    ]))
    with pytest.raises(HTTPException) as exc:
        await clinics.start_photo_import("running", request=None, user=ADMIN)
    assert exc.value.status_code == 409
    with pytest.raises(HTTPException) as exc:
        await clinics.start_photo_import("nolinks", request=None, user=ADMIN)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_a_finished_run_keeps_earlier_decisions_on_untouched_slots(admin, monkeypatch):
    db = admin(FakeDb([{
        "id": "app-1", "team_image_url": "https://x/team/",
        "photo_suggestions": {"doctor_spotlight_image_url": {**SUGGESTED, "status": "accepted"}},
    }]))

    async def fake_suggest(links):
        assert list(links) == ["team_image_url"]
        return {"team_image_url": {"status": "pending", "image_url": "/api/files/t1"}}

    monkeypatch.setattr(clinics, "suggest_photos", fake_suggest)
    await clinics._run_photo_import("app-1")

    app = db.clinic_applications.docs[0]
    assert app["photo_import"]["status"] == "done"
    assert app["photo_suggestions"]["doctor_spotlight_image_url"]["status"] == "accepted"
    assert app["photo_suggestions"]["team_image_url"]["image_url"] == "/api/files/t1"
