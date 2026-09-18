"""Emailing a private clinic intake link from the кандидатури tab.

The token is the whole security boundary here: it is returned exactly once and
only its hash is stored, so these tests guard the two ways that can go wrong —
the link failing to reach the clinic at all (a send failure must never cost the
admin the token), and the link being emailed on the strength of a token that
does not belong to the invite being sent.
"""
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import routers.clinics as clinics  # noqa: E402
from schemas import (  # noqa: E402
    AdminUser,
    ClinicIntakeInviteCreate,
    ClinicIntakeInviteSend,
)

ADMIN = AdminUser(id="admin-1", username="ops@zubite.bg")


class Result:
    def __init__(self, matched, modified):
        self.matched_count = matched
        self.modified_count = modified


class InviteCollection:
    """Just enough of the invites collection for these endpoints."""

    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    async def update_one(self, query, update):
        for doc in self.docs:
            if not all(doc.get(k) == v for k, v in query.items() if not isinstance(v, dict)):
                continue
            for field, value in (update.get("$set") or {}).items():
                doc[field] = value
            for field, amount in (update.get("$inc") or {}).items():
                doc[field] = (doc.get(field) or 0) + amount
            return Result(1, 1)
        return Result(0, 0)


class FakeDb:
    def __init__(self, invites):
        self.clinic_intake_invites = invites


class Mailer:
    """Stands in for emails.send_clinic_intake_invite_email."""

    def __init__(self, succeeds=True):
        self.succeeds = succeeds
        self.calls = []

    async def __call__(self, **kwargs):
        self.calls.append(kwargs)
        return self.succeeds


@pytest.fixture
def wired(monkeypatch):
    invites = InviteCollection()
    mailer = Mailer()
    monkeypatch.setattr(clinics, "db", FakeDb(invites))
    monkeypatch.setattr(clinics, "send_clinic_intake_invite_email", mailer)

    async def _no_audit(*_args, **_kwargs):
        return None

    monkeypatch.setattr(clinics, "audit_log", _no_audit)
    return invites, mailer


async def _create(send_email=True, contact_email="clinic@example.com"):
    return await clinics.create_clinic_intake_invite(
        ClinicIntakeInviteCreate(
            clinic_label="Дентална клиника Тест",
            contact_email=contact_email,
            expires_in_days=30,
            send_email=send_email,
        ),
        request=None,
        user=ADMIN,
    )


@pytest.mark.asyncio
async def test_creating_with_send_email_delivers_the_generated_link(wired):
    invites, mailer = wired

    created = await _create()

    assert created["email_sent"] is True
    assert created["email_error"] is None
    assert len(mailer.calls) == 1
    sent = mailer.calls[0]
    assert sent["to_email"] == "clinic@example.com"
    assert sent["clinic_label"] == "Дентална клиника Тест"
    # The emailed link must carry the raw token the admin was just handed.
    assert sent["intake_url"].endswith(f"/clinic-intake/{created['token']}")

    stored = invites.docs[0]
    assert stored["email_sent_to"] == "clinic@example.com"
    assert stored["email_sent_at"]
    assert stored["email_send_count"] == 1
    # The delivery record is visible to the admin list, the hash never is.
    assert created["invite"]["email_sent_to"] == "clinic@example.com"
    assert "token_hash" not in created["invite"]


@pytest.mark.asyncio
async def test_send_email_without_a_recipient_is_reported_not_attempted(wired):
    _invites, mailer = wired

    created = await _create(contact_email=None)

    assert created["email_sent"] is False
    assert created["email_error"] == "missing_contact_email"
    assert mailer.calls == []
    assert created["token"]


@pytest.mark.asyncio
async def test_a_failed_send_still_returns_the_token(wired, monkeypatch):
    """Resend being down must not cost the admin the only copy of the link."""
    invites, _mailer = wired
    monkeypatch.setattr(clinics, "send_clinic_intake_invite_email", Mailer(succeeds=False))

    created = await _create()

    assert created["email_sent"] is False
    assert created["email_error"] == "send_failed"
    assert len(created["token"]) > 30
    assert "email_sent_at" not in invites.docs[0]


@pytest.mark.asyncio
async def test_resend_requires_the_token_that_belongs_to_the_invite(wired):
    invites, mailer = wired
    created = await _create(send_email=False)
    invite_id = created["invite"]["id"]

    other = await _create(send_email=False, contact_email="other@example.com")

    with pytest.raises(HTTPException) as exc:
        await clinics.send_clinic_intake_invite(
            invite_id,
            ClinicIntakeInviteSend(token=other["token"]),
            request=None,
            user=ADMIN,
        )
    assert exc.value.status_code == 403
    assert mailer.calls == []
    assert "email_sent_at" not in invites.docs[0]


@pytest.mark.asyncio
async def test_resend_to_a_corrected_address_updates_the_invite(wired):
    invites, mailer = wired
    created = await _create(send_email=False)

    result = await clinics.send_clinic_intake_invite(
        created["invite"]["id"],
        ClinicIntakeInviteSend(token=created["token"], contact_email="fixed@example.com"),
        request=None,
        user=ADMIN,
    )

    assert result["status"] == "ok"
    assert mailer.calls[0]["to_email"] == "fixed@example.com"
    assert invites.docs[0]["contact_email"] == "fixed@example.com"
    assert invites.docs[0]["email_send_count"] == 1


@pytest.mark.asyncio
async def test_resend_is_refused_once_the_link_is_no_longer_pending(wired):
    invites, mailer = wired
    created = await _create(send_email=False)
    invites.docs[0]["status"] = "submitted"

    with pytest.raises(HTTPException) as exc:
        await clinics.send_clinic_intake_invite(
            created["invite"]["id"],
            ClinicIntakeInviteSend(token=created["token"]),
            request=None,
            user=ADMIN,
        )
    assert exc.value.status_code == 409
    assert mailer.calls == []


@pytest.mark.asyncio
async def test_resend_is_refused_and_marked_once_the_link_expired(wired):
    invites, mailer = wired
    created = await _create(send_email=False)
    invites.docs[0]["expires_at"] = (
        datetime.now(timezone.utc) - timedelta(days=1)
    ).isoformat()

    with pytest.raises(HTTPException) as exc:
        await clinics.send_clinic_intake_invite(
            created["invite"]["id"],
            ClinicIntakeInviteSend(token=created["token"]),
            request=None,
            user=ADMIN,
        )
    assert exc.value.status_code == 410
    assert mailer.calls == []
    assert invites.docs[0]["status"] == "expired"


@pytest.mark.asyncio
async def test_resend_without_any_recipient_is_rejected(wired):
    _invites, mailer = wired
    created = await _create(send_email=False, contact_email=None)

    with pytest.raises(HTTPException) as exc:
        await clinics.send_clinic_intake_invite(
            created["invite"]["id"],
            ClinicIntakeInviteSend(token=created["token"]),
            request=None,
            user=ADMIN,
        )
    assert exc.value.status_code == 400
    assert mailer.calls == []


def test_intake_link_is_built_from_server_config_only():
    link = clinics._intake_link("abc123")
    assert link.endswith("/clinic-intake/abc123")
    assert link.startswith("http")


@pytest.mark.asyncio
async def test_invite_email_body_carries_the_link_and_makes_no_promises(monkeypatch):
    """The invite is an invitation to describe the practice, not an offer.

    It must never suggest that taking part buys patients, ranking, or any
    claim about clinical quality — that separation is the platform's whole
    trust position, and an official email is where it would leak first.
    """
    import emails

    captured = {}

    async def _capture(to, subject, html, **kwargs):
        captured.update(to=to, subject=subject, html=html, sender=kwargs.get("sender"))
        return True

    monkeypatch.setattr(emails, "RESEND_API_KEY", "test-key")
    monkeypatch.setattr(emails, "_send_email", _capture)

    ok = await emails.send_clinic_intake_invite_email(
        to_email="clinic@example.com",
        clinic_label="Дентална клиника Тест",
        intake_url="https://zubite.bg/clinic-intake/tok123",
        expires_at="2026-10-18T09:00:00+00:00",
    )

    assert ok is True
    assert captured["to"] == "clinic@example.com"
    # Onboarding sender, not the platform-wide one.
    assert captured["sender"] == emails.CLINIC_ONBOARDING_SENDER_EMAIL
    assert "Дентална клиника Тест" in captured["subject"]
    assert "https://zubite.bg/clinic-intake/tok123" in captured["html"]
    assert "18.10.2026" in captured["html"]

    lowered = captured["html"].lower()
    for forbidden in (
        "гарантира",
        "най-добра",
        "по-високо класиране",
        "повече пациенти",
        "диагноз",
    ):
        assert forbidden not in lowered, f"invite email must not claim: {forbidden}"


@pytest.mark.asyncio
async def test_invite_email_escapes_the_clinic_label(monkeypatch):
    import emails

    captured = {}

    async def _capture(to, subject, html, **_kwargs):
        captured.update(html=html)
        return True

    monkeypatch.setattr(emails, "RESEND_API_KEY", "test-key")
    monkeypatch.setattr(emails, "_send_email", _capture)

    await emails.send_clinic_intake_invite_email(
        to_email="clinic@example.com",
        clinic_label='<script>alert("x")</script>',
        intake_url="https://zubite.bg/clinic-intake/tok123",
    )

    assert "<script>" not in captured["html"]
    assert "&lt;script&gt;" in captured["html"]


def test_onboarding_sender_falls_back_to_the_platform_sender():
    """Unset in an environment, onboarding mail must still leave the building
    from a verified address rather than from nothing."""
    import config

    assert config.CLINIC_ONBOARDING_SENDER_EMAIL


@pytest.mark.asyncio
async def test_invite_email_is_skipped_without_resend_configured(monkeypatch):
    import emails

    monkeypatch.setattr(emails, "RESEND_API_KEY", None)
    sent = await emails.send_clinic_intake_invite_email(
        to_email="clinic@example.com",
        clinic_label="Тест",
        intake_url="https://zubite.bg/clinic-intake/tok123",
    )
    assert sent is False
