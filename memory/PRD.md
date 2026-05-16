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
