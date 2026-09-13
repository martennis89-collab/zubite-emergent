"""Seed 3 demo/preview-only clinics, one per pricing tier.

Run from `/app/backend`:
    python scripts/seed_demo_clinics.py

The records are flagged `is_demo: true`, so they are hidden from real
production traffic unless the backend env var
`ZUBITE_INCLUDE_DEMO_CLINICS=true` is explicitly set. Production
deployments do NOT set that var, so demo clinics never reach real patients
or Google crawls.

Re-running this script is idempotent — it upserts by `id`.
"""
from __future__ import annotations
import sys
sys.path.insert(0, "/app/backend")  # noqa: E402

import asyncio
from datetime import datetime, timezone

from database import db


def _now() -> datetime:
    return datetime.now(timezone.utc)


DEMO_CLINICS = [
    # ─────────────── Tier 1: standard → "Zubite Listed" ───────────────
    {
        "id": "demo-clinic-verified-profile",
        "name": "Zubite Demo Verified Profile Clinic",
        "clinic_name": "Zubite Demo Verified Profile Clinic",
        "city_slug": "sofia",
        "city_name": "София",
        "area": "Лозенец",
        "treatments_supported": ["aligners", "invisalign"],
        "is_active": True,
        "is_demo": True,
        "clinic_status": "active_partner",
        "partner_tier": "standard",
        "online_consultation": False,
        "care_pass_partner": False,
        "accepts_adults": True,
        "accepts_children": False,
        "best_for": [
            "Първа ортодонтска консултация",
            "Пациенти, които сравняват алайнери",
        ],
        "not_ideal_for": [
            "Спешна дентална болка",
            "Импланти и пълно възстановяване",
        ],
        "review_sources_verified_by_admin": True,
        "clinic_profile": {
            "profile_status": "published",
            "short_description": (
                "Малка ортодонтска практика със спокойна атмосфера. "
                "Подходяща за първоначална консултация и ясно обяснение "
                "на следващите стъпки преди лечение."
            ),
            "treatment_focus": ["Алайнери", "Първична ортодонтска консултация"],
            "updated_at": _now(),
        },
        "created_at": _now(),
        "updated_at": _now(),
    },

    # ─────────────── Tier 2: featured → "Zubite Partner" ───────────────
    {
        "id": "demo-clinic-premium-partner",
        "name": "Zubite Demo Premium Partner Clinic",
        "clinic_name": "Zubite Demo Premium Partner Clinic",
        "city_slug": "sofia",
        "city_name": "София",
        "area": "Център",
        "treatments_supported": ["invisalign", "aligners", "implants"],
        "is_active": True,
        "is_demo": True,
        "clinic_status": "active_partner",
        "partner_tier": "featured",
        "online_consultation": True,
        "online_consultation_label": "Тази седмица",
        "care_pass_partner": True,
        "accepts_adults": True,
        "accepts_children": True,
        "best_for": [
            "Възрастни, които обмислят алайнери",
            "Пациенти, които сравняват брекети vs Invisalign",
            "Сложно ортодонтско планиране",
        ],
        "not_ideal_for": [
            "Само спешна дентална помощ",
            "Изключително детска стоматология",
        ],
        "review_sources_verified_by_admin": True,
        "clinic_profile": {
            "profile_status": "published",
            "short_description": (
                "Денталната практика се фокусира върху алайнерно лечение, "
                "ортодонтия за възрастни и комплексно планиране на захапката."
            ),
            "patient_intro": (
                "При първото посещение обясняваме какви опции имаш — алайнери, "
                "брекети, етапи на лечение, очаквана продължителност — без "
                "натиск за решение."
            ),
            "clinic_story": (
                "Екипът работи заедно от 2018 г. с фокус върху ясна "
                "комуникация и предвидим резултат. Имаме интраорален скенер "
                "и собствена 3D работна станция за планиране."
            ),
            "founded_year": 2018,
            "treatment_focus": [
                "Invisalign", "Алайнери", "Ортодонтия за възрастни",
            ],
            # Demo-only aggregate experience used to preview the Growth
            # trust-signal module. The public page identifies the source as
            # clinic-provided, and the demo banner makes clear these are not
            # real-clinic claims.
            "treatment_case_counts": [
                {"treatment": "Invisalign", "completed_cases": 184, "as_of_year": 2026},
                {"treatment": "Алайнери", "completed_cases": 312, "as_of_year": 2026},
                {"treatment": "Импланти", "completed_cases": 96, "as_of_year": 2026},
            ],
            "hero_image_url":
                "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1200",
            "consultation_process": (
                "1. Първоначален разговор и оглед\n"
                "2. Скенер на захапката\n"
                "3. Дискусия на 2-3 възможни плана\n"
                "4. Време за решение — без натиск"
            ),
            "doctor_spotlight_name": "д-р Демо Иванов",
            "doctor_spotlight_kind": "lead_doctor",
            "doctor_spotlight_role": "Ортодонт · Зав. отделение",
            "doctor_spotlight_specialties": [
                "Алайнерно лечение",
                "Ортодонтия за възрастни",
                "Комплексна захапка",
            ],
            "doctor_spotlight_bio": (
                "Специализира алайнерно лечение и ортодонтия за възрастни. "
                "Член на ESLO и активен лектор по случаи с комплексна захапка."
            ),
            "updated_at": _now(),
        },
        "created_at": _now(),
        "updated_at": _now(),
    },

    # ─────────────── Tier 3: premium → "Zubite Featured Partner" ───────────────
    {
        "id": "demo-clinic-authority-partner",
        "name": "Zubite Demo Authority Partner Clinic",
        "clinic_name": "Zubite Demo Authority Partner Clinic",
        "city_slug": "sofia",
        "city_name": "София",
        "area": "Изток",
        "treatments_supported": [
            "invisalign", "aligners", "implants", "full_mouth",
        ],
        "is_active": True,
        "is_demo": True,
        "clinic_status": "active_partner",
        "partner_tier": "premium",
        "online_consultation": True,
        "online_consultation_label": "Тази седмица",
        "care_pass_partner": True,
        "accepts_adults": True,
        "accepts_children": True,
        "best_for": [
            "Сложни ортодонтски и имплантологични случаи",
            "Цялостно възстановяване на захапката",
            "Пациенти, които искат дълъг разговор преди план",
            "Цени от експертно ниво за дългосрочни решения",
        ],
        "not_ideal_for": [
            "Само спешни процедури в извън-работно време",
            "Самостоятелно избелване без оглед",
        ],
        "review_sources_verified_by_admin": True,
        "clinic_profile": {
            "profile_status": "published",
            "short_description": (
                "Authority Partner клиника със задълбочен подход към сложните "
                "случаи: пълна реставрация, имплантология, дигитално планиране, "
                "обяснение стъпка по стъпка."
            ),
            "patient_intro": (
                "Когато случаят е сложен — пълно възстановяване, комбинация от "
                "брекети и импланти, или дългосрочно планиране — нашият екип "
                "сяда с теб за дълъг разговор преди да предложи план."
            ),
            "clinic_story": (
                "Основана през 2009 г. като дигитално-ориентирана дентална "
                "клиника. Имаме собствена CBCT, 3D printer за хирургични "
                "водачи, интраорален скенер и колаборация с външни "
                "ортодонти и протетици за комплексни случаи."
            ),
            "founded_year": 2009,
            "environment_description": (
                "Обширно пространство с 6 кабинета, отделна стая за "
                "консултации, тиха стая за дигитално планиране и собствена "
                "лаборатория за временни протези."
            ),
            "treatment_focus": [
                "Цялостно възстановяване", "Импланти", "Invisalign",
                "Дигитално планиране",
            ],
            # Demo-only aggregate experience; see the Growth profile module.
            "treatment_case_counts": [
                {"treatment": "Импланти", "completed_cases": 428, "as_of_year": 2026},
                {"treatment": "Цялостно възстановяване", "completed_cases": 157, "as_of_year": 2026},
                {"treatment": "Invisalign", "completed_cases": 236, "as_of_year": 2026},
                {"treatment": "Алайнери", "completed_cases": 319, "as_of_year": 2026},
            ],
            "hero_image_url":
                "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200",
            "consultation_process": (
                "1. Дълъг първоначален разговор (45-60 мин)\n"
                "2. Дигитален запис — CBCT, скенер, снимки\n"
                "3. Multi-дисциплинарен преглед от екипа\n"
                "4. Презентация на 2-3 варианта с очаквания и рискове\n"
                "5. Време за решение и второ мнение, ако искаш"
            ),
            "doctor_spotlight_name": "д-р Демо Петров",
            "doctor_spotlight_kind": "owner",
            "doctor_spotlight_role": "Имплантолог · Сертифициран от ITI",
            "doctor_spotlight_specialties": [
                "Комплексна имплантология",
                "Цялостно възстановяване",
                "All-on-4 / All-on-6",
            ],
            "doctor_spotlight_bio": (
                "20+ години опит в комплексна имплантология и пълно "
                "възстановяване. Лектор на ITI Congress 2023. Специализира "
                "случаи с компрометирана кост и all-on-4 / all-on-6 "
                "решения."
            ),
            "case_library": [
                {
                    "id": "demo-case-1",
                    "title": "Алайнерно лечение преди импланти",
                    "category": "Комбинирано лечение",
                    "summary": (
                        "Възрастен пациент с компрометирана захапка. "
                        "8 месеца Invisalign за подравняване, последвани "
                        "от 2 импланта в дисталния регион."
                    ),
                },
                {
                    "id": "demo-case-2",
                    "title": "Пълна реставрация на горна челюст",
                    "category": "All-on-4",
                    "summary": (
                        "Възрастен пациент с тотална обеззъбеност. "
                        "All-on-4 решение, дигитално планирано, "
                        "доставено за един ден."
                    ),
                },
            ],
            "updated_at": _now(),
        },
        "created_at": _now(),
        "updated_at": _now(),
    },
]


async def seed() -> None:
    for c in DEMO_CLINICS:
        # Idempotent upsert keyed on `id`.
        await db.clinics.replace_one({"id": c["id"]}, c, upsert=True)
        print(f"  upserted: {c['id']} ({c['partner_tier']})")
    total = await db.clinics.count_documents({"is_demo": True})
    print(f"Total demo clinics in DB: {total}")


if __name__ == "__main__":
    asyncio.run(seed())
