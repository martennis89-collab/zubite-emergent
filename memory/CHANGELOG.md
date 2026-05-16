# Zubite.bg — Changelog

## 2026-02-16 — Patient Layer — Batch P6: Client-side Analytics Tracking

Wired the patient decision flow with 12 first-party events so we can
see drop-offs between quiz success → matching → P4/P5 submit. **No
backend changes, no new dependencies, no admin/clinic-portal changes,
no consent bypass.**

### Files touched
- `frontend/lib/patientAnalytics.ts` (NEW) — `trackPatientEvent(event, payload)`
  helper. Sends each event in parallel to `POST /api/analytics/events`
  AND `fbq('trackCustom', ...)`. Fire-and-forget, never throws, drops
  null/undefined payload keys via `compact()`.
- `frontend/app/quiz/success/page.tsx` — events 1, 2.
- `frontend/app/results/[leadId]/clinics/page.tsx` — events 3, 9, 12.
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` — events
  5, 6 (from profile source).
- `frontend/components/patient/ClinicRecommendationCard.tsx` — events
  4, 6 (from matching_card source), 12 (P4 lock attempts). New
  optional `partnerTier`/`placementLabel` props on
  `RequestCallModal` propagated through.
- `frontend/components/patient/RequestCallModal.tsx` — events 7, 8.
  Added optional `partnerTier`/`placementLabel` props.
- `frontend/components/patient/AssistedChoiceModal.tsx` — events 10, 11.
- `memory/CHANGELOG.md`.

### Helper details
- `trackPatientEvent(eventName, payload)`:
  - Channel A — `getFbq()?.('trackCustom', eventName, payload)`. Pixel
    is already loaded with `fbq('consent', 'revoke')` by default and
    is only granted when CookieConsent saves `marketing=true`. We ride
    that flag — no new consent bypass.
  - Channel B — `fetch('/api/analytics/events', { method: POST,
    keepalive: true })` with `event_type, session_id, timestamp, ...payload`.
  - `session_id` reuses the existing `zubite_session_id` localStorage
    key (same one `articleAnalytics.ts` uses).
  - Every step wrapped in try/catch. Rate-limit (60/min) is enforced
    server-side; client just fires.
- Privacy filter: `compact()` strips `null/undefined/''`. Payload
  TypeScript interface lists **only safe keys** (`lead_id`,
  `clinic_id`, `partner_tier`, `placement_label`, `source`,
  `rank_position`, `treatment_type`, `city`, `band`, `segment`,
  `has_lead_id`, `clinic_count`, `has_premium`, `has_featured`,
  `has_standard`, `success`, `error_code`, `reason`,
  `attempted_action`). No `name`/`phone`/`email`/`message`/`consent`/
  `token`/`cookie` fields — TypeScript will reject them at the call
  site.

### Event matrix (exact names + payload fields + fire location)

| # | Event | Where | Payload |
|---|---|---|---|
| 1 | `quiz_success_viewed` | `quiz/success/page.tsx` mount | `lead_id, has_lead_id, band, segment, city` |
| 2 | `recommended_clinics_cta_clicked` | success-CTA onClick | `lead_id, source: "quiz_success"` |
| 3 | `clinic_recommendations_viewed` | matching page, after fetch | `lead_id, clinic_count, has_premium, has_featured, has_standard` |
| 4 | `clinic_profile_clicked` | card "Виж профила" onClick | `lead_id, clinic_id, partner_tier, placement_label, rank_position` |
| 5 | `clinic_profile_viewed` | profile page mount, after fetch | `lead_id, clinic_id, partner_tier, placement_label` |
| 6 | `request_call_modal_opened` | "Искам обаждане" (card / profile) | `lead_id, clinic_id, source, partner_tier, placement_label` |
| 7 | `request_call_submitted` | RequestCallModal — after backend 200 | `lead_id, clinic_id, source, partner_tier, placement_label, success: true` |
| 8 | `request_call_failed` | RequestCallModal — after backend ≠ 200 | `lead_id, clinic_id, source, error_code` |
| 9 | `assisted_choice_modal_opened` | matching-page button onClick | `lead_id, source: "matching_page"` |
| 10 | `assisted_choice_submitted` | AssistedChoiceModal — after backend 200 | `lead_id, source, success: true` |
| 11 | `assisted_choice_failed` | AssistedChoiceModal — after backend ≠ 200 | `lead_id, source, error_code` |
| 12 | `matching_choice_blocked` | disabled lock-state button onClick (card or matching-page) | `lead_id, clinic_id?, reason, attempted_action` |

### Consent behaviour
- **Meta Pixel channel**: respects the existing
  `MetaPixel.tsx` consent gate — `fbq('consent', 'revoke')` is set on
  load, and only flipped to `grant` when the user accepts marketing
  cookies via `CookieConsent`. If marketing consent is rejected, Pixel
  drops events (Meta documented behaviour); our helper never bypasses
  this.
- **First-party `/api/analytics/events`**: classed as essential
  product analytics (drop-off, funnel). The existing `articleAnalytics.ts`
  pattern uses the same endpoint without a consent gate. We mirror
  that behaviour for consistency.

### Duplicate-event guard
- Page-view events (1, 3, 5) use a `useRef(false)` latch that flips to
  `true` on first fire. Subsequent re-renders (filter clicks, state
  patches from `handleSubmitted`, banner toggles) cannot re-fire the
  event for the lifetime of the React component instance.
- In dev with React Strict Mode the component mounts → unmounts →
  mounts again, which legitimately resets the latch — that's a dev-only
  artifact, not a production bug.
- All other events are user-action driven (onClick / onSubmit), so
  natural per-action firing.

### Verification (live preview, real lead `6d6b5cf9-…`)
- E2E run: `/quiz/success → click "Виж препоръчаните клиники" → matching
  loads → click "Виж профила" → profile loads → back → open
  request-call modal → close → open assisted-choice modal`.
- Captured by playwright request interceptor on `/api/analytics/events`:
  ```
  quiz_success_viewed:           2× (dev StrictMode)
  recommended_clinics_cta_clicked: 1×
  clinic_recommendations_viewed: 2× (dev StrictMode)
  clinic_profile_clicked:        1×
  clinic_profile_viewed:         1×
  request_call_modal_opened:     1×
  assisted_choice_modal_opened:  1×
  ```
- **PII audit on captured payloads**: 0 hits for the forbidden keys
  (`name`, `phone`, `email`, `patient_name`, `patient_phone`,
  `patient_email`, `consent`, `message`, `patient_message`).
- UI continues working when analytics endpoint fails: smoke test had
  the keepalive POST against a real endpoint; even a 4xx/5xx is a
  silent catch.

### TypeScript
`tsc --noEmit` — clean for the 5 touched files + new helper. No new
errors. Payload shape is statically typed via
`PatientAnalyticsPayload` so unintended PII keys are rejected at
compile time.

### Backend reality check — must read
The backend `AnalyticsEvent` Pydantic model uses default
`extra="ignore"`, so extra payload fields (`lead_id`, `clinic_id`,
`partner_tier`, `placement_label`, etc.) are **silently dropped before
insert into `analytics_events`**. The persisted row today carries only
`event_type`, `session_id`, `timestamp`, plus a handful of
quiz-specific fields.

This means:
- ✅ **Event counts + session-level funnel analysis work today** — we
  can see `quiz_success_viewed` → `recommended_clinics_cta_clicked` →
  `clinic_recommendations_viewed` → `request_call_submitted` drop-off
  per session.
- ❌ **Clinic-level / tier-level attribution is NOT persisted on the
  first-party logger today.** It IS persisted on the Meta Pixel side
  (Pixel `trackCustom` accepts arbitrary payloads), as long as the
  visitor accepted marketing cookies.
- The same issue exists today for `articleAnalytics.ts` (which sends
  `post_slug`, `post_title`, `href`, `cta` — all dropped server-side).

Resolving this needs a **tiny backend follow-up** (out of P6 scope per
the brief): extend `AnalyticsEvent` with the optional analytics keys
listed above. The frontend already sends them in the correct shape; the
day backend is extended, the data flows through with zero frontend
changes.

### Confirmation
- ✅ 0 backend files changed.
- ✅ 0 admin / clinic-portal files changed.
- ✅ 0 auth / session / CSRF / audit / external-provider changes.
- ✅ No new dependencies — Pixel helper reuses the already-installed
  `MetaPixel.tsx` flow; no GA, no third-party tracker added.
- ✅ No PII keys in payloads (statically enforced + runtime-audited).
- ✅ UI continues to work when analytics POST fails (fire-and-forget
  with `.catch(() => {})`).
- ✅ Existing P4 / P5 / matching flows behave identically (events are
  pure side effects).
- ✅ Git not pushed, "Save to GitHub" not used, deploy not triggered.

### Unresolved risks
1. **First-party logger drops extra fields server-side** (see above).
   Needs a backend follow-up to extend the `AnalyticsEvent` schema
   with the optional analytics keys. Until then, the Pixel channel
   carries the rich attribution.
2. **React Strict Mode dev double-fire** is visible but harmless in
   dev; production builds with React 18's stable concurrency don't
   double-mount. Useful as a smoke check that the latch resets
   per-mount.
3. **`articleAnalytics.ts` lives separately.** Considered consolidating
   into `trackPatientEvent`, but the two helpers serve different
   surfaces (blog vs patient) and the brief explicitly avoids touching
   blog tracking. Left as-is.
4. **No frontend test framework.** Per brief, did not invent one. Live
   smoke + TypeScript + payload-shape static enforcement give us
   reasonable coverage.

### Safe to proceed to Admin Rich Clinic Profile Editor?
✅ **Yes.** P6 only adds passive frontend instrumentation. No backend,
admin, or clinic-portal surface area changed. The patient flow is
unchanged. The Admin Rich Profile Editor batch can start cleanly.



## 2026-02-16 — Admin Consultation Requests — URL filter follow-up

Made `/admin/consultation-requests` honor `?status=` and `?created_from=`
query params from the dashboard CTA, so admins land directly on the
right tab. **Frontend only. No backend, no dashboard, no detail-page
changes.**

### Files touched
- `frontend/app/admin/consultation-requests/page.tsx` — added
  `useSearchParams()` import + `tabFromSearchParams()` pure helper +
  initialised the `tab` state via `useState(() => tabFromSearchParams(searchParams))`.
- `memory/CHANGELOG.md`.

### Supported URL params (priority order)
1. `status=needs_zubite_review`              → tab **Чака преглед** (`awaiting_review`)
2. `created_from=assisted_choice_flow`       → tab **Помощ от Zubite** (`assisted_choice`)
3. `created_from=recommended_clinics_flow`   → tab **Избрана клиника** (`selected_clinic`)
- No params / unknown value → tab **Всички** (`all`)

### Tab/filter mapping
```
URL param                                       →  initial tab           →  backend filter applied
?status=needs_zubite_review                     →  awaiting_review       →  status=needs_zubite_review
?created_from=assisted_choice_flow              →  assisted_choice       →  created_from=assisted_choice_flow
?created_from=recommended_clinics_flow          →  selected_clinic       →  created_from=recommended_clinics_flow
(none)                                          →  all                   →  (no filter)
?status=unknown_value                           →  all                   →  (no filter)
?status=needs_zubite_review&created_from=…      →  awaiting_review       →  status=needs_zubite_review (priority)
```

### Dashboard CTA verification — live smoke
- Card click on `/admin/dashboard` → lands at
  `/admin/consultation-requests?status=needs_zubite_review` → tab
  `admin-cr-tab-awaiting_review` is `aria-pressed="true"` → exactly 1
  P5 row shown (the live `needs_zubite_review` queue). End-to-end
  confirmed.
- All 7 verification cases pass: 6 isolated URL cases + dashboard CTA.

### Behaviour notes
- **Initial-state only.** Once mounted, the user controls the tab via
  the on-page tab strip. We do NOT sync URL ↔ tab on subsequent clicks
  (out of scope; would require URL push on every tab change which
  changes browser history semantics).
- No backend query-shape change. The existing
  `GET /api/admin/consultation-requests?created_from=&status=` already
  supports all three values; the page just maps URL → tab → existing
  `buildQuery()` helper.

### TypeScript
`tsc --noEmit` — clean for `consultation-requests/page.tsx`.

### Confirmation
- ✅ 0 backend files changed.
- ✅ 0 patient-flow files changed.
- ✅ 0 clinic-portal files changed.
- ✅ Admin dashboard untouched. Admin consultation-request **detail**
  page untouched.
- ✅ 0 auth / session / CSRF / audit / external-provider changes.
- ✅ 0 new dependencies — `useSearchParams` already part of
  `next/navigation`.

### Unresolved risks
1. **No two-way URL sync.** After the user clicks a different tab, the
   URL keeps the original `?status=` value. Harmless (the active tab
   wins for the actual data fetch), but means refresh re-applies the
   original filter, not the tab the user is currently looking at. By
   design — see "Initial-state only" above.
2. **Priority order is documented but invisible.** If a future
   integration sends both `?status=` and `?created_from=` (e.g. a
   bookmark or external link), only the status filter will be honored.
   Acceptable for the dashboard CTA's single intent.



## 2026-02-16 — LeadCaptureForm — Calm success-state copy

Removed the legacy "we'll call you back" promise from the
`LeadCaptureForm` quick-contact component (used on treatment landing
surfaces). **Copy-only. No flow change, no redirect into matching, no
backend changes.**

### Files touched
- `frontend/components/LeadCaptureForm.tsx` — replaced success state
  and tweaked form header line. Added `data-testid` hooks
  (`lead-form-success`, `lead-form-success-cta`).
- `memory/CHANGELOG.md`.

### Old copy removed
- Header sub-line: "Ще се свържем с вас скоро"
- Success title: "Благодарим!"
- Success body: "Нашият екип ще се свърже с вас скоро."

### New copy added
- Header sub-line: "Ще получите кратка следваща стъпка от Zubite"
- Success title: **"Заявката е получена"**
- Success body: "Получихме информацията ви. За по-точна следваща стъпка
  можете да попълните кратката оценка на Zubite."
- **CTA added** (`data-testid="lead-form-success-cta"`,
  `href="/quiz"`, emerald-600 pill):
  **"Попълни 60-секундната оценка →"**
- Trust micro-note: "Zubite не поставя диагноза и не заменя преглед при
  лекар."

### CTA `/quiz` decision
The brief explicitly forbids redirecting `LeadCaptureForm` submissions
into the clinic matching flow (these forms don't capture enough
structured context to deep-link into `/results/[leadId]/clinics`). So
the CTA points to **`/quiz`** — the proper entry point to gather the
patient context that *does* enable the matching flow. The form
submission still calls the existing `createLead()` API as before;
nothing about the backend behaviour changes.

### Verification
- **No live URL exercises this component yet** — `LeadCaptureForm` is
  defined but not currently imported by any page (`grep -rln
  LeadCaptureForm /app/frontend --include="*.tsx"` returns only the
  component file itself). The component is dormant infrastructure for
  future treatment-specific landing surfaces. Code review confirms:
  - `submitted === true` branch returns the new success block.
  - The default header sub-line on `variant === 'default'` uses the new
    line.
- `tsc --noEmit` — clean for `LeadCaptureForm.tsx`. No new errors.

### Confirmation
- ✅ 0 backend files changed.
- ✅ MasterQuiz.tsx untouched. quiz/success page untouched. Results
  routes untouched. Clinic matching pages untouched.
- ✅ 0 admin / clinic-portal changes.
- ✅ 0 auth / session / CSRF / external-provider changes.
- ✅ No redirect to `/results/[leadId]/clinics` — the CTA goes to
  `/quiz`, per the brief.
- ✅ No promises of automatic call, 24-hour callback, guaranteed
  consultation, booked appointment, diagnosis, or treatment approval.

### Unresolved risks
1. **Component is dormant.** Once `LeadCaptureForm` is wired into a
   treatment landing page, the new success state will render. Until
   then, the change is invisible to end users. Acceptable per the
   brief's scope.
2. **No analytics on the success-state CTA.** When the component is
   eventually used, we'll want to track the `lead-form-success-cta →
   /quiz` transition in P6 analytics.



## 2026-02-16 — Admin Dashboard — P5 Assisted-Choice Queue Counter

Surfaced the new `needs_zubite_review` triage queue at the top of the
admin dashboard, so admins see pending P5 requests the moment they log
in. **Existing endpoint reused; no backend changes, no new endpoints,
no external providers, no patient/clinic-portal modifications.**

### Files touched
- `frontend/app/admin/dashboard/page.tsx`:
  - Imported two extra `lucide-react` icons (`Sparkles`, `ArrowRight`) —
    no new dependency added (lucide already in `package.json`).
  - Added `assistedReviewCount` state + a parallel fetch inside
    `fetchData()` to `GET /api/admin/consultation-requests?status=needs_zubite_review`.
    The count = `response.requests.length`. Failure tolerated silently
    (sets `null` → loading skeleton).
  - Added new colocated `AssistedReviewQueueCard` component that
    renders one of 3 states (loading / empty / non-empty) and is
    placed **above the existing stats cards grid**.
- `memory/CHANGELOG.md`.
- **No backend changes.** No `frontend/lib/api.ts` change. No test file
  change.

### Endpoint reused
`GET /api/admin/consultation-requests?status=needs_zubite_review` —
already shipped in the Admin Handling batch. Returns
`{requests: [...]}`. Dashboard takes `requests.length` as the count.

### Exact copy added
- Title: **Чакат преглед**
- Non-empty body: "Пациенти са поискали помощ от Zubite при избора на клиника."
- Empty body: "Няма заявки, които чакат преглед."
- CTA label: **Виж заявките**
- CTA target: `/admin/consultation-requests?status=needs_zubite_review`

### Zero-state behavior (`data-empty="true"`)
- Calm white card with slate-200 border.
- Sparkles icon dimmed to `text-slate-400`.
- No count pill rendered (so admin doesn't see "0").
- Copy: "Няма заявки, които чакат преглед."
- CTA still navigates (admin can land on filtered list to confirm).
- Hover lights up violet — preserves visual identity with the queue.

### Non-empty state (`data-empty="false"`)
- Violet-200 border + `bg-violet-50/60` background — matches the P5
  badge/row treatment from the Admin Handling batch.
- Violet-600 count pill with white digits (`data-testid="assisted-review-count"`).
- Copy in `text-violet-800/90`.
- CTA in solid `bg-violet-600 hover:bg-violet-700` — strong visual
  affordance without dominating the dashboard.

### CTA behavior
- Whole card is a Next.js `<Link>` — entire card area is clickable.
- Live smoke (preview env, admin@zubite.bg):
  - Card present, `data-empty="false"`, count badge `1`, copy and CTA
    text exactly as specified.
  - Click navigates to `/admin/consultation-requests?status=needs_zubite_review`
    (URL preserved by Next.js client router).

### Visual placement
```
Header
─────────────────────────────────────────────
Global message banner (when present)
[NEW] Чакат преглед card  ← P5 queue counter
4×stats cards (Общо лийдове / Зелени / Жълти / Червени)
Filters & Actions toolbar
Leads table
```
Compact (single row, `~88px` tall, full container width), does **not**
dominate the existing stats grid.

### TypeScript
`tsc --noEmit` — clean for `dashboard/page.tsx` (the only new error
flagged in the file at line 570 is a **pre-existing bug**
`!selectedIds.size === 0` unrelated to this batch).

### Confirmation
- ✅ Existing endpoint reused — no new backend route.
- ✅ 0 backend files changed.
- ✅ 0 patient-flow files changed.
- ✅ 0 clinic-portal files changed.
- ✅ Admin consultation-requests **list** page untouched (the CTA link
  uses the `?status=` query string per the brief; current list page
  doesn't auto-apply URL filters yet — see risks).
- ✅ Admin consultation-request **detail** page untouched.
- ✅ 0 auth / session / CSRF / audit-log / external-provider changes.
- ✅ No Resend / Twilio / ElevenLabs invocations triggered.
- ✅ No new dependencies.
- ✅ Git not pushed, "Save to GitHub" not used, deploy not triggered.

### Unresolved risks
1. **List page does not yet auto-apply `?status=` query string.** The
   CTA link uses `/admin/consultation-requests?status=needs_zubite_review`
   exactly as the brief requested, but the consultation-requests list
   page reads its filters from internal React state, not the URL. After
   navigating, admins still see the "Всички" tab and must click "Чака
   преглед" to apply the filter. This is a deliberate scope-limit (list
   page was not in the allowed-files list this batch). A one-line
   improvement in a follow-up batch would read `searchParams.get('status')`
   to initialize the tab state.
2. **Count is a real-time read on every fetchData() call.** Not cached
   — but the endpoint is fast and limited to admin auth, so this is
   fine. Worst case: extra ~50ms on dashboard load.
3. **No realtime push.** Admins who keep the dashboard open won't see
   new P5 submissions until they click Обнови. Polling could be added
   later if needed.
4. **Loading skeleton briefly visible.** While `assistedReviewCount`
   is `null` (initial mount and after refresh), a small pulsing card
   shows. Layout-stable; no flicker observed in smoke.



## 2026-02-16 — /za-kliniki — Neutral decision layer messaging section

Added a new B2B section that explicitly positions Zubite as a neutral
patient-decision layer (not a directory / lead marketplace), so clinic
owners reading `/za-kliniki` immediately understand they receive
informed patient demand, not cold price-shopping leads. **Frontend
copy + layout only. No backend, no form changes, no pricing.**

### Files touched
- `frontend/components/ForClinicsContent.tsx` — added
  `NeutralDecisionLayerSection` (~95 LOC) plus the `neutralLayerBullets`
  list, then wired it into the page between `<PartnerValueSection />`
  and `<FoundingPartnerSection />` (i.e. right after the partner-value
  stack, well before the application form).
- `memory/CHANGELOG.md`.

### Placement
```
HeroSection
ProblemSection
DifferentiationSection
ContextSection
HowItWorksSection
PartnerValueSection
NeutralDecisionLayerSection   ← NEW
FoundingPartnerSection
WhoItIsForSection
DashboardPreviewSection
ApplicationSection
FaqSection
```

### Exact copy added

- **Eyebrow** (`text-sky-600 uppercase tracking-[0.25em]`):
  `Неутрален слой между пациента и клиниката`

- **Title** (`data-testid="neutral-layer-title"`,
  `font-serif text-2xl→text-4xl`):
  **Не просто lead. По-информиран пациент.**

- **Body paragraphs** (`data-testid="neutral-layer-p1|2|3"`):
  1. "Zubite не изпраща пациента директно към произволен списък с клиники."
  2. "Първо помагаме на човека да подреди симптомите, притесненията и
     целта си в ясен процес. След това му показваме ограничен брой
     подходящи опции."
  3. "Ако пациентът не е сигурен коя клиника да избере, може да поиска
     помощ от Zubite като неутрален ориентиращ слой. Целта не е да
     поставяме диагноза, а да помогнем на пациента да направи по-ясна
     следваща стъпка."

- **Right-column eyebrow**:
  `Какво променя това за клиниката`

- **Bullets** (`data-testid="neutral-layer-bullets"`):
  - пациентът идва с повече контекст, не само с въпрос „колко струва"
  - вижда ограничен брой подходящи опции, не безкраен списък
  - може да поиска помощ от Zubite, ако не е сигурен
  - клиниката получава по-структурирана заявка
  - намалява хаотичното сравняване само по цена
  - партньорските клиники работят с по-информирани пациенти

- **Trust micro-note** under the bullets:
  "Zubite не поставя диагноза и не заменя преглед при лекар.
  Платформата помага на пациента да структурира контекста си преди
  разговора с клиниката."

- **CTA** (`data-testid="neutral-layer-cta"`, `href="#application"`,
  dark slate-900 pill):
  **Кандидатствайте като партньорска клиника →**

### Layout
- Desktop (`lg:`): 2-column grid `lg:grid-cols-[1.05fr,1fr]` —
  copy on the left, slate-50 bullets card on the right. Subtle
  sky-100/40 ambient blur in the background. `py-24 md:py-32`.
- Mobile (<`lg`): single column, copy then card. Card stays
  inside the `max-w-6xl mx-auto px-6 md:px-12` container, so no
  horizontal overflow.

### Verification (preview env, Feb 16 2026)
- Desktop 1280×900: `data-testid="clinics-neutral-layer"` rendered,
  title text exactly "Не просто lead. По-информиран пациент.",
  bullet count = 6, CTA label "Кандидатствайте като партньорска клиника",
  CTA `href="#application"`, application form still rendered on the
  page.
- Mobile 375×800: section rendered, application form rendered,
  `scrollWidth - clientWidth = 0` (no horizontal overflow).
- Forbidden-word audit (live DOM scan): **0 hits** for
  `медицинска консултация от Zubite`, `най-добра`, `топ клиника`,
  `гарантирани пациенти`, `гарантирани записвания`, `гарантиран старт`,
  `проверено качество`, `Zubite рейтинг`. The token `диагноза` appears
  only in negation contexts (`не поставяме диагноза`, `без диагноза`,
  `не поставя диагноза`) — exactly as required by the verbatim copy in
  the brief and consistent with the existing trust note.
- `tsc --noEmit`: clean for `ForClinicsContent.tsx` (no new errors).

### Confirmation
- ✅ 0 backend / API / schema files changed.
- ✅ 0 patient results / clinic portal / admin frontend files changed.
- ✅ 0 auth / session / CSRF / quiz / API payload changes.
- ✅ Application form behaviour (`#application`, submit endpoint, fields,
  validation) untouched — only a new CTA link points to its existing
  anchor.
- ✅ 0 new dependencies (`Compass` icon was already imported from
  `lucide-react`).
- ✅ No pricing, no monthly fees, no `лв` / `BGN` / `EUR` / `€` copy
  added.
- ✅ No clinical superiority / diagnostic / quality claims added.

### Unresolved risks
1. **Copy density on right-column card.** Six bullets fit comfortably
   on desktop and mobile, but if a future iteration adds a 7th item,
   the section may need to break into 2 columns of bullets.
2. **CTA stacking.** The page now has multiple `#application` CTAs
   (hero, partner-value, neutral-layer, founding-partner, FAQ).
   Tracking which CTA converts will need analytics wiring in P6.

### Ready for review
✅ Yes. Section is live in the preview env, mobile-safe, copy-locked
to the brief, no scope creep beyond the two allowed files.



## 2026-02-16 — Admin Handling — P4/P5 Patient Request Visibility & Triage

Added admin-side visibility and triage for patient-flow consultation
requests created by P4 (`recommended_clinics_flow`) and P5
(`assisted_choice_flow`). **Admin-only. No patient/clinic-portal flow,
no notifications, no Twilio/ElevenLabs/Resend, no auto-assignment.**

### Files touched

**Backend (3):**
- `backend/schemas.py` — added `needs_zubite_review` to
  `CONSULTATION_STATUS_VALUES` so the admin PATCH endpoint can transition
  rows in/out of the new triage status without 400.
- `backend/routers/consultations.py`:
  - `GET /api/admin/consultation-requests` — added `created_from` query
    param, whitelisted to `{recommended_clinics_flow, assisted_choice_flow}`
    (unknown values are silently ignored, behaving like "no filter").
    Also enriched the row payload with `assigned_clinic_city` (resolved
    from `clinics.city_name|city`) and `assigned_clinic_name` (resolved
    from `clinics.clinic_name|name`, supporting both schemas).
  - `GET /api/admin/consultation-requests/{id}` — added top-level
    `clinic_city` next to the existing `clinic_name`.
- `backend/tests/test_admin_patient_request_handling.py` (NEW, 12 cases) —
  **12/12 PASS** in 3.71s on isolated `zubite_test_admin_p4_p5_handling`
  DB. P4 regression (`test_patient_request_call.py`) and P5 regression
  (`test_patient_assisted_choice.py`) still **31/31** and **28/28** pass.

**Frontend (3):**
- `frontend/lib/consultationLabels.ts`:
  - Added `needs_zubite_review` to `STATUS_LABELS`
    (label: "Чака преглед", violet pill).
  - Extended `ConsultationRequest` type with the P4/P5 flow markers and
    consent fields (`created_from`, `selection_source`, `patient_message`,
    `consent_to_share_clinic*`, `consent_to_share_zubite*`,
    `assigned_clinic_city`).
  - Added `REQUEST_KIND_DESCRIPTORS` map + `requestKindFromCreatedFrom()`
    helper. Three kinds: `selected_clinic`, `assisted_choice`, `other`.
    Each carries a badge label, detail title/description, badge classes,
    and a row-accent class for visual stand-out on the list.
  - Added `SELECTION_SOURCE_LABELS` for BG copy of `selection_source`
    values (`matching_card`, `clinic_profile`, `matching_page`).
- `frontend/app/admin/consultation-requests/page.tsx` — full BG
  rewrite:
  - 4 tabs (`data-testid="admin-cr-tab-*"`): **Всички**,
    **Избрана клиника** (→`created_from=recommended_clinics_flow`),
    **Помощ от Zubite** (→`created_from=assisted_choice_flow`),
    **Чака преглед** (→`status=needs_zubite_review`).
  - Per-row badge "Пациентът избра клиника" (sky) or
    "Пациентът поиска помощ от Zubite" (violet). P5 rows also have a
    violet row-tint (`bg-violet-50/40`) and the clinic column shows
    "Без клиника · чака преглед" instead of the assign-clinic dropdown.
  - Footer count strip: total + per-kind sub-counts.
  - All BG labels: Пациент / Тип заявка / Лечение / Клиника / Статус /
    Създадена / Отвори.
- `frontend/app/admin/consultation-requests/[id]/page.tsx` — full BG
  rewrite + 3 new sections:
  - **"Тип заявка"** (`admin-cr-kind-section`) — explicit human
    sentence per kind:
    - selected → "Пациентът е избрал конкретна клиника." + sky-tinted
      box with the resolved clinic name / city / id.
    - assisted → "Пациентът не е сигурен коя клиника да избере и е
      поискал помощ от Zubite." (violet tint).
    Plus a "Източник на заявката" sub-line driven by `selection_source`.
  - **"Съобщение от пациента"** (`admin-cr-patient-message-section`) —
    rendered only when `patient_message` is non-empty. PII sensitivity
    note included.
  - **"Съгласие на пациента"** (`admin-cr-consent-section`) — split
    into two sub-blocks (clinic / Zubite). Each shows the consent type
    in BG, the timestamp, and the verbatim consent text in a quoted
    blockquote (`admin-cr-consent-clinic-text` / `-zubite-text`).
  - Existing event timeline + internal-note flow kept intact (BG
    relabel only).
- `memory/CHANGELOG.md`.

### Backend endpoint contract changes

**`GET /api/admin/consultation-requests`** — additive only.
```
Query params:
  status?       — single status string (unchanged)
  clinic_id?    — single clinic id (unchanged)
  created_from? — NEW. Whitelisted to {recommended_clinics_flow,
                  assisted_choice_flow}. Unknown values fall back
                  to "no filter".

Response row shape: existing fields + new
  - assigned_clinic_name (was already present)
  - assigned_clinic_city (NEW)
```

**`GET /api/admin/consultation-requests/{id}`** — additive only.
```
Response: existing keys + new top-level
  - clinic_city  (NEW; matches the clinic doc's city_name/city)
```

P4/P5 patient-flow fields already stored on the doc — `created_from`,
`selection_source`, `patient_message`, `consent_to_share_clinic*`,
`consent_to_share_zubite*` — are returned natively because the existing
endpoint projects only `{_id: 0}` (no field whitelist). They were never
hidden — they were just not surfaced in the admin UI.

### Bulgarian labels (exact)

| Тaб | Label | Filter |
|---|---|---|
| `admin-cr-tab-all` | Всички | (none) |
| `admin-cr-tab-selected_clinic` | Избрана клиника | `created_from=recommended_clinics_flow` |
| `admin-cr-tab-assisted_choice` | Помощ от Zubite | `created_from=assisted_choice_flow` |
| `admin-cr-tab-awaiting_review` | Чака преглед | `status=needs_zubite_review` |

| Kind badge | Color | Row tint |
|---|---|---|
| Пациентът избра клиника | sky | none |
| Пациентът поиска помощ от Zubite | violet | `bg-violet-50/40` |

| Status (new) | Label | Class |
|---|---|---|
| `needs_zubite_review` | Чака преглед | `bg-violet-100 text-violet-700` |

### How P4 (selected-clinic) requests display
- **List row**: sky badge "Пациентът избра клиника" + assign-clinic
  dropdown (existing) + status badge.
- **Detail page**: kind section title "Избрана клиника" with sub-card
  showing resolved clinic name, city, id. "Източник на заявката"
  line (`От картата в списъка` / `От профила на клиниката`). Consent
  section shows the "Споделяне на данните с избраната клиника" block
  with timestamp + verbatim consent text.

### How P5 (assisted-choice) requests display
- **List row**: violet badge "Пациентът поиска помощ от Zubite",
  violet row tint, clinic column reads "Без клиника · чака преглед"
  (no dropdown), status badge "Чака преглед".
- **Detail page**: violet-tinted kind section, title "Помощ от Zubite",
  description "Пациентът не е сигурен коя клиника да избере и е
  поискал помощ от Zubite." Patient message rendered in its own block
  with a PII sensitivity note. Consent section shows the "Споделяне на
  данните с екипа на Zubite" block.

### Privacy guarantees
- Clinic `password_hash`, `notification_email`, JWT secrets, and other
  secrets are **never** included in the list or detail payloads
  (asserted by `test_09_no_unsafe_fields_leak`).
- Patient PII (name, phone, email, message) is visible to the admin
  user — by design — but never to the clinic portal nor to
  unauthenticated clients.
- Clinic JWTs cannot access `/api/admin/consultation-requests*` —
  asserted by `test_07`.
- Unauthenticated requests are rejected — asserted by `test_08`.

### Tests
- `backend/tests/test_admin_patient_request_handling.py` — **12 / 12
  PASS** in 3.71s. Covers list + filter (created_from, status) +
  detail (P4 and P5) + access control (admin vs clinic vs anonymous) +
  PII / secret leak guard + status PATCH regression + the new
  `needs_zubite_review` status enum + note flow on a P5 row with
  `assigned_clinic_id=null`.
- Regression: `test_patient_request_call.py` → 31/31, the new status
  enum did not affect it. `test_patient_assisted_choice.py` → 28/28.

### TypeScript
`tsc --noEmit` clean for all touched files (no new errors).

### End-to-end smoke (preview env, admin@zubite.bg)
- List page (desktop 1440×900): 4 BG tabs render, 49 rows present,
  49 kind badges, P5 row visually distinct (violet badge + tint +
  "Без клиника · чака преглед" text).
- Click "Помощ от Zubite" tab → exactly 1 row (the existing live P5
  submission `7ea07968-…`).
- Open detail page → kind title "Помощ от Zubite", patient message
  rendered, "Съгласие на пациента" block with the verbatim
  REQUEST_ZUBITE_HELP_CONSENT_TEXT in a quoted blockquote. No
  "selected-clinic" sub-card (correct).

### Confirmation
- ✅ 0 patient-flow files changed (matching page, profile page, request
  modals, assisted-choice modal — all untouched).
- ✅ 0 clinic-portal files changed.
- ✅ 0 auth/session/CSRF/audit code changed beyond the existing
  `audit_log` calls inside the unchanged admin PATCH path.
- ✅ 0 external providers invoked (no Resend, no Twilio, no
  ElevenLabs). Existing module-level `_resend.Emails.send` mock in
  tests confirms.
- ✅ 0 auto-assignment of assisted-choice rows to clinics.
- ✅ 0 clinic notifications emitted.
- ✅ Assisted-choice rows are still **invisible** to the clinic portal —
  they carry `assigned_clinic_id=null` and the existing
  `/api/clinic/requests` filter excludes them.
- ✅ Git not pushed, "Save to GitHub" not used, deploy not triggered.

### Unresolved risks
1. **No bulk actions on the admin list.** Admin must open each P5 row
   one at a time. Acceptable for current volume; revisit if the
   `needs_zubite_review` queue grows.
2. **PATCH endpoint accepts `needs_zubite_review` for any doc.** An
   admin could in theory move a P4 row into this status. This is by
   design (manual triage / re-routing), but means clinic-portal-visible
   counts can change retroactively. Audit log captures the transition.
3. **Selection-source label fallback.** If the backend ever stores a
   new `selection_source` value not in `SELECTION_SOURCE_LABELS`, the
   UI falls back to the raw string. Not a correctness bug; just a copy
   gap to watch.
4. **Empty list filter `clinic_id`** is no-op for assisted-choice rows
   (they have `null` clinic). Mixing the clinic filter + Помощ от Zubite
   tab will return zero rows; this is correct behaviour but could be
   confusing — the tab visually fronts the intent.

### Safe to proceed?
- ✅ **Notifications batch**: Yes. The triage queue is now visible to
  admins, which is the precondition for adding admin email/SMS alerts
  on new P4/P5 submissions.
- ✅ **Analytics batch (P6)**: Yes. No dependency on this work.
- ⚠️ **Auto-clinic-assignment from the P5 detail page**: explicitly
  **deferred**. Would need: (a) admin-side clinic-picker that respects
  the same scoring rules as the patient-side P2 endpoint, (b) clear
  audit trail flagging "assigned manually by admin from assisted-choice
  queue", (c) decision on whether to notify the clinic. Out of this
  batch's scope.



## 2026-02-16 — Patient Layer — Batch P5: Assisted Choice ("Помогнете ми да избера")

Replaced the preview-only "Помогнете ми да избера" CTA with a real
concierge submit. Hard product rule **one lead = one active choice
path** is enforced server-side via the same `leads` document used by
P4. **No email/SMS/Twilio/ElevenLabs invoked. No clinic auto-selection.
No AI decision.** The flow only records the request in DB so admin can
handle it later.

### Files touched
**Backend (3):**
- `backend/schemas.py` — added `RequestZubiteHelpBody` (`phone`,
  `consent_to_share`, `message?` ≤1000 chars, `source:
  matching_page|clinic_profile`).
- `backend/routers/public.py`:
  - Added `POST /api/leads/{lead_id}/request-zubite-help` (rate-limited
    5/300s).
  - Extended `GET /api/leads/{lead_id}/selection-state` with explicit
    P5 fields (`has_selected_clinic`, `has_requested_zubite_help`,
    `assisted_choice_request_id`, `assisted_choice_status`,
    `assisted_choice_requested_at`, `assisted_choice_source`,
    `selected_clinic`).
  - Extended P4 `POST /request-call` with a new pre-check: if the lead
    already has `assisted_choice_request_id`, return 409 with
    `code="already_requested_zubite_help"`.
- `backend/tests/test_patient_assisted_choice.py` (NEW) —
  **28 / 28 PASS** in 0.74s on isolated `zubite_test_p5_assisted_choice`
  DB.

**Frontend (3):**
- `frontend/lib/api.ts` — added `RequestZubiteHelpBody`,
  `RequestZubiteHelpSuccess`, `PATIENT_ZUBITE_HELP_CONSENT_TEXT`
  constant + `postRequestZubiteHelp()` helper. `SelectionState` type
  extended with P5 fields.
- `frontend/components/patient/AssistedChoiceModal.tsx` (NEW,
  ~340 LOC) — real-submit modal with phone/message/consent. Phases:
  form / submitting / success / error. Surfaces `already_requested_clinic`
  inline with clinic info.
- `frontend/components/patient/ClinicRecommendationCard.tsx` —
  added `hasAssistedChoice` prop; new CTA state (Zubite-locked) with
  label "Вече поискахте помощ от Zubite"
  (`clinic-card-locked-by-assisted-{id}`).
- `frontend/app/results/[leadId]/clinics/page.tsx` — wires the real
  modal, adds the sky "Заявката е изпратена към Zubite." banner,
  flips the "Помогнете ми да избера" button between 3 states
  (submitted / locked-by-clinic / available), and passes
  `hasAssistedChoice` down to every card. The previous
  `AssistedNextStepModal` preview-only component is stubbed.
- `memory/CHANGELOG.md`.

### Endpoint contract

**`POST /api/leads/{lead_id}/request-zubite-help`** — rate-limited 5/300s.

**Request body:**
```json
{
  "phone": "string",
  "consent_to_share": true,
  "message": "optional ≤1000 chars",
  "source": "matching_page" | "clinic_profile"
}
```

**Response (200 success):**
```json
{
  "success": true,
  "request_id": "uuid",
  "message": "Заявката е изпратена към Zubite."
}
```

**Response (200 idempotent retry):** same shape with `"already_requested": true` and `"message": "Заявката вече е изпратена към Zubite."`.

**Response (409 selected-clinic conflict):**
```json
{
  "detail": {
    "success": false,
    "code": "already_requested_clinic",
    "clinic": {"id": "...", "name": "...", "city_name": "..."},
    "message": "Вече сте изпратили заявка към избрана клиника."
  }
}
```

**Response (422 consent/phone):** `code = "consent_required"` or `"phone_invalid"`.
**Response (404/410/429):** standard.

The P4 endpoint now also returns `409 already_requested_zubite_help` if
the lead has an active assisted-choice row.

### Updated `selection-state` shape
```jsonc
{
  "lead_id": "...",
  // P4 (backwards compatible)
  "has_request": false,                       // alias of has_selected_clinic
  "selected_clinic_id": null,
  "selected_clinic_request_id": null,
  "clinic_selection_source": null,
  "request_call_status": null,
  "selected_clinic_requested_at": null,
  "clinic": null,                              // present only when selected
  // P5
  "has_selected_clinic": false,
  "selected_clinic": null,
  "has_requested_zubite_help": false,
  "assisted_choice_request_id": null,
  "assisted_choice_status": null,
  "assisted_choice_requested_at": null,
  "assisted_choice_source": null
}
```

### DB fields written
**`consultation_requests` (new doc, no clinic assignment):**
```
id, lead_id, assigned_clinic_id = null,
source = "patient_requested_zubite_help",
created_from = "assisted_choice_flow",
selection_source = "matching_page" | "clinic_profile",
status = "needs_zubite_review",
patient_name/phone/email/city, treatment_interest, urgency, readiness,
quiz_result_id, utm_*, patient_message (≤1000 chars or null),
consent_to_share_zubite = true,
consent_to_share_zubite_at = ISO,
consent_to_share_zubite_text = REQUEST_ZUBITE_HELP_CONSENT_TEXT (verbatim BG),
created_at, updated_at.
```

**`leads` (atomic CAS update):**
```
assisted_choice_request_id, assisted_choice_requested_at,
assisted_choice_status = "requested", assisted_choice_source,
consent_to_share_zubite, consent_to_share_zubite_at,
phone (if patient edited).
```

### Mutual exclusion — "selected clinic OR assisted choice, not both"

The `leads` document is the single source of truth. Both endpoints use
**atomic CAS** with a guard filter that requires BOTH `selected_clinic_id`
AND `assisted_choice_request_id` to be unset/null/"":

1. **`request-zubite-help`**:
   - Pre-check rejects with 409 `already_requested_clinic` if
     `lead.selected_clinic_id` is set OR a flow consultation_request
     exists for `recommended_clinics_flow`.
   - Pre-check returns 200 idempotent retry if a prior assisted-choice
     row exists for this lead.
   - CAS pre-generates `req_id` and writes BOTH
     `assisted_choice_request_id` AND `assisted_choice_requested_at`
     inside the same `update_one`. The guard then locks out concurrent
     submits because `assisted_choice_requested_at` flips from absent →
     present.
2. **`request-call`** (P4 extension):
   - New pre-check rejects with 409 `already_requested_zubite_help` if
     `lead.assisted_choice_request_id` is set.
   - Existing CAS guard on `selected_clinic_id` unchanged.

In both flows, CAS loss → defensive re-read & branch to the right
duplicate response. Concurrent submits cannot create two rows
(test 16 covers this with `asyncio.gather`).

### Frontend behaviour
- **Banner mutual exclusion**: matching page renders either the
  emerald "Вече избрахте клиника" banner (P4) OR the sky "Заявката е
  изпратена към Zubite." banner (P5) — never both. Driven by
  `selection.has_selected_clinic` / `selection.has_requested_zubite_help`.
- **Clinic card CTA states** (4-way):
  1. `clinic-card-submitted-{id}` → green pill for the chosen clinic.
  2. `clinic-card-locked-by-assisted-{id}` → grey "Вече поискахте помощ от Zubite".
  3. `clinic-card-disabled-{id}` → grey "Вече избрахте клиника".
  4. `clinic-card-cta-{id}` → original primary button.
- **Assisted button states**:
  1. `assisted-choice-submitted` → green pill once submitted.
  2. `assisted-choice-locked-by-clinic` → grey "Вече избрахте клиника".
  3. `assisted-choice-btn` → original button.
- **Modal field gating**: submit disabled until phone has ≥6 digits AND
  consent box checked. Confirmed live during smoke.
- **Server-canonical state**: after submit, `onSuccess` refetches
  `getSelectionState` so the UI never relies on optimistic-only state
  across navigations.
- **Never fake success**: 4xx/5xx → inline rose error band; form
  remains usable.

### Clinic portal isolation
`assigned_clinic_id = null` on every assisted-choice row. All existing
clinic-portal queries in `backend/routers/consultations.py` filter by
`assigned_clinic_id == <clinic_id>` (line 344), so a row with `null`
never matches any clinic. Test 13 confirms: querying
`{"assigned_clinic_id": clinic}` returns nothing; querying
`{"assigned_clinic_id": {"$ne": null}}` returns nothing either.

### Admin visibility (deferred)
No admin UI for assisted-choice was built in P5. Admins can inspect the
rows manually with:
```js
db.consultation_requests.find({
  created_from: "assisted_choice_flow",
  status: "needs_zubite_review"
})
```
A future admin batch should add a filtered list / kanban for these.

### Test results
- `backend/tests/test_patient_assisted_choice.py` — **28 / 28 PASS**.
  Covers all 20 required scenarios + 7 boundary/parametrize cases +
  selection-state neither-path case.
- P4 regression: `test_patient_request_call.py` → **31 / 31 PASS**
  (after extending the request-call endpoint with the new mutual-
  exclusion pre-check).
- No external provider called — `_resend.Emails.send.assert_not_called()`
  passes (test 14).

### End-to-end smoke (preview env)
- INIT: 3 primary clinic CTAs, 1 assisted button, 0 banners.
- Open assisted modal → title "Помогнете ми да избера", submit disabled.
- Fill phone + message + consent → submit enabled → 200 success.
- AFTER_SUBMIT: 1 sky banner, 1 assisted-submitted pill, 3
  `clinic-card-locked-by-assisted-*` pills, 0 primary CTAs.
- Refresh → all 3 lock-by-assisted CTAs and banner persist (server-canonical).
- Mobile 375×800 → `overflow_px = 0`.

### TypeScript
`tsc --noEmit` clean for all touched files.

### Confirmation
- ✅ 0 admin / clinic portal UI files changed.
- ✅ 0 emails / SMS / Twilio / ElevenLabs / Resend invocations.
- ✅ Assisted-choice rows are invisible to every clinic portal query.
- ✅ Mutual exclusion enforced both directions
  (clinic → blocks help; help → blocks clinic).
- ✅ No clinic auto-selection. No AI decision.
- ✅ Optional `message` field — Pydantic-bounded to 1000 chars,
  whitespace-only normalised to `null`, oversize rejected with 422.

### Unresolved risks
1. **No admin UI for `needs_zubite_review` queue.** Admins must use a
   shell query until the next admin batch lands.
2. **`patient_message` is free text.** No PII redaction; admin should
   handle it sensitively. Length is bounded (≤1000) so DB rows stay
   compact.
3. **No follow-up workflow yet** for what happens after an
   assisted-choice row exists. Patient receives no email/SMS
   confirmation (by design — this batch creates the record only).
4. **`status="needs_zubite_review"` is a new enum value.** Clinic
   portal queries already filter by `assigned_clinic_id`, so this
   never reaches them, but any future admin UI must whitelist this
   status explicitly.
5. **CAS guard uses `assisted_choice_requested_at`**, not the request
   id, as the lock token because we now pre-generate `req_id` inside
   the CAS `$set`. Either field would work; ordering picked for clearer
   semantic auditing.

### P5 complete?
**Yes.** Patient layer now offers a complete dual-path decision flow:
choose-a-clinic OR ask-Zubite, never both, server-canonical state,
audit-ready, isolated tests. Safe to proceed to admin / notification
batch when ready.



## 2026-02-16 — Patient Layer — Batch P4: Request Call Flow (REAL submit)

Replaced the preview-only "Искам обаждане" modals on the matching page
and the clinic profile with a real submit flow. Patient now selects
**exactly one** clinic from the recommended set, confirms phone +
consent, and the system creates a single `consultation_request` (status
`assigned`) for that clinic only. **No email/SMS/Twilio/ElevenLabs is
invoked.** Hard rule "1 lead = 1 clinic request" is enforced server-side
via atomic CAS on the `leads` document plus a flow-tagged duplicate
guard against `consultation_requests`.

### Files touched
**Backend** (3 files):
- `backend/schemas.py` — added `RequestCallBody` (Pydantic model with
  `clinic_id`, `phone`, `consent_to_share`, `source: matching_card|clinic_profile`).
- `backend/routers/public.py` — added two endpoints:
  - `POST /api/leads/{lead_id}/request-call` (rate-limited 5/300s).
  - `GET /api/leads/{lead_id}/selection-state` (read-only, used by
    frontend after refresh/navigation to reconstruct submitted state).
- `backend/tests/test_patient_request_call.py` (NEW) — **31 cases,
  all PASS** in 0.75s on isolated `zubite_test_p4_request_call` DB.

**Frontend** (4 files):
- `frontend/lib/api.ts` — added `RequestCallBody`, `RequestCallSuccess`,
  `SelectionState` types + `postRequestCall()`, `getSelectionState()`
  helpers + `PATIENT_CONSENT_TEXT` constant (mirrors backend verbatim).
- `frontend/components/patient/RequestCallModal.tsx` (NEW, ~340 LOC) —
  real-submit modal with 3 phases (form / submitting / success / error).
  Inline 409 / 422 / generic error handling. Hot rules: never fake
  success, never call backend twice.
- `frontend/components/patient/ClinicRecommendationCard.tsx` — replaced
  the preview-only `NextStepModal` with the new modal; CTA now has 3
  states (active / submitted / disabled) driven by `selectedClinicId`
  prop.
- `frontend/app/results/[leadId]/clinics/page.tsx` — fetches
  `getSelectionState` in parallel; passes `selectedClinicId` +
  `onSubmitted` to all cards; renders a green "Вече избрахте клиника"
  banner above the grid when applicable.
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` — same
  selection-state fetch; passes `isThisSelected` / `hasAnySelection` to
  `CompactHero`, `PremiumHero`, and the bottom CTA; introduces tiny
  `RequestCallCta` helper that renders one of 3 states with a stable
  base `data-testid`.
- `memory/CHANGELOG.md`.

### Endpoint

**`POST /api/leads/{lead_id}/request-call`** — rate-limited 5/300s.

**Request body:**
```json
{
  "clinic_id": "string",
  "phone": "string",
  "consent_to_share": true,
  "source": "matching_card" | "clinic_profile"
}
```

**Response (200 success):**
```json
{
  "success": true,
  "request_id": "uuid",
  "clinic": { "id": "...", "name": "...", "city_name": "..." },
  "message": "Заявката е изпратена към избраната клиника."
}
```

**Response (200 idempotent retry — same clinic):** same shape with
`"already_requested": true` and `"message": "Заявката вече е изпратена…"`.

**Response (409 different-clinic duplicate):**
```json
{
  "detail": {
    "success": false,
    "code": "already_requested",
    "clinic": { "id": "...", "name": "...", "city_name": "..." },
    "message": "Вече сте изпратили заявка към клиника за този резултат."
  }
}
```

**Response (400 not-in-recommendations):**
```json
{
  "detail": {
    "success": false,
    "code": "clinic_not_in_recommendations",
    "message": "Тази клиника не е част от препоръките за този резултат."
  }
}
```

**Response (422 consent_required / phone_invalid):**
- `code: "consent_required"` → "Необходимо е съгласие, за да споделим заявката с избраната клиника."
- `code: "phone_invalid"` → "Моля, въведете валиден телефонен номер."

Other status codes: `404` (lead missing), `410` (lead expired beyond
the recommendation window), `429` (rate-limited).

### Database fields written

**On `consultation_requests` (new doc):**
```
id, patient_name, patient_phone, patient_email, patient_city,
treatment_interest, urgency, readiness, quiz_result_id, lead_id,
source = "patient_selected_clinic",
created_from = "recommended_clinics_flow",
selection_source = "matching_card" | "clinic_profile",
utm_*, assigned_clinic_id, status = "assigned",
assigned_at, clinic_viewed_at=null, first_action_at=null,
call_attempted_at=null, patient_contacted_at=null,
appointment_booked_at=null, attended_at=null, no_show_at=null,
cancelled_at=null, notes=null,
consent_to_share_clinic = true,
consent_to_share_clinic_at = ISO,
consent_to_share_clinic_text = REQUEST_CALL_CONSENT_TEXT (verbatim BG),
created_at, updated_at.
```

**On `leads` (atomic update):**
```
selected_clinic_id, selected_clinic_requested_at, selected_clinic_request_id,
clinic_selection_source, request_call_status = "requested",
consent_to_share_clinic = true, consent_to_share_clinic_at,
phone  (if patient edited it in the modal).
```

### Exactly how "1 lead = 1 clinic" is enforced

1. **Pre-write idempotency check** reads `lead.selected_clinic_id` AND
   queries `consultation_requests` for any doc with
   `lead_id == X AND created_from == "recommended_clinics_flow"`.
   Either signal blocks creation.
2. **Atomic CAS on the lead doc** — `update_one` with a guard filter
   `selected_clinic_id` in `{not exists, null, ""}`. Only the first
   POST in a concurrent race finds the lead "unpinned" and gets
   `modified_count == 1`. The loser falls into the duplicate path.
3. **Defensive re-read after CAS loss** — if CAS fails we re-read the
   lead state and return 200 (same clinic → idempotent) or 409
   (different clinic), with the existing clinic info.
4. **Backend explicitly does NOT call any helper that fans out to all
   recommended clinics.** The doc is built inline in this endpoint
   from `fresh_lead` + the server-validated `selected_clinic`.

### Clinic-not-in-recommendations enforcement
The endpoint re-runs the EXACT scoring pipeline used by
`GET /recommended-clinics` (`_is_clinic_visible`, `_score_clinic`,
deterministic sort, top-3 slice). The client's `clinic_id` must be in
that server-computed set — there is no client-supplied list to trust.
City-mismatch, inactive, missing-treatment, or 4th+ rank → 400 with
`code=clinic_not_in_recommendations`.

### Consent storage
- Backend constant `REQUEST_CALL_CONSENT_TEXT` (BG verbatim) is stored
  on the consultation_request AND echoed by the frontend constant
  `PATIENT_CONSENT_TEXT` so the text shown to the patient is exactly
  what is persisted.
- `consent_to_share_clinic_at` is set server-side from
  `datetime.now(timezone.utc).isoformat()` — never client-supplied.
- The lead doc carries the same `consent_to_share_clinic` + timestamp
  for direct audit replay.

### Frontend modal behavior
- Open from: card `Искам обаждане` button → `source=matching_card`;
  profile top/bottom CTA → `source=clinic_profile`.
- Submit disabled until both: phone has ≥6 digits AND consent box
  checked. Pre-submit gating confirmed live: empty → disabled, phone
  alone → disabled, phone + consent → enabled.
- During submit: button label switches to "Изпращане…", modal close +
  Esc disabled.
- 200 success → green confirmation panel + close button. Parent's
  `onSuccess` callback patches local selection state immediately so
  sibling cards / hero CTAs update without round-trip.
- 409 → amber duplicate panel with the already-selected clinic name;
  the parent receives a synthetic success so the UI reflects the
  server's view even when the local state was out of date.
- Other 4xx/5xx → inline rose error band ("Възникна грешка."); form
  stays open and re-submittable. **Never fake success.**

### Success / duplicate state across pages
- Persistent state is canonical on the server (`GET /selection-state`).
- Both the matching page and the profile page call it in parallel
  with the recommendation fetch.
- After refresh, navigation, or even cross-device retry the UI
  reconstructs the submitted state from the server.
- Card variants:
  - selected clinic → green `Заявката е изпратена` pill (`clinic-card-submitted-{id}`)
  - non-selected → disabled `Вече избрахте клиника` button (`clinic-card-disabled-{id}`)
  - none → original `Искам обаждане` button (`clinic-card-cta-{id}`)
- Profile hero/bottom CTAs use the same 3-state `RequestCallCta`
  with derived testids: `profile-top-cta` / `profile-top-cta-submitted`
  / `profile-top-cta-disabled`; same for `profile-bottom-cta-*`.

### Selected clinic visibility in clinic portal
Verified: the new consultation_request is stored with
`assigned_clinic_id=<selected_id>` and `status="assigned"` — exactly
the shape that the existing `/api/clinic/requests` endpoint
(`backend/routers/consultations.py:344`) queries. Cross-clinic isolation
is preserved (test 14 + 15 confirm only the assigned clinic sees the
row). No backend portal changes required.

### Test results
- `backend/tests/test_patient_request_call.py` — **31 / 31 PASS**
  (`pytest tests/test_patient_request_call.py -v --tb=short`, 0.75s).
- Existing P2 reco tests still pass when run individually (28 / 28).
- Existing R1 review-signals tests still pass when run individually
  (23 / 23).
- Total backend test footprint added by P4: 31 cases covering all
  20 required scenarios plus 5 boundary/parametrize cases.

### End-to-end smoke (preview env, against real backend)
- Lead `4bb3b171-…` (Sofia, braces_adult).
- Submit from matching card for **Test Clinic For Email** (Featured):
  modal opens → gated submit → 200 success → matching grid shows
  1 submitted pill + 2 disabled + green banner.
- Refresh → state persists.
- Navigate to **Sofia Premium Clinic** profile → top+bottom CTAs
  switch to `disabled` ("Вече избрахте клиника"), already-selected
  banner shown.
- Navigate to **Test Clinic For Email** profile → green
  `Заявката е изпратена` pill on top+bottom.
- DB inspection: exactly 1 consultation_request, with
  `consent_to_share_clinic_text` verbatim BG, `assigned_clinic_id`
  matching the selected clinic, `selection_source="matching_card"`.

### TypeScript
`tsc --noEmit` clean for all touched files (pre-existing errors in
admin pages unrelated).

### Confirmation
- ✅ 0 admin / clinic portal UI files changed.
- ✅ 0 emails / SMS / Twilio / ElevenLabs / Resend invoked.
  Resend `.send` is asserted NOT called by `test_16`.
- ✅ 0 multi-clinic fan-out. Only the selected clinic receives a
  consultation_request.
- ✅ 0 mutation of unrelated lead fields (test 19 keeps name, email,
  score_total, band, answers untouched).
- ✅ Assisted choice ("Помогнете ми да избера") remains preview-only;
  unchanged in this batch.

### Unresolved risks
1. **No `selected_clinic_id` index yet.** Single-doc CAS is correct on
   any Mongo version; an index on `(lead_id)` of `consultation_requests`
   would slightly speed up the duplicate guard. We can add an index in
   P5 or with the next admin maintenance pass.
2. **`request_call_status` enum is single-valued ("requested") for now.**
   When notification fan-out lands in P6, we'll extend with
   `notified` / `accepted` / `cancelled` etc.
3. **Phone validation is intentionally permissive** (≥6 digits, optional
   `+`). The clinic portal will see whatever the patient supplied.
   Strict E.164 BG validation should land alongside the notification
   batch so we don't reject international numbers prematurely.
4. **Patient name is empty on the consultation_request** for leads
   that didn't go through a "contact" submit before P4 (the quiz flow
   doesn't yet collect name). This is consistent with existing
   behavior — the clinic portal already handles empty `patient_name`.
5. **`selected_clinic_request_id` backfill** in step 9 is not part of
   the CAS — it's a second `update_one`. In a crash window between
   steps 7-8-9, the lead is pinned but `request_id` is null. The flow
   re-detects this on retry via the cross-check in step 6 and returns
   the existing request id from the consultation_request.

### Safe to proceed to P5 (Assisted choice)?
**Yes.** P4 is complete and self-contained; the patient layer now has a
fully operational, single-clinic, audit-ready request-call flow.



## 2026-02-16 — Patient Layer — Batch P3.7: Premium-only Profile Sections

Added five **Premium-tier-only** profile sections (Case Library,
Doctor Spotlight, Patient Journey, Zubite Feedback placeholder; plus the
existing Environment/equipment block reordered into the new sequence) so
the demo clearly shows what commercial tier unlocks on the
patient-facing profile. **Frontend only. No backend, no submit, no fake
clinical content.**

### Files touched
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` — added 4
  new colocated subcomponents (`CaseLibrarySection`,
  `DoctorSpotlightSection`, `PatientJourneySection`,
  `ZubiteFeedbackPlaceholderSection`); restructured premium-branch
  rendering to the spec'd order. Featured/Standard branches untouched.
- `memory/CHANGELOG.md`.

### Final Premium section order (post-P3.7)
1. Hero (2-column)
2. Видео представяне (+ 2 video placeholders)
3. Защо виждате тази клиника
4. Подходяща за
5. Отзиви и доверие *(only if `review_signals` present)*
6. **Библиотека със случаи**  ← NEW
7. **Водещ лекар / екип**  ← NEW (replaces P3.6 "Екип и лекари")
8. Среда и оборудване
9. **Как протича първата стъпка** (Patient Journey)  ← NEW (replaces P3.6 "Какво да очаквате")
10. **Обратна връзка от пациенти през Zubite**  ← NEW
11. Bottom CTA + trust note

For Featured and Standard tiers, the generic "Какво да очаквате при
първата стъпка" block is still rendered (only Premium opts out, since
it has the richer Patient Journey).

### Exact placeholder copy

**Case Library** (`profile-case-library-section`):
> Тук Premium клиниката ще може да покаже завършени случаи, когато има
> разрешение за споделяне и съдържанието е одобрено.

3 case cards (`profile-case-card-aligners` / `-orthodontics` / `-aesthetic`):
- Subtitle: **Завършен случай**
- Title: **Алайнери** / **Ортодонтско лечение** / **Естетично лечение**
- Body: **Очаква реално съдържание от клиниката.**
- Visual style: dashed border, muted slate-50/60 background, small
  "Очаква съдържание" pill in the top-right of each card.
- **No before/after imagery. No patient names. No durations. No outcomes.**

**Doctor Spotlight** (`profile-doctor-spotlight-section`):
> Тук клиниката ще може да представи водещ лекар или екип, който работи
> по този тип случаи.
- Avatar = circle with neutral `UserCircle2` icon (`profile-doctor-avatar-placeholder`).
- Body: **Информацията за екипа ще бъде добавена от клиниката.**
- Honesty stamp: **Все още не е добавено**
- **No fake doctor name. No bio. No years of experience.**

**Patient Journey** (`profile-patient-journey-section`):
- Intro: "След като заявите обаждане, клиниката ще получи вашата заявка
  през Zubite. След това ще може да се свърже с вас, за да уточни дали
  е подходящо да запазите консултация."
- 4-step ordered list (`profile-patient-journey-steps`):
  1. Избирате клиника
  2. Потвърждавате телефон и съгласие
  3. Клиниката получава заявката
  4. Уточнявате следващата стъпка
- **No "guaranteed appointment". No "Zubite provides diagnosis".**

**Zubite Feedback Placeholder** (`profile-zubite-feedback-section`):
> Тук ще се показва структурирана обратна връзка от пациенти, които са
> минали през Zubite процеса, когато има достатъчно реални данни.

Empty state (`profile-zubite-feedback-empty`):
> Все още няма достатъчно данни за публично обобщение.

- **No fake ratings, testimonials, quotes, or aggregate scores.**

### Tier visibility behavior (smoke-test confirmed)

| Section | Standard | Featured | Premium |
|---|:-:|:-:|:-:|
| `profile-case-library-section` | 0 | 0 | **1** |
| `profile-case-card-*` cards | 0 | 0 | **3** |
| `profile-doctor-spotlight-section` | 0 | 0 | **1** |
| `profile-patient-journey-section` | 0 | 0 | **1** (4 steps) |
| `profile-zubite-feedback-section` | 0 | 0 | **1** |
| `profile-environment-section` | 0 | 0 | **1** |
| `profile-video-section` (P3.6) | 0 | 0 | **1** |
| Generic `profile-next-step-section` | 1 | 1 | **0** (replaced by Patient Journey) |
| `profile-about-section` (Featured-only) | 0 | 1 | 0 |
| `profile-featured-extra-section` | 0 | 1 | 0 |
| Premium tier labels | 0 | 0 | **6** |
| Featured tier labels | 0 | 2 | 0 |

### CTA behavior
Both `profile-top-cta` and `profile-bottom-cta` still open the same
preview-only `NextStepModal`. Smoke test confirms `modal=1` +
`aria-disabled="true"` on the internal CTA. **No backend POST. No
consultation request. No email.**

### Forbidden-content audit (live DOM, all 3 tiers)
Zero hits for: "най-добра", "топ клиника", "#1", "гарантирано",
"проверено качество", "certified", "recommended doctor", "expert pick",
"trust score", "overall score", "рейтинг на zubite", "успех",
"успеваем". No "д-р", "dr.", "доктор" tokens (no fake doctor names).

### Mobile (375×800 on Premium — the richest layout)
`scrollWidth - clientWidth = 0` → no horizontal overflow. Case-cards
grid collapses to 1 column, Patient Journey steps collapse to 1 column,
Doctor Spotlight flex stays within viewport.

### TypeScript
`tsc --noEmit` clean for all touched files. Note: replaced
non-existent `lucide-react` icon `Route` with `Footprints` (lucide
doesn't ship a `Route` icon in this version).

### Confirmation
- ✅ 0 backend / admin / clinic portal files changed.
- ✅ 0 external providers called.
- ✅ 0 new dependencies (only an additional icon import from the
  already-installed `lucide-react`).
- ✅ Premium-only sections render strictly when
  `partner_tier === 'premium' || placement_label === 'Premium партньор'`.
- ✅ No fake patient names / photos / before-after / outcomes /
  durations / awards / case studies / doctor names / testimonials /
  review videos / pricing / quality claims.



## 2026-02-16 — Patient Layer — Batch P3.6: Rich Clinic Profile Layout (tier-aware)

Upgraded the lead-contextual clinic profile to feel like a premium,
full-screen decision page on desktop — with **tier-aware** section
rendering. **Frontend only, same data source (`GET /api/leads/{lead_id}/recommended-clinics`).**
No new dependencies. No fake content.

### Files touched
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` — full rewrite
  of the profile body around a `resolveTier()` helper. New subcomponents
  (all colocated to keep file count low and changes contained):
  `PremiumHero`, `CompactHero`, `VideoIntroSection`, `VideoPlaceholderCard`,
  `ClinicImagePlaceholder`, `PlaceholderSection`, `TierLabel`.
- `memory/CHANGELOG.md`.
- (No backend / admin / clinic portal / external providers touched.)

### Tier resolution
```ts
isPremium  = partner_tier === 'premium'  || placement_label === 'Premium партньор'
isFeatured = partner_tier === 'featured' || placement_label === 'Представена клиника'
isStandard = !isPremium && !isFeatured
```
Container width also varies: Premium `max-w-6xl`, Featured `max-w-4xl`,
Standard `max-w-3xl` — so the page literally feels different per tier.
`<article data-tier="{tier}">` exposes the active tier to QA/automation.

### Sections by tier (final matrix)

| Section | Standard | Featured | Premium |
|---|:-:|:-:|:-:|
| Back link, name, city, top CTA | ✅ | ✅ | ✅ |
| **2-column hero w/ large image placeholder** | — | — | ✅ |
| Placement badge + disclosure | — | ✅ | ✅ |
| **Видео представяне** (clinic video + doctor video placeholders) | — | — | ✅ |
| Защо виждате тази клиника | ✅ | ✅ | ✅ |
| Подходяща за | ✅ | ✅ | ✅ |
| **За клиниката** placeholder | — | ✅ | ✅ |
| **Допълнителна информация от клиниката** (Featured-only) | — | ✅ | — |
| **Екип и лекари** placeholder | — | — | ✅ |
| **Среда и оборудване** placeholder | — | — | ✅ |
| Отзиви и доверие (only if `review_signals` present) | ✅* | ✅* | ✅* |
| Какво да очаквате при първата стъпка | ✅ | ✅ | ✅ |
| Bottom CTA + view-others | ✅ | ✅ | ✅ |
| Trust note | ✅ | ✅ | ✅ |

\* All tiers display review signals when admin has verified them — they
are not commercial; they are public confidence signals.

### Placeholder copy (exact)
- Image placeholder caption: **Снимка на клиниката** —
  "Клиниката все още не е добавила снимка към профила си."
- **Видео от клиниката**: "Тук клиниката ще може да добави кратко видео
  представяне на средата и начина на работа." + "Все още не е добавено"
- **Видео обръщение от водещ лекар**: "Тук водещ лекар от клиниката ще
  може да обясни подхода към първата консултация." + "Все още не е добавено"
- **За клиниката**: "Клиниката все още не е добавила подробно описание
  към профила си."
- **Екип и лекари**: "Информация за екипа ще бъде добавена от клиниката."
- **Среда и оборудване**: "Тук клиниката ще може да представи средата,
  технологиите и удобствата за пациента."
- **Допълнителна информация от клиниката** (Featured): "Тази секция е
  видима, защото клиниката е представен партньор в Zubite. Клиниката
  може да добави повече информация за пациентите."

### Tier labels on premium/featured sections
- **Premium секция**: "Видимо за пациенти, защото клиниката е Premium
  партньор в Zubite." (rendered via `title` attribute + visible pill).
- **Featured профил**: "Тази секция е видима, защото клиниката е
  представен партньор в Zubite."
- The labels exist so the demo clearly shows that **profile DEPTH /
  VISIBILITY** changes by tier — never clinical quality.

### Hero specifics
- **Premium hero**: 2-column grid (`lg:grid-cols-[1.1fr,1fr]`).
  Left column = badge, name (`text-3xl→text-5xl`), city, eyebrow
  "Профил на партньорска клиника в Zubite", reason summary, placement
  disclosure, primary + secondary CTAs, trust microcopy. Right column
  = large gradient image placeholder (`min-h-[420px]` on `lg`) with
  honest "Клиниката все още не е добавила снимка…" caption.
- **Compact hero** (Featured + Standard): single-column white card
  matching previous P3.5 design.

### CTA behavior (unchanged from P3.5)
All Request-Call CTAs (`profile-top-cta`, `profile-bottom-cta`) open
the same preview-only `NextStepModal` with inner CTA `disabled` +
`aria-disabled="true"`. **No backend submit, no consultation creation,
no email.**

### Smoke test results (desktop 1440×900 unless noted)

| Tier | Tier attr | Image | Video | Team | Env | About | Feat extra | Premium labels | Feat labels |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|---|
| PREMIUM (Sofia Premium Clinic) | premium | 1 | 1 (+2 cards) | 1 | 1 | 1 | 0 | 4 | 0 |
| FEATURED (Test Clinic For Email) | featured | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 2 |
| STANDARD (Test Diagnostic Clinic) | standard | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

- CTA preview-only confirmed: modal opens, internal CTA `aria-disabled="true"`.
- **Mobile 375px on Premium (richest layout)**: `overflow_px = 0`. All
  rich sections stack vertically via responsive `grid-cols-1` /
  `sm:grid-cols-2` etc.
- Forbidden-language audit (live DOM scan): zero hits of "най-добра",
  "топ клиника", "#1", "гарантирано", "проверено качество", "certified",
  "recommended doctor", "expert pick", "trust score", "overall score",
  "рейтинг на zubite" — on all three tier profiles.
- TypeScript `tsc --noEmit` clean for touched files.

### Backlog
> Richer public clinic profiles require admin-managed fields for clinic
> images, video URLs, doctor video, clinic description, team,
> environment, working hours and treatment focus. Until those fields
> exist in the backend schema and admin UI, the placeholder copy stays
> exactly as above — no real content will be fabricated.

### Confirmation
- ✅ 0 backend files changed (`git status` confirms).
- ✅ 0 admin / clinic portal files changed.
- ✅ 0 external providers called.
- ✅ 0 new dependencies.
- ✅ No fake clinic photos / doctors / videos / testimonials / awards /
  experience / case studies / availability / prices / success rates / rankings.
- ✅ Request-call flow remains preview-only.



## 2026-02-16 — /za-kliniki — Partner Terms section refinement

Reframed the existing `FoundingPartnerSection` into a confident
**Партньорски условия** section that explains early-stage individual
partnership terms — without introducing public pricing or a "contact us
for price" framing. Form and submission flow untouched.

### Files touched
- `frontend/components/ForClinicsContent.tsx` — `FoundingPartnerSection`
  rewritten: new title, three new paragraphs, six new bullets, new CTA
  linking to the existing `#application` anchor. Section's
  `data-testid="clinics-founding"` preserved.
- `memory/CHANGELOG.md`

### Exact copy added
- **Badge**: `Founding Partner — ограничен брой места`
- **Title**: `Партньорски условия`
- **Body paragraphs (3)**:
  1. "Zubite не работи като стандартен listing или масов lead marketplace."
  2. "В началния етап партньорските условия се обсъждат индивидуално
     според града, типа лечения, капацитета на клиниката и начина, по
     който искате да обработвате заявките."
  3. "Целта е да изградим партньорство, което има смисъл и за двете
     страни — не просто още един месечен абонамент."
- **Bullets** (`data-testid="partner-terms-list"`):
  - ограничен брой партньорски клиники в началния етап
  - условия според град, лечение и капацитет
  - достъп до партньорски dashboard
  - заявки с повече пациентски контекст
  - възможност за допълнителна видимост в каналите на Zubite
  - участие във формирането на early partner workflow
- **CTA** (`data-testid="partner-terms-cta"`, `href="#application"`):
  `Обсъдете партньорски условия`

### Pricing audit
A full grep confirmed the page never had public pricing, package tables,
monthly fees, "лв" / "BGN" / "EUR" / "€" / "цена" / "пакет" / "месечна
такса" copy. The only previous "price" mention is line 174 — a *patient*
quote about "пациенти, които питат само за цена" (unrelated, kept).
**No pricing was removed because there was none to remove. The new
section explicitly denies a flat-fee subscription framing.**

### Form behavior confirmation
- `data-testid="clinic-application-form"` still renders on both desktop
  and mobile (smoke test: `form_present=1` for both).
- Anchor `#application` unchanged.
- Submit endpoint and required fields unchanged.
- No API payload changes.

### Smoke test (Feb 16, 2026 — preview env)
- Desktop 1280×900: title rendered, marketplace line rendered, individual-
  terms line rendered, subscription-denial line rendered, 6 bullets,
  CTA "Обсъдете партньорски условия" with `href="#application"`, form
  present, no pricing words detected.
- Mobile 375×800: `overflow_px=0`, form present.
- TypeScript: `tsc --noEmit` clean for `ForClinicsContent.tsx`.

### Tone
Premium, confident, selective. Reads as "we are still choosing the
right clinics and cities", not "we are hiding the price".



## 2026-02-16 — Patient Layer — Batch P3.5: Lead-Contextual Clinic Profile

Patients can now open a read-only profile preview for each recommended
clinic from the matching shortlist. **No new backend endpoint, no
request-call submission, no consultation creation.** Profile is strictly
lead-contextual — reachable only via `/results/[leadId]/clinics/[clinicId]`.

### Phase 0 inspection result
No existing public/patient-facing clinic profile route was found. Closest
neighbours were `/app/clinic/*` (B2B portal), `/app/admin/clinics/*`
(admin-only), and `/app/za-kliniki` (B2B marketing landing). None were
suitable. New route created under `/app/results/[leadId]/clinics/[clinicId]`
so the profile stays bound to the lead context.

### Files touched
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` (NEW) —
  the profile page, including all 8 sections + 4 error states + skeleton
  loader + preview-only modal.
- `frontend/components/patient/ReviewSignalsSection.tsx` (NEW, ~115 LOC)
  — reusable review block, BG-localised plural ("отзив" / "отзива"),
  amber star icon, external links with `rel="noopener nofollow"` and
  `aria-label="Виж отзивите в {platform} (отваря нов прозорец)"`,
  date formatted DD.MM.YYYY, fallback disclaimer if backend disclaimer
  is missing.
- `frontend/components/patient/ClinicRecommendationCard.tsx` — dual CTA:
  primary `Виж профила` (Next.js `<Link>` to the profile route) +
  secondary `Искам обаждане` (still opens the preview-only `NextStepModal`).
  Card prop now requires `leadId`.
- `frontend/app/results/[leadId]/clinics/page.tsx` — passes `leadId={leadId}`
  to each card.
- `frontend/lib/api.ts` — extended `RecommendedClinic` type with the
  `review_signals?` object shape matching backend R1 contract.

### Data source
Single call to `GET /api/leads/{leadId}/recommended-clinics?limit=3`
(existing P2/R1 endpoint). The profile page locates the selected clinic
by `clinicId` inside the returned `clinics[]` array. If not found →
`clinic_not_in_list` error state with a back-to-list CTA.

### Card CTA changes (exact)
- Primary (filled sky): `Виж профила` → `<Link href="/results/{leadId}/clinics/{id}">` ; `data-testid="clinic-card-view-profile-{id}"`.
- Secondary (white, bordered): `Искам обаждане` → opens existing
  `NextStepModal` ; `data-testid="clinic-card-cta-{id}"`.
- **No backend call from either button.**

### Profile sections (in order)
1. Back link `← Назад към препоръчаните клиники`.
2. Header card: building icon, optional placement badge (Premium
   amber / Featured slate), clinic name, city with map-pin icon,
   placement disclosure (if present), top CTA `Искам обаждане от тази клиника`.
3. `Защо виждате тази клиника` — uses backend `clinic.reason` + a
   small explanatory line ("Тази препоръка е базирана на наличната
   партньорска информация, града и типа заявка.").
4. `Подходяща за` — treatment chips via `TREATMENT_LABELS`. Empty →
   "Информацията за конкретните направления ще бъде потвърдена при
   разговор." Optional `Партньор на Zubite от {YEAR}` line.
5. `Отзиви и доверие` — rendered **only** when
   `review_signals && sources.length > 0`. Star + platform label +
   rating + count in BG plural + external link. Standard clinics show
   nothing here (no empty section, no "няма отзиви").
6. `Какво се случва, ако изберете тази клиника` — exact required copy.
7. Bottom CTA row: repeat `Искам обаждане от тази клиника` + secondary
   `Виж другите препоръки` (link back to shortlist).
8. Trust note: "Zubite не поставя диагноза…".

### Tier visibility behavior
- `partner_tier === 'standard'` OR `placement_label` missing → no badge,
  no commercial section, no disclosure.
- `placement_label` present → badge (amber for premium, slate for featured)
  + disclosure text in the header card.

### Review signal behavior
- Section rendered only when `review_signals?.sources?.length > 0`.
- Each row: star + platform name (Google / Facebook / Superdoc) + rating
  (1 decimal) + count + optional external link (`target="_blank"`,
  `rel="noopener nofollow"`, BG `aria-label`).
- Date rendered DD.MM.YYYY (UTC). Disclaimer from backend, with safe
  fallback if absent.
- Standard clinic without review signals (Test Diagnostic Clinic) → 0
  review section rendered.

### Modal behavior (preview-only)
- Same disabled CTA pattern as the matching page.
- Title: `Следваща стъпка`, subtitle: `За {clinicName}`, body:
  exact required copy.
- The internal CTA is `disabled` + `aria-disabled="true"` ; label:
  `Ще бъде активирано в следващата стъпка`. **No backend call. No
  consultation request created.**

### Smoke test results (Feb 16, 2026 — preview env)
- Matching page (desktop 1280×900): `view_profile_btns=3`, `call_btns=3` ✅
- Profile page — Sofia Premium Clinic: name renders, `premium_badge=1`,
  `review_section=1`, `google=1`, `superdoc=1`, `last_checked=1`,
  `top_cta=1`, `bottom_cta=1`, `back=1`, `trust=1`, treatments rendered.
- Modal: `modal_shown=1`, `aria_disabled=true` (CTA correctly inert).
- Profile page — Test Diagnostic Clinic (standard): `premium=0`,
  `featured=0`, `review=0`, `treatments_empty=1` (empty-treatments
  fallback copy rendered).
- Profile page — unknown clinic UUID: `clinic_not_in_list error_shown=1`,
  `back_btn=1`.
- Mobile (375×800): `overflow_px=0` (no horizontal overflow).
- TypeScript: `tsc --noEmit` clean for all touched files.

### Forbidden ranking/marketing language audit
The profile page strings contain none of: "най-добра", "топ", "#1",
"гарантирано", "проверено качество", "certified", "recommended doctor",
"expert pick", "trust score", "overall score", "рейтинг на Zubite".

### Out of scope / backlog
- **Richer public clinic profiles require additional admin-managed
  clinic profile fields** (long description, doctors, opening hours,
  photos, certifications, language preferences). Not in P3.5 scope.
- R2 — Admin "Edit reviews" modal (R2 batch).
- P4 — `POST /api/leads/{id}/request-call` backend wiring (next batch).

### Confirmation
- 0 backend files changed (`git status` confirms only frontend + memory).
- 0 admin files changed.
- 0 clinic portal files changed.
- 0 external provider calls (no Resend/Twilio/ElevenLabs).
- 0 backend endpoints added.



## 2026-02-16 — Patient Layer — Review Signals R1 (Backend only)

Backend support for external review signals (Google / Superdoc / Facebook)
on the patient clinic matching response. **No scraping, no external API
calls, no frontend changes, no admin UI changes.** All signals are
display-only patient confidence cues — **never** affect ranking.

### Touched files
- `backend/schemas.py` — `ClinicAdminUpdate` extended with 11 optional fields:
  `google_rating/_review_count/_place_url`, `facebook_rating/_review_count/_page_url`,
  `superdoc_rating/_review_count/_profile_url`, `review_sources_last_checked_at`,
  `review_sources_verified_by_admin`. Rating bounded [0, 5], count [0, 100_000],
  URLs ≤500 chars. (URL host whitelisting is enforced at response-build time,
  not at write time — admin may store URLs, but unsafe ones never surface.)
- `backend/routers/public.py` — added:
  - `_REVIEW_HOST_WHITELIST` (Google: 6 hosts; Facebook: 4; Superdoc: 2) — **exact** host match, no wildcards.
  - `_is_safe_review_url()` — rejects non-http(s), userinfo (`@`), non-string, missing host, >500 chars.
  - `_coerce_rating()` / `_coerce_count()` — strict numeric coercion that **rejects bool**.
  - `_build_review_signals(clinic)` — gates publishing on `verified_by_admin === true`, drops sources with `review_count < 5`, missing rating, or unsafe URL. Returns `None` when nothing publishable.
  - `_score_clinic()` docstring updated: review signals are deliberately not read here. **Comment:** "External review signals are display-only patient confidence signals and must not affect ranking."
  - Projection in the `db.clinics.find(...)` call extended with the 11 review-signal field keys.
- `backend/tests/test_patient_recommended_clinics.py` — `ALLOWED_CLINIC_FIELDS` set extended with `"review_signals"` for regression safety.

### Response contract (additive, optional)
```jsonc
{
  // ...existing clinic keys...
  "review_signals": {                     // omitted entirely when none publishable
    "sources": [                          // deterministic order:
      { "platform": "google",     "rating": 4.7, "review_count": 213, "url": "https://maps.google.com/?cid=…" },
      { "platform": "superdoc",   "rating": 4.9, "review_count": 41,  "url": "https://superdoc.bg/clinic/…" },
      { "platform": "facebook",   "rating": 4.5, "review_count": 88,  "url": "https://www.facebook.com/…" }
    ],
    "last_checked_at": "2026-02-12T08:00:00Z",
    "disclaimer": "Данните са публични сигнали от външни платформи и може да се променят."
  }
}
```

### Hard rules enforced by code + tests
- `review_sources_verified_by_admin !== true` → no `review_signals` key.
- A source with rating missing / outside [1.0, 5.0] / non-numeric → dropped.
- `review_count < 5` → that source dropped.
- URL on a non-whitelisted host → dropped.
- URL with non-http(s) scheme (`javascript:`, `data:`, `file:`, `ftp:`, …) → dropped.
- URL with userinfo (`user@host`) → dropped.
- Hostnames are compared lower-cased, **exact match only** — no `*.google.com` patterns. `google.com.attacker.tld` is rejected.
- Boolean values for rating/count → rejected (not silently coerced to 1).
- No `trust_score`, `combined_rating`, `overall_score`, `ranking`, `review_texts`, `testimonials`, `reviewer_name`, `screenshot` keys — anywhere in the response.
- Source objects contain **only** `{platform, rating, review_count, url}`.
- Source order: **google → superdoc → facebook**, regardless of insertion order in the Mongo doc.

### Ranking guarantee
`_score_clinic` does not read any review-signal field. Test
`test_09_review_signals_do_not_change_order` proves two identical-tier
clinics retain their alphabetical tiebreak regardless of how rich one's
review profile is.

### Tests
- `backend/tests/test_patient_review_signals.py` (NEW) — **23 cases, all PASS** in 0.69s on isolated `zubite_test_r1_review_signals` DB:
  - `test_01_unverified_clinic_hides_review_signals`
  - `test_02_verified_valid_google_returns_source`
  - `test_03_review_count_below_five_hides_source` + `_03b_exactly_five_publishes` (boundary)
  - `test_04_unsafe_host_rejected` + `_04b_no_wildcard_bypass` + `_04c_userinfo_rejected`
  - `test_05_unsafe_scheme_rejected` × 7 parametrized cases (`javascript:`, `data:`, `file:`, `ftp:`, `/relative`, host-only, empty)
  - `test_06_deterministic_source_order`
  - `test_07_no_review_text_or_raw_fields_leak`
  - `test_08_no_aggregate_keys_anywhere`
  - `test_09_review_signals_do_not_change_order`
  - `test_10_admin_schema_rejects_invalid_rating_bounds`
  - `test_11_missing_url_hides_source` + `_11b_missing_rating_hides_source`
  - `test_12_standard_clinic_without_review_fields`
  - `test_13_boolean_values_rejected`
- **Regression**: `backend/tests/test_patient_recommended_clinics.py` — **28/28 pass** (no behavior change for non-review responses).

### Out of scope (next batches)
- R3 — patient UI rendering of review signals (next).
- R2 — admin "Edit reviews" modal in `/admin/clinics`.
- R4 — demo seed script (non-production DB only).



## 2026-02-16 — Patient Layer — Partner Tiers (UI badges, frontend-only)

Surfaces the already-shipped backend partner-tier fields on the patient
matching cards. **No backend changes; no new endpoints; no submit flows.**

### Touched files
- `frontend/lib/api.ts` — extended `RecommendedClinic` with optional fields:
  `partner_tier ("standard"|"featured"|"premium")`, `is_featured`,
  `placement_label`, `placement_disclosure`.
- `frontend/components/patient/ClinicRecommendationCard.tsx` — new local
  `PlacementBadge` subcomponent rendered only when `placement_label` is
  truthy and tier ∈ {premium, featured}. Premium = amber pill, Featured =
  slate pill (same visual weight, only hue differs). Disclosure rendered as
  small slate-400 helper text in the meta block, plus repeated via the
  badge's `title` attribute for native tooltip. Standard clinics render
  unchanged.
- `frontend/app/results/[leadId]/clinics/page.tsx` — general transparency
  note rendered above the grid, only when at least one returned clinic
  carries a `placement_label`:
  > "Някои партньорски клиники могат да имат допълнителна видимост в
  >  Zubite. Препоръките се съобразяват с вашия град и тип заявка."

### Copy (exact)
- Premium badge label: **Premium партньор**
- Featured badge label: **Представена клиника**
- Premium disclosure: "Тази клиника има допълнителна партньорска видимост в Zubite."
- Featured disclosure: "Тази клиника е представена като партньор на Zubite."

All copy is sourced verbatim from the backend (`backend/routers/public.py`
`_PLACEMENT_LABEL` / `_PLACEMENT_DISCLOSURE`); the frontend never hard-codes
tier labels and falls back cleanly when fields are absent.

### Ethical guarantees
- No words: "най-добра", "топ клиника", "#1", "гарантирано",
  "проверено качество", fake ratings, fake reviews, fake availability.
- Badge styling is intentionally quiet — not a medal, ribbon, or rank
  number.
- Standard clinics (label === null) render with **zero** visual change.

### Smoke test (Feb 16, 2026 — preview env)
- Lead `4bb3b171-…` (Sofia, braces_adult) → backend returned 3 clinics:
  premium, featured, standard.
- Desktop (1280×900): `premium_badges=1`, `featured_badges=1`,
  `placement_note=1`, `disclosures=2` (one per tier'd card).
- Mobile (390×844): `scrollWidth - clientWidth = 0` → no horizontal overflow.
- TypeScript: `tsc --noEmit` reports only pre-existing errors unrelated to
  touched files.

### New `data-testid`s
- `clinic-card-placement-row`
- `clinic-card-placement-premium`
- `clinic-card-placement-featured`
- `clinic-card-placement-disclosure`
- `match-placement-note`

### Status
UI integration complete. Awaiting user verification before proceeding to
Batch P4 (Request Call backend + frontend wiring).



## 2026-02-15 — Patient Layer — Batch P3 (Match page frontend)

### New patient-facing route
- `/results/[leadId]/clinics` — `frontend/app/results/[leadId]/clinics/page.tsx` (NEW, 263 LOC).
  - Fetches `GET /api/leads/{leadId}/recommended-clinics?limit=3` (P2 endpoint).
  - States: loading skeleton (3 cards), error (404/410/429/generic), 0-match (uses `ClinicMatchEmptyState`), 1–3 clinic cards in responsive grid.
  - **404** → "Не успяхме да намерим този резултат." + "Започни отново" CTA → `/quiz`.
  - **410** → "Този резултат е изтекъл." + "Започни отново" CTA → `/quiz`.
  - **429** → "Твърде много заявки. Опитайте отново след малко." + retry button.
  - **Generic** → safe BG message + retry.
  - Selection-rule banner echoing the product rule from backend response: "Може да разгледате до 3 клиники. Заявка за обаждане ще може да изпратите към 1 клиника."
  - Trust note: "Zubite не поставя диагноза и не заменя преглед при лекар…"
  - Assisted-choice panel ("Помогнете ми да избера") — non-submitting; opens preview modal with disabled CTA.

### New components (`frontend/components/patient/`)
- `ClinicRecommendationCard.tsx` (NEW, 138 LOC) — single clinic card. Whitelisted fields: name, city_name, treatments (BG labels from `TREATMENT_LABELS`), reason, response_expectation, partner_since_year. Primary CTA "Искам обаждане от тази клиника" **opens preview modal only** (`NextStepModal`) — disabled inner CTA, no backend POST.
- `ClinicMatchEmptyState.tsx` (NEW, 38 LOC) — 0-match honest state with disabled "Помогнете ми да избера · Скоро" button.

### Result page CTA wiring (`frontend/app/results/[leadId]/page.tsx`)
- Added `"Покажи ми 3 подходящи клиники"` button → `/results/${leadId}/clinics`, with `data-testid="show-3-clinics-btn"`. Existing "Към началото" link preserved.

### API helper (`frontend/lib/api.ts`, additive only)
- Added typed interfaces `RecommendedClinic` + `RecommendedClinicsResponse`.
- Added `getRecommendedClinics(leadId, limit=3)` helper.
- **Side-fix**: `getLead` and `getRecommendedClinics` both use the absolute-URL pattern (`process.env.NEXT_PUBLIC_API_URL + '/api/...'`) to work around the shared axios baseURL config that drops the `/api` prefix when env contains a full domain in preview. This unblocks the result page itself (pre-existing bug). Other helpers (createLead, updateLeadContact) unchanged — not in P3 critical path.

### P3 scope adherence
- ❌ No backend changes.
- ❌ No consultation_request created.
- ❌ No emails / Resend / Twilio / ElevenLabs.
- ❌ No new dependencies.
- ❌ No fake ratings / reviews / availability / "best clinic" claims.
- ❌ CTA buttons do NOT submit to backend in P3 — preview modals only with disabled inner CTAs marked "Ще бъде активирано в следващата стъпка".
- ✅ TypeScript: zero new errors from P3 files.
- ✅ Mobile 375×812: page-level overflow = 0.
- ✅ Live smoke verified end-to-end: result page CTA → match page → 3 cards rendered.



## 2026-02-15 — Patient Layer — Batch P2 (Recommended-clinics endpoint)

### Backend
- **NEW `GET /api/leads/{lead_id}/recommended-clinics?limit=N`** (`backend/routers/public.py`)
  - Public read endpoint. Returns up to 3 partner clinics matched deterministically against the lead's city + treatment.
  - Lead window: 7 days from `created_at` → 410 Gone after that. 404 if missing.
  - Hard safety filters across mixed clinic schemas:
    - **Negative signals**: `is_active=False`, `clinic_status ∈ {applicant, suspended, churned, paused}`, `status ∈ {suspended, churned, paused, applicant}` → excluded.
    - **Required positive signal**: at least one of `is_active=True`, `clinic_status ∈ {active_partner, evaluation_partner}`, `status=active`.
  - Scoring: same-city = +100 base (required), treatment match (legacy `treatments_supported` ∪ admin `treatments_offered`) = +50. Alphabetical name tie-breaker.
  - **No out-of-city auto-fill** to reach 3. Returns fewer if fewer match.
  - `treatment_type ∈ {diagnostic_quiz, master_quiz, general}` ⇒ city-only match (broad reason text "за първа консултация").
  - **Response whitelist** (only): `id, name, city_name, city_slug, treatments, reason, response_expectation, partner_since_year`. Forbidden fields (email/phone/password_hash/notification_email/owner_id/subscription_status/monthly_plan/description/internal_notes/address/is_active/status/clinic_status/_id) cannot leak.
  - **selection_rule** echoed every time: `{can_view_clinics: 3, can_request_call_from_clinics: 1, assisted_choice_available: true}`. Surfaces the product rule "view up to 3, call from 1".
  - Conservative `response_expectation` copy: "Клиниката ще получи заявката ви и ще може да се свърже с вас при потвърдено съгласие." **NO SLA promise.**
  - 0-match response: empty list + Bulgarian assisted-help message.
  - Rate-limited: 30 req / 300s per IP via existing `rate_limit("recommended_clinics", ...)`.

### Tests (`backend/tests/test_patient_recommended_clinics.py`, NEW, 16 cases)
- 01: lead not found → 404
- 02: lead older than window → 410
- 03: same-city + treatment match returns clinic with BG reason
- 04: forbidden fields whitelist check (seeded with real leak values, not just absence)
- 05: inactive / applicant / suspended clinics excluded
- 06: both `treatments_supported` AND `treatments_offered` matched
- 07: `master_quiz` ⇒ city-only match, broad reason text
- 08: returns fewer than 3 when only 1-2 clinics match
- 09: NO auto-fill with out-of-city clinics
- 10: 0 matches ⇒ empty clinics array + assisted_help_available + BG message + selection_rule still echoed
- 11: deterministic order (score desc, name asc), verified across 2 calls
- 12: selection_rule values exact
- 12b: limit=10 clamped to 3
- 13: rate limit eventually returns 429 after 32 requests
- 14: response_expectation copy NEVER contains "1 работен ден" / "24 часа" / SLA promises, MUST contain "съгласие"
- 15: lead with empty city_slug ⇒ honest empty payload (no crash)

**Result**: 16/16 passed (0.68s). Existing P2-E1 (43/43) and P2-E4 (22/22) regression suites still green in isolation.

### Safety
- No frontend touched. No clinic portal / admin / patient UI files changed.
- No consultation_requests created.
- No emails. Resend mocked. No Twilio/ElevenLabs calls.
- Production DB untouched (isolated `zubite_test_p2_reco` test DB).
- No new dependencies.

### Known limitations (documented for P3+)
- **Mixed clinic schema** not unified — endpoint reads both legacy (`name, city_slug, treatments_supported, is_active`) and admin (`clinic_name, city, treatments_offered, status, clinic_status`) shapes via runtime field detection. Admin-created docs with only free-text `city` (no `city_slug`) are mapped via the `CITIES` slug-name dict; unmapped names ⇒ clinic excluded. Tech debt deferred to P4 architecture cleanup.
- No public-visibility flag on clinic docs. We approximate visibility with the conservative allow-list of statuses above. If admin needs finer-grain control (e.g. partner-but-hidden), future field `clinic.public_visible: bool` should be added.
- No `accepting_new_patients` / capacity field — out of P2 scope.



## 2026-02-10 — Clinic Portal UX — Batch C4 (Dashboard Overview Redesign)

### Backend — `/api/clinic/dashboard-overview` enriched
- **`backend/routers/consultations.py`** — `clinic_dashboard_overview()` now also returns:
  - `weekly_trend`: array of 7 `{date, assigned, booked}` points covering the last 7 calendar days (UTC). Counts are derived from `assigned_at` / `appointment_booked_at` date prefixes against the current clinic's requests.
  - `top_active_requests`: up to 5 most-recently-created non-terminal requests `{id, patient_name, patient_phone, treatment_interest, urgency, status, created_at, assigned_at, appointment_booked_at}` (active = `new|assigned|clinic_viewed|call_attempted|no_answer|patient_contacted|booked|rescheduled`). Sorted by `created_at desc`.
- All existing KPI keys preserved (`new_requests`, `awaiting_action`, `booked_this_month`, `attended_this_month`, `no_show_this_month`, `avg_response_seconds`, `avg_time_to_book_seconds`). Regression test `test_11_dashboard_overview` still passes.

### Frontend — `/clinic/dashboard` redesigned (163 → 350 LOC)
- **NEW `frontend/components/clinic/WeeklyTrendChart.tsx`** (~145 LOC) — lightweight inline SVG line chart, **no dependency added**:
  - Two series (Назначени заявки sky-600 / Резервации emerald-600) with gradient area fill, dotted gridlines, daily x-axis labels in Bulgarian (`weekday: 'short'`), auto y-scale with 20% headroom, `data-testid="weekly-trend-chart"`.
- **`frontend/app/clinic/dashboard/page.tsx`** — full redesign:
  - **Hero KPIs**: 4 large cards (`grid-cols-2 lg:grid-cols-4`) — Нови / неназначени, Чакат действие, Резервирани (месец), Посетили (месец). Numeric values are emphasized when > 0 (slate-900) else dimmed (slate-400). First two cards surface contextual CTAs ("Реагирай сега" / "Прегледай заявките") only when count > 0.
  - **Chart + Active panel** (`lg:grid-cols-3`): WeeklyTrendChart takes 2/3 column; "Активни заявки" panel takes 1/3 — up to 5 rows of `{patient_name, phone, treatment, преди X}` with status badge, each row links to `/clinic/dashboard/requests/[id]`. Empty state: "Няма активни заявки в момента."
  - **Secondary stats**: 3 compact horizontal cards — Не се явили (месец), средно време до първо действие, средно време до резервация. Pulled out of the hero so the visual hierarchy stays clean.
  - **Tips card**: gradient `from-sky-50 to-white` border-sky-100, same 3-step guidance preserved.
  - **Skeleton loader**: replaces the previous "Зареждане…" plain text — full-fidelity pulse skeleton for hero, chart row, secondary row.
- All elements have `data-testid` (`kpi-new`, `kpi-awaiting`, `kpi-booked`, `kpi-attended`, `kpi-noshow`, `kpi-avg-response`, `kpi-avg-book`, `weekly-trend-section`, `weekly-trend-chart`, `top-active-requests-section`, `top-request-{id}`, `top-requests-all-link`).
- No `recharts` (or any other chart lib) added to `package.json`.

### Verification
- Backend regression: `pytest tests/test_consultation_workflow.py::test_11_dashboard_overview` ✅, `test_12_clinic_performance` ✅.
- Live preview (desktop 1440×900): hero shows real counts (2 / 2 / 0 / 0), chart renders 7-day series with the spike on today (2 назначени), Активни заявки panel lists "Тест Пациент" + "Test User" with Bulgarian "Назначена" badges. ✅
- Live preview (mobile 390×844): hero collapses to 2×2 grid, chart remains readable (horizontal scroll allowed via `min-w-[480px]`), no layout overflow. ✅
- `npx tsc --noEmit`: zero new TS errors. The pre-existing TS2802 (calendar) is unchanged.



## 2026-02-10 — Clinic Portal UX — Batch C3 (Requests List Mobile Cards & Polish)

### Frontend — clinic request list demo-readiness pass
- **`frontend/lib/consultationLabels.ts`** — added `timeSince(iso)` helper (returns `преди X сек/мин/ч/дни/седмици`, falls back to `formatDate` for >30 days or invalid input). Pure helper, zero deps.
- **NEW `frontend/components/clinic/RequestCard.tsx`** — clinic-only mobile card component:
  - Patient name + phone, status badge, treatment, city, readiness/urgency pills, relative time-since-assigned, "Отвори →" CTA.
  - Whole card is a `<Link>` to `/clinic/dashboard/requests/[id]`.
  - Sky-300 hover border, slate-50 active background.
- **`frontend/app/clinic/dashboard/requests/page.tsx`** — full rewrite of the list page (170 → 251 LOC):
  - **Three render branches**: `loading` (skeleton), `error` (rose chip + support email), `ready` (cards OR table OR empty state).
  - **Mobile** (< `md` ≈ 768px): `grid grid-cols-1 gap-3 md:hidden` of `RequestCard` instances.
  - **Desktop** (≥ `md`): unchanged-ish table with two readability fixes — `timeSince()` in the Назначена/Първо действие columns (full date in `title=` tooltip), filter chips are now pill-shaped (`rounded-full`) with `aria-pressed` for accessibility.
  - **Loading**: skeleton component renders 4 mobile pulse-cards + 5 desktop pulse-rows. Replaces the previous "Зареждане…" plain text.
  - **Error**: rose-bordered panel with AlertCircle icon + "Възникна грешка при зареждане" + support email. Network failures and 5xx land here. 401/403 still redirects to `/clinic` with localStorage cleanup (unchanged).
  - **Empty state**: now filter-aware. When `filter !== 'all'` or `search.trim().length > 0` and `requests.length > 0`, shows "Няма съвпадения за избрания филтър". Otherwise "Все още няма заявки". Inbox icon in sky-50 disc.
  - **Filter toolbar**: rounded-full pill chips, search placeholder now sentence-cased with ellipsis ("Търсене по име, телефон или лечение…"), `aria-pressed` on active chip, `shadow-sm` lift on active.
  - **Counter**: small `X от Y` badge in the header right-side, hidden during loading and when requests are empty.
- No backend changes. `/api/clinic/consultation-requests` payload unchanged.

### TypeScript
- `npx tsc --noEmit` — only the pre-existing `TS2802` (Map iteration in `calendar/page.tsx`, untouched). Zero new errors.

### Live preview verification
- Desktop 1920×800: table renders with relative times ("преди 5 дни"), Bulgarian status labels, "X от Y" counter, rounded filter pills.
- Filter "Посетили" returns matching rows (no empty state).
- Search "zzz_no_match_qwerty" → filter-aware empty state ("Няма съвпадения за избрания филтър"). ✅
- Mobile 375×812: no horizontal scroll (`scrollWidth > innerWidth` returns `false`). ✅
- First card link resolves to `/clinic/dashboard/requests/{id}`. ✅

### Explicitly out of scope of C3 (deferred)
- No dashboard overview redesign (C4).
- No calendar week-view (C5).
- No performance charts (C6).
- No login page polish (C7).
- No new backend endpoints / new filters.
- No image assets — empty/error states use existing lucide icons (Inbox / AlertCircle).


## 2026-02-10 — Clinic Portal UX — Batch C2 (Request Detail Hierarchy & Progress Strip)

### Frontend — clinic request detail clarity pass
- **`frontend/lib/consultationLabels.ts`** — extensions:
  - `PROGRESS_STAGES` (5-stage canonical workflow: Нова заявка → Видяна → Свързан пациент → Резервирана → Посетила).
  - `ProgressShape` discriminated union + `progressFromStatus(status)` helper. Terminal statuses (`no_show`, `patient_declined`, `not_suitable`, `cancelled`, `expired`, `disputed`) map to dedicated terminal banners with tone (`negative` / `neutral` / `positive`).
  - `ctaStageFromStatus(status)` → one of `contact | after_contact | after_booking | completed | unknown` for primary-CTA selection.
  - `EVENT_ACTOR_LABELS` + `inferEventActor(ev)` for human-readable actor pills on timeline entries (Клиника / Zubite / Админ / Система / Пациент).
- **NEW `frontend/components/clinic/RequestProgressStrip.tsx`** — small clinic-only component rendering either:
  - The 5-stage strip with completed stages in emerald + checkmark, the current stage in sky-blue with ring focus, future stages in slate.
  - A terminal banner (rose / slate / emerald based on tone) for closed-out requests.
  - Responsive: stages horizontally on desktop, compact icons + labels on mobile, no horizontal overflow at 375px.
- **`frontend/app/clinic/dashboard/requests/[id]/page.tsx`** — major restructure of the action panel + timeline:
  - **Progress strip** rendered at the very top of the detail (before the patient summary card).
  - **Action panel header changed** from "Действия" to context-aware "Какво следва?" with a 1-line subtitle that explains the recommended next step per stage.
  - **Contextual primary CTA** (replaces the previous flat two-row layout):
    - `contact` stage (`new` / `assigned` / `clinic_viewed` / `call_attempted` / `no_answer`): primary = "Обади се на пациента" (tel: link) + "Опит за обаждане" / "Свързано с пациента" / "Без отговор" siblings; secondary row offers "Резервирай директно" for clinics that want to skip ahead.
    - `after_contact` stage (`patient_contacted`): single large primary "Резервирай консултация" with calendar icon.
    - `after_booking` stage (`booked` / `rescheduled`): three peer buttons "Маркирай като посетила" / "Пациентът не се яви" / "Премести консултацията".
    - `completed` stage (any terminal status): no large primary CTA — read-only completion panel with status badge + "Заявката е приключена" copy.
    - `unknown` stage: safe fallback with "Резервирай консултация" only.
  - **Tertiary destructive actions** (`patient_declined`, `not_suitable`, `cancel`) hidden behind a collapsed "Други опции" toggle (`ChevronDown` / `ChevronUp`). Each tertiary action triggers a `window.confirm(...)` with a Bulgarian prompt before posting — prevents accidental clicks during a demo.
  - **Action labels** use the C1 friendly Bulgarian messages (no enum keys leaked).
- **Timeline humanisation**:
  - Each event row gains an **actor pill** (Клиника / Zubite / Админ / Пациент / Система) colour-coded per actor.
  - Event label falls back to `event_type.replace(/_/g, ' ')` (sentence-case-ish) if `EVENT_LABELS` is missing the key — no more raw `appointment_booked` slug.
  - Status transition phrase already humanised in C1; kept.
- **Booking modal context** (small polish):
  - Title row split into two lines: heading + new sub-line "Пациент: <name>" in slate-500 with the patient name in slate-700 medium.
  - Past-date guard from C1 retained.
- **Mobile 375px**: verified no horizontal scroll, primary CTA visible without scroll, progress strip remains usable.

### TypeScript
- `npx tsc --noEmit` — only the pre-existing `TS2802` (Map iteration in `calendar/page.tsx`, untouched by C2). Zero new errors.

### Live preview verification (Playwright + screenshots, 1920×800 and 375×812)
- Progress strip visible on detail (stage 2 highlighted for a `clinic_viewed` request). ✅
- Action panel: contextual CTAs rendered per stage. ✅
- Tertiary "Други опции" toggle expands to show destructive actions, each with a `confirm()` prompt. ✅
- Booking modal: "Пациент: TEST_Patient_b04382a9" subtitle visible. `<input type="date">` carries `min=2026-05-15`. ✅
- Timeline events show actor pills (КЛИНИКА). ✅
- Mobile 375px: no horizontal overflow, primary CTA above the fold. ✅

### Explicitly out of scope of C2 (deferred)
- No mobile request *list* card view (C3).
- No dashboard overview redesign (C4).
- No calendar week-view (C5).
- No performance charts (C6).
- No login page illustration (C7).
- No styled confirmation modal — using native `window.confirm` per spec (out-of-scope: full modal).
- No backend changes; `action_type` payload values unchanged.


## 2026-02-10 — Clinic Portal UX — Batch C1 (Quick Wins & Bug Fixes)

### Frontend — clinic portal demo-readiness pass
- **`frontend/lib/consultationLabels.ts`** — new label dictionaries + helpers:
  - `READINESS_LABELS` (incl. legacy `RED`/`AMBER`/`GREEN` band codes the backend sometimes surfaces).
  - `URGENCY_LABELS`.
  - `APPT_STATUS_LABELS`.
  - `ACTION_SUCCESS_MESSAGES` — friendly per-action confirmation text.
  - Helpers: `readinessLabel(v)`, `urgencyLabel(v)`, `apptStatusLabel(v)`, `actionSuccessMessage(action)`, `statusTransitionPhrase(prev, next)`.
- **`frontend/app/clinic/dashboard/requests/[id]/page.tsx`** — five fixes:
  1. **Busy state bug**: `performAction` now sets `setBusy(true)` at the start, ensuring the disabled state + spinner are visible during the round-trip. Inline "Записва се…" indicator added under the action panel.
  2. **Friendly action messages**: `actionMsg` now uses `actionSuccessMessage(action_type)` (e.g., "Опитът за обаждане е записан.") and renders inside a coloured chip (emerald on success, rose on error).
  3. **Bulgarian labels**: `req.readiness` / `req.urgency` / `appt.status` now go through their respective label helpers — no raw `soon`, `urgent`, `booked`, `RED` exposed.
  4. **Timeline transition phrase**: `previous_status → new_status` (was monospace raw enum) → `Назначена → Видяна` via `statusTransitionPhrase()`.
  5. **UTM block hidden**: the `(req.utm_source || req.utm_campaign || req.source)` block was removed entirely from the clinic detail view. Data still lives in the backend — admins see it; clinic users no longer do.
- **Booking modal guard** (same file):
  - `<input type="date">` now has `min={todayIso}` — past dates blocked at the picker level.
  - On submit, blocks combined date+time < now (with 60s grace) and surfaces the message `"Не може да резервираш в миналото. Избери бъдеща дата и час."` in a rose-coloured chip.
  - Generic Date.parse failure surfaces `"Невалидна дата/час."`.
- **`frontend/components/ClinicShell.tsx`** — header polish:
  - Clinic name (medium weight) on row 1, email + city in slate-400 small text on row 2 (desktop only).
  - Logout button: rounded-full pill, rose hover state, subtle hover border. Easier to spot, clearer intent.
- **Empty-state copy** — three pages upgraded from one-line greyed text to two-line "what you'll see" guidance:
  - `requests/page.tsx`: "Все още няма пациенти в този изглед" + "Тук ще се появят пациентите, които Zubite ви насочи…"
  - `calendar/page.tsx`: "Няма резервирани консултации" + "Когато резервирате консултация от страница на заявка, тя ще се появи тук."
  - `performance/page.tsx`: "Все още няма данни за анализ" + "Резултатите ще се изчисляват автоматично…"

### TypeScript
- `npx tsc --noEmit` — only **1 pre-existing TS2802** (Map iteration in `calendar/page.tsx`). C1 introduced zero new errors.

### Live preview verification (Playwright + screenshot)
- Login → dashboard → all 5 clinic pages load. ✅
- Header now shows `Test MVP Clinic / mvp-test@example.com · Sofia`. ✅
- Request detail page: no `UTM source`/`UTM campaign`/`UTM ad` visible. ✅
- Timeline reads `Назначена → Видяна` (no monospace). ✅
- `Готовност: Висока готовност` instead of raw `RED`. ✅
- Action button "Резервирай консултация" → modal opens; `min={today}` blocks past dates in the picker. ✅
- Logout still clears `zubite_clinic_session` cookie and redirects to `/clinic`. ✅

### Explicitly out of scope of C1 (deferred to C2–C7)
- No 3-tier action hierarchy reshuffle (C2).
- No status timeline strip at top of detail (C2).
- No mobile card view on request list (C3).
- No dashboard hero KPIs or chart (C4).
- No calendar week-view (C5).
- No performance charts or period selector (C6).
- No login page illustration / forgot-password (C7).
- No new dependencies. No new image assets. No backend changes.


## 2026-02-10 — P2 Auth/Session Hardening — Batch E4 (P1) — Cookie-Only Mode (Flag-Gated)

### Backend — `AUTH_REQUIRE_COOKIE=1` enforcement
- **`backend/auth.py`** — `get_current_user` + `get_current_clinic` now read `AUTH_REQUIRE_COOKIE` from `os.environ` on **every call** (lazy re-read so tests can flip the env without re-importing). When `=1`:
  - The `Authorization: Bearer` header is ignored entirely. No Bearer parsing branch is reachable.
  - Only the respective `zubite_admin_session` / `zubite_clinic_session` cookie authenticates the request.
  - Missing cookie → 401 (regardless of any Bearer header).
  - CSRF Origin guard applies as before — but the previous "Bearer bypasses CSRF" path is now dead code, because Bearer never reaches the auth gate as a valid credential.
- **`backend/routers/admin.py`** — `admin_login` returns `TokenResponse(user=admin_user)` only (no `access_token`, no `token_type`) when `AUTH_REQUIRE_COOKIE=1`. Cookie still set with identical attributes. When `=0`, response is identical to E1–E3 (`{access_token, token_type:"bearer", user}`). Route now uses `response_model_exclude_none=True` so `None` fields are stripped from the body.
- **`backend/routers/clinics.py`** — `clinic_login` mirrors the admin pattern.
- **`backend/schemas.py`** — `TokenResponse.access_token: Optional[str] = None`, `TokenResponse.token_type: Optional[str] = None` (and identical for `ClinicTokenResponse`). This is backwards-compatible: E1/Phase 2/Phase 3 suites that read `access_token` from default-mode responses keep passing.
- **`backend/.env.example`** — updated `AUTH_REQUIRE_COOKIE` comment to reflect that E4 is implemented and the flag controls the cookie-only enforcement; default committed value remains `0`.

### Behaviour matrix
| Flag | Header `Bearer` | Cookie | Behaviour |
|---|---|---|---|
| `=0` (default) | present | absent | Auth via header (E1 mode, CSRF bypassed) |
| `=0` | absent | present | Auth via cookie (CSRF enforced on mutations) |
| `=0` | present | present | Header wins, cookie ignored |
| `=1` | present | absent | **401** — header silently ignored |
| `=1` | absent | present | Auth via cookie (CSRF enforced on mutations) |
| `=1` | present | present | Auth via cookie (header silently ignored) |
| any | absent | absent | 401 |
| `=1`, login response body | — | — | `{user: {...}}` only — no `access_token`, no `token_type` |
| `=0`, login response body | — | — | `{access_token: "...", token_type: "bearer", user: {...}}` (unchanged) |

### Tests
- **New `backend/tests/test_p2_e4_bearer_removal.py`** — 22 tests with `AUTH_REQUIRE_COOKIE=1` at module load:
  - TestLoginResponseShape (4): admin/clinic body omits `access_token`/`token_type`; cookies still set with `HttpOnly`+`SameSite=Lax`.
  - TestBearerRejected (5): admin/clinic protected endpoint rejects Bearer-only with 401; cookie-only succeeds; cookie wins over (junk) Bearer.
  - TestRoleSeparation (2): clinic-JWT-in-admin-cookie → 403; admin-JWT-in-clinic-cookie → 403; cross-name cookies → 401.
  - TestInvalidSessions (2): expired cookie → 401, tampered cookie → 401.
  - TestLogout (2): admin/clinic logout still clears cookie with `Max-Age=0`.
  - TestCsrf (4): allowed Origin POST → 200, missing Origin POST → 403, evil Origin POST → 403, Bearer-only POST → **401 (cannot bypass CSRF — 401 is returned at the auth gate before CSRF runs)**.
  - TestPublicUnaffected (2): `POST /api/leads`, `/api/analytics/events` unaffected by the flag.
  - TestEnvFlagSemantics (1): flipping `AUTH_REQUIRE_COOKIE=0` mid-process re-enables the Bearer rollback path (proves lazy env read).
- Safety contract identical to E1: isolated `zubite_test_p2_e4` DB, autouse rate-limit + audit reset, mocked Resend/storage, no real provider IO, `AUTH_COOKIE_SECURE=0` forced at module load for ASGI testserver.
- **Result: 22/22 PASS in 2.03s.**

### Full Phase 2 + Phase 3 + P2 (E1, E4) regression — per-file, isolated DBs
- A 24 / B 31 / C 21 / D1 30 / D2a 32 / D2b 22 / D3 20 / **E1 29** / **E4 22** = **231 tests, 0 failures**.
- Confirms: changing the default flag to `=0` keeps every pre-E4 test green. The flag is a no-op at default.

### Live preview verification (default mode)
- `POST /api/admin/login` (default flag) → response still contains `access_token` (204 chars). ✅
- `GET /api/admin/audit-logs` with Bearer header → 200. ✅
- Frontend (E2/E3 migration) continues to authenticate via cookie unchanged. ✅

### Frontend cleanup
- **Intentionally minimal per E4 scope.** The 26 `removeItem('admin_token' | 'clinic_token' | …)` stale-state cleanup lines and the two `// access_token` comment lines remain in place. They are no-ops at runtime and serve as defensive cleanup for users who haven't refreshed the page since pre-E1. Broader frontend cleanup deferred.

### Explicitly out of scope of E4
- No sessions collection / token revocation / JWT expiry change / JWT_SECRET_PREVIOUS / force logout — all deferred to E5.
- No admin self-service password change.
- No `clinic_status` semantics change.
- No GDPR / WCAG / clinic UI / patient-facing UI changes.

### Operational notes
- **No env was flipped.** `backend/.env` and `backend/.env.example` both keep `AUTH_REQUIRE_COOKIE=0`. The cookie-only enforcement is dormant code until an operator flips the flag per environment.
- Recommended rollout: preview soak with `=1` for a few days → flip in production. Rollback is single-knob (`=0` + `sudo supervisorctl restart backend`).


## 2026-02-10 — P2 Auth/Session Hardening — Batch E3 (P1) — Clinic Frontend Cutover

### Frontend — clinic cookie migration (Bearer/localStorage now unused for clinic)
- **7 files updated**:
  - `app/clinic/page.tsx` (login): fetch now uses `credentials: 'include'`; on success cleans up any stale `clinic_token`/`clinic_user` from a prior version and redirects to `/clinic/dashboard`. The `access_token` in the response body is deliberately ignored.
  - `components/ClinicShell.tsx`: session probe changed from `localStorage.getItem('clinic_user')` to **`GET /api/clinic/profile` with `credentials: 'include'`**. On 401/403 redirects to `/clinic`; on 200 populates the header info (clinic_name, city) directly from the profile response. `logout()` now POSTs `/api/clinic/logout` then redirects.
  - `app/clinic/dashboard/page.tsx`: overview KPI fetch wrapped in `useCallback`, `credentials: 'include'`.
  - `app/clinic/dashboard/requests/page.tsx`: list fetch migrated to `${API_URL}/api/clinic/consultation-requests` + cookie.
  - `app/clinic/dashboard/requests/[id]/page.tsx`: detail GET + `performAction` POST both cookie-based; 401/403 → cleanup + redirect.
  - `app/clinic/dashboard/calendar/page.tsx`: appointments fetch + cookie.
  - `app/clinic/dashboard/performance/page.tsx`: metrics fetch + cookie.
- **Pattern**: every clinic fetch carries `credentials: 'include' as RequestCredentials` and drops `Authorization: Bearer …`. No new helper module / no React Context — surgical inline migration.
- **localStorage clinic keys**: never WRITTEN by frontend any more. Still REMOVED defensively in 401/403 handlers and login/logout flows (per spec — stale-state cleanup).
- **No admin file touched** — `git status` confirms scope is `frontend/app/clinic/*` + `frontend/components/ClinicShell.tsx` only.
- **No patient-facing page touched** — no edit under `/app/(public)`, `/app/quiz`, `/app/blog/[slug]`, `/app/za-kliniki`.
- **No backend file touched** in E3.

### TypeScript / build
- `npx tsc --noEmit` over the migrated files yields **1 pre-existing TS2802** (Map iteration in `calendar/page.tsx`). All E3 edits compile cleanly.

### Backend regression
- Re-ran **E1** suite — **29/29 PASS** (unchanged; no backend file modified in E3).

### Live preview verification (Playwright, MVP test clinic)
- `POST /api/clinic/login` returns 200 + `Set-Cookie: zubite_clinic_session=…; HttpOnly; Secure; SameSite=Lax`. ✅
- After login: `localStorage.clinic_token = undefined`, `localStorage.clinic_user = undefined`. ✅
- Cookie list: `[cf_clearance, _fbp, zubite_clinic_session, __cf_bm]` — no `zubite_admin_session` collision. ✅
- Dashboard renders KPIs (1 new / 1 awaiting / 2 booked / 2 attended / 0 no-shows / 19 sec avg response). ✅
- **Hard refresh** on `/clinic/dashboard` keeps user signed in via `/api/clinic/profile` probe. ✅
- All 3 sub-pages (`/clinic/dashboard/requests`, `/calendar`, `/performance`) load via cookie. ✅
- `POST /api/clinic/logout` returns 200; `zubite_clinic_session` cookie cleared. ✅
- After logout, `/clinic/dashboard` redirects to `/clinic`. ✅
- No `auth.csrf_origin_mismatch` audit rows generated during walk — Origin guard passes for same-origin preview.

### Explicitly out of scope of E3 (deferred to E4/E5)
- **No backend changes** — `access_token` still returned in login bodies; Bearer header still accepted; sessions/jti not introduced.
- **No clinic_status / login-block semantics change** — pre-existing `status="paused"` gate preserved.


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
