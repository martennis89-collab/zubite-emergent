# Zubite.bg — Product Requirements Document

## Original Problem Statement
Build and optimize **Zubite.bg**, an educational orthodontic platform for the Bulgarian market that helps users understand their orthodontic issues and guides them toward the correct treatment path. Built with Next.js (frontend) + FastAPI (backend) + MongoDB.

**Language**: All UI/emails/content in **Bulgarian**.

## Core Product Requirements
1. **Master Quiz** — Multi-step diagnostic with Adult/Teen/Child branching, severity scoring, lead capture, segment-specific success pages.
2. **SEO & Content** — SSR `/blog`, object-storage image uploads, sitemaps.
3. **AI Outbound Calling** — ElevenLabs Conversational AI with patient context, transcript retrieval.
4. **B2B Clinic Onboarding** — `/za-kliniki` application form, structured admin review, clinic dashboards, lead distribution.
5. **Lead Verification** — Automated 24h-after-assignment email loop asking patients to confirm clinic contact.

## What's Implemented (current state)
- Full backend modularization (`server.py` → `routers/*.py` + `auth.py`, `database.py`, `emails.py`, `scoring.py`).
- High-converting animated hero (`AnimatedHomeSections.tsx`) and 10-question multi-path quiz (`MasterQuiz.tsx`).
- Segment-aware success pages (`quiz/success/page.tsx`).
- Resend-based admin notification + patient confirmation emails.
- ElevenLabs outbound calling with proper webhook signature verification (`t=ts,v0=hash` format with 30-min replay window).
- Clinic application/approval/credential flow with welcome email.
- Auto-verification background loop (every hour, scans 24h+ assigned leads).
- **Comprehensive security hardening (Feb 2026)** — 22 fixes; see CHANGELOG.md.
- **Article ZIP Importer** (`/admin/blog/import`) — structured markdown + image bundle parser with SEO validation, JSON-LD, sitemap auto-update.
- **Image placement engine** — explicit `Placeholder: {{image:x}}` tokens beat generic `Placement` rules; featured images never inserted in body. Unit-tested via `lib/_imageParser.test.ts` (Feb 2026).
- **Test Render preview** — admin can click "Test Render" before publishing to see the exact reader-view HTML, featured image, CTA, FAQ, metadata + a 13-point validation checklist (errors block publish, warnings allow save). Uses the same `parseMarkdown()` renderer as the live blog page (`lib/markdownToHtml.ts`). Regression-tested via `lib/_testRender.test.ts` (27 assertions / 10 scenarios).
- **Lead Attribution System** — first/latest-touch UTM, click IDs, referrer & internal content path captured client-side and visible in admin lead detail.
- **Consultation Workflow MVP (Feb 2026)** — clinic-side request management: when admin assigns a lead to a clinic, a `ConsultationRequest` is auto-created and surfaced on `/clinic/dashboard/requests`. Clinics perform 11 actions (call_attempted, book_consultation, mark_attended, …); each emits an immutable event in `consultation_events`. Booked consultations land in the internal `clinic_appointments` calendar. Admin sees the full event timeline at `/admin/consultation-requests/[id]`. Backend tested via 25-case regression suite (`/app/test_reports/iteration_36.json`).
- **Admin Handling for P4/P5 Patient Requests (Feb 2026)** — admin can list, filter (by `created_from`, `status`, `clinic_id`), and view full detail for the new patient-layer requests. 4 BG tabs (`Всички / Избрана клиника / Помощ от Zubite / Чака преглед`), visual badges per kind, dedicated "Тип заявка", "Съобщение от пациента", and "Съгласие на пациента" sections on the detail page. `needs_zubite_review` added as a valid consultation status. Backend tested via `test_admin_patient_request_handling.py` (12/12 PASS). **No notifications/auto-assignment/external providers triggered in this batch.**
- **Demo Premium Clinic Content Setup (May 2026)** — Sofia Premium Clinic (`aa1aa2cd-c794-4f6e-97c3-0e32475925fc`) seeded with safe, generic Bulgarian demo copy via existing `PATCH /api/admin/clinics/{id}`. Populated: `short_description`, `patient_intro`, `treatment_focus` (6 items), `doctor_spotlight_bio`, `team_note`, `clinic_story`, `environment_description`, `consultation_process`, 3 `case_library` items (all `published` + `consent_confirmed=true`). Intentionally left blank (no fake data): doctor names/roles, video URLs, nested `review_sources`. Existing `hero_image_url` and top-level Google/Superdoc review fields preserved (not overwritten). No code changes. Script: `/app/scripts/seed_sofia_premium_demo.py`. Public profile verified at `/results/{leadId}/clinics/{clinicId}` on desktop and mobile (375px → no horizontal overflow; honest placeholders for missing media/doctor). **Local-only, no push/deploy.**
- **Lead Identity Capture Standardization + Duplicate Contact UX (May 2026)** — `POST /api/leads` now strictly requires name + phone + email when `source ∈ {diagnostic_quiz, diagnostic_quiz_v1, quiz}`, with friendly Bulgarian error messages (`missing_required_contact` / `invalid_phone` / `invalid_phone_format`) and three structured 422 codes. Non-quiz sources keep the legacy blank-string-to-None coercion → no regression for soft/legacy forms. `MasterQuiz` always shows all 3 fields (Име/Телефон/Имейл) regardless of A/B `formVersion` and validates client-side before submit. New `lib/leadContact.ts` (localStorage, `zubite_lead_contact_v1`) caches contact per leadId so `RequestCallModal` (P4) and `AssistedChoiceModal` (P5) open in **confirm mode** with a read-only "Ще се свържем с вас на:" block + "Промени данните" toggle, eliminating the duplicate ask. Backwards-compatible: callers without prefill see the original empty-input layout. Tests: `test_strict_quiz_contact.py` 13/13 PASS + 215/215 regression pass; testing agent iteration_37 100%.
- **Admin Header Consistency (May 2026)** — Single shared `AdminHeader.tsx` replaces 8 different inline header variants across `/admin/*`. Two layouts: full nav for list pages (Табло / Заявки / Партньори / Кандидатури / Анализи / Блог with active `aria-current` pill) and compact `← {backLabel}` for detail/editor pages. Bulgarian per-page titles. Encapsulated logout (POST `/api/admin/logout` + localStorage cleanup). Loading / not-found states now also render the header for chrome continuity. Login page intentionally excluded. Frontend-only batch — zero backend / patient / clinic-portal / analytics / dependency changes. Tests: testing agent iteration_38 64/64 PASS (100%); zero new TS errors.
- **Clinic Treatment Fields Cleanup (May 2026)** — Established `treatments_supported` as the **canonical** clinic treatment field across backend + frontend. Non-destructive bridge: legacy `treatments_offered` is preserved on stored docs and written by the backend on every admin save as a temporary mirror. New helper `_normalize_clinic_treatments(clinic)` prefers canonical, falls back to legacy, lowercases / trims / dedupes / drops empty entries / preserves order. Public response now exposes BOTH `treatments_supported` (canonical) and `treatments` (legacy alias). Admin create + patch endpoints accept either input field and always write both. Frontend admin clinics list + create form, recommended-clinic cards, and public clinic profile all read canonical with legacy fallback. Treatment labels updated to spec (whitening → Избелване, general → Обща стоматология, cosmetic → Естетична стоматология). Tests: `test_clinic_treatment_fields_cleanup.py` 18/18 PASS + 284/284 regression. Zero new TS errors. **No DB migration, no destructive deletes — safe to proceed to Auth E5 or Resend domain verification.**
- **Review Collection + QR Foundation R1 (May 2026)** — Patient-trust signal pipeline: clinics share a public link/QR code, patients submit feedback at `/review/clinic/{clinicId}`, every submission lands as `pending` and stays HIDDEN from public until an admin approves it via `/admin/reviews`. Backend: `routers/reviews.py` with 7 endpoints (public review-info + submit, clinic collection-link + own-list, admin list/detail/approve/reject), HTML-escape sanitization, SHA-256 IP/UA hashes (no raw PII), 3-per-IP-per-600s public rate limit, deterministic duplicate fingerprint, `_safe_review_for_clinic` / `_safe_review_for_admin` projections (clinics never see admin moderation metadata or hashes). Frontend: public submission page (Bulgarian copy, 5-star rating, consent checkboxes, 404 fallback), clinic dashboard reviews page with locally-rendered QR (qrcode.react v4.2.0 — installed locally per user requirement; NO external QR APIs), Copy + Print poster, status counts; **clinic intentionally has NO approve/reject buttons — only admins moderate**. New admin moderation queue at `/admin/reviews` with 4 Bulgarian tabs (В преглед / Одобрени / Отхвърлени / Всички), clinic_id filter, per-review approve/reject with optional moderation_notes, display_permission auto-set from `consent_public_display` only on approval. AdminHeader gains a 7th nav item: **Ревюта** (Star icon, matchPrefix `/admin/reviews`). R2 (rendering approved reviews on the public clinic profile) is intentionally deferred. Tests: `test_clinic_reviews.py` 22/22 PASS; iteration_39 100% green on backend sanity + e2e UI flows; zero new TS errors in touched files.
- **Premium Branded Review Poster (May 2026)** — Upgraded the printable review poster to a Care-Pass-aligned brand asset. Component `/app/frontend/components/ReviewPoster.tsx` (preview + print variants), warm-ivory base, sky-blue accents, serif Zubite.bg wordmark, large QR in rounded white card, trust pills, friendly footer.
- **QR 404 Fix (P0, May 2026)** — QR was encoding `https://zubite.bg/...` (production not deployed) → 404. Fix: frontend derives URL from `window.location.origin`. Works in preview/dev/prod identically.
- **R2 — Public Display of Approved Reviews (May 2026)** — Approved + display-permitted patient reviews render on the public clinic profile (`/results/{leadId}/clinics/{clinicId}`) between Trust Signals and FAQ. New backend `GET /api/public/clinics/{clinic_id}/reviews` filters strictly by `clinic_id + status="approved" + display_permission=true`; returns only public-safe fields (`id`, `rating_overall`, `feedback_text`, `patient_display_name`, `treatment_type`, `approved_at`, `submitted_at`). NEVER exposes phone, email, private notes, moderation notes, IP/UA hashes, duplicate fingerprint, status, clinic_id, or full last name. `_safe_first_name()` strips `patient_name_optional` to first word only (≤24 chars). Average + count computed over approved+permitted only — no fake stars on empty. New `<PublicReviewsSection>` (responsive 2-col → 1-col mobile, no 375px overflow), per-card "Прегледано от Zubite" badge, 380-char "Покажи още" toggle, calm empty state, fail-soft fetch. Optional secondary "Оставете мнение за тази клиника" CTA opens `/review/clinic/{id}` via `window.open` (smaller than primary "Искам обаждане"). feedback_text rendered as plain React text — no `dangerouslySetInnerHTML`. Tests 22→34 PASS.
- **Clinic Aligner Brand Tags / Provider Badges (May 2026)** — Structured `aligner_brands_supported[]` field on the clinic doc with a curated whitelist (Invisalign, Spark, Angel Aligner, Dentalign, ClearCorrect, Other) and per-entry `relationship` (offered | official_provider) + `verification_status` (unverified | pending_verification | verified) + `visible` flag + sanitised `other_label`. New shared module `/app/backend/aligner_brands.py` (`normalize_aligner_brand_entries` for write path; `public_aligner_brand_chips` for public read path). **Verification guardrail**: a clinic can only display "Официален <brand> provider" publicly when an admin has set `verification_status=verified`; any `relationship="official_provider"` with non-verified status is silently downgraded to `relationship="offered"` before the public response, so the patient-facing text always falls back to the safer "Работи с …" form. Admin write path validates strictly (whitelist, enums, max 12 entries, dedupe by brand, `other` requires `other_label`, html-escapes the custom label, caps at 60 chars). Admin GET returns the full structured list (incl. verification_status — needed by the editor); public GET only exposes `{brand, label, relationship, verified_official}` — never `verification_status`, never `visible`. Public projection is added to both `recommended-clinics` (`/api/leads/{lead_id}/recommended-clinics`) and the lead-contextual clinic profile data. Frontend: new admin section "Алайнер системи / Provider badges" on `/admin/clinics/[id]` with brand select / relationship / verification / visible toggle / "other" label / amber warning when `official_provider` selected without `verified`; new shared `<AlignerBrandChips>` component renders both the compact card variant (used on `<ClinicRecommendationCard>`) and the labelled profile variant (new section on the lead-contextual profile, only shown when the clinic has visible brands). Verified-official chips use a distinct emerald style with a shield icon; unverified chips use a calm sky style. Text-only chips — no brand logos. Tests: `test_aligner_brand_tags.py` 25/25 PASS (helper unit, admin write validation, public projection downgrade, visibility filter, backwards compat for clinics without the field, recommended-clinics integration). Zero new TS errors. No quiz/matching/request/reviews/auth/email scope drift.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, Tailwind, shadcn/ui.
- **Backend**: FastAPI + Motor (MongoDB async) + Pydantic v2 + bcrypt + python-jose.
- **Integrations**: Resend (email), ElevenLabs (AI calls), Twilio (telephony), Emergent Object Storage (uploads), Meta Pixel (analytics).

## Key Database Collections
- `leads` — quiz results, contact, assigned_clinic_id, verification_status, scoring band.
- `clinic_applications` — partnership applications, status, notes.
- `clinics` — approved clinic accounts (password_hash, profile).
- `lead_verifications` — 24h verification tokens & responses.
- `blog_posts`, `blog_views`, `analytics_events`, `lead_call_logs`, `uploaded_files`, `admin_users`.

## Security Posture (post-audit Feb 2026)
- JWT_SECRET fail-fast (min 24 chars, ~144 bits).
- CORS strict by default (zubite.bg + preview regex).
- Rate limiting on login/lead/contact/verify endpoints.
- NoSQL injection guards on dict-based body endpoints.
- ElevenLabs webhook strictly enforces HMAC signature with replay protection.
- PII excluded from public lead lookup endpoints.
- Pydantic EmailStr + length validation across input schemas.
- 60-min edit window on `/leads/{id}/contact` to prevent late tampering.

## Roadmap
### P1 — Frontend
- Centralize data-fetching helper (DRY for fetch patterns across pages).

### P2 — Localization
- English version under `/en/...`.

### P3 — Admin CMS
- Inline editing for homepage text, treatment details.

### P4 — Geo Expansion
- Add Varna, Burgas, Ruse to city dropdown + service availability.

### P5 — Infrastructure
- Replace in-memory rate limiter with Redis when horizontally scaling.
- Add JWT_SECRET fail-fast unit test (subprocess boot).

## Test Credentials
See `/app/memory/test_credentials.md`.
