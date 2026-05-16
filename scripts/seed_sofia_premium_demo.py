"""Demo Premium Clinic Content Setup — Sofia Premium Clinic.

Populates clinic_profile fields with safe, generic Bulgarian demo copy via
the existing admin PATCH /api/admin/clinics/{id} endpoint.

NO code changes. NO new endpoints. NO invented doctor names / images /
videos / Google/Facebook/Superdoc review counts. Local-only execution.

Run:
    python /app/scripts/seed_sofia_premium_demo.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error


API_URL = os.environ.get(
    "API_URL",
    "https://ortho-preview-2.preview.emergentagent.com",
).rstrip("/")
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin@zubite.bg")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "password")
CLINIC_ID = "aa1aa2cd-c794-4f6e-97c3-0e32475925fc"


def http_json(method: str, path: str, *, token: str | None = None,
              body: dict | None = None) -> dict:
    url = f"{API_URL}{path}"
    data = None
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (zubite-demo-seed)",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as exc:
        body_txt = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} {method} {path}: {body_txt}") from exc


def login() -> str:
    res = http_json(
        "POST",
        "/api/admin/login",
        body={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
    )
    token = res.get("access_token")
    if not token:
        raise SystemExit(f"Login failed: {res}")
    return token


def fetch_clinic(token: str) -> dict:
    res = http_json("GET", f"/api/admin/clinics/{CLINIC_ID}", token=token)
    return res["clinic"]


def build_payload(existing: dict) -> dict:
    """Build the PATCH payload. Preserves existing media URLs and nested
    review_sources values rather than overwriting them with None."""
    existing_profile = existing.get("clinic_profile") or {}
    existing_review = existing_profile.get("review_sources") or {}

    clinic_profile = {
        "profile_status": "published",

        "short_description": (
            "Модерна дентална клиника в София с фокус върху ясна "
            "комуникация, подреден процес на консултация и индивидуален "
            "подход към всеки пациент. Екипът помага на пациентите да "
            "разберат възможностите си спокойно и без натиск."
        ),
        "patient_intro": (
            "Подходяща за пациенти, които искат първо да разберат какви "
            "са възможните следващи стъпки — независимо дали става дума "
            "за ортодонтска оценка, алайнери, брекети или по-обща "
            "дентална консултация."
        ),
        "treatment_focus": [
            "Алайнери",
            "Брекети",
            "Ортодонтска консултация",
            "Дигитална диагностика",
            "Детска ортодонтия",
            "Естетична стоматология",
        ],

        # Media: preserve existing values; do NOT invent new ones.
        "hero_image_url": existing_profile.get("hero_image_url"),
        "clinic_video_url": existing_profile.get("clinic_video_url"),
        "doctor_video_url": existing_profile.get("doctor_video_url"),

        # Doctor spotlight: no real doctor data → leave name/role blank.
        "doctor_spotlight_name": existing_profile.get("doctor_spotlight_name"),
        "doctor_spotlight_role": existing_profile.get("doctor_spotlight_role"),
        "doctor_spotlight_bio": (
            "Екипът на клиниката посреща пациентите с фокус върху ясна "
            "комуникация, спокойно обяснение на възможностите и подреден "
            "план за следваща стъпка."
        ),
        "team_note": (
            "Пациентът получава време да зададе въпроси и да разбере "
            "какво е подходящо да се обсъди при реален клиничен преглед."
        ),

        "clinic_story": (
            "Клиниката поставя акцент върху спокойно преживяване, ясни "
            "обяснения и структуриран процес. Целта е пациентът да не "
            "се чувства изгубен между различни варианти, а да разбере "
            "какви са възможните следващи стъпки след професионална оценка."
        ),
        "environment_description": (
            "Средата е създадена така, че пациентът да се чувства спокойно "
            "още от първото посещение. Процесът е подреден, комуникацията "
            "е ясна, а консултацията започва с разбиране на основния повод "
            "и очакванията на пациента."
        ),
        "consultation_process": (
            "Обикновено процесът започва с разговор за основното притеснение "
            "на пациента, преглед на наличния контекст и клинична оценка. "
            "След това се обсъждат възможните варианти и следваща стъпка, "
            "без натиск за незабавно решение."
        ),

        # Review sources: preserve existing nested values only (do NOT invent).
        "review_sources": {
            "google_rating": existing_review.get("google_rating"),
            "google_review_count": existing_review.get("google_review_count"),
            "google_url": existing_review.get("google_url"),
            "facebook_rating": existing_review.get("facebook_rating"),
            "facebook_review_count": existing_review.get("facebook_review_count"),
            "facebook_url": existing_review.get("facebook_url"),
            "superdoc_rating": existing_review.get("superdoc_rating"),
            "superdoc_review_count": existing_review.get("superdoc_review_count"),
            "superdoc_url": existing_review.get("superdoc_url"),
        },

        "case_library": [
            {
                "title": "Ортодонтски случай с фокус върху подреждане",
                "category": "Ортодонтия",
                "summary": (
                    "Примерен структуриран случай, при който пациентът търси "
                    "по-ясна следваща стъпка за подреждане на зъбите. Клиниката "
                    "представя възможностите след преглед и индивидуална оценка."
                ),
                "status": "published",
                "consent_confirmed": True,
            },
            {
                "title": "Консултация за алайнери",
                "category": "Алайнери",
                "summary": (
                    "Пациентът се интересува от по-дискретен вариант за "
                    "ортодонтско лечение. По време на консултацията се "
                    "обсъждат подходящите възможности според конкретния случай."
                ),
                "status": "published",
                "consent_confirmed": True,
            },
            {
                "title": "Първа ортодонтска оценка",
                "category": "Първична консултация",
                "summary": (
                    "Случаят показва как пациент с въпроси за захапка и "
                    "подреждане може да получи структуриран разговор и "
                    "по-ясен план за следваща стъпка."
                ),
                "status": "published",
                "consent_confirmed": True,
            },
        ],
    }

    return {
        "partner_tier": "premium",
        "clinic_profile": clinic_profile,
    }


def main() -> int:
    token = login()
    existing = fetch_clinic(token)
    print(f"BEFORE: partner_tier={existing.get('partner_tier')!r} "
          f"profile_status="
          f"{(existing.get('clinic_profile') or {}).get('profile_status')!r}")

    payload = build_payload(existing)
    res = http_json(
        "PATCH",
        f"/api/admin/clinics/{CLINIC_ID}",
        token=token,
        body=payload,
    )
    clinic = res.get("clinic", {})
    profile = clinic.get("clinic_profile") or {}

    print("AFTER:")
    print(f"  partner_tier        = {clinic.get('partner_tier')!r}")
    print(f"  profile_status      = {profile.get('profile_status')!r}")
    print(f"  short_description   = "
          f"{(profile.get('short_description') or '')[:80]!r}...")
    print(f"  treatment_focus     = {profile.get('treatment_focus')}")
    print(f"  case_library count  = {len(profile.get('case_library') or [])}")
    for i, case in enumerate(profile.get("case_library") or [], 1):
        print(f"    case[{i}] title={case.get('title')!r} "
              f"status={case.get('status')!r} "
              f"consent={case.get('consent_confirmed')}")
    print(f"  hero_image_url      = {profile.get('hero_image_url')!r}")
    print(f"  clinic_video_url    = {profile.get('clinic_video_url')!r}")
    print(f"  doctor_video_url    = {profile.get('doctor_video_url')!r}")
    print(f"  doctor_spotlight    = "
          f"name={profile.get('doctor_spotlight_name')!r} "
          f"role={profile.get('doctor_spotlight_role')!r}")
    rs = profile.get("review_sources") or {}
    print(f"  review_sources.nested = google={rs.get('google_rating')} "
          f"facebook={rs.get('facebook_rating')} "
          f"superdoc={rs.get('superdoc_rating')}")
    print(f"  updated_at          = {profile.get('updated_at')!r}")
    print(f"  published_at        = {profile.get('published_at')!r}")

    # Assertions
    assert clinic.get("partner_tier") == "premium"
    assert profile.get("profile_status") == "published"
    assert (profile.get("case_library") or []) and \
        all(c.get("consent_confirmed") for c in profile["case_library"]
            if c.get("status") == "published"), \
        "All published cases must have consent_confirmed=true"
    print("\nOK — Premium demo content applied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
