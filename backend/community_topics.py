"""Общност (Q&A) topic taxonomy.

Patient-friendly topics for the community. Each maps to the relevant
educational surface (`/treatments/*`, `/symptoms`, `/blog`) so a question
page can cross-link and compound SEO. Slugs are English (URL convention);
labels/descriptions are Bulgarian (UI copy).

Kept as a small static list on purpose — topics change rarely and a fixed
set keeps the browse taxonomy clean. `related_path` is a frontend route.

`related_treatments` maps a topic to the `clinics.treatments_supported`
tags (see `backend/routers/clinics.py` — values like "implants",
"invisalign", "braces", "veneers", "whitening", "full_mouth") used to route
questions into a clinic's "Въпроси за отговор" queue (Phase 3). An empty
list means the topic is general — every active clinic can see it, since
the treatment vocabulary has no matching tag (pain/symptoms, children,
gums, hygiene, TMJ, other).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

# order == display order on the community home
COMMUNITY_TOPICS: List[Dict[str, Any]] = [
    {
        "slug": "implants",
        "label": "Импланти",
        "description": "Зъбни импланти, костна пластика, синус лифт, цени и възстановяване.",
        "related_path": "/implants",
        "related_treatments": ["implants"],
    },
    {
        "slug": "braces-aligners",
        "label": "Брекети и алайнери",
        "description": "Ортодонтия при възрастни и деца — брекети, Invisalign, прозрачни алайнери.",
        "related_path": "/braces",
        "related_treatments": ["invisalign", "braces", "orthodontics"],
    },
    {
        "slug": "aesthetic",
        "label": "Естетична стоматология",
        "description": "Фасети, избелване, естетични възстановявания и усмивка.",
        "related_path": "/cosmetic-dentistry",
        "related_treatments": ["veneers", "whitening"],
    },
    {
        "slug": "pain-symptoms",
        "label": "Болка и симптоми",
        "description": "Зъбобол, чувствителност, подуване — какво може да означава и кога да се потърси помощ.",
        "related_path": "/symptoms",
        "related_treatments": [],
    },
    {
        "slug": "children",
        "label": "Детска стоматология",
        "description": "Млечни зъби, никнене, профилактика и лечение при деца.",
        "related_path": "/treatments",
        "related_treatments": [],
    },
    {
        "slug": "gums",
        "label": "Венци и пародонтоза",
        "description": "Кървящи венци, пародонтоза, възпаление и грижа за венците.",
        "related_path": "/symptoms",
        "related_treatments": [],
    },
    {
        "slug": "prosthetics",
        "label": "Протези и коронки",
        "description": "Коронки, мостове, зъбни протези — видове, издръжливост и цени.",
        "related_path": "/treatments",
        "related_treatments": ["full_mouth"],
    },
    {
        "slug": "hygiene",
        "label": "Хигиена и профилактика",
        "description": "Почистване на зъбен камък, профилактични прегледи и ежедневна грижа.",
        "related_path": "/treatments",
        "related_treatments": [],
    },
    {
        "slug": "tmj",
        "label": "Челюстна става (TMJ)",
        "description": "Скърцане със зъби, болка в челюстта, щракане и напрежение.",
        "related_path": "/tmj",
        "related_treatments": [],
    },
    {
        "slug": "other",
        "label": "Друго",
        "description": "Общи въпроси, които не попадат в останалите теми.",
        "related_path": None,
        "related_treatments": [],
    },
]

_TOPIC_BY_SLUG: Dict[str, Dict[str, Any]] = {t["slug"]: t for t in COMMUNITY_TOPICS}

TOPIC_SLUGS = set(_TOPIC_BY_SLUG.keys())


def is_valid_topic(slug: str) -> bool:
    return slug in _TOPIC_BY_SLUG


def get_topic(slug: str) -> Optional[Dict[str, Any]]:
    return _TOPIC_BY_SLUG.get(slug)


def topics_for_clinic(treatments_supported: Optional[List[str]]) -> List[str]:
    """Topic slugs that belong in a clinic's answer queue: every general
    topic (no `related_treatments`) plus any topic whose related_treatments
    intersects the clinic's own `treatments_supported`."""
    supported = set(treatments_supported or [])
    return [
        t["slug"] for t in COMMUNITY_TOPICS
        if not t["related_treatments"] or supported.intersection(t["related_treatments"])
    ]
