"""An approved кандидатура must land in the public /clinics catalog.

Approval used to create the clinic without `clinic_status`, and the public
visibility query only admits a set of partner statuses — so approved clinics
never appeared and the admin had no control to fix it. Premium partners were
also missing from the public statuses.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import routers.clinics as clinics  # noqa: E402
import routers.public as public  # noqa: E402
import routers.public_clinics as public_clinics  # noqa: E402
from schemas import AdminUser  # noqa: E402

ADMIN = AdminUser(id="admin-1", username="ops@zubite.bg")


class Result:
    matched_count = modified_count = 1


class Collection:
    def __init__(self, docs=()):
        self.docs = [dict(d) for d in docs]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(update.get("$set") or {})
        return Result()


class FakeDb:
    def __init__(self, applications):
        self.clinics = Collection()
        self.clinic_applications = Collection(applications)


@pytest.fixture
def approved_clinic(monkeypatch):
    async def _no_audit(*_a, **_k):
        return None

    monkeypatch.setattr(clinics, "audit_log", _no_audit)
    monkeypatch.setattr(clinics, "_send_clinic_credentials_email", lambda **_k: True)
    db = FakeDb([{
        "id": "app-1", "status": "pending", "clinic_name": "Клиника Нова",
        "city": "Пловдив", "email": "new@example.com", "phone": "0888",
    }])
    monkeypatch.setattr(clinics, "db", db)

    async def _approve():
        await clinics.update_clinic_application(
            "app-1", {"status": "approved"}, request=None, user=ADMIN)
        return db.clinics.docs[0]

    return _approve


@pytest.mark.asyncio
async def test_approved_clinic_matches_the_public_visibility_query(approved_clinic):
    clinic = await approved_clinic()
    query = public_clinics._public_visibility_query()

    assert clinic["clinic_status"] in query["clinic_status"]["$in"]
    assert clinic.get("archived") is not True
    assert clinic["is_active"] is True


@pytest.mark.asyncio
async def test_approved_clinic_carries_the_catalog_name_and_city(approved_clinic):
    clinic = await approved_clinic()

    assert clinic["name"] == "Клиника Нова"
    assert clinic["city_slug"] == "plovdiv"
    payload = public_clinics._public_clinic_payload(clinic, set())
    assert payload["name"] == "Клиника Нова"
    assert payload["city_slug"] == "plovdiv"


def test_premium_partners_are_public_everywhere():
    assert "premium_partner" in public_clinics._PUBLIC_STATUSES
    assert "premium_partner" in public._VISIBLE_CLINIC_STATUSES


@pytest.mark.parametrize("status", ["probation", "waiting_list", "inactive"])
def test_hidden_statuses_stay_out_of_the_catalog(status):
    assert status not in public_clinics._PUBLIC_STATUSES
    assert status not in public._VISIBLE_CLINIC_STATUSES
