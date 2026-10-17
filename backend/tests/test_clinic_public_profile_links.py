"""Dashboard links to a clinic's public profile on zubite.bg.

The path must match the frontend's `clinicProfileHref`
(`/clinics/[city]/[slug]`), and it must only be returned when the
profile is actually publicly listed — admin and clinic dashboards must never
link to a page that 404s.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import routers.clinics as clinics  # noqa: E402
import routers.public_clinics as public_clinics  # noqa: E402
from schemas import AdminUser  # noqa: E402

ADMIN = AdminUser(id="admin-1", username="ops@zubite.bg")


def _matches(doc, query):
    for key, cond in query.items():
        value = doc.get(key)
        if isinstance(cond, dict):
            if "$in" in cond and value not in cond["$in"]:
                return False
            if "$ne" in cond and value == cond["$ne"]:
                return False
        elif value != cond:
            return False
    return True


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return dict(next(self._it))
        except StopIteration:
            raise StopAsyncIteration

    def sort(self, *_a, **_k):
        return self

    async def to_list(self, _n):
        return [dict(d) for d in self.docs]


class Collection:
    def __init__(self, docs):
        self.docs = docs

    def find(self, query=None, projection=None):
        return Cursor([d for d in self.docs if _matches(d, query or {})])


class FakeDb:
    def __init__(self, clinics_docs=(), applications=()):
        self.clinics = Collection(list(clinics_docs))
        self.clinic_applications = Collection(list(applications))


def _clinic(**extra):
    doc = {
        "id": "clinic-1",
        "clinic_name": "Дентален център Светлина",
        "city": "София",
        "city_slug": "sofia",
        "clinic_status": "active_partner",
        "status": "active",
        "treatments_supported": ["orthodontics", "implants"],
        "email": "c@example.com",
        "phone": "0888",
    }
    doc.update(extra)
    return doc


@pytest.fixture
def use_db(monkeypatch):
    monkeypatch.setattr(public_clinics, "_demo_clinics_enabled", lambda: False)

    def install(db):
        monkeypatch.setattr(public_clinics, "db", db)
        monkeypatch.setattr(clinics, "db", db)
        return db

    return install


def test_path_matches_the_public_route_shape():
    path = public_clinics.public_profile_path(_clinic())
    assert path == "/clinics/sofia/dentalen-tsentar-svetlina"


def test_path_falls_back_like_the_frontend_does():
    # Free-text city only: city resolved from the name, slug derived from the
    # clinic name (the same slug `/public/clinics/{slug}` resolves). The
    # clinic's treatments never appear in the URL.
    doc = _clinic(city_slug=None, city="Пловдив", treatments_supported=["Детска стоматология"])
    path = public_clinics.public_profile_path(doc)
    assert path == "/clinics/plovdiv/dentalen-tsentar-svetlina"


def test_no_path_without_a_city():
    assert public_clinics.public_profile_path(_clinic(city_slug=None, city="")) is None


@pytest.mark.asyncio
async def test_only_publicly_listed_clinics_get_a_link(use_db):
    use_db(FakeDb([
        _clinic(id="live"),
        _clinic(id="new-approved", clinic_status=None),  # approval alone isn't public
        _clinic(id="archived", archived=True),
        _clinic(id="inactive", is_active=False),
        _clinic(id="demo", is_demo=True),
        _clinic(id="applicant", clinic_status="applicant"),
    ]))

    paths = await public_clinics.public_profile_paths(
        ["live", "new-approved", "archived", "inactive", "demo", "applicant"])

    assert set(paths) == {"live"}


@pytest.mark.asyncio
async def test_clinic_sees_its_own_link_once_live(use_db):
    use_db(FakeDb([_clinic()]))
    out = await clinics.clinic_profile(clinic=_clinic())
    assert out["public_profile_path"] == "/clinics/sofia/dentalen-tsentar-svetlina"
    assert out["clinic_name"] == "Дентален център Светлина"


@pytest.mark.asyncio
async def test_clinic_sees_no_link_before_it_is_listed(use_db):
    unlisted = _clinic(clinic_status=None)
    use_db(FakeDb([unlisted]))
    out = await clinics.clinic_profile(clinic=unlisted)
    assert out["public_profile_path"] is None


@pytest.mark.asyncio
async def test_approved_applications_link_to_their_clinic_and_profile(use_db):
    use_db(FakeDb(
        clinics_docs=[
            _clinic(id="c-live", application_id="app-live"),
            _clinic(id="c-hidden", application_id="app-hidden", clinic_status=None),
        ],
        applications=[
            {"id": "app-live", "status": "approved"},
            {"id": "app-hidden", "status": "approved"},
            {"id": "app-pending", "status": "pending"},
        ],
    ))

    result = await clinics.get_clinic_applications(user=ADMIN)
    by_id = {a["id"]: a for a in result["applications"]}

    assert by_id["app-live"]["clinic_id"] == "c-live"
    assert by_id["app-live"]["clinic_public_profile_path"].startswith("/clinics/sofia/")
    assert by_id["app-hidden"]["clinic_id"] == "c-hidden"
    assert by_id["app-hidden"]["clinic_public_profile_path"] is None
    assert "clinic_id" not in by_id["app-pending"]
