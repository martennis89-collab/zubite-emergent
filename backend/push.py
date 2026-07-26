"""Web Push (VAPID) sends — Общност thread-follow notifications.

Mirrors emails.py's shape: best-effort, never raises, logs and swallows on
failure so a broken push send can never break the caller (the answer POST
that triggered it, or the notification fan-out it's part of).

A patient may have several subscriptions (desktop + phone, or a re-opted-in
browser after clearing site data) — `send_push_to_patient` fans out to all
of them. A 404/410 from the push service means the browser unsubscribed or
the endpoint expired; that row is pruned so we stop paying for retries that
can never succeed.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict

from starlette.concurrency import run_in_threadpool

from config import PRODUCTION_URL, VAPID_CLAIM_EMAIL, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY
from database import db


def push_enabled() -> bool:
    return bool(VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY)


async def send_push_to_patient(patient_id: str, *, title: str, body: str, url: str) -> None:
    if not push_enabled():
        return
    subs = [s async for s in db.push_subscriptions.find({"patient_id": patient_id}, {"_id": 0})]
    for sub in subs:
        await _send_one(sub, title=title, body=body, url=url)


async def _send_one(sub: Dict[str, Any], *, title: str, body: str, url: str) -> None:
    # Imported lazily so the rest of the app (and `push_enabled()` callers)
    # works even in environments where pywebpush isn't installed yet.
    from pywebpush import WebPushException, webpush

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": f"{PRODUCTION_URL}{url}" if url.startswith("/") else url,
    })
    try:
        await run_in_threadpool(
            webpush,
            subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{VAPID_CLAIM_EMAIL}"},
        )
    except WebPushException as e:
        status = getattr(e.response, "status_code", None)
        if status in (404, 410):
            await db.push_subscriptions.delete_one({"id": sub["id"]})
        else:
            logging.warning(f"Push send failed ({status}): {e}")
    except Exception as e:
        logging.warning(f"Push send failed: {e}")
