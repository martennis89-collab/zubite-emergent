# Zubite.bg — Changelog

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
