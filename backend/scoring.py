from typing import Dict, Any


def calculate_score(treatment_type: str, answers: Dict[str, Any], can_travel: bool = True) -> tuple:
    score_breakdown = {}

    if treatment_type == "invisalign" or treatment_type == "orthodontics":
        if answers.get('quiz_type') in ['smile-classification', 'treatment-match']:
            quiz_result = answers.get('quiz_result', 'consult')
            if quiz_result in ['aligners', 'eligible']:
                score_breakdown["quiz_result"] = 75
            elif quiz_result in ['both', 'consult']:
                score_breakdown["quiz_result"] = 60
            else:
                score_breakdown["quiz_result"] = 50
        else:
            score_breakdown["seriousness"] = {"searching": 15, "considering": 8, "browsing": 2}.get(answers.get("seriousness", "browsing"), 2)
            score_breakdown["timing"] = {"0-3": 15, "3-6": 10, "6+": 5, "not_sure": 4}.get(answers.get("timing", "not_sure"), 4)
            score_breakdown["importance"] = {"quality": 15, "comfort": 10, "price": 0}.get(answers.get("importance", "price"), 0)
            score_breakdown["previous_ortho"] = {"yes": 6, "no": 5}.get(answers.get("previous_ortho", "no"), 5)
            score_breakdown["bite_problem"] = {"yes": 8, "no": 5}.get(answers.get("bite_problem", "no"), 5)
            score_breakdown["readiness"] = {"yes": 20, "maybe": 10, "no": 0}.get(answers.get("readiness", "no"), 0)
            score_breakdown["can_visit"] = 6 if can_travel else 0

    elif treatment_type == "implants":
        score_breakdown["missing_teeth"] = {"1-2": 10, "3-5": 12, "6+": 15}.get(answers.get("missing_teeth", "1-2"), 10)
        score_breakdown["chewing_difficulty"] = {"yes": 15, "sometimes": 8, "no": 3}.get(answers.get("chewing_difficulty", "no"), 3)
        score_breakdown["pain"] = {"yes": 12, "no": 6}.get(answers.get("pain", "no"), 6)
        score_breakdown["timing"] = {"0-3": 15, "3-6": 10, "6+": 5, "not_sure": 4}.get(answers.get("timing", "not_sure"), 4)
        score_breakdown["importance"] = {"quality": 15, "speed": 8, "price": 0}.get(answers.get("importance", "price"), 0)
        score_breakdown["readiness"] = {"yes": 20, "maybe": 10, "no": 0}.get(answers.get("readiness", "no"), 0)
        score_breakdown["can_visit"] = 6 if can_travel else 0

    elif treatment_type == "full_mouth":
        score_breakdown["situation"] = {"many_missing": 15, "worn": 12, "aesthetic": 5}.get(answers.get("situation", "aesthetic"), 5)
        score_breakdown["main_problem"] = {"function": 15, "aesthetic": 10, "curiosity": 2}.get(answers.get("main_problem", "curiosity"), 2)
        score_breakdown["consulted_before"] = {"yes": 12, "no": 8}.get(answers.get("consulted_before", "no"), 8)
        score_breakdown["timing"] = {"0-3": 15, "3-6": 10, "6+": 5, "not_sure": 4}.get(answers.get("timing", "not_sure"), 4)
        score_breakdown["importance"] = {"quality": 15, "price": 0}.get(answers.get("importance", "price"), 0)
        score_breakdown["complex_plan"] = {"yes": 10, "maybe": 5, "no": 0}.get(answers.get("complex_plan", "no"), 0)
        score_breakdown["can_visit"] = 6 if can_travel else 0

    total = sum(score_breakdown.values())

    if total >= 75:
        band = "GREEN"
    elif total >= 50:
        band = "YELLOW"
    else:
        band = "RED"

    if not can_travel and band == "GREEN":
        band = "YELLOW"

    return total, band, score_breakdown
