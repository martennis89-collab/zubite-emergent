"""
Patient context mapper - transforms raw lead/quiz data into structured context for AI caller.
"""
from typing import Dict, Any, Optional
from models.call_models import PatientContext

# Quiz questions for reference
QUIZ_QUESTIONS = {
    'q1': 'Имаш ли усещане, че някои зъби са леко струпани или застъпени?',
    'q2': 'Когато захапеш, усещаш ли зъбите си напълно равномерно?',
    'q3': 'Дъвчеш ли повече от едната страна, без да се замисляш?',
    'q4': 'Случва ли се да дишаш през устата (особено нощем)?',
    'q5': 'Чуваш ли щракане или пукане при отваряне на устата?',
    'q6': 'Събуждаш ли се с напрежение в челюстта или лицето?',
    'q7': 'Задържа ли се храна на едни и същи места между зъбите?',
    'q8': 'Забелязал ли си зъбите ти да изглеждат по-износени с времето?',
    'q9': 'Имаш ли главоболие, напрежение във врата или ушите без ясна причина?',
    'q10': 'Преди този тест мислеше ли, че имаш проблем със зъбите?',
}

ANSWER_LABELS = {
    'yes': 'Да',
    'no': 'Не',
    'sometimes': 'Понякога',
    'unsure': 'Не съм сигурен/а',
}

CITY_NAMES = {
    'sofia': 'София',
    'plovdiv': 'Пловдив',
    'varna': 'Варна',
    'burgas': 'Бургас',
}

BAND_LABELS = {
    'early': 'Ранен етап',
    'progressing': 'Развиващ се етап',
    'advanced': 'Напреднал етап',
    'GREEN': 'Ранен етап',
    'YELLOW': 'Развиващ се етап',
    'RED': 'Напреднал етап',
}


def extract_main_concern(answers: Dict[str, Any]) -> str:
    """Extract the main concern from quiz answers"""
    concerns = []
    
    if answers.get('q1') == 'yes':
        concerns.append('струпани или застъпени зъби')
    if answers.get('q2') == 'no':
        concerns.append('неравномерна захапка')
    if answers.get('q3') == 'yes':
        concerns.append('едностранно дъвчене')
    if answers.get('q5') == 'yes':
        concerns.append('щракане в челюстта')
    if answers.get('q6') == 'yes':
        concerns.append('напрежение в челюстта')
    if answers.get('q9') == 'yes':
        concerns.append('главоболие/напрежение')
    if answers.get('q8') == 'yes':
        concerns.append('износени зъби')
    
    if concerns:
        return ', '.join(concerns[:3])  # Limit to top 3 concerns
    return 'общо притеснение за зъбите'


def extract_suspected_treatment(answers: Dict[str, Any], band: str) -> str:
    """Determine suspected treatment based on quiz answers"""
    # Check for TMJ/jaw issues
    jaw_issues = any([
        answers.get('q5') == 'yes',
        answers.get('q6') == 'yes',
        answers.get('q9') == 'yes',
    ])
    
    # Check for alignment issues
    alignment_issues = any([
        answers.get('q1') == 'yes',
        answers.get('q2') == 'no',
        answers.get('q7') == 'yes',
    ])
    
    if band in ['advanced', 'RED'] and jaw_issues:
        return 'възможно ортодонтско лечение с TMJ оценка'
    elif alignment_issues:
        return 'ортодонтско лечение (алайнери или брекети)'
    else:
        return 'консултация за оценка'


def extract_urgency(band: str, answers: Dict[str, Any]) -> str:
    """Determine urgency based on quiz results"""
    if band in ['advanced', 'RED']:
        return 'препоръчителна скорошна консултация'
    elif band in ['progressing', 'YELLOW']:
        return 'добре е да се консултира в близките месеци'
    else:
        return 'без спешност, профилактична консултация'


def build_quiz_summary(answers: Dict[str, Any]) -> str:
    """Build a human-readable summary of quiz answers in Bulgarian"""
    summary_parts = []
    
    positive_answers = []
    for q_id, q_text in QUIZ_QUESTIONS.items():
        answer = answers.get(q_id)
        if answer == 'yes':
            # Extract the key symptom from the question
            positive_answers.append(q_text.split('?')[0].replace('Имаш ли ', '').replace('Случва ли се да ', '').lower())
    
    if positive_answers:
        summary_parts.append(f"Пациентът съобщава за: {', '.join(positive_answers[:4])}")
    else:
        summary_parts.append("Пациентът няма изразени оплаквания")
    
    return '. '.join(summary_parts)


def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to E.164 format for Bulgaria"""
    if not phone:
        return phone
    
    # Remove spaces, dashes, parentheses
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
    
    # Handle Bulgarian numbers
    if cleaned.startswith('0') and len(cleaned) == 10:
        # Convert 0888123456 to +359888123456
        return '+359' + cleaned[1:]
    elif cleaned.startswith('359') and not cleaned.startswith('+'):
        return '+' + cleaned
    elif cleaned.startswith('+359'):
        return cleaned
    
    # Return as-is if already in good format or unknown format
    return cleaned


def map_lead_to_patient_context(lead: Dict[str, Any]) -> PatientContext:
    """
    Transform raw lead data into structured PatientContext for AI caller.
    
    Args:
        lead: Raw lead document from MongoDB
        
    Returns:
        PatientContext with clean, structured data for the AI
    """
    answers = lead.get('answers', {})
    city_slug = lead.get('city_slug', 'sofia')
    
    # Determine band - could be in different places
    band = lead.get('band', answers.get('quiz_band', 'early'))
    score = lead.get('score_total', answers.get('quiz_score', 0))
    
    # Map to band label
    if isinstance(band, str):
        if band == 'GREEN':
            band = 'early'
        elif band == 'YELLOW':
            band = 'progressing'
        elif band == 'RED':
            band = 'advanced'
    
    return PatientContext(
        name=lead.get('name', 'Пациент'),
        phone=normalize_phone_number(lead.get('phone', '')),
        city=city_slug,
        city_name=CITY_NAMES.get(city_slug, city_slug),
        main_concern=extract_main_concern(answers),
        suspected_treatment=extract_suspected_treatment(answers, band),
        urgency=extract_urgency(band, answers),
        quiz_summary=build_quiz_summary(answers),
        quiz_score=score,
        quiz_band=band,
        quiz_band_label=BAND_LABELS.get(band, band),
    )


def build_ai_prompt_context(context: PatientContext) -> Dict[str, str]:
    """
    Build the dynamic variables to pass to ElevenLabs agent.
    
    These will be injected into the agent's prompt/conversation.
    """
    return {
        "patient_name": context.name,
        "patient_city": context.city_name,
        "main_concern": context.main_concern,
        "suspected_treatment": context.suspected_treatment,
        "urgency_level": context.urgency,
        "quiz_summary": context.quiz_summary,
        "quiz_result": f"{context.quiz_band_label} ({context.quiz_score} точки)",
    }
