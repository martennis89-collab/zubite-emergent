"""Phase C2 — seed the dedicated visual add-ons showcase clinic.

This is a sales / QA / demo-only asset. The clinic is:
  • `is_demo: True` + `is_addons_showcase: True` so listing endpoints
    hide it (the showcase flag is filtered ALWAYS, regardless of the
    ZUBITE_INCLUDE_DEMO_CLINICS preview gate).
  • `_is_clinic_visible` already blocks any `is_demo` clinic from
    quiz-driven recommendations.
  • Direct URL `/kliniki/sofia/<specialty>/<slug>` resolves only when
    the preview env enables demo clinics; in production the lookup
    returns 404. Either way, sitemap.ts never lists `/kliniki/*` so
    Google can't crawl into it.

Run from `/app/backend`:
    python scripts/seed_addons_showcase.py
"""
from __future__ import annotations
import sys
sys.path.insert(0, "/app/backend")  # noqa: E402

import asyncio
from datetime import datetime, timezone

from database import db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


SHOWCASE_CLINIC: dict = {
    "id": "demo-clinic-addons-showcase",
    "name": "Zubite Демо Клиника — Визуален пакет",
    "clinic_name": "Zubite Демо Клиника — Визуален пакет",
    "city_slug": "sofia",
    "city_name": "София",
    "area": "Лозенец",
    "treatments_supported": [
        "invisalign", "aligners", "implants", "full_mouth", "cosmetic",
    ],
    "is_active": True,
    "is_demo": True,
    "is_addons_showcase": True,
    "clinic_status": "active_partner",
    "subscription_status": "active",
    "partner_tier": "premium",  # Authority Partner in the public mapping
    "online_consultation": True,
    "online_consultation_label": "Тази седмица",
    "care_pass_partner": True,
    "accepts_adults": True,
    "accepts_children": True,
    "is_sponsored": True,
    "sponsored_label": "Спонсорирано",
    "best_for": [
        "Демонстрация на пълния визуален пакет",
        "Авторити кейсове, дигитално планиране, видео представяне",
        "Sales / QA / partner onboarding preview",
    ],
    "not_ideal_for": [
        "Реално насочване на пациенти — това е демо профил",
    ],
    "review_sources_verified_by_admin": True,
    "clinic_profile": {
        "profile_status": "published",
        "short_description": (
            "Това е демонстрационен профил, който показва всички визуални "
            "партньорски add-on модули. Данните са примерни и не "
            "представят реална клиника."
        ),
        "patient_intro": (
            "В реален Authority Partner профил тук виждаш кратко "
            "обяснение от клиниката за това как протича първата "
            "консултация и какви очаквания да имаш."
        ),
        "treatment_focus": [
            "Invisalign", "Алайнери", "Импланти", "Цялостно възстановяване",
        ],
        "hero_image_url":
            "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1600",
        "clinic_video_url":
            "https://example.com/zubite-demo-clinic-tour",
        "doctor_video_url":
            "https://example.com/zubite-demo-doctor-intro",
        "doctor_spotlight_name": "д-р Демо Иванов",
        "doctor_spotlight_role": "Имплантолог · Сертифициран от ITI",
        "doctor_spotlight_bio": (
            "Демонстрационна биография: 20+ години опит в комплексна "
            "имплантология и пълно възстановяване. (Това е примерен "
            "текст за визуализация на блока, не реален лекар.)"
        ),
        "team_note": (
            "Демо: екипът работи заедно с външни ортодонти и протетици "
            "за комплексни случаи."
        ),
        "clinic_story": (
            "Демонстрационна история на клиниката. В реален Authority "
            "Partner профил тук стои разказ за основаването, екипа и "
            "подхода — споделен от клиниката и прегледан от Zubite."
        ),
        "environment_description": (
            "Демо: обширно пространство с 6 кабинета, отделна стая за "
            "консултации и дигитално планиране."
        ),
        "philosophy": (
            "Демонстрационна философия: дълъг разговор преди план, "
            "втора оценка по желание, без натиск за решение."
        ),
        "consultation_process": (
            "1. Първоначален разговор и оглед\n"
            "2. Дигитален запис — скенер, снимки\n"
            "3. Multi-дисциплинарен преглед от екипа\n"
            "4. Презентация на 2-3 варианта с очаквания и рискове\n"
            "5. Време за решение и второ мнение, ако искаш"
        ),
        "category_authority": (
            "Демо: примерно позициониране на клиниката в специфична "
            "категория — напр. „Известна с комплексни ортодонтски случаи "
            "и пълно възстановяване с имплантология“."
        ),
        "technology_section": [
            "Интраорален скенер — дигитални отпечатъци за прецизни планове.",
            "CBCT — 3D диагностика за имплантологични случаи.",
            "3D printer за хирургични водачи и временни конструкции.",
            "Дигитално планиране с smile design софтуер.",
        ],
        "expert_qa": [
            {
                "question": "Колко често са контролните прегледи при алайнерно лечение?",
                "answer": (
                    "Демо отговор: обикновено на 6-8 седмици, с дистанционни "
                    "снимки между визитите. Това е примерен експертен "
                    "отговор, не клинична препоръка."
                ),
            },
            {
                "question": "Какво се случва, ако алайнерът се счупи?",
                "answer": (
                    "Демо отговор: продължаваш с предишния алайнер и "
                    "клиниката доставя замяна. Това е примерен текст."
                ),
            },
            {
                "question": "Колко продължава лечение с импланти?",
                "answer": (
                    "Демо отговор: обикновено 3-6 месеца от поставяне до "
                    "финална корона. Това е примерен текст за визуализация."
                ),
            },
        ],
        "faq": [
            {
                "question": "Колко струва първата консултация?",
                "answer": "Демо отговор. Реална цена се определя от клиниката.",
            },
            {
                "question": "Приемате ли деца?",
                "answer": "Демо отговор. Реална политика се определя от клиниката.",
            },
        ],
        "price_ranges": [
            {"treatment": "invisalign", "price_from": 4500, "price_to": 7500,
             "currency": "BGN", "note": "демо ориентир — реалната цена зависи от случая"},
            {"treatment": "implants", "price_from": 2200, "price_to": 3500,
             "currency": "BGN", "note": "демо ориентир — без корона"},
            {"treatment": "full_mouth", "price_from": 15000, "price_to": 35000,
             "currency": "BGN", "note": "демо ориентир — широк диапазон"},
        ],
        "treatment_details": {
            "invisalign": {
                "who_for": (
                    "Демо: възрастни с леки до средни ортодонтски случаи "
                    "и тийнейджъри над 14 г."
                ),
                "remote_start_possible": True,
                "note": "Първоначална консултация може да започне дистанционно.",
            },
            "implants": {
                "who_for": "Демо: пациенти с липсващи или компрометирани зъби.",
                "remote_start_possible": False,
                "note": "Изисква CBCT и оглед на място.",
            },
            "full_mouth": {
                "who_for": "Демо: комплексни случаи с компрометирана захапка.",
                "remote_start_possible": False,
                "note": "Multi-дисциплинарен преглед задължителен.",
            },
        },
        "case_library": [
            {
                "id": "demo-case-1",
                "title": "Алайнерно лечение преди импланти",
                "category": "Комбинирано лечение",
                "summary": (
                    "Демо случай: възрастен пациент с компрометирана захапка. "
                    "8 месеца Invisalign за подравняване, последвани от 2 "
                    "импланта. Това е примерен текст с потвърдено демо съгласие."
                ),
                "status": "published",
                "consent_confirmed": True,
            },
            {
                "id": "demo-case-2",
                "title": "Пълна реставрация на горна челюст",
                "category": "All-on-4",
                "summary": (
                    "Демо случай: All-on-4 решение, дигитално планирано, "
                    "доставено за един ден. Това е примерен текст."
                ),
                "status": "published",
                "consent_confirmed": True,
            },
        ],
        "published_at": _now(),
        "updated_at": _now(),
    },
    "created_at": _now(),
    "updated_at": _now(),
}


async def seed() -> None:
    await db.clinics.replace_one(
        {"id": SHOWCASE_CLINIC["id"]}, SHOWCASE_CLINIC, upsert=True,
    )
    print(f"  upserted showcase: {SHOWCASE_CLINIC['id']}")
    total = await db.clinics.count_documents({"is_addons_showcase": True})
    print(f"Total addons-showcase clinics in DB: {total}")


if __name__ == "__main__":
    asyncio.run(seed())
