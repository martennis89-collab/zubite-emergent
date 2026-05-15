# Zubite.bg — Changelog

## 2026-02-10 — Phase 3 Audit Foundation — Batch D1 (P1)

### Backend
- **New `backend/audit.py`** — fire-and-forget-safe audit helper:
  - `audit_log(action, *, actor, actor_type, target_type, target_id, target_summary, before_state, after_state, metadata, severity, request) -> None`. Never raises to the caller; internal failures `logger.warning` only.
  - Honours `AUDIT_LOGS_ENABLED` env flag (default on; `"0"` disables writes).
  - Deny-by-default sanitiser: `_REDACT_KEYS` (21 secret-shaped keys → `"[REDACTED]"`), `_DROP_KEYS` (12 forbidden keys → removed entirely incl. answers / score_breakdown / attribution / call_transcript / notes), `_TARGET_ALLOWED_KEYS` (9 target types with explicit scalar allow-lists for before/after state).
  - `_sanitize_metadata` enforces 4 KB JSON cap → returns `{_truncated: True}` on overflow.
  - `_extract_request_meta` lifts IP (XFF first hop preferred) + 200-char-truncated User-Agent. Never reads cookies / Authorization.
  - `diff_fields(before, after, keys)` builder for minimal `(before_state, after_state)` pairs limited to the keys that actually changed.
  - `ACTION_KEYS` frozenset of ~50 canonical action strings; unknown actions log a warning but the row is still written.
  - `SEVERITY_VALUES = {info, warning, critical}`; invalid severities coerced to "info" with a warning.
  - `ACTOR_TYPES = {admin, clinic, system, public}`; invalid actor types coerced to "system".
- `backend/config.py` — new `AUDIT_LOGS_ENABLED` constant (default `True`).
- `backend/.env.example` — added `AUDIT_LOGS_ENABLED=1`.
- `backend/server.py` — added 7 indexes on `admin_audit_logs` at startup (id unique, created_at desc, action, actor_id, target_type+target_id compound, severity, created_at+action compound). Additive; no migration.

### Tests
- **New `backend/tests/test_phase3_d1_audit_foundation.py`** — 30 tests across 5 classes:
  - **TestSanitizer (10)**: top-level secret redaction, case-insensitive redaction, nested dict/list secret redaction, forbidden-key drop (top-level + nested), lead target_type strict allow-list (phone/email/name/UTM all stripped), unknown target_type drops everything, UA truncation to 200 chars, None request handling, XFF first-hop extraction.
  - **TestMetadataTruncation (4)**: small kept, oversized → `{_truncated: True}`, non-dict → `{_truncated: True}`, drops forbidden + redacts secrets.
  - **TestDiffFields (4)**: only changed keys, ignores keys outside the explicit list (defence-in-depth), handles missing before, returns empty when nothing changed.
  - **TestAuditLogWrites (11)**: writes valid row, extracts AdminUser fields, failure does not raise (mock insert_one to throw), `AUDIT_LOGS_ENABLED=False` skips write, unknown action still writes + warns, parametrised severity (info/warning/critical), invalid severity coerced + warned, invalid actor_type coerced to system, secrets-in-metadata redacted on write (raw values not present in stored row).
  - **TestActionKeysAllowList (1)**: required Batch D2 action keys present.
- **Result: 30/30 PASS in 0.40s. Full Phase 2 + Phase 3 D1 regression: 106 tests, 0 failures.**

## 2026-02-10 — Phase 2 Security Hardening — Batch C (workflow & notifications) (P2)

### Backend
- `routers/public.py` — `POST /api/leads`:
  - Added soft duplicate detection (`_detect_soft_duplicate`). Checks for another lead with the same trimmed phone or lower-cased email created in the last 30 days. **Never blocks submission.** Missing phone+email → skipped safely.
  - New lead fields: `is_potential_duplicate`, `duplicate_reason` (e.g. `phone`, `email`, or `phone+email`), `possible_duplicate_lead_id`. Audit-logged with `logger.info` (lead id + match id + reason — no PII).
- `schemas.py` — added the three duplicate-detection fields to `Lead` with safe defaults.
- `server.py` — new MongoDB indexes: `leads(phone, created_at)` and `leads(email, created_at)`.
- `routers/clinics.py` — `PATCH /api/admin/leads/{id}/assign-clinic` now records `prev_clinic_id`, only triggers `_send_clinic_assignment_email` when the assignment is to a different clinic (or first assignment), and wraps the email call in try/except so a Resend outage cannot block the assignment.
- `routers/consultations.py` — `POST /api/admin/consultation-requests/{id}/assign-clinic` mirrors the same `is_new_assignment` guard and try/except email isolation.
- `emails.py` — new `send_verification_flagged_alert(lead, clinic_name=None)`. Sends a minimal admin alert containing only `lead_id`, `clinic_id`, optional `clinic_name`, optional `patient_name`, and the fixed reason text. **No** quiz answers / attribution / call transcript / duplicate metadata.
- `routers/verification.py` — `GET /api/verify/{token}` with `response="no"`:
  - Saves `verification_status="flagged"` first, **then** attempts the admin alert.
  - Lead is projected to `{id, name, assigned_clinic_id}` before being passed to the alert helper.
  - Email failure is caught + logged safely; the flagged status is preserved regardless.

### Tests
- New `/app/backend/tests/test_phase2_batch_c.py` — 21 tests across 5 classes:
  - **TestSoftDuplicateDetection (7)**: phone match, email match (case-insensitive), combined `phone+email` reason, >30-day-old not flagged, missing phone+email skipped, public `GET /api/leads/{id}` does NOT expose duplicate fields, admin lead detail DOES expose them.
  - **TestClinicReassignmentEmail (4)**: first assignment sends one email, re-saving to the same clinic sends zero, reassigning to a different clinic sends a new email to the right clinic, email outage does not block assignment (lead.assigned_clinic_id still updates).
  - **TestVerificationFlaggedAlert (3)**: `response=no` sets `flagged` + invokes alert with PII-trimmed lead payload, alert failure still saves `flagged`, `response=yes` does not trigger the alert.
  - **TestClinicIsolation (6)**: cross-clinic GET / action / lead-status returns 404; clinic JWT rejected on three admin endpoints; `/clinic/leads` projection still strips quiz answers / UTM / content path / notes / call transcripts / duplicate metadata / verification tokens even with all those fields seeded; clinic consultation-request response does not echo forbidden fields.
  - **TestBackupArtifactSafety (1)**: hard assert that the Batch C suite leaves zero backup artefacts in `test_reports/backups/`.
- Real Resend mocked at module load (`resend.Emails.send = MagicMock(...)`); per-test `unittest.mock.patch` around `_send_clinic_assignment_email` and `send_verification_flagged_alert` for call-count assertions.
- **Result: Batch C 21/21 PASS in ~4s. Full Phase 2 (A+B+C) regression: 76 tests, 0 failures.**

## 2026-02-10 — Phase 2 Security Hardening — Batch B (destructive endpoint guards) (P1)

### Backend
- `routers/admin.py` — `/admin/reset-analytics`, `/admin/reset-blog-views`, `/admin/cleanup-leads` now:
  - return **403 in production** (`config.IS_PRODUCTION`),
  - require a fixed confirmation phrase in the request body (`CONFIRM_RESET_ANALYTICS`, `CONFIRM_RESET_BLOG_VIEWS`, `CONFIRM_DELETE_NON_MATCHING_LEADS`),
  - are rate-limited (5/10min for resets, 3/10min for cleanup-leads),
  - emit safe `logger.warning(...)` audit lines (admin username + counts only, **no patient identifiers**).
- `cleanup-leads` additionally:
  - requires `keep_ids` to be a non-empty `List[str]` (Pydantic `min_length=1` + strip-and-reject-empties validator),
  - pre-computes `n_to_delete` and **refuses if it would delete >50% of leads** unless `force=true` is passed explicitly,
  - returns `{deleted_count, n_to_delete, total_before}` — no lead ids, no PII.
- `routers/public.py` — `POST /api/seed`:
  - **403 in production**,
  - calls `_validate_seed_admin_password` which rejects missing / known-weak / username-equal / <12-char passwords (weak-list checked before length so the operator gets a clearer message),
  - removed the previous `os.environ.get('SEED_ADMIN_PASSWORD', 'password')` default (no more silent fallback to `password`).
- `routers/calls.py` — `/admin/calls/cleanup-stuck`:
  - **kept available in every environment** (operational recovery, not mass deletion),
  - safe audit log added (admin + `reset_count`).
- `schemas.py` — new models `ConfirmationBody`, `CleanupLeadsBody`; constants `RESET_ANALYTICS_TOKEN`, `RESET_BLOG_VIEWS_TOKEN`, `CLEANUP_LEADS_TOKEN`.

### Operations tooling
- New `backend/scripts/backup_leads.py` (one-shot, never auto-run): exports the `leads` collection as JSON to `/app/test_reports/backups/leads_YYYY-MM-DD_HHMMSS.json` (gitignored).
  - Aborts on missing `DB_NAME` or `MONGO_URL`.
  - Aborts when `APP_ENV/ENVIRONMENT/NODE_ENV=production` unless `--allow-production-backup` is passed.
  - Streams documents to disk; prints metadata only (path, count, db, env) — never PII.

### Tests
- New `/app/backend/tests/test_phase2_batch_b.py` — 31 tests, in-process via `httpx.AsyncClient + ASGITransport`, isolated `zubite_test_phase2_batch_b` DB, autouse rate-limit reset, autouse backup-file teardown so no test artefact survives.
- Coverage: backup script (5 cases incl. PII non-leak + prod block + override flag + empty-DB-name abort), seed guards (11 cases — missing / 8 weak variants / too-short / username-equal / strong-in-non-prod / prod block), destructive endpoint guards (10 cases — 403 in prod for all three, confirmation enforced, empty `keep_ids` rejected, majority-deletion refused without `force=true`, minor deletion succeeds, response carries no lead ids), `cleanup-stuck` (3 cases — admin happy path, still works in prod, requires auth).
- **Result: 31/31 PASS in ~9.3s**. Batch A re-run: still 24/24 PASS — no regression.



### Tests
- Refactored `/app/backend/tests/test_phase2_batch_a.py` to run **in-process** via `httpx.AsyncClient` + `ASGITransport(app=app)` — no real HTTP, no network IO, no real provider calls (Resend / Twilio / ElevenLabs / object storage).
- Hard safety guard: refuses to run unless `DB_NAME` starts with `zubite_test` / `test_` and `APP_ENV/ENVIRONMENT/NODE_ENV` is not `production`.
- Module-scoped event loop (motor's IOLoop binds once); admin + clinic accounts seeded, test DB dropped at teardown.
- Autouse fixture clears `rate_limit._buckets` between every test so rate-limit assertions are deterministic.
- `storage.init_storage` monkey-patched to a no-op; FastAPI startup events aren't executed by ASGITransport so the auto-verification background loop never spawns in tests.
- Coverage expanded: original suite covered 2 of 5 rate-limited endpoints — new suite covers all 5 (`/analytics/events`, `/blog/track-view`, `/leads`, `/admin/login`, `/clinic/login`).
- Result: **24/24 passing in ~4.9s** (previously 9 timeouts on rapid live-network requests).

Run with:
```
cd /app/backend
DB_NAME=zubite_test_phase2_batch_a APP_ENV=test python -m pytest tests/test_phase2_batch_a.py -v
```

Batch A is now complete and verified. Batch B (destructive endpoint guards) NOT started — awaiting user approval + manual MongoDB export of `leads`.



## 2026-02-09 — Clinic Consultation Workflow MVP (P0)

### Backend
- New collections: `consultation_requests`, `consultation_events`, `clinic_appointments` (with appropriate indexes).
- New router `routers/consultations.py` with 17 endpoints across admin + clinic surfaces.
- New Pydantic models in `schemas.py`: `ClinicCreate`, `ClinicAdminUpdate`, `ConsultationRequestCreate`, `ConsultationAssignClinic`, `ConsultationAdminPatch`, `AppointmentDetails`, `ConsultationActionRequest`, `ClinicAppointmentCreate`, `ClinicAppointmentPatch`.
- Auto-create hook: `PATCH /api/admin/leads/{id}/assign-clinic` now also creates a linked `ConsultationRequest` (idempotent; safe to re-assign).
- Lazy backfill: `GET /api/clinic/consultation-requests` automatically promotes any pre-existing `assigned_clinic_id` leads to `consultation_requests` so legacy data is not lost.
- Generic `_send_email` helper added to `emails.py` (Resend wrapper). On-assign notification emailed to `clinic.notification_email` (best-effort; never blocks).
- Strict access control: every clinic endpoint scopes by `clinic_id` from JWT. Cross-clinic GET/PATCH returns 404.
- Renamed legacy admin endpoint `/admin/clinics` → `/admin/seed-clinics` (city directory). New `/admin/clinics` returns partner clinics with workflow/subscription metadata.

### Frontend (Bulgarian UX)
- New `ClinicShell` layout component with sidebar nav (Преглед / Заявки / Календар / Резултати).
- `/clinic/dashboard` rebuilt as KPI overview (7 cards: new requests, awaiting action, booked/attended/no-show this month, avg response, avg time-to-book).
- `/clinic/dashboard/requests` — searchable + filterable list (5 quick filters).
- `/clinic/dashboard/requests/[id]` — patient details + UTM/source + 12 action buttons + booking modal (type / date / time / duration / notes) + event timeline.
- `/clinic/dashboard/calendar` — internal Zubite list-view calendar grouped by day with status + type filters.
- `/clinic/dashboard/performance` — 11 stats cards including booking conversion rate and attendance rate.
- New admin pages: `/admin/clinics` (CRUD list with inline status/subscription editing + create modal showing temporary password) and `/admin/consultation-requests` + `/admin/consultation-requests/[id]` (linked lead snapshot, event timeline, internal note).

### Action types supported on `/api/clinic/consultation-requests/{id}/action`
`mark_viewed`, `call_attempted`, `patient_contacted`, `no_answer`, `book_consultation`, `reschedule`, `patient_declined`, `not_suitable`, `mark_attended`, `mark_no_show`, `cancel`, `admin_note`. Every action: (a) updates status + timestamp fields, (b) sets `first_action_at` on first meaningful action, (c) writes an immutable row to `consultation_events`.

### Testing
- 25/25 backend tests pass: clinic CRUD, lead→consultation auto-create, full clinic action lifecycle, KPI + performance endpoints, cross-clinic access control (404 isolation), input validation, regression on `/admin/leads`, `/admin/analytics`, `/blog/posts`, `/admin/clinic-accounts`, `/admin/clinic-applications`. Report: `/app/test_reports/iteration_36.json`.
- No regressions to existing quiz, blog, attribution, lead capture flows.

### NOT in scope
- No Twilio call recording, no Google/Outlook calendar sync, no payments/billing, no AI receptionist, no public clinic ranking, no patient self-booking.


## 2026-02-06 — Analytics Date Filter + Segment Breakdown + Sanity (P0)
- Backend `/api/admin/analytics` now accepts `?from=YYYY-MM-DD&to=YYYY-MM-DD` query params (or `?from=all`). **Default changed from all-time to last 30 days** — older numbers (e.g. "229 starts") were cumulative, not "past 2 days".
- Added `segment` field to `AnalyticsEvent` schema (was being silently stripped) — adult/teen/child breakdown for started + completed sessions now visible in admin.
- New `sanity` block in API response: `raw_quiz_start_events`, `unique_started_sessions`, `raw_quiz_completed_events`, `unique_completed_sessions`, `duplicate_starts_per_session` — confirms whether the count is inflated by within-session re-fires (current data: 0 duplicates, logic is clean).
- Added `starts_per_day` time-series + range-aware `leads_per_day` for daily breakdown.
- Frontend `/admin/analytics` page:
  - 5 preset chips: **Днес / 7 дни / 30 дни / Всичко / По дати** (custom date range pickers).
  - Live range label (`YYYY-MM-DD..YYYY-MM-DD`) shown on the right.
  - "Started vs Completed по сегмент" card with adult/teen/child + completion %.
  - "Sanity check" card surfacing the 5 backend counters; flags duplicate starts in green/amber.
- All cards & funnel re-fetch automatically when preset/dates change.


## 2026-02-06 — Admin Test Render Modal (P1)
- New "Test Render" button next to Save/Publish in `/admin/blog/import` — opens a full-screen modal that previews the article exactly as a reader will see it.
- Reuses the public blog page's markdown renderer — `parseMarkdown()` extracted to shared `lib/markdownToHtml.ts` (no behaviour change for live blog).
- Image placeholders resolved using same `replaceImagePlaceholders` + `autoInsertRemainingImages` engine; featured image is rendered above the article (NOT inside the body); when ZIP is loaded, blob URLs are used; otherwise inline SVG placeholders are shown so admins can verify positions even without uploading.
- 13-point validation checklist (separate from existing `validateArticle`):
  1. ARTICLE_META section exists  2. ARTICLE_BODY_START + ARTICLE_BODY_END markers exist  3. FAQ has ≥ 5 Q/A pairs  4. CTA_BLOCK populated  5. IMAGE_ASSETS section exists  6. Every Placeholder field maps to a token in the body  7. Every body token maps to an IMAGE_ASSETS entry  8. No duplicate placeholders  9. No unused support assets  10. Featured image not rendered inside body  11. External source URLs are plain (no markdown links)  12. JSON-LD `@context` strictly equals `https://schema.org`  13. `Reviewed By` empty implies `Last Reviewed` empty.
- **Hard errors** block publish (e.g., missing markers, orphan placeholders, bad JSON-LD context, markdown links in sources). **Warnings** allow draft save (e.g., FAQ < 5, duplicates, unused assets).
- Object URLs from JSZip blobs are revoked on modal close to prevent memory leaks.
- Regression suite: `lib/_testRender.test.ts` — 27 assertions / 10 scenarios all pass via `sucrase-node`.
- Existing `lib/_imageParser.test.ts` re-run, no regressions.


## 2026-02-06 — Article Importer: Image Placement Fix (P0)
- Explicit `Placeholder: {{image:x}}` field in IMAGE_ASSETS now overrides generic `Placement` rules — image is inserted exactly at the token, NOT auto-placed afterwards.
- Featured images (`Type: featured` or `Placement: featured_image`) are NEVER inserted into the article body, even when a placeholder is present in the markdown (token is consumed silently).
- Generic `{{image:TYPE}}` tokens still work for assets without an explicit `Placeholder`.
- All occurrences of an explicit placeholder are replaced (supports re-using the same image twice).
- Admin importer preview badge now shows the explicit placeholder string when present (e.g. `placeholder {{image:support_1}}`).
- Verified via `frontend/lib/_imageParser.test.ts` — 17 assertions across 6 scenarios, all passing.


## 2026-02 — Security Audit & Hardening (P0)
**Status**: 25/25 backend security tests passing (`/app/test_reports/iteration_32.json`).

### Critical fixes
1. **JWT_SECRET fail-fast** — `config.py` raises RuntimeError if `<24` chars (≥144 bits required).
2. **REVALIDATE_SECRET** — fail-fast with ephemeral fallback + persisted to `.env`.
3. **CORS** — strict origin allowlist (`zubite.bg`, `www.zubite.bg`) + regex for `*.preview.emergentagent.com`. Removed `allow_origins=*` and `allow_methods=*`.
4. **ElevenLabs webhook signature** — now strictly enforced (rejects 401 on missing/invalid). Implemented full ElevenLabs spec: `t=ts,v0=hash` with 30-min replay protection.
5. **Webhook 400 on invalid JSON** — was silently returning 200.
6. **NoSQL injection guards** — `PATCH /admin/leads/{id}/assign-clinic` and `PATCH /admin/clinic-applications/{id}` now reject non-string operator payloads (e.g. `{"$ne":""}`).
7. **PII exposure** — public `GET /leads/{id}` and `PATCH /leads/{id}/contact` no longer return name/phone/email.
8. **Edit-window guard** — `/leads/{id}/contact` only allows edits within 60 min of lead creation.

### High-priority fixes
9. **Rate limiting** (in-memory, per-IP via XFF) on:
   - `/admin/login` — 5/5min
   - `/clinic/login` — 5/5min
   - `/leads` (public) — 5/5min
   - `/clinic-applications` — 3/10min
   - `/verify/{token}` — 20/10min
   - `/leads/{id}/contact` — 10/5min
10. **`SEED_ADMIN_PASSWORD` env override** — replaces hardcoded "password" default in seeder.
11. **Pydantic strict validation** — `EmailStr` + `Field(min_length, max_length)` added to:
    - `LeadCreate`, `LeadContactUpdate`, `LeadUpdate`
    - `AdminLogin`, `ClinicLogin`, `ClinicPasswordChange` (min 8)
    - `ClinicApplicationCreate`
12. **`clinic_change_password` rewrite** — uses `get_current_clinic` dependency instead of duplicated JWT logic; min length now Pydantic-enforced (8 chars).
13. **`verify_lead` token format** — rejects tokens outside 32-100 chars.

### New modules
- `/app/backend/rate_limit.py` — sliding-window, per-IP limiter with `RATE_LIMIT_TRUST_XFF` toggle.

### Tests
- `/app/backend/tests/test_security_audit.py` — 25 tests covering all of the above.

### Known infrastructure note
- Kubernetes ingress / Emergent edge proxy injects `Access-Control-Allow-Origin: *` on OPTIONS preflight, overriding backend's strict CORS at the edge. Backend code itself is correct (verified internally). Mitigation requires platform-level config (out of app scope).

---

## Previous milestones (before fork)
- **Backend modular refactor** — Split 2400-line `server.py` into routers + core modules. (100% pass)
- **Animated hero section** — Premium above-the-fold redesign.
- **Master Quiz multi-path** — Adult/Teen/Child branching with SVG diagnostics.
- **Segment-specific success pages** — Dynamic messaging by severity band.
- **Auto-verification loop fix** — Resolved `$ne` query bug that emailed old leads.
- **Lead confirmation email** — Patient receives copy after submitting quiz.
