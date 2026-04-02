from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from schemas import AnalyticsEvent, AdminUser
from auth import get_current_user

router = APIRouter()


@router.post("/analytics/events")
async def track_analytics_event(event: AnalyticsEvent):
    doc = {
        "id": str(uuid.uuid4()),
        "event_type": event.event_type,
        "session_id": event.session_id,
        "timestamp": event.timestamp,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **{k: v for k, v in event.model_dump().items() if v is not None and k not in ['event_type', 'session_id', 'timestamp']}
    }
    await db.analytics_events.insert_one(doc)
    return {"status": "ok"}


@router.get("/admin/analytics")
async def get_analytics(user: AdminUser = Depends(get_current_user)):
    events = await db.analytics_events.find().to_list(10000)

    sessions: Dict[str, Any] = {}
    for event in events:
        sid = event.get('session_id')
        if sid not in sessions:
            sessions[sid] = {'events': [], 'started': False, 'completed': False}
        sessions[sid]['events'].append(event)
        if event.get('event_type') == 'quiz_start':
            sessions[sid]['started'] = True
        if event.get('event_type') == 'quiz_completed':
            sessions[sid]['completed'] = True

    total_starts = sum(1 for s in sessions.values() if s['started'])
    total_completions = sum(1 for s in sessions.values() if s['completed'])
    completion_rate = (total_completions / total_starts * 100) if total_starts > 0 else 0

    completion_times: List[float] = []
    for s in sessions.values():
        for e in s['events']:
            if e.get('event_type') == 'quiz_completed' and e.get('total_time_ms'):
                completion_times.append(e['total_time_ms'] / 1000)
    avg_time = sum(completion_times) / len(completion_times) if completion_times else 0

    question_answers: Dict[int, int] = {}
    for event in events:
        if event.get('event_type') == 'question_answered':
            q_idx = event.get('question_index', 0)
            question_answers[q_idx] = question_answers.get(q_idx, 0) + 1

    dropoff: Dict[str, int] = {}
    for i in range(1, 11):
        current = question_answers.get(i, 0)
        previous = question_answers.get(i - 1, total_starts) if i > 1 else total_starts
        dropoff[f"q{i}"] = previous - current if previous > current else 0

    question_stats: Dict[str, Dict[str, float]] = {}
    for i in range(1, 11):
        q_key = f"q{i}"
        question_stats[q_key] = {"yes": 0, "sometimes": 0, "unsure": 0, "no": 0}
    for event in events:
        if event.get('event_type') == 'question_answered':
            q_idx = event.get('question_index', 0)
            answer = event.get('answer', '')
            q_key = f"q{q_idx}"
            if q_key in question_stats and answer in question_stats[q_key]:
                question_stats[q_key][answer] += 1
    for q_key, stats in question_stats.items():
        total = sum(stats.values())
        if total > 0:
            for answer in stats:
                stats[answer] = round(stats[answer] / total * 100, 1)

    result_dist = {"early": 0, "developing": 0, "advanced": 0}
    for event in events:
        if event.get('event_type') == 'quiz_completed':
            band = event.get('band', '')
            if band == 'progressing':
                band = 'developing'
            if band in result_dist:
                result_dist[band] += 1

    soft_commits_yes = sum(1 for e in events if e.get('event_type') == 'soft_commit' and e.get('choice') == 'yes')
    soft_commits_no = sum(1 for e in events if e.get('event_type') == 'soft_commit' and e.get('choice') == 'no')
    form_submits = sum(1 for e in events if e.get('event_type') == 'form_submitted')
    funnel = {
        "quiz_start": total_starts, "quiz_completed": total_completions,
        "soft_commit_yes": soft_commits_yes, "soft_commit_no": soft_commits_no,
        "form_submitted": form_submits
    }

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    leads_cursor = db.leads.find({"created_at": {"$gte": thirty_days_ago.isoformat()}})
    leads = await leads_cursor.to_list(1000)
    leads_by_date: Dict[str, int] = {}
    for lead in leads:
        created = lead.get('created_at', '')[:10]
        leads_by_date[created] = leads_by_date.get(created, 0) + 1
    leads_per_day = [{"date": k, "count": v} for k, v in sorted(leads_by_date.items())]

    leads_by_city = {
        "sofia": await db.leads.count_documents({"city_slug": "sofia"}),
        "plovdiv": await db.leads.count_documents({"city_slug": "plovdiv"})
    }

    form_a_count = 0
    form_b_count = 0
    leads_for_form = await db.leads.find({}, {"form_version": 1, "answers": 1, "_id": 0}).to_list(10000)
    for lead in leads_for_form:
        fv = lead.get('form_version') or (lead.get('answers', {}) or {}).get('form_version')
        if fv == 'A': form_a_count += 1
        elif fv == 'B': form_b_count += 1

    total_leads = await db.leads.count_documents({})

    return {
        "total_starts": total_starts, "total_completions": total_completions,
        "completion_rate": round(completion_rate, 1), "avg_time_seconds": round(avg_time, 1),
        "dropoff_by_question": dropoff, "question_stats": question_stats,
        "result_distribution": result_dist, "funnel": funnel,
        "leads_per_day": leads_per_day, "leads_by_city": leads_by_city,
        "form_version_stats": {"A": form_a_count, "B": form_b_count},
        "total_leads": total_leads
    }
