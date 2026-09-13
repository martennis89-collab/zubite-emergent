"""Canonical clinic assessment-approach attributes.

These describe what a clinic says it considers during assessment. They are
not awards, rankings, specialties, or outcome guarantees.
"""
from __future__ import annotations

from typing import Iterable

ASSESSMENT_APPROACHES = {
    "airway_breathing": "Дишане и дихателни пътища",
    "swallowing_orofacial": "Преглъщане и орофациални навици",
    "speech_articulation": "Говор и артикулация",
    "posture_balance": "Стойка и мускулен баланс",
    "facial_asymmetry": "Лицева асиметрия",
    "functional_orthodontics": "Функционален ортодонтски подход",
}

QUIZ_FLAG_TO_APPROACH = {
    "approach_airway": {"airway_breathing", "functional_orthodontics"},
    "approach_swallowing": {"swallowing_orofacial", "functional_orthodontics"},
    "approach_speech": {"speech_articulation", "functional_orthodontics"},
    "approach_posture": {"posture_balance", "functional_orthodontics"},
    "approach_asymmetry": {"facial_asymmetry", "functional_orthodontics"},
}


def clean_assessment_approaches(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    return list(dict.fromkeys(value for value in raw if isinstance(value, str) and value in ASSESSMENT_APPROACHES))


def matching_assessment_approaches(raw: object, quiz_flags: Iterable[str]) -> list[str]:
    offered = set(clean_assessment_approaches(raw))
    sought: set[str] = set()
    for flag in quiz_flags:
        sought.update(QUIZ_FLAG_TO_APPROACH.get(flag, set()))
    return [value for value in ASSESSMENT_APPROACHES if value in offered and value in sought]
