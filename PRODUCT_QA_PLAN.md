# Общност (Q&A) — Implementation Plan

A public patient Q&A / community section for Zubite.bg where patients ask
questions that can be answered visibly by **other patients** (lived experience)
or by **verified partner clinics** (expert answers). "Like Facebook groups but
better": searchable, permanent, moderated, independent, and wired into the
orientation/booking funnel.

## Status

- **Phase 1 — Patient accounts (OTP-only):** ✅ built + verified
- **Phase 2 — Ask & browse + moderation:** ✅ built + verified
- **Phase 3 — Answers & trust:** ⏳ next
- **Phase 4 — Funnel & SEO/AEO:** ⏳ pending

## Decisions (locked)

- **Naming / route:** Общност — `/community` (URL in English, UI copy in Bulgarian)
- **URL convention:** all new routes are English-slugged by default
  (`/community`, `/ask`, `/profile`, …); Bulgarian stays in the visible copy only.
- **Asker identity:** Full patient accounts, **OTP-only** (passwordless) for launch
- **Moderation:** Hybrid — questions pre-moderated (safety/PII/spam triage before
  publish); verified-clinic answers publish instantly; peer answers post-moderated

## Why this beats a Facebook group

| Facebook group | Zubite Общност |
|---|---|
| Buried in a feed, gone in a day | Every answered question = a permanent, indexed decision-support page (GEO/AEO) |
| Anyone answers, no accountability | Verified partner-clinic answers with badges, beside peer experience |
| Clinics shill freely | Independent + admin-moderated; no "best clinic", no contact-info in answers |
| Diagnosis roulette | Answers framed as "what may be normal / your next step" — anti-diagnosis stance enforced |
| Dead end | Every thread routes to orientation → booking → Care Pass (core KPI) |

The peer layer (real cost/recovery/experience) is what clinics can't provide and
what makes it human — kept, but structured.

## Stack anchors (reuse, don't fork)

- FastAPI + Motor/MongoDB; router-per-feature registered in `backend/server.py`.
- Cookie-session auth: `auth_sessions`, `_validate_auth_session`,
  `_enforce_csrf_for_cookie_auth`, `_create_auth_session` in `backend/auth.py`.
  New patient auth copies `create_clinic_token` / `get_current_clinic`.
- Moderation, sanitization, IP/UA hashing, rate-limit, audit logs already exist
  in `backend/routers/reviews.py` + `backend/rate_limit.py` + `admin_audit_logs`.
- Email sending in `backend/emails.py` (`send_verification_email` template).
- Frontend: Next.js app-router, axios client `frontend/lib/api.ts`.

---

## Phase 0 — Data foundation & scaffolding

**Backend**
- New collections + indexes in `backend/server.py`:
  - `patients` — `id`(uniq), `email`(uniq), `email_verified`, `display_name`,
    `city_slug`, `reputation`, `status`, `created_at`
  - `patient_otps` — `email`, `code_hash`, `expires_at` (TTL index), `attempts`,
    `consumed`
  - `qa_questions` — `id`(uniq), `slug`(uniq), `topic`, `status`, `patient_id`,
    `safety_flag`, `created_at`
  - `qa_answers` — `id`(uniq), `question_id`, `author_type`, `author_id`,
    `status`, `is_expert`
  - `qa_reports`, `qa_notifications`
- `backend/schemas.py`: `Patient`, `QaQuestionCreate/Out`, `QaAnswerCreate/Out`,
  `PatientOtpRequest/Verify`.
- `backend/community_topics.py`: topic taxonomy seeded from existing treatment
  slugs (импланти, брекети/aligners, болка, TMJ, деца, естетика…), each linking
  to matching `/treatments` + `/blog`.

**Acceptance:** collections + indexes created on boot; topics enumerable.

## Phase 1 — Patient accounts (OTP-only) — the foundation gate

**Backend — `backend/auth.py` (extend):**
- `AUTH_COOKIE_NAME_PATIENT = "zubite_patient_session"`
- `create_patient_token(user_id, email)` — copy `create_clinic_token`,
  `role="patient"`, `user_type="patient"`.
- `get_current_patient(request, credentials)` — copy `get_current_clinic`,
  reject non-`patient` roles, reuse `_validate_auth_session` +
  `_enforce_csrf_for_cookie_auth`.
- `get_current_patient_optional` — returns `None` instead of 401.

**Backend — `backend/routers/patient_auth.py` (new):**
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/patient/auth/request-otp` | email → 6-digit code, hash+store (5-min TTL), send `send_patient_otp_email`. Rate-limited `patient_otp` 5/300s. |
| POST | `/api/patient/auth/verify-otp` | email+code → validate (attempts cap), upsert `patients`, `email_verified=true`, set session cookie. |
| POST | `/api/patient/auth/logout` | revoke `auth_sessions` row + clear cookie. |
| GET | `/api/patient/me` | current profile. |
| PATCH | `/api/patient/me` | set `display_name`, `city_slug`. |

- `emails.py`: `send_patient_otp_email(email, code)`.
- Register router in `backend/server.py`.

**Frontend**
- `frontend/lib/patientAuth.ts` — `requestOtp`, `verifyOtp`, `getMe`,
  `updateMe`, `logout` (axios, `withCredentials: true`).
- `frontend/app/profile/page.tsx` — my questions / answers / notifications +
  display-name/city editor (client-guarded via `getMe`).
- `<OtpLoginModal>` — email → code, triggered at any anon action gate.

**Acceptance:** unknown email requests+verifies OTP → session cookie → `/profile`
loads; refresh persists; logout clears; OTP rate-limited + expiring.

## Phase 2 — Ask & browse (public surface + moderation)

**Backend — `backend/routers/community.py` (new):**
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/community/questions` | patient | Safety triage → PII strip → sanitize → `status="pending"`. Rate-limited. |
| GET | `/api/community/questions` | public/optional | Filter `topic`, `status="published"`, trending/new, paginate. |
| GET | `/api/community/questions/{slug}` | public/optional | Question + published answers. |
| GET | `/api/community/topics` | public | Tiles + counts. |
| POST | `/api/community/questions/{id}/report` | patient | → `qa_reports`. |

- `backend/community_safety.py` — Bulgarian red-flag scan (acute pain/swelling/
  bleeding/trauma/child-fever) → `safety_flag`; flagged → "потърси спешна помощ"
  interstitial, held out of peer queue.
- Slug: transliterate BG title + short id, unique index.

**Backend — admin moderation:** clone `reviews.py` admin queue:
`GET /api/admin/community/questions?status=`, `POST …/{id}/approve|reject` +
`admin_audit_logs`.

**Frontend**
- `frontend/lib/community.ts`
- `frontend/app/community/page.tsx` — home (topic tiles, trending, "Задай въпрос")
- `frontend/app/community/[topic]/page.tsx` — topic feed
- `frontend/app/community/v/[slug]/page.tsx` — single question (SSR for SEO)
- `frontend/app/ask/page.tsx` — ask form (OtpLoginModal gate; emergency
  interstitial on safety flag)
- Admin: Q&A queue tab reusing the reviews-queue component.

**Acceptance:** patient asks → admin queue (or emergency interstitial); approve →
visible on feed + slug page; anon can browse/search published questions.

## Phase 3 — Answers & trust (hybrid moderation)

**Backend (`community.py`):**
| Method | Path | Auth | Publish rule |
|---|---|---|---|
| POST | `/api/community/questions/{id}/answers` | clinic | verified → publish instantly (`is_expert=true`) |
| POST | `/api/community/questions/{id}/answers` | patient | post-moderated; auto-hide at N reports |
| POST | `/api/community/answers/{id}/upvote` | patient | "това ми помогна" |
| GET | `/api/clinic/community/questions` | clinic | queue matched to clinic treatment topics |

- Clinic guardrails: strip contact/self-promo, cap answers-per-clinic-per-thread,
  badge = existing clinic verification status.

**Frontend**
- `frontend/app/clinic/dashboard/questions/page.tsx` — "Въпроси за отговор"
  (mirror `clinic/dashboard/reviews`).
- Question page: ✅ Експертни отговори (badged) above 👥 От общността; upvotes;
  "личен опит" label; report control.

**Acceptance:** verified clinic answer appears instantly + badged; peer answer
auto-hides after N reports; upvotes persist; clinic sees only topic-matched
questions.

## Phase 4 — Funnel & SEO/AEO

- `backend/routers/seo.py` + `frontend/app/sitemap.ts`: add published question slugs.
- Question page: `generateMetadata`, JSON-LD `QAPage` schema, canonical,
  cross-links to matching `/treatments/*` + `/blog/*`.
- "Ориентирай се по темата" CTA → existing booking/orientation engine (respect the
  two parallel engines) + Care Pass.
- `qa_notifications` → "your question was answered" email (reuse `emails.py`),
  shown in `/profile`.
- Reputation increments on upvotes / accepted answers.

**Acceptance:** question pages indexed with QAPage schema + cross-links;
answered-question emails fire; CTA routes into a real booking flow.

---

## Sequencing & risk

- **Phase 1 is the gate** — the only genuinely new subsystem. Everything after is
  CRUD-on-a-pattern. Harden OTP rate-limits, session expiry, and CSRF (existing
  cookie guard) before building on it.
- **Reuse, don't fork:** auth session governance, moderation queue UI,
  sanitization, rate limiting, email sending, audit logs all already exist.
- **Tests:** extend `backend/tests/` per router (OTP happy/expiry/rate-limit,
  moderation transitions, safety-flag triage, clinic-badge publish-instant).
