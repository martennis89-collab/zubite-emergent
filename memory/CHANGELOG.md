# Zubite.bg — Changelog

## 2026-02-10 — P2 Auth/Session Hardening — Batch E2 (P1) — Admin Frontend Cutover

### Frontend — admin cookie migration (Bearer/localStorage now unused for admin)
- **15 files updated**:
  - `app/admin/page.tsx` (login): `/api/admin/me` cookie probe replaces localStorage check; login `fetch` uses `credentials: 'include'`; on success cleans up any stale `admin_token`/`admin_user` from a prior version and redirects to dashboard. The `access_token` in the response body is deliberately ignored.
  - `app/admin/dashboard/page.tsx`: removed `Bearer` from headers var, all fetches `credentials: 'include'`. `handleLogout` now POSTs to `/api/admin/logout` with credentials, then redirects.
  - `app/admin/leads/page.tsx`, `app/admin/leads/[id]/page.tsx`: cookie-only fetches; 401/403 → cleanup + redirect.
  - `app/admin/analytics/page.tsx`: all 3 fetches + logout migrated.
  - `app/admin/blog/page.tsx`, `app/admin/blog/new/page.tsx`, `app/admin/blog/[id]/page.tsx`, `app/admin/blog/import/page.tsx`: cookie auth + logout endpoint. File uploads now also carry `credentials: 'include'`.
  - `app/admin/clinics/page.tsx`, `app/admin/clinic-applications/page.tsx`, `app/admin/consultation-requests/page.tsx`, `app/admin/consultation-requests/[id]/page.tsx`: same pattern; inline logout button in clinic-applications also POSTs to logout endpoint.
  - `components/AICallPanel.tsx`, `components/SeoStatusPanel.tsx`: cookie-based fetches.
- **Pattern used everywhere**: every admin fetch carries `credentials: 'include' as RequestCredentials` and drops `Authorization: Bearer …`. No new helper module / no React Context refactor — surgical inline migration only.
- **localStorage admin keys**: never WRITTEN by frontend any more (zero `setItem` for `admin_token`/`admin_user`). Still REMOVED defensively in two cases (per spec): (a) on 401/403 from any admin endpoint, (b) on successful login + logout. This is harmless cleanup of stale state from prior versions.
- **No clinic file touched** — `/clinic/*`, `components/ClinicShell.tsx`, `CookieConsent.tsx`, `BlogViewTracker.tsx`, `MetaPixel.tsx` untouched (verified by git diff scope).
- **No patient-facing page touched** — no edit under `/app/(public)`, `/app/quiz`, `/app/blog`, `/app/za-kliniki`, etc.

### TypeScript / build
- `npx tsc --noEmit` over the migrated files yields only **3 pre-existing errors** (verified against pre-E2 baseline via `git stash`):
  - 2× `TS2802` `Set<string>` iteration in `blog/import/page.tsx`.
  - 1× `TS2367` `!selectedIds.size === 0` in `dashboard/page.tsx`.
- All E2 edits compile cleanly.

### Backend regression
- Re-ran **E1** suite — **29/29 PASS**.
- Backend code path unchanged in E2 — Bearer header still works, cookie auth still works, logout endpoint still emits audit.

### Live preview verification (Playwright)
- `POST /api/admin/login` returns 200 + `Set-Cookie: zubite_admin_session=…; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`.
- After login: `localStorage.admin_token = undefined`, `localStorage.admin_user = undefined`. ✅
- Cookie present in browser: `cookies = [cf_clearance, _fbp, zubite_admin_session, __cf_bm]`. ✅
- All 6 admin pages (`/dashboard`, `/leads`, `/analytics`, `/blog`, `/clinics`, `/consultation-requests`, `/clinic-applications`) load via cookie session. ✅
- **Hard refresh** on `/admin/dashboard` keeps user signed in. ✅
- `POST /api/admin/logout` returns 200; `zubite_admin_session` cookie cleared. ✅
- After logout, `/admin/dashboard` → redirects to `/admin`. ✅

### Explicitly out of scope of E2 (deferred to E3/E4/E5)
- **No clinic frontend changes.** Clinic still uses localStorage `clinic_token` + Bearer — E3 territory.
- **No backend changes.** `access_token` still returned in login bodies; Bearer header still accepted server-side — E4 territory.
- **No sessions collection / no `jti` / no token revocation** — E5 territory.


## 2026-02-10 — P2 Auth/Session Hardening — Batch E1 (P1)

### Backend — cookie-or-Bearer auth foundation (fully additive)
- **`config.py` + `.env.example`** — new env vars:
  - `AUTH_COOKIE_SECURE` (default `1`; set `0` only for local HTTP dev).
  - `AUTH_COOKIE_SAMESITE` (default `lax`; allowed: `lax|strict|none`).
  - `AUTH_COOKIE_NAME_ADMIN` (default `zubite_admin_session`).
  - `AUTH_COOKIE_NAME_CLINIC` (default `zubite_clinic_session`).
  - `AUTH_COOKIE_MAX_AGE_SECONDS` (derived from `JWT_EXPIRATION_HOURS * 3600`).
  - `AUTH_REQUIRE_COOKIE` (default `0`; reserved for E4 — NOT enforced in E1).
- **`auth.py`** — full rewrite (preserving behaviour):
  - `HTTPBearer(auto_error=False)` so we can fall back to a cookie when the Authorization header is absent.
  - `get_current_user(request, credentials)` now reads `Authorization: Bearer` first; if absent, reads the **`zubite_admin_session`** cookie. Clinic JWT still rejected with 403. The clinic cookie is never consulted on admin routes.
  - `get_current_clinic(request, credentials)` mirrors the above with the **`zubite_clinic_session`** cookie. Admin JWT still rejected with 403.
  - Invalid / expired / tampered tokens (from either source) → 401.
  - New `_enforce_csrf_for_cookie_auth(...)` helper: when the request was authenticated via cookie AND method is `POST|PUT|PATCH|DELETE`, requires `Origin` (preferred) or `Referer` to match an allow-list (`zubite.bg`, `www.zubite.bg`, `*.preview.emergentagent.com`, plus any host in `CORS_ORIGINS`). On failure, emits `auth.csrf_origin_mismatch` audit (`severity=warning`, metadata = `{reason_code, origin_host, method, path}` — no cookie value, no Authorization header, no secrets) and raises 403.
  - **Bearer-authenticated requests bypass CSRF entirely** — the existing frontend keeps working without changes.
- **`routers/admin.py`**:
  - `POST /api/admin/login` — **also** sets `Set-Cookie: zubite_admin_session=<jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400` (+ `Secure` when `AUTH_COOKIE_SECURE=1`). `TokenResponse` body unchanged (still returns `access_token`).
  - New **`POST /api/admin/logout`** — clears the admin cookie with matching attributes; idempotent (no auth required); emits `auth.admin_logout` audit only when a cookie was actually present.
- **`routers/clinics.py`**:
  - `POST /api/clinic/login` — mirrors admin: sets `zubite_clinic_session` cookie; response body unchanged.
  - New **`POST /api/clinic/logout`** — same pattern; emits `auth.clinic_logout`.
- **`audit.py`** — added action keys: `auth.admin_logout`, `auth.clinic_logout`, `auth.csrf_origin_mismatch`. (`auth.clinic_login_failed` and `auth.clinic_login_blocked_paused` were already in `ACTION_KEYS` from D1; they remain unused — wiring deferred to E5 per the plan.)
- **CORS** unchanged. Already `allow_credentials=True` with strict origins — cookie auth was always wire-compatible.

### Behaviour matrix
| Request shape | Result |
|---|---|
| `Authorization: Bearer <admin>` to admin endpoint | 200 (unchanged) |
| `Authorization: Bearer <admin>` to admin POST, no Origin | 200 (CSRF bypassed for Bearer) |
| `Cookie: zubite_admin_session=<admin>` to admin endpoint (GET) | 200 |
| `Cookie: zubite_admin_session=<admin>` to admin POST + `Origin: https://zubite.bg` | 200 |
| `Cookie: zubite_admin_session=<admin>` to admin POST, no Origin | **403** + `auth.csrf_origin_mismatch` |
| `Cookie: zubite_admin_session=<admin>` to admin POST + `Origin: https://evil.example.com` | **403** + audit |
| `Cookie: zubite_admin_session=<clinic JWT>` to admin endpoint | 403 (role check) |
| `Cookie: zubite_clinic_session=<admin JWT>` to clinic endpoint | 403 (role check) |
| Bearer admin + bogus admin cookie | 200 (Bearer takes precedence) |
| Tampered / expired JWT in cookie | 401 |
| No credentials | 401 |
| Public endpoints (`/api/leads`, `/api/analytics/events`, `/api/blog/track-view`, webhooks, etc.) | Unchanged — CSRF guard only fires inside `get_current_user`/`get_current_clinic`, not on public routes. |

### Tests
- **New `backend/tests/test_p2_e1_auth_cookies.py`** — 29 tests across 7 classes:
  - TestAdminCookieLogin (6): cookie attrs, body still returns `access_token`, cookie-only auth, Bearer-only auth, Bearer precedence with bogus cookie, missing-creds → 401.
  - TestClinicCookieLogin (3): cookie attrs, cookie-only on `/api/clinic/dashboard`, Bearer-only.
  - TestRoleSeparation (2): clinic-JWT-in-admin-cookie → 403; admin-JWT-in-clinic-cookie → 403; "no admin cookie present" → 401.
  - TestInvalidSessions (2): expired JWT in cookie → 401, tampered JWT → 401.
  - TestLogout (5): admin/clinic logout `Set-Cookie` deletion + `Max-Age=0`, idempotent on empty session, `auth.admin_logout` audit emitted when cookie present, NOT emitted when no cookie.
  - TestCsrfGuard (8): allowed Origin (zubite.bg + preview regex) succeed, missing Origin → 403, evil Origin → 403, Bearer bypass, safe GET no-CSRF, `auth.csrf_origin_mismatch` audit row contains `reason_code` + safe origin host + method + path AND zero cookie/Bearer values, clinic POST CSRF gating.
  - TestPublicEndpointsUnaffected (3): `POST /api/leads`, `/api/analytics/events`, `/api/blog/track-view` not CSRF-gated.
- Safety contract identical to D3: isolated `zubite_test_p2_e1` DB, autouse rate-limit + audit reset, mocked Resend/storage, no real provider IO, `AUTH_COOKIE_SECURE=0` forced at module load so `http://testserver` can receive the cookie.
- **Result: 29/29 PASS in 6.15s.**

### Full Phase 2 + Phase 3 + P2 E1 regression (per-file, isolated DBs)
- A 24 / B 31 / C 21 / D1 30 / D2a 32 / D2b 22 / D3 20 / **E1 29** = **209 tests, 0 failures**.

### Explicitly out of scope of E1 (deferred to E2–E5)
- No frontend changes (no localStorage removal, no Bearer header removal in fetch calls).
- No removal of `access_token` from login response bodies.
- No `sessions` collection; no token revocation; no `jti` in JWTs.
- No JWT expiry change (still 24h).
- No admin self-service password change.
- No `clinic_status` login-block changes.
- `AUTH_REQUIRE_COOKIE` env var declared but not enforced.


## 2026-02-10 — Phase 3 Audit Read API — Batch D3 (P1)

### Backend — admin-only read API for `admin_audit_logs`
- **`routers/audit_logs.py`** wired into `server.py` (`api_router.include_router(audit_logs.router)`). Exposes a single endpoint:
  - `GET /api/admin/audit-logs` — admin JWT only (clinic JWT → 403 via `get_current_user`).
  - Pagination: `limit` (default 50, clamped to **max 200**, FastAPI `ge=1`) + `skip` (`ge=0`).
  - Filters: `action` (exact OR comma-separated `$in`), `actor_id`, `actor_type`, `target_type`, `target_id`, `severity`, `date_from`, `date_to` (`YYYY-MM-DD` or full ISO; `date_to` is end-of-day inclusive).
  - Validation: invalid `severity` / `actor_type` / date → **400** (per spec — never 422 for these three).
  - Sort: `created_at` **desc**.
  - Mongo projection excludes `_id`; every returned row additionally runs through `mask_for_read(...)` (defence-in-depth — same redact/drop rules as the write sanitiser, idempotent + immutable).
  - Response: `{total, limit, skip, logs}`.
  - Rate-limited via `rate_limit("admin_audit_logs_read", 30, 60)`.
- **`audit.py`** — added `mask_for_read(...)` helper (delegates to the existing `_walk` deep sanitiser). No new write paths, no new collections.

### Tests
- **New `backend/tests/test_phase3_d3_audit_api.py`** — 20 tests across 7 classes:
  - **TestAuthGate (3)**: no token → 401/403, clinic JWT → 403, admin JWT → 200.
  - **TestPaginationAndSort (4)**: `total`/`limit`/`skip` correctness across two pages, `created_at desc` order, `limit=9999` clamped to 200, `limit=0` → 422, `skip=-1` → 422.
  - **TestFilters (7)**: action exact, action comma → `$in`, actor_id, actor_type, target_type + target_id, severity, date range (`date_to` end-of-day inclusive).
  - **TestInputValidation (3)**: invalid date / severity / actor_type → **400**.
  - **TestDefensiveMasking (1)**: hand-seeded unsafe row (with `password`, `token`, `password_hash`, `api_key`, `verification_token`, `notes`, `answers`, `attribution`, `call_transcript`, `score_breakdown`) — response redacts secret keys to `"[REDACTED]"` at any depth, drops forbidden keys entirely, preserves safe scalar fields, and the serialised JSON does not contain any of the planted secret values.
  - **TestNoMongoId (1)**: `_id` is never present in any returned row.
  - **TestRateLimit (1)**: 31st request within 60s → **429** (admin token cached at module scope to avoid contaminating audit assertions with login rows).
- **Token cache** — `_admin_token` / `_clinic_token` memoise the JWT so per-test `_reset_state` can wipe `admin_audit_logs` cleanly without a fresh login row reinflating `total`.
- Safety contract identical to Batches A–D2b: refuses production / non-test DB names, isolated DB `zubite_test_phase3_d3`, autouse rate-limit + audit-log reset between tests, no real Resend / Twilio / ElevenLabs / storage calls, no backup artefacts created.
- **Result: 20/20 PASS in 1.59s.**

### Full Phase 2 + Phase 3 regression (per-file, isolated DBs)
- A 24 / B 31 / C 21 / D1 30 / D2a 32 / D2b 22 / **D3 20** = **180 tests, 0 failures**.
- Note: pytest cross-contamination between test files persists (Motor `AsyncIOMotorClient` binds to the first test file's event loop, and existing teardowns call `client.close()`). Running all suites in a single pytest invocation is NOT supported by the existing test harness — each file must be invoked separately, as has been the convention since Batch A. D3 follows the same convention.

### Out of scope (deferred / explicit non-goals for D3)
- No admin UI / no `/admin/audit-logs` page.
- No CSV export.
- No `/admin/ops` / `/admin/security-status` endpoints.
- No clinic-side read access.
- No data migration.
- No changes to patient-facing UI or the article importer.


## 2026-02-10 — Phase 3 Audit Wiring — Batch D2b (P1)

### Backend — `audit_log(...)` wired into remaining governance paths
- **`routers/consultations.py`**:
  - `POST /admin/clinics` → `clinic.created` (info; after_state via `clinic` allow-list; password_hash & temporary password NEVER stored).
  - `PATCH /admin/clinics/{id}` → `clinic.updated` (metadata `changed_fields=[keys]`); also emits `clinic.status_changed` (warning if pausing/inactive/probation/waiting_list, info otherwise; before/after limited to clinic_status/status).
  - `PATCH /admin/consultation-requests/{id}` → `consultation_request.admin_status_changed` (before/after status only) OR `consultation_request.admin_note_added` (length-only metadata).
  - `POST /admin/consultation-requests/{id}/assign-clinic` → `consultation_request.assigned` (info, first time) or `consultation_request.reassigned` (warning, different clinic). Idempotent same-clinic re-saves emit ZERO rows. Metadata: previous/new clinic ids, notification flags.
  - `DELETE /clinic/appointments/{id}` → `appointment.cancelled` (info, actor_type="clinic", target_type="consultation_request" with appointment_id in metadata).
- **`routers/clinics.py`**:
  - `PATCH /admin/clinic-applications/{id}` → `clinic_application.approved` / `.rejected` with `created_clinic_id` metadata when an account is auto-created; `clinic_application.notes_updated` with length-only metadata (body NEVER stored).
  - `POST /admin/clinic-applications/{id}/regenerate-password` → `clinic.password_regenerated_via_app` (warning; password value NEVER stored; only `email_attempted`/`email_success` flags).
  - `POST /admin/clinic-accounts/{id}/reset-password` → `clinic.password_reset` (warning; same protections).
- **`routers/blog.py`**:
  - `POST /admin/blog/posts` → `blog_post.created` with after_state allow-listed to `{slug, is_published, category, language}` ONLY. Article body / content_html / FAQ / schema NEVER stored.
  - `PUT /admin/blog/posts/{id}` → `blog_post.updated` (changed_fields metadata + safe before/after via the blog_post allow-list).
  - `DELETE /admin/blog/posts/{id}` → `blog_post.deleted` (warning; safe before_state only).
  - `POST /admin/upload` → `file.uploaded` (after_state via `file` allow-list; bytes & storage_path NEVER stored).
  - `DELETE /admin/files/{id}` → `file.deleted` (before/after `is_deleted` flip only).
- **`server.py`** — `auto_verification_loop`: emits `verification.email_sent` (system, info) with `{lead_id, clinic_id, auto_sent, email_attempted, email_success}`; token & patient email NEVER stored. Wrapped in its own try/except so audit failures cannot abort the loop.

### Authoritative event collection unchanged
- `consultation_events` remains the source of truth for the clinic workflow timeline (`call_attempted`, `book_consultation`, `mark_attended`, etc.). We did NOT duplicate every clinic action into `admin_audit_logs`; only governance-relevant actions (admin assign/reassign, admin status/note changes, appointment cancel) cross-post to the audit log.

### Tests
- **New `backend/tests/test_phase3_d2b_audit_wiring.py`** — 22 tests across 8 classes:
  - TestClinicAdminAudit (5), TestClinicApplicationAudit (3), TestConsultationRequestAudit (4),
  - TestAppointmentCancelAudit (1), TestBlogPostAudit (3), TestFileAudit (2),
  - TestSystemVerificationAudit (1), TestD2bResilience (2), TestD2bSanitisationSweep (1).
- Sweep test exercises clinic-update / blog-create / blog-update / file-upload and asserts the full serialised audit collection contains zero PII, no clinic phone/address, no blog body/title/HTML, no file bytes, no admin password, no password_hash / token / verification_token / storage_path keys anywhere.
- Resilience tests patch `db.admin_audit_logs.insert_one` to raise; clinic PATCH and blog POST still complete and the underlying state changes persist.
- **Result: 22/22 PASS in 17.6s. Full Phase 2 + Phase 3 regression: A 24 / B 31 / C 21 / D1 30 / D2a 32 / D2b 22 = 160 tests, 0 failures.**

## 2026-02-10 — Phase 3 Audit Wiring — Batch D2a (P1)

### Backend — `audit_log(...)` wired into critical governance paths
- **`routers/admin.py`**:
  - `POST /api/admin/login` — `auth.admin_login_succeeded` (info) on success; `auth.admin_login_failed` (warning, `actor_type="public"`, masked username via new `_mask_username` helper) on 401. Password and token NEVER stored.
  - `PATCH /api/admin/leads/{id}` — `lead.status_changed` (before/after via `diff_fields` on `lead` allow-list); `lead.notes_changed` (metadata = `{notes_changed, notes_length_before, notes_length_after}` only — note bodies NEVER stored).
  - `PUT /api/admin/leads/{id}` — `lead.profile_updated` (metadata = `{changed_fields: [keys-only]}`); also emits `lead.status_changed` if status field changed.
  - `DELETE /api/admin/leads/{id}` — `lead.deleted` (warning); `before_state` runs through the lead allow-list so name/phone/email/answers are stripped.
  - `GET /api/admin/leads/export/csv` — `lead.exported_csv` with metadata `{row_count, filters}` (filters captured as new query-params; exported data NEVER stored).
  - `POST /api/admin/reset-analytics` — `reset_analytics.blocked_production` (warning) in prod; `reset_analytics.attempted` (warning) on bad confirmation; `reset_analytics.executed` (critical) on success. `confirmation_token` VALUE never stored — only `confirmation_token_ok: bool`.
  - `POST /api/admin/reset-blog-views` — same triplet pattern.
  - `POST /api/admin/cleanup-leads` — `cleanup_leads.blocked_production` / `.attempted` / `.blocked_majority` / `.executed`. Metadata captures `keep_ids_count`, `n_to_delete`, `total_before`, `deleted_count`, `force`, `confirmation_token_ok` — `keep_ids` VALUES never stored.
- **`routers/clinics.py`** — `PATCH /api/admin/leads/{id}/assign-clinic`: emits `lead.assigned_to_clinic` (info) on first assignment, `lead.reassigned_to_clinic` (warning) when changing clinics. Idempotent re-saves to the same clinic emit ZERO audit rows. Metadata captures `previous_clinic_id`, `new_clinic_id`, `notification_attempted`, `notification_success`.
- **`routers/verification.py`** — `GET /api/verify/{token}`: emits `verification.responded` (public, info) for every response; additionally emits `verification.flagged` (warning) on `response=no` with metadata `{lead_id, clinic_id, alert_email_attempted, alert_email_success}`. **Token value never stored.**
- **`routers/calls.py`**:
  - `POST /api/admin/leads/{id}/call` — `call.initiated` (info); `target_id` = `call_log_id`, metadata = `{lead_id, conversation_id, is_mock, success}`. **Phone number never stored.**
  - `POST /api/admin/calls/cleanup-stuck` — `calls.cleanup_stuck` (info) with metadata `{reset_count}`.
- **`routers/public.py`** — `POST /api/seed`:
  - `seed.blocked_production` (warning, `actor_type="system"`) in prod.
  - `seed.rejected_weak_password` (warning, `actor_type="system"`) on invalid password, with `metadata.reason_code ∈ {missing, weak, short, username_equal}`. **Submitted password value never stored.**
  - `seed.executed` (critical, `actor_type="system"`) on success.
  - Helper split into `_classify_seed_password()` (returns reason_code) + existing `_validate_seed_admin_password()` (raises HTTPException) so the audit row precedes the user-facing error.

### Tests
- **New `backend/tests/test_phase3_d2a_audit_wiring.py`** — 32 tests across 9 classes:
  - TestAdminLoginAudit (2), TestLeadAdminAudit (6), TestLeadAssignmentAudit (3),
  - TestDestructiveEndpointAudit (7), TestSeedAudit (7), TestVerificationAudit (2),
  - TestCallAudit (2), TestAuditResilience (2), TestSanitisationSweep (1).
- Resilience tested via `db.admin_audit_logs.insert_one` mock raising — simulates the realistic failure mode (audit DB outage) rather than patching the helper itself, which would bypass its own safety net. Business endpoints still succeed (lead status updates, destructive guards still fire).
- Full sweep test runs 5 representative endpoints and asserts the entire audit collection serialised as JSON does NOT contain submitted PII values, the admin password, confirmation token values, the seeded patient name / phone / email, or `BadTokenLOL`.
- **Result: 32/32 PASS in 11.5s. Full Phase 2 + Phase 3 regression: A 24 / B 31 / C 21 / D1 30 / D2a 32 = 138 tests, 0 failures.**

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
