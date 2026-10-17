"""Admin-issued clinic passwords are temporary and must be replaced on first login.

Every path that hands a clinic a password (approval email, regenerate from
кандидатури, admin reset, admin-created account) marks the account
`must_change_password`; every clinic endpoint then refuses it with
403 `password_change_required` until /clinic/change-password clears the flag.
"""
import os
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import auth  # noqa: E402
import routers.clinics as clinics  # noqa: E402
from auth import hash_password, verify_password  # noqa: E402
from schemas import AdminUser, ClinicPasswordChange  # noqa: E402

ADMIN = AdminUser(id="admin-1", username="ops@zubite.bg")


class Result:
    def __init__(self, matched):
        self.matched_count = matched
        self.modified_count = matched


class Collection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    @staticmethod
    def _match(doc, query):
        for k, v in query.items():
            if isinstance(v, dict) and "$exists" in v:
                if (k in doc) != v["$exists"]:
                    return False
            elif doc.get(k) != v:
                return False
        return True

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if self._match(doc, query):
                return dict(doc)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_one(self, query, update):
        for doc in self.docs:
            if self._match(doc, query):
                doc.update(update.get("$set") or {})
                return Result(1)
        return Result(0)


class FakeDb:
    def __init__(self, clinics_docs=(), applications=()):
        self.clinics = Collection(clinics_docs)
        self.clinic_applications = Collection(applications)


class Mailer:
    def __init__(self, ok=True):
        self.ok = ok
        self.calls = []

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        return self.ok


@pytest.fixture
def wired(monkeypatch):
    async def _no_audit(*_a, **_k):
        return None

    monkeypatch.setattr(clinics, "audit_log", _no_audit)
    mailer = Mailer()
    monkeypatch.setattr(clinics, "_send_clinic_credentials_email", mailer)

    def install(db):
        monkeypatch.setattr(clinics, "db", db)
        return db

    return install, mailer


def _clinic(**extra):
    doc = {
        "id": "clinic-1", "clinic_name": "Клиника Тест", "city": "София",
        "email": "clinic@example.com", "phone": "0888", "status": "active",
        "password_hash": hash_password("temporary-1"),
    }
    doc.update(extra)
    return doc


# ─── The gate ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_portal_endpoints_refuse_a_clinic_with_a_temporary_password(monkeypatch):
    async def _resolved(_request, _credentials):
        return _clinic(must_change_password=True)

    monkeypatch.setattr(auth, "get_current_clinic_pending_password", _resolved)

    with pytest.raises(HTTPException) as exc:
        await auth.get_current_clinic(request=None, credentials=None)

    assert exc.value.status_code == 403
    assert exc.value.detail["code"] == "password_change_required"


@pytest.mark.asyncio
@pytest.mark.parametrize("flag", [False, None])
async def test_portal_endpoints_admit_a_clinic_with_its_own_password(monkeypatch, flag):
    async def _resolved(_request, _credentials):
        doc = _clinic()
        if flag is not None:
            doc["must_change_password"] = flag
        return doc

    monkeypatch.setattr(auth, "get_current_clinic_pending_password", _resolved)

    clinic = await auth.get_current_clinic(request=None, credentials=None)

    assert clinic["id"] == "clinic-1"


def test_login_payload_tells_the_portal_to_ask_for_a_new_password():
    assert clinics._clinic_to_out(_clinic(must_change_password=True)).must_change_password is True
    # Existing clinics never had the field: they are not forced.
    assert clinics._clinic_to_out(_clinic()).must_change_password is False


# ─── Setting the clinic's own password ─────────────────────────


@pytest.mark.asyncio
async def test_change_password_replaces_the_temporary_one_and_lifts_the_gate(wired):
    install, _mailer = wired
    db = install(FakeDb([_clinic(must_change_password=True)]))

    result = await clinics.clinic_change_password(
        ClinicPasswordChange(current_password="temporary-1", new_password="my-own-pass-9"),
        request=None,
        clinic={"id": "clinic-1"},
    )

    stored = db.clinics.docs[0]
    assert result["status"] == "ok"
    assert stored["must_change_password"] is False
    assert stored["password_changed_at"]
    assert verify_password("my-own-pass-9", stored["password_hash"])
    assert not verify_password("temporary-1", stored["password_hash"])


@pytest.mark.asyncio
async def test_change_password_rejects_reusing_the_temporary_password(wired):
    install, _mailer = wired
    db = install(FakeDb([_clinic(must_change_password=True)]))

    with pytest.raises(HTTPException) as exc:
        await clinics.clinic_change_password(
            ClinicPasswordChange(current_password="temporary-1", new_password="temporary-1"),
            request=None,
            clinic={"id": "clinic-1"},
        )

    assert exc.value.status_code == 400
    assert db.clinics.docs[0]["must_change_password"] is True


@pytest.mark.asyncio
async def test_change_password_still_requires_the_current_password(wired):
    install, _mailer = wired
    db = install(FakeDb([_clinic(must_change_password=True)]))

    with pytest.raises(HTTPException) as exc:
        await clinics.clinic_change_password(
            ClinicPasswordChange(current_password="wrong-guess", new_password="my-own-pass-9"),
            request=None,
            clinic={"id": "clinic-1"},
        )

    assert exc.value.status_code == 400
    assert db.clinics.docs[0]["must_change_password"] is True


# ─── Every admin-issued password is temporary ──────────────────


@pytest.mark.asyncio
async def test_approving_an_application_creates_a_must_change_account_and_emails_it(wired):
    install, mailer = wired
    application = {
        "id": "app-1", "status": "pending", "clinic_name": "Клиника Нова",
        "city": "София", "email": "New@Example.com", "phone": "0888",
    }
    db = install(FakeDb(applications=[application]))

    response = await clinics.update_clinic_application(
        "app-1", {"status": "approved"}, request=None, user=ADMIN)

    created = db.clinics.docs[0]
    assert created["must_change_password"] is True
    assert response["email_sent"] is True
    sent = mailer.calls[0]
    assert sent["kind"] == "welcome"
    assert sent["email"] == "New@Example.com"
    assert verify_password(sent["password"], created["password_hash"])
    assert response["clinic_credentials"]["temporary_password"] == sent["password"]


@pytest.mark.asyncio
async def test_a_failed_welcome_email_is_reported_to_the_admin(wired, monkeypatch):
    install, _mailer = wired
    monkeypatch.setattr(clinics, "_send_clinic_credentials_email", Mailer(ok=False))
    application = {
        "id": "app-1", "status": "pending", "clinic_name": "Клиника Нова",
        "city": "София", "email": "new@example.com", "phone": "0888",
    }
    install(FakeDb(applications=[application]))

    response = await clinics.update_clinic_application(
        "app-1", {"status": "approved"}, request=None, user=ADMIN)

    assert response["email_sent"] is False
    assert response["clinic_credentials"]["temporary_password"]


@pytest.mark.asyncio
async def test_regenerating_from_the_application_makes_the_password_temporary_again(wired):
    install, mailer = wired
    db = install(FakeDb([_clinic(application_id="app-1", must_change_password=False)]))

    result = await clinics.regenerate_clinic_password_by_app("app-1", request=None, user=ADMIN)

    stored = db.clinics.docs[0]
    assert stored["must_change_password"] is True
    assert verify_password(result["credentials"]["password"], stored["password_hash"])
    assert mailer.calls[0]["kind"] == "reset"


@pytest.mark.asyncio
async def test_admin_reset_makes_the_password_temporary_again(wired):
    install, mailer = wired
    db = install(FakeDb([_clinic(must_change_password=False)]))

    result = await clinics.admin_reset_clinic_password("clinic-1", request=None, user=ADMIN)

    stored = db.clinics.docs[0]
    assert stored["must_change_password"] is True
    assert verify_password(result["credentials"]["password"], stored["password_hash"])
    assert mailer.calls[0]["kind"] == "reset"


# ─── The email itself ───────────────────────────────────────────


@pytest.mark.parametrize("kind", ["welcome", "reset"])
def test_credentials_email_explains_the_mandatory_change_and_links_to_production(monkeypatch, kind):
    monkeypatch.setattr(clinics, "PRODUCTION_URL", "https://zubite.bg")

    body = clinics._clinic_credentials_email_html(
        kind=kind, clinic_name="Клиника <script>", email="c@example.com", password="Tmp-123_x")

    assert "Временна парола" in body
    assert "ще ви помолим да зададете своя парола" in body
    assert 'href="https://zubite.bg/clinic"' in body
    assert "Tmp-123_x" in body
    # Clinic names come from a public form, so they are escaped.
    assert "<script>" not in body
    assert "Клиника &lt;script&gt;" in body


def test_credentials_email_is_not_attempted_without_resend(monkeypatch):
    monkeypatch.setattr(clinics, "RESEND_API_KEY", "")
    assert clinics._send_clinic_credentials_email(
        kind="welcome", clinic_name="X", email="c@example.com", password="p") is False
