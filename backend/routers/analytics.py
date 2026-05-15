from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from schemas import AnalyticsEvent, AdminUser
from auth import get_current_user
from rate_limit import rate_limit

router = APIRouter()


@router.post(
    "/analytics/events",
    dependencies=[Depends(rate_limit("analytics_events", max_calls=60, window_seconds=60))],
)
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


def _resolve_range(from_str: Optional[str], to_str: Optional[str]) -> Dict[str, Any]:
    """Build {start_iso, end_iso, label} from optional YYYY-MM-DD strings.

    `to` is end-of-day inclusive. `from` is start-of-day. If neither is given,
    defaults to last 30 days. If `from` is the literal string `all`, no filter
    is applied.
    """
    now = datetime.now(timezone.utc)
    if from_str == 'all':
        return {"start": None, "end": None, "label": "all"}

    def parse_date(s: str) -> Optional[datetime]:
        try:
            return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            return None

    end_dt = parse_date(to_str) if to_str else now
    if to_str and end_dt:
        end_dt = end_dt + timedelta(days=1) - timedelta(microseconds=1)

    start_dt = parse_date(from_str) if from_str else (now - timedelta(days=30))
    if start_dt is None:
        start_dt = now - timedelta(days=30)
    if end_dt is None:
        end_dt = now

    return {
        "start": start_dt.isoformat(),
        "end": end_dt.isoformat(),
        "label": f"{start_dt.date()}..{end_dt.date()}",
    }


@router.get("/admin/analytics")
async def get_analytics(
    user: AdminUser = Depends(get_current_user),
    from_: Optional[str] = Query(None, alias="from", description="YYYY-MM-DD or 'all'"),
    to: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    rng = _resolve_range(from_, to)

    # Build event query — filter by created_at when range is set
    event_query: Dict[str, Any] = {}
    if rng["start"] is not None and rng["end"] is not None:
        event_query["created_at"] = {"$gte": rng["start"], "$lte": rng["end"]}
    events = await db.analytics_events.find(event_query).to_list(50000)

    sessions: Dict[str, Any] = {}
    for event in events:
        sid = event.get('session_id')
        if not sid:
            continue
        if sid not in sessions:
            sessions[sid] = {'events': [], 'started': False, 'completed': False, 'segment': None}
        sessions[sid]['events'].append(event)
        if event.get('event_type') == 'quiz_start':
            sessions[sid]['started'] = True
            seg = event.get('segment')
            if seg and not sessions[sid]['segment']:
                sessions[sid]['segment'] = seg
        if event.get('event_type') == 'quiz_completed':
            sessions[sid]['completed'] = True
            seg = event.get('segment')
            if seg and not sessions[sid]['segment']:
                sessions[sid]['segment'] = seg

    total_starts = sum(1 for s in sessions.values() if s['started'])
    total_completions = sum(1 for s in sessions.values() if s['completed'])
    completion_rate = (total_completions / total_starts * 100) if total_starts > 0 else 0

    # Sanity: total raw quiz_start events vs unique sessions
    raw_quiz_start_events = sum(
        1 for e in events if e.get('event_type') == 'quiz_start'
    )
    raw_quiz_completed_events = sum(
        1 for e in events if e.get('event_type') == 'quiz_completed'
    )

    # Segment breakdown for sessions that started / completed
    starts_by_segment: Dict[str, int] = {"adult": 0, "teen": 0, "child": 0, "unknown": 0}
    completions_by_segment: Dict[str, int] = {"adult": 0, "teen": 0, "child": 0, "unknown": 0}
    for s in sessions.values():
        if not s['started']:
            continue
        seg = (s['segment'] or 'unknown').lower()
        if seg not in starts_by_segment:
            seg = 'unknown'
        starts_by_segment[seg] += 1
        if s['completed']:
            completions_by_segment[seg] += 1

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

    # Starts per day (for the time-series chart)
    starts_by_date: Dict[str, int] = {}
    for s in sessions.values():
        if not s['started']:
            continue
        # Use earliest quiz_start event timestamp for the bucket
        earliest = None
        for e in s['events']:
            if e.get('event_type') == 'quiz_start':
                created = e.get('created_at') or e.get('timestamp') or ''
                if not earliest or created < earliest:
                    earliest = created
        day = (earliest or '')[:10]
        if day:
            starts_by_date[day] = starts_by_date.get(day, 0) + 1
    starts_per_day = [{"date": k, "count": v} for k, v in sorted(starts_by_date.items())]

    # Leads per day — use the same date filter
    leads_query: Dict[str, Any] = {}
    if rng["start"] is not None and rng["end"] is not None:
        leads_query["created_at"] = {"$gte": rng["start"], "$lte": rng["end"]}
    leads_cursor = db.leads.find(leads_query)
    leads = await leads_cursor.to_list(5000)
    leads_by_date: Dict[str, int] = {}
    for lead in leads:
        created = lead.get('created_at', '')[:10]
        if created:
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
        if fv == 'A':
            form_a_count += 1
        elif fv == 'B':
            form_b_count += 1

    total_leads = await db.leads.count_documents({})
    total_leads_in_range = len(leads)

    return {
        "range": rng,
        "total_starts": total_starts,
        "total_completions": total_completions,
        "completion_rate": round(completion_rate, 1),
        "avg_time_seconds": round(avg_time, 1),
        "dropoff_by_question": dropoff,
        "question_stats": question_stats,
        "result_distribution": result_dist,
        "funnel": funnel,
        "starts_per_day": starts_per_day,
        "leads_per_day": leads_per_day,
        "leads_by_city": leads_by_city,
        "form_version_stats": {"A": form_a_count, "B": form_b_count},
        "total_leads": total_leads,
        "total_leads_in_range": total_leads_in_range,
        "starts_by_segment": starts_by_segment,
        "completions_by_segment": completions_by_segment,
        "sanity": {
            "raw_quiz_start_events": raw_quiz_start_events,
            "unique_started_sessions": total_starts,
            "raw_quiz_completed_events": raw_quiz_completed_events,
            "unique_completed_sessions": total_completions,
            "duplicate_starts_per_session": raw_quiz_start_events - total_starts,
        },
    }
