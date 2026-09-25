"""Every outgoing email must keep its spaces without relying on newlines.

HTML turns a newline into a space, so a sentence wrapped across source lines
normally reads correctly. Part of the mail path strips newlines instead of
collapsing them, and the words on either side are then glued together: a
clinic invitation arrived reading "профил наДентална клиника", and the
Care Pass summary was reaching patients the same way.

The rule is therefore: keep each run of text on one source line. That is easy
to forget while editing wide markup, so this module renders every sender and
checks the rule mechanically, and refuses to pass if a sender is added without
being covered here.
"""
import asyncio
import inspect
import os
import re
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import emails  # noqa: E402
import resend  # noqa: E402

LEAD = {
    "id": "lead-1",
    "name": "Иван",
    "email": "patient@example.com",
    "phone": "+359888123456",
    "city_slug": "sofia",
    "treatment_type": "aligners",
    "band": "YELLOW",
    "score_total": 50,
    "assigned_clinic_id": "clinic-1",
}


def _visible_text(html: str) -> str:
    """The words a reader actually sees, with runs of whitespace normalised."""
    return " ".join(re.sub(r"<[^>]+>", " ", html).split())


def _depends_on_newlines(html: str) -> bool:
    """True when the text changes depending on how newlines are treated."""
    collapsed = _visible_text(re.sub(r"\n\s*", " ", html))
    stripped = _visible_text(re.sub(r"\n\s*", "", html))
    return collapsed != stripped


# Every sender, with arguments that exercise its longest copy. A sender with
# an optional block that changes the body (Care Pass's magic link) appears
# once per shape, because only the rendered branch can be checked.
def _senders():
    return {
        "send_lead_notification_email": lambda: emails.send_lead_notification_email(LEAD),
        "send_patient_otp_email": lambda: emails.send_patient_otp_email(
            "patient@example.com", "123456"
        ),
        "send_community_answer_email": lambda: emails.send_community_answer_email(
            "patient@example.com",
            question_title="Кървят ли венците при миене?",
            question_slug="krivat-venci",
            answerer_display="Д-р Иванова",
            is_expert=True,
        ),
        "send_lead_confirmation_email": lambda: emails.send_lead_confirmation_email(LEAD),
        "send_quiz_result_email": lambda: emails.send_quiz_result_email(LEAD),
        "send_verification_email": lambda: emails.send_verification_email(
            LEAD, "token123", "https://zubite.bg"
        ),
        "send_verification_flagged_alert": lambda: emails.send_verification_flagged_alert(
            LEAD, "Дентална клиника Тест"
        ),
        "send_clinic_intake_invite_email": lambda: emails.send_clinic_intake_invite_email(
            to_email="clinic@example.com",
            clinic_label="Дентална клиника Тест",
            intake_url="https://zubite.bg/clinic-intake/tok123",
            expires_at="2026-10-18T09:00:00+00:00",
        ),
        "send_clinic_chat_notification": lambda: emails.send_clinic_chat_notification(
            to_email="clinic@example.com", clinic_name="Дентална клиника Тест"
        ),
        "send_admin_selected_clinic_request_alert": lambda: emails.send_admin_selected_clinic_request_alert(
            request_id="r1",
            lead_id="lead-1",
            patient_name="Иван",
            patient_phone="+359888123456",
            patient_city="sofia",
            treatment_interest="aligners",
            clinic_id="clinic-1",
            clinic_name="Дентална клиника Тест",
            source="recommended_clinics_flow",
            created_at="2026-09-21T09:00:00+00:00",
        ),
        "send_admin_assisted_choice_request_alert": lambda: emails.send_admin_assisted_choice_request_alert(
            request_id="r2",
            lead_id="lead-1",
            patient_name="Иван",
            patient_phone="+359888123456",
            patient_city="sofia",
            treatment_interest="aligners",
            patient_message="Имам въпрос за цената.",
            source="assisted_choice_flow",
            created_at="2026-09-21T09:00:00+00:00",
        ),
        "send_care_pass_summary_email": lambda: emails.send_care_pass_summary_email(
            to_email="patient@example.com",
            name="Иван",
            band="YELLOW",
            city_slug="sofia",
            treatment_type="aligners",
        ),
        "send_care_pass_summary_email (magic link)": lambda: emails.send_care_pass_summary_email(
            to_email="patient@example.com",
            name="Иван",
            band="RED",
            city_slug="sofia",
            treatment_type="aligners",
            access_token="tok123",
        ),
        "send_contact_message_emails": lambda: emails.send_contact_message_emails(
            {
                "name": "Иван",
                "email": "patient@example.com",
                "message": "Здравейте, имам въпрос.",
            }
        ),
    }


@pytest.fixture
def rendered(monkeypatch):
    """Render a sender's HTML instead of sending it.

    Senders reach Resend two ways — through _send_email and directly via
    resend.Emails.send — so both are intercepted.
    """
    captured: list[str] = []

    async def _fake_send_email(to, subject, html, **_kwargs):
        captured.append(html)
        return True

    def _fake_resend(params):
        captured.append(params.get("html", ""))
        return {"id": "test"}

    monkeypatch.setattr(emails, "RESEND_API_KEY", "test-key")
    monkeypatch.setattr(emails, "ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setattr(emails, "_send_email", _fake_send_email)
    monkeypatch.setattr(resend.Emails, "send", staticmethod(_fake_resend))

    def _run(call):
        captured.clear()
        asyncio.get_event_loop_policy().new_event_loop().run_until_complete(call())
        return list(captured)

    return _run


@pytest.mark.parametrize("name", sorted(_senders()))
def test_email_keeps_its_spaces_without_newlines(name, rendered):
    bodies = rendered(_senders()[name])
    assert bodies, f"{name} produced no HTML — the test's arguments are wrong"
    for html in bodies:
        assert not _depends_on_newlines(html), (
            f"{name} wraps a sentence across source lines, so stripping "
            "newlines glues words together. Keep each run of text on one line."
        )


def test_every_sender_is_covered_here():
    """A new email must be added to this module, not quietly skipped.

    Without this, the check above silently stops protecting anything the day
    someone adds a sender.
    """
    covered = {name.split(" ")[0] for name in _senders()}
    defined = {
        name
        for name, obj in inspect.getmembers(emails, inspect.isfunction)
        if name.startswith("send_") and obj.__module__ == emails.__name__
    }
    missing = defined - covered
    assert not missing, (
        f"these senders are not covered by the word-spacing check: {sorted(missing)}"
    )
