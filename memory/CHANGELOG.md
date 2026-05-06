# Zubite.bg — Changelog

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
