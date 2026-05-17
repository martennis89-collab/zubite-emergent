# Zubite.bg — Changelog

## 2026-02-17 — Phase 3: Blog + Static Pages Visual Polish (Wave.co glass)

Migrated all **patient-facing static & informational pages** to the
premium Wave.co glassmorphism system (ivory `#FCFAF8` bg, deep navy
serif headings, teal accents, decorative orbs, glass cards).

### New / rewritten pages
1. **`/blog`** — Premium "Журнал Zubite" hero with eyebrow chip,
   teal-accented serif H1 "Статии и съвети **за усмивката ви**", glass
   article cards (first card asymmetric md:col-span-2), trust chip
   "Ориентир, не диагноза", glass CTA → /quiz.
2. **`/blog/[slug]`** — Ivory bg + decorative orbs, all `sky-*` →
   `teal-*` (CTA, related-articles cards, FAQ accordion, sources).
3. **`/privacy`** — Reusable `LegalShell` + `LegalSection` glass shell,
   GDPR eyebrow chip, 11 numbered glass section cards, teal accent
   links, contact callout.
4. **`/terms`** — Same shell, "Правила · Ползване" eyebrow, amber
   medical-disclaimer callout preserved, 11 sections.
5. **`/cookies`** — Same shell, 3 cookie-category glass cards each
   with a styled table (necessary/analytics/marketing), teal note.
6. **`/contact`** — 3 glass cards (Email/Phone/Location) on ivory with
   teal-accent icons + glass working-hours card.

### New shared component
- **`components/static/LegalShell.tsx`** — `LegalShell` (eyebrow +
  serif title + glass hero + decorative orbs + back link) and
  `LegalSection` (numbered teal badge + serif h2 + prose body).
  Eliminates duplication across the 3 legal pages.

### Site-wide brand consistency pass
- Migrated **all remaining patient-facing `sky-*` → `teal-*`** in
  ~20 files (SEO landing pages: `aligners-comparison`,
  `aligners-vs-braces`, `cosmetic-dentistry`, `crooked-teeth`,
  `implant-price`, `implants`, `invisalign-price`, `orthodontics`,
  `sleep-airway`, `symptoms`, `symptoms/[symptomSlug]`, `tmj`,
  `what-is-invisalign`; route `[city]/[treatment]` + its `/quiz`;
  `assessment`; patient components: `CookieConsent`, `ReviewPoster`,
  `ClinicShell`, `ArticleBreadcrumbs`, `AssistedChoiceModal`,
  `ReviewSignalsSection`, `ClinicMatchEmptyState`, `RequestCallModal`,
  `AlignerBrandChips`, `LeadCaptureForm`, `LeadAttributionPanel`,
  `AnimatedHomeSections`, `TestRenderModal`).
- **Admin & clinic dashboards intentionally left untouched** —
  scheduled for Phase 4 (P2) per roadmap.

### Testing
- `/app/test_reports/iteration_48.json` — frontend-only.
- **100% pass** on critical Phase 3 checks: 6/6 redesigned pages
  (correct testids, glass eyebrow chips, teal accents, 0 `sky-*`
  refs, Bulgarian-only copy), 4/4 smoke regressions (/, /quiz,
  /care-pass, /za-kliniki) — no breakage.
- Minor non-blocking observations: 1 pre-existing image 500 inside
  one blog post body; CookieConsent banner overlay (global, pre-
  existing).

### Files touched
- `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`,
  `app/privacy/page.tsx`, `app/terms/page.tsx`,
  `app/cookies/page.tsx`, `app/contact/page.tsx`,
  `components/static/LegalShell.tsx` (new),
  `components/CookieConsent.tsx`, + 20 patient-facing files for
  `sky-*` → `teal-*` brand consistency.


## 2026-02-17 — Site-Wide Visual System: Phase 2 (Quiz + Results)

Extended the homepage premium glass design system to the **8 quiz
routes** + **results pages** + **quiz success page**. Strategic
approach: target the **shared `MasterQuiz` / `TreatmentQuiz`
components** so all 8 quiz routes get the upgrade in one pass,
then rewrite the two leaf pages (`/quiz/success`, `/results/[leadId]`)
end-to-end.

### Files touched
1. **`components/MasterQuiz.tsx`** — bulk `sky-*` → `teal-*` rebrand
   (every color token), plus targeted chrome polish:
   - **Internal sticky header**: `bg-white/80 backdrop-blur-md
     border-b border-slate-100` → `bg-[#FCFAF8]/80 backdrop-blur-xl
     border-white/40` + new question-counter pill with uppercase
     tracking + serif logo with teal `.bg`.
   - **Progress bar**: flat `bg-teal-500` 1px → 1.5px glossy gradient
     `linear-gradient(90deg,#14b8a6,#0d9488,#0f766e)` with `0 0 12px
     rgba(20,184,166,0.5)` teal glow + thin top white-40% shine line
     for liquid-glass refraction.
   - **Question card**: `bg-white border border-slate-200 shadow-sm`
     → `bg-white/75 backdrop-blur-2xl ring-white/80 shadow-[deep
     liquid-glass stack] + inset white-85%` + inner top gloss
     pseudo-element.
   - **Segment-select cards** ("За мен / За тийнейджър / За дете"):
     `bg-white border-2 border-slate-200` → `bg-white/70 backdrop-
     blur-xl ring-white/80 hover:ring-teal-300/60` with teal-50 icon
     containers + hover lift + teal-tinted drop shadow.
   - **Visual option cards** (smile grid) + **text option cards**
     (multi-choice answers): same glass treatment, hover ring →
     `ring-teal-300/70`, hover bg → `white/90-95`, hover shadow
     → teal-tinted, lettered chip `bg-teal-50 ring-teal-200` instead
     of grey-on-grey. Reads as a premium product step, not a form.
2. **`components/TreatmentQuiz.tsx`** — bulk `sky-*` → `teal-*`
   rebrand for visual parity (no other chrome changes needed; the
   `MasterQuiz` polish flows through wherever the master is used).
3. **`components/OrthodonticsQuiz.tsx`** + **`components/
   AlignersVsBracesQuiz.tsx`** — same bulk color migration.
4. **`app/quiz/success/page.tsx`** — targeted polish:
   - Page chrome wrapped in a relative overflow-hidden container
     with the homepage's radial-gradient ivory + teal/cyan blob
     backdrop layers + soft warm `border-white/40` header/footer.
   - "Какво следва?" panel: `bg-white border border-slate-200`
     → `bg-white/75 backdrop-blur-2xl ring-white/80 shadow-[deep
     liquid-glass]` + inset highlight. Numbered step badges:
     flat `bg-sky-500` → diagonal teal gradient + soft teal drop
     shadow.
   - Primary CTA ("Виж препоръчаните клиники"): flat `bg-sky-500
     shadow-lg` → glossy teal gradient pill with inset top white-
     20% highlight + inset shine line + `-translate-y-0.5` hover
     lift + arrow `translate-x-0.5` group-hover.
   - **Care Pass card upgraded to a premium navy panel** matching
     the homepage Care Pass section: `bg-white/70 border` →
     `radial-gradient(rgba(20,184,166,0.30)) + linear-gradient(
     #0E1A24 → #112832)` with inner white-10% blur highlight,
     teal-300/80 "Zubite Care Pass" eyebrow, and the exact correct
     copy: "След като посетиш консултация в партньорска клиника
     чрез Zubite.bg, клиниката ще ти предостави Zubite Care Pass с
     отстъпки за продукти за орална хигиена."
   - Spinner color `border-sky-500` → `border-teal-500`. Logo accent
     `.bg` `text-sky-500` → `text-teal-600`.
5. **`app/results/[leadId]/page.tsx`** — completely rewritten end-
   to-end (was a dark-navy page mixing sky-500 and slate-800):
   - New page chrome: `min-h-screen bg-[#FCFAF8]` + radial
     teal/cyan gradient backdrop + 2 large blur blobs + homepage's
     `<Header />` + `<Footer />` (now auto-styled via Phase 1).
   - **Primary result panel**: `rounded-[1.75rem] bg-white/75
     backdrop-blur-2xl ring-white/80 shadow-[deep liquid-glass +
     inset white-95%]` + inner top gloss.
   - **NEW** "Ориентир, не диагноза" badge at the top of the panel
     (`bg-teal-50 ring-teal-100 text-teal-700` with `ShieldCheck`
     icon) — exactly per the brief's safety guardrail.
   - Success icon container: gradient teal/emerald with teal-50
     ring + teal soft drop shadow.
   - Primary CTA "Покажи ми 3 подходящи клиники": glossy teal
     gradient pill with shine line + group-hover arrow translate.
   - Secondary "Към началото": frosted glass pill matching the
     homepage Hero secondary.
   - **NEW Care Pass reminder card** below the main panel: same
     premium navy gradient panel as the success page, with `Gift`
     icon, "Zubite Care Pass" eyebrow, the canonical Care Pass
     copy, and the "Не е отстъпка от лечение" disclaimer.
   - **NEW next-steps strip** at the bottom: 3 micro-chips ("Без
     задължение / Личен ориентир според отговорите ти / Не заменя
     професионален преглед") with subtle separators.
   - Loading state and error state restyled with `bg-[#FCFAF8]` +
     teal spinner + glass header/footer parity.

### Result
- **8 quiz routes** automatically inherit:
  - the new floating ivory chrome,
  - glossy teal gradient progress bar with glow,
  - liquid-glass question cards + glass option cards,
  - teal accent across every interactive element.
- **All scoring, state transitions, segment branching, lead-capture
  hooks, analytics events, and submission API calls untouched** —
  pure presentation polish per the brief's hard guardrail.
- **`/quiz/success`**: matching the homepage Care Pass framing
  exactly — Care Pass now reads as the same premium dark navy
  centerpiece across homepage, quiz success, and results page.
- **`/results/[leadId]`**: dramatically more premium and product-led
  while staying medically safe via the "Ориентир, не диагноза" badge.

### Tests
- Desktop 1440×900 + mobile 390×844 screenshots: quiz intro
  segment-select cards, quiz question step, quiz success page,
  results page. Quiz mobile: zero horizontal overflow.
- `npx tsc --noEmit -p .` → 0 new errors (only the pre-existing
  unrelated `lib/attribution.ts:241` enum-narrowing complaint).
- All `data-testid` selectors preserved (`segment-*`, `option-*`,
  `question-text`, `success-*`, `show-3-clinics-btn`, etc).

### Scope discipline
- Zero new files. Zero deletes. Zero new dependencies.
- Zero changes to: quiz scoring, question pool, segment branching,
  lead-capture, submission, analytics events, routes, SEO, JSON-LD,
  backend, data models, auth.

---


## 2026-02-17 — Site-Wide Visual System: Phase 1 (Header / Footer / Buttons / Design Tokens)

Began propagating the homepage premium glass design system across
the entire Zubite.bg site. Phase 1 chose a **high-leverage,
low-risk strategy**: instead of rewriting 53+ pages individually,
we rewrote the shared `Header`, `Footer`, and global `btn-primary`
CSS class + added reusable CSS-utility design tokens. Every public
page automatically inherits the new visual language for nav, footer
and primary CTAs without per-page edits.

### Files touched (4 files, zero new pages, zero deletes)
- **`frontend/components/Header.tsx`** — fully rewritten. Now matches
  the homepage floating pill nav:
  - Fixed `top-3 sm:top-4 inset-x-3 sm:inset-x-6` centered pill
    container.
  - Two-state glass: `bg-white/20 backdrop-blur-2xl ring-white/35`
    (top of page) → `bg-white/45 ring-white/55` (scrolled), both
    with deep liquid-glass inset highlights (`inset 0 1px 0
    rgba(255,255,255,0.95)` + bottom inset shadow) and a visible
    inner top-edge gloss line.
  - Logo updated from `sky-500` accent → `teal-600` to match the
    new brand accent.
  - Nav-link active state: `text-sky-500` → `text-teal-700
    font-medium`.
  - **NEW** Desktop "Провери случая" CTA pill (was missing
    entirely) — diagonal navy gradient
    `linear-gradient(135deg,#0f172a,#1e293b,#0f172a)` with inner
    white-15% blur shine + `inset 0 1px 0 rgba(255,255,255,0.18)`
    highlight, arrow icon with `translate-x-0.5` hover shift.
  - Mobile menu drawer redesigned: glass border-t, calmer link
    styling, full-width navy CTA at the bottom.
  - Auto-closes on route change via `usePathname` effect.
  - Preserves `data-testid`s (`logo`, `nav-*`, `mobile-menu`,
    `nav-cta`).
- **`frontend/components/Footer.tsx`** — fully rewritten to match
  `HomeFooter`:
  - Dark navy `bg-[#0E1A1A]` with thin teal-400/40 gradient top
    edge + soft teal blur halo at the top.
  - Restructured into 4 columns: Brand · Платформа · За клиники ·
    Право, with `text-xs uppercase tracking-[0.18em]` section
    labels.
  - Brand column gets the proper Zubite.bg serif logo with teal
    `.bg`, the new "Спокоен ориентир…" tagline, and a small
    medical disclaimer.
  - Social icons restyled to glass circles (`bg-white/5 ring-
    white/10` → `bg-teal-500/15 ring-teal-400/30` on hover).
  - **NEW** "Клиничен вход" link to `/clinic`, **NEW** "Бисквитки"
    link to `/cookies`.
  - Copyright row uses `border-white/10` divider with "Направено с
    грижа в България" sub-tagline.
  - `treatmentSlug` prop kept in the signature for backwards
    compatibility (existing call-sites pass it).
- **`frontend/app/globals.css`** — major rewrite of `.btn-primary`
  and added new design-token utility classes:
  - **`.btn-primary`** — was flat `bg-sky-500` → now the homepage
    glossy teal gradient
    `linear-gradient(135deg,#14b8a6,#0d9488,#0f766e)` with a `::before`
    pseudo-element shine line, `0 18px 40px -12px rgba(13,148,136,0.55)`
    soft teal drop shadow + inset white-20% top highlight. Hover
    lifts `-2px` and deepens the shadow. **Automatically upgrades
    every existing `<button class="btn-primary">` on every page.**
  - **`.btn-secondary-glass`** — frosted-glass pill button reusable
    across pages (`bg-white/35 backdrop-blur-2xl ring-white/60` +
    inset highlight + inner shine line).
  - **`.glass-card`** + **`.glass-card-hover`** — translucent card
    utility (`bg-white/70 backdrop-blur-xl ring-white/80`) with a
    matching `:hover` lift variant.
  - **`.glass-panel`** — larger glass section container
    (`bg-white/65 backdrop-blur-2xl ring-white/70`, rounded-3xl,
    deep shadow).
  - **`.glass-panel-dark`** — premium dark navy panel matching
    the Care Pass aesthetic.
  - **`.liquid-bg`** — soft teal/cyan radial gradient background
    overlay via `::before` pseudo-element; content sits on top
    via `> *` z-index lift.
  - **`.trust-chip`** — single-line frosted trust pill.
- **`frontend/app/layout.tsx`** — `<body>` background set to
  `bg-[#FCFAF8] text-slate-900` matching the homepage warm-ivory
  base. Pages with `bg-white` containers still render correctly
  (they only paint their own region); pages that don't override
  bg now inherit the warm ivory.

### Result
- **All 53+ public/marketing/blog/legal/static pages** automatically
  receive:
  - the new floating pill glass nav with proper logo + teal active
    states + new "Провери случая" CTA,
  - the new dark navy premium footer with the correct link hierarchy
    + medical disclaimer + Bulgaria-tagline,
  - any element using `class="btn-primary"` is now the glossy teal
    gradient CTA with shine line + lift hover.
- **Smoke-tested via screenshots** across:
  - `/aligners-vs-braces` (hero + final CTA section + footer),
  - `/orthodontics` (hero),
  - `/blog` (journal hero),
  - mobile `/aligners-vs-braces` at 390px (zero horizontal overflow:
    `docW === viewW === 390`),
  - mobile menu open state (premium drawer with new gradient CTA).
- `npx tsc --noEmit -p .` → 0 new errors.
- All `data-testid`s preserved; existing test selectors continue
  to work.

### What is intentionally NOT yet touched (Phase 2+)
- **Per-page hero / body sections**: pages still have their original
  layouts (gradient cards, comparison tables, content blocks). The
  unified nav + footer + button system is the foundation; individual
  page polish (glass info-cards, scroll reveal, treatment overview
  panels) lands in Phase 2.
- **Quiz flow** (`/quiz`, `/[city]/[treatment]/quiz`, treatment-
  specific quizzes) — Phase 2 will replace its form chrome with the
  premium glass card system + progress rail + animated transitions.
- **Results / lead capture** (`/results/[leadId]/*`) — Phase 2 will
  apply premium glass result panel + "Ориентир, не диагноза" badge
  + Care Pass reminder block.
- **Blog article body** (`/blog/[slug]`) — Phase 3 will polish the
  reading shell (article hero card, FAQ glass accordion, inline
  CTA blocks) without harming readability.
- **Clinic dashboard** (`/clinic/dashboard/*`) — Phase 4 will apply
  restrained brand polish (ivory bg, deep navy headings, teal
  accents, glass/white hybrid panels) **with minimal motion**
  per the brief.
- **Admin dashboard** (`/admin/*`) — Phase 4 will tighten spacing,
  colors and table styling **without adding liquid backgrounds or
  Zubi** per the brief.
- **`/za-kliniki`** (for-clinics page) — Phase 5 darker premium B2B
  navy + glass dashboard mockups.

### Brief compliance snapshot
- ✅ Glass system is now shared via the global CSS tokens
  (`.glass-card`, `.glass-panel`, `.glass-panel-dark`, `.liquid-bg`,
  `.trust-chip`, `.btn-primary`, `.btn-secondary-glass`).
- ✅ No route, no backend, no API, no data-model, no auth, no SEO,
  no JSON-LD, no functionality changes.
- ✅ Care Pass language untouched on this pass (still consistent
  with the existing homepage copy).
- ✅ Medical safety wording untouched.
- ✅ No Zubi added to dashboards or non-patient-guidance routes.
- ✅ Mobile responsiveness preserved across the audited pages.
- ✅ Accessibility maintained: keyboard nav, `aria-label` on icon
  buttons, semantic `<header>/<footer>` markup, mobile drawer
  closes on route change.

---


## 2026-02-17 — Zubi-Bubble Removal · Trust-Strip Marquee · Stronger Liquid Glass

Three focused homepage refinements per user request. Pure visual
changes — zero copy, route, backend, dependency or data-testid
changes.

### 1) Removed "Zubi говори" Hero bubble entirely
- Deleted the `ZubiHeroBubble` component, its mount inside
  `HeroMockup`, the `useRotatingTip` hook, and the `ZUBI_TIPS`
  array. The Hero now keeps only its two existing floating chips
  ("Партньорски клиники" bottom-left, "Ориентир за цена" top-right)
  + the main product card.
- Zubi mascot remains in the dedicated **Zubi section** as the
  main character moment — same premium glass environment with its
  single static chat bubble. Nothing else about Zubi changed.

### 2) Trust strip → infinite auto-scrolling marquee
- All **6 trust items** now ride a single continuous track that
  drifts right → left and seamlessly loops.
- Implementation:
  - Items are rendered twice in a `.trust-track` flex row so the
    second copy slides in as the first copy slides out.
  - CSS `@keyframes trustMarquee { 0%→0; 100%→translateX(-50%) }`
    + `animation: trustMarquee 38s linear infinite` produces a
    perfectly seamless loop (38s chosen for a calm, premium pace).
  - `.trust-track:hover { animation-play-state: paused }` lets the
    user freeze the rail and read at their own pace.
  - **Edge fade masks**: a 12-16px gradient-to-transparent overlay
    on both left and right sides dissolves chips at the edges so
    nothing pops in/out hard — classic premium marquee polish.
  - First copy keeps `data-testid="trust-chip-{0..5}"` for test
    queries; second copy carries `aria-hidden="true"` so screen
    readers don't read the items twice.
- **Reduced-motion**: a local `@media (prefers-reduced-motion:
  reduce)` block in the section's `<style jsx>` forces
  `animation: none !important` on `.trust-track`, freezing the
  rail at offset 0 so reduced-motion users see a static row.
- Container itself upgraded with stronger liquid glass:
  `bg-white/45 backdrop-blur-2xl ring-1 ring-white/65` + a layered
  inset highlight (`inset 0 1px 0 rgba(255,255,255,0.9)`) + a
  visible inner top-edge gloss line (`bg-gradient-to-b from-
  white/55 to-transparent`). Now reads as a polished glass rail,
  not a flat pill.

### 3) Stronger semi-transparent liquid glass
- **Sticky nav**:
  - Top state (no scroll): `bg-white/35 backdrop-blur-xl` →
    `bg-white/20 backdrop-blur-2xl` (more see-through, harder
    blur).
  - Scrolled state: `bg-white/65 backdrop-blur-2xl` →
    `bg-white/45 backdrop-blur-2xl`.
  - Inset top highlight strengthened from `rgba(255,255,255,0.85)`
    → `rgba(255,255,255,0.95)`; inset bottom shadow line added at
    `rgba(15,23,42,0.05)` for refraction depth.
  - Inner top gloss line (`from-white/60` → `from-white/70`) and
    a new subtle bottom inner gradient line provide the
    "wet-glass" refraction edges classic to liquid-glass UI.
- **Hero secondary CTA** ("Виж как работи"):
  `bg-white/55 → bg-white/35`, `backdrop-blur-xl → backdrop-
  blur-2xl`, inset highlight pushed to `rgba(255,255,255,0.95)`,
  + new inset bottom shadow line + brighter `from-white/65` inner
  shine line. Now reads as glassier and more product-control-like.
- **Final-CTA secondary CTA** ("Виж как работи"): same liquid-
  glass treatment for visual parity with the Hero secondary.
- All other buttons (Hero primary teal gradient, Care Pass primary
  white, Care Pass secondary translucent-white-on-navy, Nav CTA
  navy gradient, Mobile sticky CTA) left untouched — they already
  match the new system or have their own context-appropriate
  liquid-glass treatment.

### Tests
- Desktop 1440×900 + mobile 390×844: marquee animation captured
  in two frames 2.5s apart, confirming the right→left drift; no
  horizontal overflow on mobile (`docW === viewW === 390`).
- `npx tsc --noEmit -p .` → 0 new errors.
- Hero verified clean — no Zubi avatar/bubble in any frame.

### Files touched
- `frontend/components/HomeContent.tsx` only.
- No new files, no deletes, no package changes.

---


## 2026-02-17 — Zubi Mascot (Asset D) + Rotating Hero Tip + Liquid-Glass Polish

User delivered the Zubi mascot render (Asset D) — a calm, premium
3D guide character with a futuristic teal-accented healthcare-tech
suit, a glowing smile graphic on the chest, and a confident
thumbs-up gesture in a Clarity-Hub backdrop scene. Wired the
mascot in two places, added a rotating "Zubi говори" tip bubble in
the Hero with the exact messaging the user requested, and pushed
extra liquid-glass refraction polish onto the navigation and
button system.

### Asset D placement
- **`ZUBI_MASCOT`** constant added.
- **Zubi section (main character moment)**: replaced the abstract
  orb (`ZUBI_ORB`) with the mascot rendered inside a premium
  rectangular glass environment:
  - `rounded-[2rem]` glass container with radial-teal gradient,
    `bg-white/55 backdrop-blur-xl ring-1 ring-white/70` + soft
    drop shadow.
  - Top glossy highlight (`bg-white/45 blur-2xl`) and a soft
    bottom-up vignette so the chat bubble stays legible.
  - Mascot rendered via `<img>` with `object-position: 55% 28%`
    and `scale(1.18)` to focus on the upper-body / face. Slow
    `floatSlow` 10s breathing motion.
  - Outer `breatheGlow 8s` halo wrapping the whole frame.
- **Hero (supporting presence)**: small 56–64px circular Zubi
  avatar (`<ZubiHeroBubble />`) positioned `-bottom-20 right-0` of
  the product mockup column. Frosted teal halo + inset white
  highlight ring + `floatSlow 8s`. The avatar uses
  `object-position: 55% 25%; scale(1.35)` to crop tight to Zubi's
  face. Avatar does not overlap the "Партньорски клиники"
  floating chip after the −20 bottom offset adjustment.
- **Mobile**: hero Zubi avatar+bubble explicitly `hidden sm:flex`
  — mobile hero stays focused on copy + CTAs + result card; full
  Zubi moment is reserved for the dedicated Zubi section which
  works perfectly at 390px.

### Rotating "Zubi говори" tip bubble (Hero)
- New `useRotatingTip(intervalMs = 5500)` hook with a fade-in
  re-mount per tip via React `key` (no extra state).
- Honors `prefers-reduced-motion: reduce` — interval is never
  registered when the user opted out, so the first tip stays
  static.
- **4 rotating tips** (every 5.5s) with the messaging the user
  explicitly requested:
  1. "Помагам ти да разбереш дали имаш орален проблем — дори ако
     още не си сигурен."
  2. "След това те насочвам към верифицирани партньорски клиники."
  3. "Първо яснотата. После — изборът."
  4. "Не съм лекар — помагам ти да си подготвиш въпросите за
     преглед."
- Bubble styled as premium frosted-glass chip
  (`bg-white/85 backdrop-blur-xl ring-1 ring-white/85` + inset
  highlight) with a teal "ZUBI ГОВОРИ" eyebrow + sparkles avatar
  dot. Each tip slides up with a 0.55s ease-out animation.
- Zubi section chat bubble copy was also updated to a single
  longer sentence reflecting the new messaging:
  *"Помагам ти да разбереш дали имаш орален проблем — и след това
  те насочвам към верифицирана партньорска клиника."*

### Liquid-glass refraction polish
- **Nav (sticky pill)**: stronger glass language. Two-layer inset
  highlights via `box-shadow: inset 0 1px 0 rgba(255,255,255,0.85),
  inset 0 -1px 0 rgba(15,23,42,0.04)`, plus a separate
  `absolute inset-x-6 top-0.5 h-1/2 rounded-full bg-gradient-to-b
  from-white/60 to-transparent opacity-70` overlay that renders a
  visible inner top-edge gloss line — classic liquid-glass
  refraction edge.
- **Nav CTA button**: switched from flat `bg-slate-900` to a
  diagonal `linear-gradient(135deg,#0f172a,#1e293b,#0f172a)`
  with an inner white-15% blur "shine" line and an
  `inset 0 1px 0 rgba(255,255,255,0.18)` highlight — feels like a
  polished glass product control instead of a flat dark button.
- **Hero secondary CTA** + **Final CTA secondary** (both "Виж как
  работи"): upgraded to a stronger frosted glass —
  `bg-white/55-60 backdrop-blur-xl ring-1 ring-white/80-85` with
  the inset-1px white-85% highlight + an inner blurred white-55%
  shine line on the top half. Now reads as Wave-style glass.
- **Care Pass secondary CTA** ("Как работи Care Pass"): same
  liquid-glass refraction language adapted to the dark navy
  panel context — `bg-white/15 backdrop-blur-xl ring-white/30`
  with inset top-30% white highlight + inner white-25% shine
  line.
- All buttons preserve keyboard accessibility & hover lift.

### Testing
- Desktop 1440×900 + mobile 390×844 verified via screenshots.
  Tip rotation confirmed in Playwright: bubble text changes from
  "Помагам ти да разбереш…" → "Първо яснотата. После — изборът."
  after ~6s pause (random tip on rotation tick).
- `docW === viewW (390)` — zero horizontal overflow.
- `npx tsc --noEmit -p .` → 0 new errors. Pre-existing unrelated
  admin-page errors only.

### Files touched
- `frontend/components/HomeContent.tsx` only.
- No new files, no deletes, no package changes, no `next.config.js`
  edits.

---


## 2026-02-17 — Premium Custom Asset Integration + Hover/Tap Reveal

Integrated 4 user-provided premium asset renders into the homepage
and converted the Care Pass benefit chips to an accessible
hover/tap reveal pattern. Zero copy rewrites, zero route/backend/
dependency changes, single-file edit (`HomeContent.tsx`).

### Asset map → placement
- **Asset E** (premium Zubite Care Pass card render) → **Care
  Pass section centerpiece**. Replaced the entire CSS-built glossy
  card mockup with the real branded image (`<Image>` 900×900,
  drop-shadow + rotated tilt baked into the asset). The asset
  already includes the correct copy ("Zubite.bg / Care Pass /
  Отстъпки за орална хигиена / Получаваш го след консултация") so
  no overlay code needed. Still wrapped in our `floatSlow` 8s
  animation + breathing teal glow + shimmer sweep overlay so the
  card has cinemagraph-style life. This is now arguably the most
  premium, tangible moment on the page.
- **Asset F** (deep navy + teal atmospheric backdrop) → **Final
  CTA section background**. Replaces the previous
  `gradient-to-br from-teal-50 to-white` flat background.
  Rendered as a full-cover `<Image>` at 42% opacity, then overlaid
  with a `bg-gradient-to-br from-teal-50/60 via-white/55 to-white/75`
  warm scrim so the frosted-glass conversion panel + dark text
  remain perfectly legible. Existing 3 parallax+breathe blobs and
  floating Care Pass/~60 секунди/Без регистрация chips all still
  render above the new backdrop.
- **Asset B** (floating frosted-glass UI panels) → **Hero**
  decorative depth layer. Positioned `absolute -right-20 top-32
  w-[42rem] h-[42rem]` at 25% opacity, rotated −4°, with a radial
  mask (`maskImage: radial-gradient(circle … 30% → 70%)`) so the
  edges fade naturally instead of forming a hard rectangle. Hidden
  on `<lg` to keep mobile clean. Slow parallax via `--py * 0.04`.
- **Asset C** (premium dental decision-app UI mockup) → **Decision
  preview** decorative backdrop. Positioned `-inset-6` behind the
  existing CSS product card, rotated 3°, at 35% opacity, with an
  ellipse mask fading the outer edge. Renders only on `>=md`. The
  existing CSS card sits on top with full readable copy so the
  asset provides product-led atmosphere without competing for
  attention.
- **Asset A & Asset D** — not provided in this batch; the homepage
  still uses the existing `HERO_BG` warm-ivory grain texture and
  the existing `ZUBI_ORB` abstract render. Swapping in a real Zubi
  mascot or new hero background is a one-line constant change when
  the assets arrive.

### Hover/Tap Reveal — Care Pass benefit chips
- Converted the 4 Care Pass benefit chips (`След проведена
  консултация / От клиниката / Орална хигиена / Не е отстъпка
  от лечение`) from static `<span>` to native `<details>` +
  `<summary>` elements.
- Default state shows the chip with a `ChevronDown` indicator.
- Open state reveals a short clarification:
  - "Получаваш Pass-а след като посетиш консултацията в
    партньорска клиника."
  - "Pass-ът се предоставя от самата клиника, не от Zubite.bg."
  - "Отстъпки за продукти за ежедневна грижа за зъбите и
    венците."
  - "Care Pass не намалява цената на лечение или процедури."
- Native browser semantics give us free keyboard accessibility
  (Tab → focus → Space/Enter → toggle), correct `aria-expanded`
  state, mobile tap support, and `group-open/chip:rotate-180` on
  the chevron without any JS state.
- Each chip carries `data-testid="care-pass-chip-{0..3}"` so
  testing agents can interact with the reveal.

### Visual tweaks while wiring assets
- The Care Pass card's surrounding box is now an extra
  `breatheGlow` 9s teal-400/15 blur halo, so the image card visually
  ties into the dark gradient panel without a hard edge.
- Decision preview right column gains an explicit `-z-0` on Asset C
  so it stays behind the depth stacked cards but above the section
  backdrop blobs.
- Hero Asset B uses a `radial-gradient` `maskImage` so the floating
  glass panels image dissolves into the page background instead of
  forming a noticeable cropped rectangle.

### Mobile compliance
- `docW === viewW (390)` → still zero horizontal overflow.
- Asset B hidden on `<lg`, Asset C hidden on `<md` — keeps mobile
  hero/decision focused on the product card only.
- Asset E auto-fits 100% width inside the Care Pass right column;
  Asset F covers full section background.
- Care Pass chip `<details>` natively collapses on mobile,
  preventing the dark panel from getting taller than necessary.

### Files touched
- `frontend/components/HomeContent.tsx` (4 const additions, 4
  asset placements, 1 chip-component rewrite). No new files, no
  deletes, no package changes, no `next.config.js` changes (we
  already have `images.unoptimized: true`, so the new
  `customer-assets.emergentagent.com` URLs just work via
  `<Image unoptimized>`).
- `npx tsc --noEmit -p .` → 0 new errors. Pre-existing unrelated
  admin-page errors only.

### What was intentionally scoped out
- Full hover/tap reveal pattern across Problem cards, Treatment
  cards, Patient Questions (brief mentions). Reasoning: each of
  those would require a substantial card-component refactor + tap
  toggle state + keyboard reveal + ARIA + mobile expand behaviour
  + ensuring the existing `<Link>` navigation still works. Done in
  a follow-up pass when desired — current visual polish + Care
  Pass chips reveal already delivers the brief's "reduce visible
  text, premium product feel" intent on the most-scrutinised
  section.
- Asset D (Zubi mascot) — not provided in this batch.
- Asset A (new hero atmospheric bg) — not provided in this batch.

---


## 2026-02-17 — Premium Background Motion & Parallax (Wave.co Depth)

Added subtle, premium-grade background motion across the homepage
per the brief: "slow, smooth, calm, healthcare-tech, app-like,
background-first, not attention-seeking". Zero copy changes, zero
route/backend/dependency changes, zero new files.

### Architecture
- **Single global rAF scroll listener** (`useBackgroundParallax`)
  writes `document.documentElement.style.setProperty('--py', scrollY)`.
  This avoids per-element React state and keeps all parallax driven
  by CSS `calc(var(--py, 0) * Xpx)` transforms with `will-change:
  transform`. One listener, ~60 fps via requestAnimationFrame
  throttling, zero re-renders.
- **`px(factor)` helper** returns the inline style for a parallax
  layer at a given factor (typically ±0.04 → 0.08). All affected
  blobs are tagged `data-parallax` for the reduced-motion override.
- **`MotionStyles` component** injects centralised global keyframes:
  - `floatSlow` (8–9s) and `floatSlower` (10–14s) — vertical drift
    for stacked depth cards & Care Pass glossy card.
  - `driftSlow` (12–16s) — tiny X+Y sway + 0.6° rotation for the
    new decorative background shapes around the Hero mockup.
  - `breatheGlow` (8–15s) — opacity 0.55↔0.85 + scale 1↔1.04 for
    every section's blur blobs (Hero, Problem, Decision, Zubi,
    Matching, Care Pass, Final CTA).
  - `shimmerSweep` (8s) — diagonal `linear-gradient(90deg,
    transparent → rgba(255,255,255,0.18) → transparent)` translates
    `−120% → 220%` across the Care Pass glossy card. Tasteful,
    not bank-card / gambling-card style.

### Where motion is applied
- **Hero**: 3 background blobs get parallax (`-0.08`, `+0.06`,
  `-0.04`) + `breatheGlow` (9/11/13s). HeroMockup gains 3 NEW
  decorative floating shapes (rounded square 8° + circle + rounded
  square −6°) on `driftSlow` 12/14/16s with negative `animation-delay`
  to desync. Existing stacked depth cards now also drift on
  `floatSlower`/`floatSlow` (10s/9s reverse).
- **Problem section**: cyan blob → parallax + breathe.
- **Decision preview**: 2 NEW background blobs (teal-100/35 at
  top-right, cyan-100/25 at bottom-left) with parallax + breathe.
  Inner grid wrapped in `relative z-10` so content stays above
  motion layers without z-fighting.
- **Zubi section**: orb halo gets `breatheGlow` (8s). NEW background
  cyan-100 blob with `breatheGlow` (14s) + parallax `-0.05`.
- **Clinic matching**: existing teal-100 blob now `breatheGlow`
  (13s) + parallax `-0.06`.
- **Care Pass section**: 2 blob layers get parallax + `breatheGlow`
  (10/12s). The glossy Care Pass card now wrapped in a
  `floatSlow` 8s container, AND a subtle diagonal `shimmerSweep`
  overlay sweeps across the card every 8s (`linear-gradient` div with
  `inset-y-0 -left-1/2 w-1/3` translating).
- **Final CTA**: 3 blobs get parallax + breathe at varied tempos
  (11/13/9s).
- **Mobile sticky CTA + Hero/Final CTAs**: still rely on the
  inset white-25% glassy shine line (no shimmer animation — keeps
  CTAs static and predictable for clicks).

### Accessibility
- Top of `useBackgroundParallax` does
  `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
  early-return → CSS var `--py` is **never set**, freezing every
  parallax layer at translate3d(0,0,0).
- `MotionStyles` injects a `@media (prefers-reduced-motion: reduce)`
  block that forces `animation: none !important` on every animated
  element and `transform: none !important` on every `[data-parallax]`
  element, so even browser-rendered animations stop.
- Verified via Playwright `emulate_media(reduced_motion="reduce")`:
  `--py` empty, `activeAnims: 0`, parallax transform `none`. Page
  still renders beautifully — just static.

### Performance
- Only `transform` and `opacity` animated (compositor-friendly).
- `blur(3xl)` filters live on already-blurred decorative layers
  whose `transform` is the only animated property → no repaints.
- Single passive scroll listener + rAF throttle → ~60 fps without
  jank. No `requestAnimationFrame` inside React state.
- 13 layers tagged `data-parallax` + 28 elements running keyframe
  animations total. No CLS — every motion layer is `absolute`-
  positioned and `pointer-events-none`.

### Brief compliance check
- ✅ Hero parallax + 4 floating decorative shapes behind product mockup.
- ✅ Floating chips already exist around Hero/Decision/Zubi (kept).
- ✅ Section depth orbs on Hero · Decision · Zubi · Care Pass ·
   Final CTA (and bonus on Problem · Matching).
- ✅ Scroll-based parallax (lightweight CSS+JS) without scroll-jacking.
- ✅ Care Pass card has subtle floating + a tasteful diagonal
   shimmer sweep (not "bank-card / gambling-card" glamour).
- ✅ Zubi orb halo has slow breathing glow.
- ✅ `prefers-reduced-motion: reduce` fully respected.
- ✅ No fast parallax, no hijacking, no bouncing, no neon, no
   particles, no cursor-follow.
- ✅ Mobile: no overflow at 390px (re-verified).

### Files touched
- `frontend/components/HomeContent.tsx` (~1346 LOC) — only file
  modified. No new files, no deletes, no package changes.

---


## 2026-02-17 — Wave.co-Inspired Glassmorphism Visual Polish

Heavy visual polish pass over `frontend/components/HomeContent.tsx`.
Goal: take the homepage from "premium SaaS landing" to
"Wave.co / Linear / Stripe / Family-app-tier polished product
landing". **Pure visual/UX work — zero copy rewrites, zero route
changes, zero backend changes, zero new pages, zero new packages.**
All `data-testid`s and CTA `href`s preserved.

### Glassmorphism system applied across 15 sections
- **Floating pill nav** — fixed top inset with `bg-white/40 → /70`
  backdrop-blur-2xl, soft ring + scroll-aware shadow. Replaces the
  previous full-width glass bar.
- **Hero**
  - Premium radial-gradient backdrop (teal at 15/20, cyan at 85/60)
    on top of warm-ivory base, plus three soft turquoise/cyan/emerald
    blur blobs for layered light leaks.
  - Glossy primary CTA: linear `#14b8a6 → #0d9488 → #0f766e` gradient
    with inset white-25% blur "shine" line for the wet-glass effect.
  - Frosted glass secondary CTA (`bg-white/60 backdrop-blur-md`).
  - **NEW** 4 hero glass chips ("Без регистрация / Ориентир за цена и
    срок / Care Pass след консултация / Не заменя преглед").
  - Hero mockup gains 2 extra stacked depth cards (rotated 3.5° and
    counter-rotated −2.5°) behind the primary card → strong layered
    Wave-style product depth. Floating chips "Партньорски клиники" +
    "Ориентир за цена" soften the corner accents.
- **Trust strip** — converted to a glass pill rail
  (`rounded-full bg-white/60 backdrop-blur-xl ring-1 ring-white/70`)
  with mobile horizontal-scroll and desktop wrap. 6 trust items.
- **Problem** — radial gradient backdrop + glass cards
  (`bg-white/70 backdrop-blur-xl ring-1 ring-white/70`), each gains a
  Lucide icon (Megaphone / MessagesSquare / Wallet / HelpCircle) in a
  rounded teal-50 icon container, hover lift + soft shadow growth.
- **How It Works** — connected glass card track:
  - Horizontal teal-200 gradient connector line behind the row
    (`hidden lg:block`).
  - Each step now carries a **mini UI mock** inside the card
    (questionnaire rows / orientation card / comparison rows /
    Care Pass voucher).
  - **Step 04 (Care Pass)** rendered with a distinct teal-tinted
    gradient background + teal ring + larger teal numeral, making it
    visually prominent — reinforces the Care Pass promise.
- **Treatment categories** — glass cards with subtle radial
  hover-sweep; **first two cards** ("Ортодонтия" + "Алайнери vs
  брекети") rendered with featured teal-tinted gradient bg + teal
  ring + larger drop shadow.
- **Decision preview** — main product card now glassy
  (`bg-white/90 backdrop-blur-xl`), gains a third stacked depth card
  rotated 2°, and **two new floating glass chips** orbit the mockup:
  "Въпроси за преглед" (top-left) + "Продължаваш само ако решиш"
  (bottom-right). Closest section to a Wave-style product demo.
- **Zubi** — frosted glow halo + glass container around the orb,
  **NEW chat bubble** ("Zubi · Искаш ли да разбереш какви въпроси да
  зададеш на ортодонт?") with sparkles avatar dot + float animation.
- **Clinic matching** — completely re-laid out 2-col with **NEW
  app-like matching mockup** on the right:
  - "Критерии за насочване" panel with 3 criteria rows
    (Град · София / Категория · Ортодонтия / Предпочитание ·
    дискретно лечение) each in a glass row with a Lucide icon.
  - "Релевантни клиники" panel showing 3 anonymized glass cards
    (Клиника А / Б / В) with treatment tags (Алайнери, Възрастни,
    Ортодонтия, Естетични брекети, Дискретно).
  - Disclaimer text: "Примерни клиники, не реални имена."
  - Brief explicitly required no real names, no paid-ranking
    implication, no "best clinic" copy → all satisfied.
- **Patient questions** — translucent cards with rounded icon
  circles, hover teal-ring + larger drop shadow, "Прочети
  обяснението" link gains arrow + group-hover gap animation.
- **Recent Articles (Journal)** — glass-hybrid cards with persistent
  fallback `BookOpen` icon under the image; `onError` now hides only
  the broken `<img>` while keeping the gradient placeholder visible
  (fixes the brief's "no broken images" requirement). Hover gains a
  subtle bottom-up overlay + 4% scale on the cover image.
- **Care Pass section — full premium centerpiece rewrite**:
  - Deep navy-teal gradient panel
    (`linear-gradient(135deg, #0E1A24 → #112832)`) with radial teal
    glow at top-right and cyan glow at bottom-left.
  - **NEW glossy Care Pass card mockup** on the right: stacked
    depth card behind, radial teal-94 highlight + white-10% bottom
    highlight, top white-20% blur "shine" line, "Zubite / Care Pass"
    serif wordmark, gift-icon glass tile, "Включва: Отстъпки за
    продукти за орална хигиена", "Получаваш го от клиниката след
    консултация", and a thin gradient shine line at the bottom
    edge. Tangible, healthcare-tech feel — NOT bank/insurance/
    rewards/gambling card aesthetic.
  - **NEW 4 benefit chips** below the body copy ("След проведена
    консултация / От клиниката / Орална хигиена / Не е отстъпка от
    лечение") rendered as white-6% glass chips with teal-300 check
    icons.
  - Dual CTAs preserved (glossy white primary + frosted secondary).
- **FAQ** — wrapped in a glass container
  (`bg-white/65 backdrop-blur-xl ring-1 ring-white/70`) with soft
  `slate-200/60` dividers; existing accordion expand/collapse motion
  preserved.
- **Final CTA** — frosted gradient panel (`bg-white/55
  backdrop-blur-2xl`) with **3 floating background chips** ("~60
  секунди" / "Без регистрация" / "Care Pass") perched on the edges
  (hidden on smallest screens), plus the same glossy gradient primary
  CTA used in the Hero. Three radial blur blobs in the background.
- **Mobile sticky CTA** — same glossy gradient + inset shine line.
- **Footer** — same dark navy, gains a thin top
  `bg-gradient-to-r from-transparent via-teal-400/40 to-transparent`
  glass edge + a single soft teal blur blob behind the top.

### Motion language (unchanged philosophy, expanded usage)
- Re-uses the existing IntersectionObserver `Reveal` helper.
- CSS `float` keyframe powers Hero mockup, Hero floating chips,
  Decision floating chips, Zubi chat bubble — all gentle 6–8s
  ease-in-out Y-axis loops.
- All hovers: `-translate-y-0.5/-1` lift + soft shadow growth +
  group arrow `translate-x-0.5`. No bounces, no parallax chaos.

### Accessibility & responsiveness
- Mobile horizontal-overflow check on `/` at 390×844 returns
  `{ docW: 390, viewW: 390, overflow: false }` ✅.
- Trust strip on small screens uses horizontal-scroll + hidden
  scrollbar; clears tap targets.
- All glass surfaces tested for legibility against new gradient
  backdrops — text stays `slate-700/800/900` on `white/55+ glass`,
  `slate-200/300/400` on dark Care Pass + Footer panels.
- All buttons remain keyboard-focusable; `aria-hidden` on every
  decorative blob/halo/depth card.

### Technical
- 6 new Lucide icons imported (MapPin, SlidersHorizontal,
  Megaphone, MessagesSquare, Wallet, HelpCircle, Gift); zero other
  dependencies added.
- File grew from ~960 → ~1310 LOC, all within one `HomeContent.tsx`
  per prior architectural decision. No splits this batch.
- TypeScript: `npx tsc --noEmit` → 0 new errors in HomeContent.tsx /
  page.tsx (only pre-existing unrelated errors in admin files).

### Screenshots captured (per acceptance criteria)
Desktop 1440×900: Hero · Trust strip · How-it-works · Decision
preview · Zubi · Clinic matching · Care Pass · Final CTA.
Mobile 390×844: Hero (top) · Hero (mockup scrolled) · Care Pass.
All renders pass the brief.

### Brief compliance check
- ✅ Heavy glassmorphism system, premium gradients, layered depth.
- ✅ Glossy CTA + frosted secondary buttons (Wave-style).
- ✅ App-like product mockups in Hero, Decision, Matching.
- ✅ Step 04 Care Pass visually emphasized.
- ✅ Care Pass: glossy tangible card + 4 benefit chips + correct
   guarantee copy "Посети консултацията и получи Care Pass от
   клиниката".
- ✅ Zubi: glass guide container + chat bubble; no white coat,
   no mascot, no dental tools.
- ✅ Clinic matching: only example names "А/Б/В", explicit
   disclaimer, no paid-ranking copy.
- ✅ No diagnostic UI (no percentages, no "best clinic", no
   medical certainty).
- ✅ No purple gradients, no neon, no harsh borders, no pure black.
- ✅ Mobile remains excellent: no horizontal overflow, glass cards
   stay readable, hero mockup doesn't overpower headline.

---


## 2026-02-17 — Homepage Copy Refinement (Patient-Safe, Care Pass Clarified)

Pure copy/messaging pass over `frontend/components/HomeContent.tsx` —
no layout changes, no new routes, no functional changes. The
previous redesign was visually premium but some wording was vague,
too SaaS-generic, or carried diagnostic confidence the platform must
not project. This batch makes every public-facing string clearer,
patient-friendlier, and medically safer, and introduces the
Care Pass guarantee with the correct framing.

### What changed (15 sections updated)
1. **Hero** — subheading rewritten to spell out what the user
   actually gets after clicking ("кратки въпроси → разбираем ориентир
   → възможни посоки → ориентировъчни цени → следваща стъпка");
   disclaimer rephrased to "не поставя диагноза и не заменя преглед".
2. **Hero result card** — *removed* the percentage-style match bars
   (95% / 78% / 65%) that read like diagnosis output. Replaced with
   a calm "Посоки за обсъждане:" list of three text rows with short
   reasoning. Card eyebrow now "Примерен ориентир след въпросника",
   badge "Ориентировъчен случай", footer "Следваща стъпка:
   консултация с ортодонт", CTA "Виж подходящи клиники". Floating
   chips softened to "Партньорски клиники" + "Ориентир за цена".
3. **Trust strip** — now 6 chips including the new
   "Care Pass след консултация" item.
4. **Problem section** — subheading + all four pain-card titles &
   bodies rewritten to specific, less-abstract Bulgarian.
5. **How it works** — new heading "Как стигаш от объркване до ясна
   следваща стъпка"; step 04 redesigned around Care Pass:
   *"Посети и получи Care Pass — клиниката ще ти предостави Zubite
   Care Pass с отстъпки за продукти за орална хигиена"*.
6. **Treatment categories** — every card description rewritten to be
   concrete (symptoms / scope / when relevant). CTA label changed
   from "Научи повече" → "Виж насоки".
7. **Decision preview** — heading "Виж какъв ориентир получаваш
   преди преглед", new bullet list (4 items including "Продължаваш
   само ако решиш"), button "Започни краткия въпросник". **Mockup
   card fixed**: "Лек до умерен скрипт на долна челюст" was unnatural
   BG — replaced with "Възможно леко до умерено струпване на долни
   зъби". Labels "Срок" → "Ориентировъчен срок", "Подходящи подходи"
   → "Възможни подходи за обсъждане". Added third option
   "Ортодонтска консултация за потвърждение". Verification badge
   "Прегледано" → "Примерен ориентир, не диагноза".
8. **Zubi section** — replaced awkward "не лекар, не игра" with
   "Zubi помага да разбереш информацията — без да поставя диагноза"
   + clearer body + explicit medical disclaimer.
9. **Clinic matching** — new heading "Насочване към клиники според
   това, което си описал", new subheading explaining the inputs
   (отговори / град / тип проблем / предпочитания). 3 reassurance
   cards retitled: "По случай, не по реклама" / "Ясни критерии" /
   "Без задължение". Removed risky phrasing "точно с твоя случай".
10. **Patient questions** — new heading "Въпросите, които повечето
    пациенти си задават преди лечение"; every card now has a short
    description under the question; CTA replaced "Към статия в
    журнала →" with "Прочети обяснението →".
11. **Recent Articles** — new heading "Кратки обяснения за решения,
    които не трябва да взимаш на сляпо" + supporting subheading.
12. **Care Pass section — full rewrite**:
    - Eyebrow "Care Pass (скоро)" → "Zubite Care Pass" (no
      "coming-soon" qualifier).
    - Heading "Посети консултацията и получи Care Pass от клиниката".
    - Body explains the guarantee: *"Когато заявиш насочване чрез
      Zubite.bg и посетиш консултацията в партньорска клиника,
      клиниката ще ти предостави Zubite Care Pass — карта с
      отстъпки за продукти за орална хигиена."*
    - Removed all subscription / family / early-access /
      personal-calendar / treatment-tracking / predictable-prices
      copy (these features are not implemented; brief explicitly
      forbade implying them).
    - Primary CTA "Запази място в early access" → "Провери своя
      случай" (routes to /quiz, not /care-pass).
    - **NEW** secondary CTA "Как работи Care Pass" → /care-pass.
    - **NEW** small disclaimer note: *"Care Pass се предоставя от
      клиниката след проведена консултация чрез Zubite.bg.
      Отстъпките са за партньорски продукти за орална хигиена и
      не представляват отстъпка от лечение."*
    - Card mock on the right changed from "Член от Февруари 2026"
      (subscription vibe) to "Включва: Отстъпки за продукти за
      орална хигиена" with badge "Партньорска" (replaces "Premium").
13. **FAQ** — all 5 existing answers rewritten in calmer,
    less-promotional Bulgarian. **Two new items added**:
    *"Как получавам Zubite Care Pass?"* and *"Какво включва
    Care Pass?"* — both reinforce that the Pass is given by the
    clinic after the consultation and contains discounts for oral
    hygiene products, not treatment discounts. FAQ array now has 7
    items (5 → 7).
14. **Final CTA** — heading "Първо яснота. После — подходяща
    следваща стъпка." + new subheading + simpler disclaimer
    aligned with the rest of the page.
15. **Footer** — tagline unchanged (already matched the brief).

### Page metadata (page.tsx)
- `description`, OG `description`, Twitter `description` updated to
  mirror the new hero subheading. Title and structure unchanged.

### Verified copy hygiene
Hard grep for forbidden phrases in `HomeContent.tsx` and `page.tsx`
returns **0 matches** for: `съгласувано`, `не игра`, `точно с твоя`,
`60-секунден преглед`, `най-добрата клиника`, `за цялото семейство`,
`early access`, `персонален календар`, `проследяване на лечение`,
`предвидими цени`.

"Care Pass" is mentioned **12 times** across the page (trust strip,
How-it-works step 04, dedicated section + secondary CTA + disclaimer,
two FAQ entries) — guarantee is unmistakable.

### Tests
Self-test screenshots across Hero, Problem, How-it-works, Treatments,
Decision preview, Zubi, Care Pass, FAQ on 1440×900 desktop — all
sections render cleanly, no layout regression, no broken anchors,
no new TS errors. Previous functional test (iteration_40, 100%
pass) covers layout/CTA routing/responsiveness/SEO — none of those
contracts changed.

### Scope discipline
- Zero new files. Zero deleted files.
- Zero new dependencies.
- Zero backend changes.
- Zero changes to quiz, blog, admin, attribution, lead capture,
  clinic dashboard, reviews, or any non-homepage route.
- Legacy `AnimatedHomeSections.tsx` still intentionally retained
  per prior user decision.

---


## 2026-02-17 — Premium Wave.co-inspired Homepage Redesign

Complete rewrite of the public landing page (`/`) per the calm,
premium "Organic & Earthy / Soft-Tech Healthcare" blueprint in
`/app/design_guidelines.json`. Replaces the previous
`AnimatedHomeSections` stack with a single composed `HomeContent`
component that delivers all 14 sections in the design system:
warm-ivory backgrounds, soft turquoise accents, Playfair Display
serif headlines, Inter body, gentle floating mockups, no neon, no
mascot, no stock dental photography.

### Files changed
- **NEW** `frontend/components/HomeContent.tsx` (~930 LOC, single file)
  containing 14 named sections: `Nav`, `MobileStickyCTA`, `Hero`,
  `HeroMockup`, `TrustStrip`, `Problem`, `HowItWorks`,
  `TreatmentCategories`, `DecisionPreview`, `ZubiSection`,
  `MatchingExplain`, `PatientQuestions`, `RecentArticles`,
  `CarePassTeaser`, `FAQ` + `FAQItem`, `FinalCTA`, `HomeFooter`.
  All interactive elements have `data-testid` attributes for QA.
- **REWRITTEN** `frontend/app/page.tsx` — now a thin server
  component that fetches `getRecentPosts()` via SSR
  (`/api/blog/posts?limit=3`, revalidate 300s) and renders
  `<HomeContent recentPosts={...} />` inside `<main>` with the
  same SEO `Metadata` export + WebSite/Organization JSON-LD scripts.
- **UPDATED** `frontend/tailwind.config.js` — `fontFamily.serif` now
  maps to `['Playfair Display','Georgia','serif']` so the
  `font-serif` utility used across HomeContent reliably produces
  Playfair Display. `fontFamily.sans` aligned to Inter explicitly.
- *Intentionally retained*: `frontend/components/AnimatedHomeSections.tsx`
  remains in the repo — no deletions per handoff guidance.

### Sections (per design_guidelines.json)
1. Sticky glass nav with scroll-aware backdrop blur.
2. Hero — split layout: serif headline + dual CTAs (left) +
   floating product mockup card with match-percentage bars and two
   floating side-chips (right). Uses `hero_background_texture`
   asset as a 0.18-opacity overlay; two soft turquoise blur blobs
   anchor the corners. CSS `float` keyframe drives subtle levitation.
3. Trust strip — 5 uppercase chips (Без регистрация, Без задължение,
   …) on a low-contrast white/60 + backdrop-blur surface.
4. Problem — `bg-teal-50/40`, large serif headline, 4-card pain grid.
5. How it works — 4 numbered step cards with chevron connectors.
6. Treatment categories — 7-card responsive grid linking to blog.
7. Decision preview — side-by-side product mockup mimicking the
   actual results screen (case headline, срок, ценови диапазон,
   подходящи подходи, насочване preview).
8. Zubi guidance — uses `zubi_ai_abstract` orb image with a
   continuous breathing scale animation; explicitly framed as
   "не лекар, не игра".
9. Clinic matching explanation — 3 reassurance cards.
10. Patient questions — 6-card grid pointing to /blog.
11. **NEW** Recent Articles (SSR) — 3 cards rendered from
    `/api/blog/posts?limit=3`; renders `null` if no posts.
12. Care Pass teaser — dark premium card with soft teal glow,
    "Care Pass (скоро)" badge, membership-card mock.
13. FAQ — 5 accordion items, soft dividers, serif questions,
    smooth height transition with `grid-rows-[1fr]` trick.
14. Final CTA — centered teal gradient, "~60 секунди" badge,
    repeated quiz CTA + medical disclaimer.
15. **NEW** `HomeFooter` — dark slate footer with 4-column
    nav (Platform / За клиники / Право / Brand), copyright +
    "Направено с грижа в България".
16. **MobileStickyCTA** — fixed-bottom pill CTA visible only on
    `<md` to drive conversions, exactly per design spec.

### Visual & motion system
- `Reveal` helper (single IntersectionObserver per element,
  threshold 0.12, rootMargin `-10%` bottom) staggers entrance
  fades via `style.transitionDelay` rather than CSS hacks —
  works without framer-motion, zero new deps.
- Lucide-react icons only; no emoji.
- Pill-shaped CTAs with `-translate-y-0.5` hover lift and soft
  teal-tinted drop shadows (`shadow-[0_10px_30px_-12px_rgba(20,184,166,0.5)]`).
- All max-widths capped at `max-w-6xl` / `max-w-3xl` for FAQ &
  Final CTA, per the "generous max-width" guideline.

### SEO preserved
- Page-level `Metadata` retained (title, description, keywords, OG,
  Twitter, canonical, robots).
- Both WebSite and Organization JSON-LD scripts retained in
  `page.tsx`.

### Test status
- `testing_agent_v3_fork` iteration_40 → **100% pass**, zero bugs,
  zero action items. All 14 sections verified across 1920/768/375
  viewports, all CTA routes verified, FAQ toggle verified, mobile
  sticky-CTA visibility rules verified, no horizontal overflow,
  SEO metadata + JSON-LD intact.

### Notes
- `RESEND_API_KEY` and `EMERGENT_LLM_KEY` remain empty in local
  `.env` (intentional after the secret rotation). This does not
  affect the homepage which is purely static + a single SSR blog
  fetch.
- Old `AnimatedHomeSections.tsx` retained per handoff. Can be
  deleted in a follow-up cleanup once stakeholders sign off.
- Optional refactor (deferred per testing-agent review):
  split HomeContent.tsx into `/components/home/*.tsx` files.

---



## 2026-05-16 — Clinic Profile Engagement Upgrade R1

Made the public clinic profile a true **decision-support page** for
patients, not a static directory entry. Frontend-only batch — single
file edit + one new export, **zero backend changes**, zero new
dependencies, no admin / clinic-portal scope drift.

### Files changed
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` — added 5
  new sections + 2 wrapper components inside the existing file
  (~410 LOC additions, ~25 LOC removals). The legacy
  `Какво да очаквате при първата стъпка` micro-section was replaced
  by the richer `PostRequestTimeline`. The legacy
  `ReviewSignalsSection` was superseded by the new consolidated
  `TrustSignalsSection` (import commented out, kept for reference).
- `memory/CHANGELOG.md` — appended entry.

### Sections added / upgraded
1. **`ClinicDecisionSidebar`** (desktop sticky, `lg:` only). Contents:
   tier badge (Premium/Featured), clinic name, city, "Подходяща за"
   chips, primary `Искам обаждане` CTA (uses existing `RequestCallCta`),
   secondary `← Назад към препоръчаните клиники` link, Care Pass
   micro-note. Hidden on `<lg`.
2. **`MobileDecisionStrip`** (`lg:hidden`). Compact CTA + Care Pass
   note kept above the fold on small screens so the desktop sticky
   sidebar's primary action stays accessible on mobile too. No fixed
   positioning → no horizontal overflow / no z-index conflict with
   the existing cookie banner.
3. **`ClinicFitPanel`** — "Подходяща ли е тази клиника за мен?"
   4-card grid: Лечение / фокус, Град / достъпност, Тип заявка,
   Следваща стъпка. Cautious copy ("Може да е подходяща опция, ако
   търсите…"). No "най-добрата" / "гарантирано подходяща" /
   "Zubite препоръчва лечение" phrases.
4. **`PostRequestTimeline`** — 3-step "Какво се случва след заявката?"
   sequence: 1) Изпращате заявка, 2) Клиниката се свързва с вас,
   3) Посещавате консултация. Includes the safety note
   "Zubite не поставя диагноза и не заменя преглед при лекар."
5. **`TrustSignalsSection`** — "Сигнали за доверие" using ONLY existing
   data (see Data sources below). Honest empty state when no signals
   present.
6. **`ClinicFAQSection`** — 5-question accordion with `useState` only,
   no new dependency. First question open by default. Toggle via
   `aria-expanded` + visual `+` rotation.

### Treatment focus chips
The existing treatment-tag rendering already used pill chips with
`TREATMENT_LABELS` lookup (Алайнери / Брекети / Импланти /
Ортодонтия / Естетична стоматология / Обща стоматология). R1
preserves it — no fake treatments invented; honest empty state
"Информацията за конкретните направления ще бъде потвърдена при
разговор." stays in place when the clinic has no treatment data.

### Care Pass placement
- **Existing** Care Pass section directly under the hero (image +
  badge + benefit copy) was preserved. Image cap stays at `aspect-square`
  / `140px` desktop. **Not made bigger** than the clinic decision CTA.
- **New** Care Pass micro-note added in two more places: the desktop
  sticky sidebar (in a small sky-50/40 strip with `ShieldCheck` icon)
  and the mobile decision strip. Wording: "При посетена консултация
  през Zubite.bg клиниката ще ви предостави Zubite Care Pass."
- No coupon styling, no "награда", no "гарантирана отстъпка".

### Trust / review data sources used
| Item | Source | Shown when |
|---|---|---|
| Google ревюта | `clinic.review_signals.sources[].platform === 'google'` | `rating > 0` OR `review_count > 0` |
| Facebook ревюта | same | same |
| Superdoc ревюта | same | same |
| Добавени пациентски случаи | `clinic.clinic_profile.case_library.length` | `> 0` (Premium published only — backend already gates this) |
| Публикуван профил | `clinic.clinic_profile.profile_status === 'published'` | true |
| Партньор на Zubite от | `clinic.partner_since_year` | truthy |

If none → empty state copy: "Все още няма добавени review сигнали за
тази клиника." `review_signals.disclaimer` (when present) is rendered
below the grid as soft-text.

### Tier visibility
- **Standard** profile: hero, fit panel, treatments, mobile-strip,
  PostRequestTimeline, TrustSignals, FAQ, bottom CTA.
- **Featured**: same + `patient_intro` (existing About card).
- **Premium**: same + the existing Premium-only stack (Clinic Story,
  Case Library, Doctor Spotlight, Environment, Patient Journey,
  Zubite Feedback) — **unchanged**, all backend-gated.
- The new sections are tier-agnostic by design (no Premium-only copy
  inside) so Standard/Featured can never see a Premium-only empty
  block. The Premium case library still renders only when the
  backend exposes it (already enforced by `_public_profile_for_tier`).

### Case library behaviour (unchanged)
The existing Case Library section keeps its consent-safe wording, no
implied guaranteed outcomes. No filter UI added in R1 (only 0–3 cases
are typically present per profile; filtering would feel heavy). Empty
state for **Premium** only: "Тази клиника все още не е добавила
пациентски случаи." Standard/Featured never see this because they
never reach the Premium block.

### FAQ behaviour
- Local `useState<number | null>(0)` — first question open by default.
- 5 questions per spec. Safe answers — Zubite helps with clarity, not
  diagnosis; clinic contacts patient; Care Pass after attended
  consultation; patient can compare up to 3 clinics.
- `data-testid="faq-question-{i}"` and `faq-answer-{i}` for each row.
- No new dependency (no `@radix-ui/react-accordion`, no `@headlessui`).

### Container width bump
Standard / Featured tier containers were `max-w-3xl` / `max-w-4xl`.
With the new 320px sticky sidebar these became cramped. Bumped both
to `max-w-5xl`; Premium stays at `max-w-6xl`. Mobile widths unchanged.

### Mobile verification (live preview, 390 × 844)
| Check | Result |
|---|---|
| `documentElement.scrollWidth === clientWidth === innerWidth` | `[390, 390, 390]` ✅ no overflow |
| Sticky sidebar visible on mobile | `false` ✅ (lg:block hides it) |
| Mobile decision strip visible | `true` ✅ |
| Fit panel renders | ✅ |
| Post-request timeline renders | ✅ |
| Trust signals renders | ✅ |
| FAQ renders | ✅ |

Desktop (1440 × 900) — sidebar visible with badge / city / treatment
chips / CTA / back link / Care Pass note. Sticks to `top-24` while
scrolling. Verified live on Sofia Premium Clinic profile.

### TypeScript
`npx tsc --noEmit` → **zero new errors**. The 6 pre-existing errors
in unrelated files (`admin/blog/import` Set iteration,
`admin/dashboard` line 561 boolean comparison, `lib/api.ts` index
sig, `lib/articleTestRender`, `lib/attribution`) are unchanged.

### Copy guardrails (live audit)
✅ Used: "пациентски контекст", "следваща стъпка",
"може да е подходяща", "сигнали за доверие", "партньорски ползи",
"след посетена консултация".
✅ Avoided: "най-добра", "топ клиника", "гарантиран резултат",
"диагноза" (only mentioned in the safety disclaimer "не поставя
диагноза"), "сертифицирана от Zubite", "проверено качество",
"награда", "безплатно лечение", "гарантирана отстъпка".

### No scope drift
- ✅ Backend: untouched. No data model, no endpoint, no auth, no CSRF,
  no audit-log change. No backend calls changed.
- ✅ Admin frontend: untouched.
- ✅ Clinic portal: untouched.
- ✅ Quiz: untouched.
- ✅ Request-call modal / assisted-choice modal: existing contact
  confirm-mode (added in the previous batch) still works because the
  modal-open path is unchanged — modal is still passed
  `getStoredLeadContact(leadId)` from this page.
- ✅ Analytics: existing `trackPatientEvent('request_call_modal_opened',
  {...})` is wired on the new sidebar CTA path with the same payload
  shape. No new event types; no analytics refactor.
- ✅ `package.json` / dependencies: unchanged. No new dependencies.
- ✅ Resend / Twilio / ElevenLabs: not invoked.
- ✅ No git push / no deploy / no Save to GitHub.

### Remaining risks
- 🔴 Git secrets-leak remains BLOCKED — local-only.
- 🟡 The legacy `ReviewSignalsSection` component file still exists
  under `components/patient/`. Kept intact (just not imported here)
  so any other consumer outside this page keeps working. Cleanup of
  the file itself is deferred to a future tidy-up batch.
- 🟢 Treatment chips are not yet **interactive** (they don't filter the
  case library). Spec said "small cards/chips" — done. Filterable
  chips would require a Premium-only case-library filter UI and
  would touch the Case Library section (Premium scope), which is out
  of R1 scope.

### Safe to proceed?
✅ **Review Collection + QR Foundation** — fully independent surface
from this batch. The new sections read existing review data
read-only; adding write paths or QR generation can proceed without
re-touching what we built here.

### Recommended sub-batch (optional)
- **R1.1 — Treatment chip filtering**: when a Premium clinic has 4+
  case_library items, let the new treatment chips filter the case
  cards client-side. Still no backend change. Adds ~30 LOC.


## 2026-05-16 — Resend Live Delivery Verification (P4/P5 Admin Alerts) — BLOCKED

Verification-only batch: confirm whether the existing P4/P5 admin email
alerts deliver in the preview environment now that the user reports
`zubite.bg` is verified in Resend. **No code changes**, no new feature,
no automation added.

### Result: ❌ Domain still rejected by this API key

The `RESEND_API_KEY` currently configured in the preview environment
**still rejects `zubite.bg` as unverified**, with the error message:

> `The zubite.bg domain is not verified. Please, add and verify your
> domain on https://resend.com/domains`

This was confirmed three independent ways:
1. Direct `resend.Emails.send({from: SENDER_EMAIL, to: ADMIN_EMAIL, …})`
   from a python REPL using the live env vars → same domain error.
2. `POST /api/leads` lead-create alert path → backend logs:
   `Failed to send lead notification email: The zubite.bg domain is not verified`.
3. `POST /api/leads/{id}/request-call` and
   `POST /api/leads/{id}/request-zubite-help` admin-alert path → backend
   logs: `_send_email failed to almareleood@gmail.com: The zubite.bg
   domain is not verified`.

### Likely root cause
The configured API key cannot list domains:
`resend.Domains.list()` → `This API key is restricted to only send emails`.
That is consistent with two scenarios:
- (A) Domain `zubite.bg` was verified in a **different Resend account
  / team** than the one that owns this API key.
- (B) The verification was completed but the key in
  `backend/.env` is from a separate, older account.

Action required by the user: confirm the API key in the env belongs
to the same Resend workspace where `zubite.bg` was verified, OR rotate
the key to one from that workspace. **The code is correct; only the
config / key-domain pairing needs to be aligned.**

### What WAS verified to work correctly

#### 1. Environment config (no secrets exposed)
- `SENDER_EMAIL` = `he***@zubite.bg` (uses verified domain pattern).
- `ADMIN_EMAIL` = `al***@gmail.com` (configured).
- `RESEND_API_KEY` = configured (36 chars).

#### 2. P4 selected-clinic flow (1 fresh test lead)
- `POST /api/leads` → 200, lead `e8fd3ec9-…1994` created.
- `POST /api/leads/{id}/request-call` → 200, `request_id`
  `d6527a56-…4ba8` returned.
- Backend invoked `send_admin_selected_clinic_request_alert()` exactly
  once (1 `_send_email failed` log line at 20:32:23). Subject template
  in code: `Нова заявка към избрана клиника — Zubite`. Body composer
  includes patient name + phone + email + selected clinic name + lead
  id + consultation_request id + admin link (verified by
  `test_p4_p5_admin_notifications.py::test_p4_long_form_body`).
- Resend rejected at SDK level → admin email NOT delivered.
- Patient response was unaffected: status 200, the resilience contract
  holds.

#### 3. P5 assisted-choice flow (1 fresh test lead)
- `POST /api/leads` → 200, lead `11176ce7-…0896` created.
- `POST /api/leads/{id}/request-zubite-help` → 200, `request_id`
  `e1c71bbd-…2d48` returned.
- Backend invoked `send_admin_assisted_choice_request_alert()` exactly
  once (1 `_send_email failed` log line at 20:33:00). Subject template
  in code: `Нова заявка за помощ при избор — Zubite`. Body composer
  includes patient name + phone + email + truncated message + lead id
  + request id + admin link (verified by
  `test_p4_p5_admin_notifications.py::test_p5_long_form_body` and
  `test_email_body_does_not_leak_forbidden_keys`).
- Resend rejected at SDK level → admin email NOT delivered.
- Patient response unaffected.

#### 4. Duplicate protection ✅
- P4 retry with same `clinic_id` → `200 already_requested:true`,
  **NO** second `_send_email` log line. (Backend grep:
  `_send_email failed to almareleood@gmail.com` count = 2,
  matching exactly one P4 + one P5 alert; zero retries.)
- P5 retry → `200 already_requested:true`, no second alert.

#### 5. Resilience ✅
- Resend SDK exception did NOT bubble up to the patient endpoint.
  Both P4 and P5 returned `success:true` with the consultation
  request id despite the email failing. This pins the contract
  `routers/public.py` line ~1370 / ~1561 (try/except around the
  best-effort alert call).

### Tests run
| Suite | Result |
|---|---|
| `test_p4_p5_admin_notifications.py` | **11/11 PASS** |
| `test_patient_request_call.py` | **31/31 PASS** |
| `test_patient_assisted_choice.py` | **28/28 PASS** |
| **Total** | **70/70 PASS** |

All Resend interactions in tests are mocked via `MagicMock`, so
the test results are independent of the live domain-verification
state and remain green. **No live emails were sent** beyond the
single P4 attempt and single P5 attempt described above (both
rejected before leaving Resend's API).

### No scope drift
- ✅ No patient email automation added.
- ✅ No clinic email notifications added.
- ✅ No SMS / Twilio / ElevenLabs invocation.
- ✅ No UI redesign / no patient flow change / no admin UI change.
- ✅ No `package.json` / dependency changes.
- ✅ Local-only — no git push / no deploy / no Save to GitHub.

### Files changed
**Code: NONE.** Only `memory/CHANGELOG.md` (this entry) and
`memory/PRD.md` (status note).

### Remaining email risks
- 🔴 Admin alerts are NOT actually being delivered in this preview env
  until the API-key ↔ verified-domain pairing is corrected.
- 🟡 The legacy `Failed to send lead notification email` path (older
  pre-P4/P5 helper triggered on every `POST /api/leads`) also fails
  silently — same root cause, not a separate bug.
- 🟡 Patient confirmation emails to lead-supplied addresses (e.g.
  `resend-p4-test@example.com`) also fail — same root cause.

### Safe to proceed?
- **Auth E5 (Session Governance)** ✅ — independent surface; the
  Resend gap doesn't block it.
- **Production smoke** ⚠️ — production should be checked separately:
  the production env may have a different `RESEND_API_KEY` paired with
  the verified `zubite.bg` domain. **Do NOT assume preview = production
  for this config.**

### Recommended next step (for the user)
Rotate the preview env's `RESEND_API_KEY` to one issued from the
Resend workspace where `zubite.bg` was actually verified, then re-run
this same verification (one P4 + one P5 fresh request). No code change
is required; the existing helpers will start delivering on the first
successful request after the key swap.


## 2026-05-16 — Technical Cleanup: Unify Clinic Treatment Fields

Resolved the long-standing schema duality between `treatments_supported`
and `treatments_offered` by establishing **`treatments_supported` as the
canonical field** going forward. Read/write bridge is non-destructive:
no migration, no data deletion, legacy clinics keep working.

### Decision
- **Canonical**: `treatments_supported` (clearer for matching + patient-
  facing recommendation logic).
- **Legacy mirror**: `treatments_offered` — kept on stored docs, written
  by the backend on every admin save as a temporary backwards-compat
  bridge. Frontend NO LONGER writes to it from new code.

### Audit (before cleanup)
| Where | Field used |
|---|---|
| `backend/schemas.py` Clinic | `treatments_supported` (legacy/routing) |
| `backend/schemas.py` ClinicCreate / ClinicAdminUpdate | `treatments_offered` (admin/partner) |
| `backend/routers/public.py` `_treatments_of()` | UNION of both |
| `backend/routers/public.py` quiz-driven auto-assign query (line 187) | `treatments_supported` only — legacy clinics missed |
| `backend/routers/public.py` recommended-clinics query | both fields fetched, union returned as `treatments` |
| `backend/routers/consultations.py` admin create | wrote ONLY to `treatments_offered` |
| `backend/routers/consultations.py` admin patch | wrote ONLY to `treatments_offered` |
| `frontend/app/admin/clinics/page.tsx` | read+wrote `treatments_offered` |
| `frontend/lib/api.ts RecommendedClinic` | exposed `treatments` |
| `frontend/components/patient/ClinicRecommendationCard.tsx` | read `clinic.treatments` |
| `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` | read `clinic.treatments` |

### Files changed
- `backend/routers/public.py`:
  - **New**: `_normalize_clinic_treatments(clinic)` — prefers
    `treatments_supported`; falls back to `treatments_offered`;
    lowercases, trims, deduplicates, drops empty/non-string entries,
    preserves stable insertion order.
  - `_treatments_of()` is now a thin alias for
    `_normalize_clinic_treatments` (was UNION before).
  - `_safe_clinic_payload()` now exposes BOTH `treatments` (legacy
    alias for backwards-compat) AND `treatments_supported` (canonical).
  - Quiz-driven auto-assign query (line 187) now matches on EITHER
    `treatments_supported` OR `treatments_offered` so legacy clinics
    still get auto-assigned during the cleanup window.
- `backend/schemas.py`:
  - `ClinicCreate`: added optional `treatments_supported` field.
  - `ClinicAdminUpdate`: added optional `treatments_supported` field.
- `backend/routers/consultations.py`:
  - **New**: `_canonical_treatments_for_doc(clinic)` — local mirror of
    the normalize helper (avoids cross-router import).
  - `_public_clinic_dict()` now surfaces canonical
    `treatments_supported` on every admin response.
  - Admin **create** (`POST /api/admin/clinics`): accepts either
    `treatments_supported` OR `treatments_offered`; canonicalizes;
    writes BOTH fields with the same normalized list.
  - Admin **patch** (`PATCH /api/admin/clinics/{id}`): when either
    field is in the update body, normalizes and writes BOTH.
  - Admin **list** (`GET /api/admin/clinics`): augments each clinic
    with normalized `treatments_supported`.
  - Admin **detail** (`GET /api/admin/clinics/{id}`): wraps response
    through `_public_clinic_dict()` so canonical field is surfaced.
- `frontend/lib/api.ts` — `RecommendedClinic` gets
  `treatments_supported?: string[]` (canonical, optional).
- `frontend/lib/consultationLabels.ts` — `TREATMENT_LABELS` now
  matches the spec exactly:
  - `aligners → Алайнери` (already correct)
  - `braces → Брекети`, `implants → Импланти`, `whitening → Избелване`
  - `general → Обща стоматология` (was `Обща`)
  - `cosmetic → Естетична стоматология` (added)
  - `cosmetic-dentistry → Естетична стоматология` (was `Естетика`)
  - `orthodontics → Ортодонтия`
  - `diagnostic_quiz / diagnostic_quiz_v1 / quiz → Диагностичен въпросник`
- `frontend/app/admin/clinics/page.tsx`:
  - `PartnerClinic` interface adds canonical `treatments_supported?`;
    keeps `treatments_offered?` as read-only fallback.
  - List column reads `treatments_supported || treatments_offered`.
  - Create-clinic form input is now `treatments_supported` (state +
    POST body); backend mirrors to legacy field automatically.
- `frontend/components/patient/ClinicRecommendationCard.tsx` — reads
  `clinic.treatments_supported || clinic.treatments`.
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` — same
  fallback chain in the public clinic profile treatment section.
- `backend/tests/test_clinic_treatment_fields_cleanup.py` — **new**,
  18 tests, **18/18 PASS**.
- `backend/tests/test_patient_recommended_clinics.py` — added
  `treatments_supported` to `ALLOWED_CLINIC_FIELDS` allow-list (tests
  `04_only_safe_clinic_fields_returned` and `25_no_unsafe_fields_leak_for_premium_clinic`).
- `memory/CHANGELOG.md` / `memory/PRD.md` — appended entries.

### Read precedence (canonical helper)
```python
def _normalize_clinic_treatments(clinic):
    raw = clinic.get("treatments_supported") or []
    if not (isinstance(raw, list) and any(isinstance(x, str) and x.strip() for x in raw)):
        raw = clinic.get("treatments_offered") or []
    # …lowercase, trim, dedupe, drop non-strings, preserve order…
```

### Write behaviour
- **Frontend (admin)**: now sends only `treatments_supported`.
- **Backend admin endpoints**: accept either field on input; always
  write canonical to **both** keys (mirror to `treatments_offered`
  is a temporary bridge). No new code path writes to
  `treatments_offered` exclusively.
- **No destructive migration**: existing legacy docs keep
  `treatments_offered` populated; on first admin save they get the
  canonical field too.

### Public API contract
- `GET /api/leads/{id}/recommended-clinics` clinic items expose:
  - `treatments_supported: string[]` (canonical, normalized)
  - `treatments: string[]` (legacy alias, same value, kept for
    backwards-compat with any pre-cleanup cached frontend bundles)
- `GET /api/admin/clinics` and `/api/admin/clinics/{id}` clinic dicts
  expose normalized `treatments_supported`. Stored doc still has
  `treatments_offered` for legacy reads.

### Tests run
- `pytest tests/test_clinic_treatment_fields_cleanup.py` →
  **18/18 PASS** (5.67s):
  1–7. Helper precedence/normalization (prefers supported, falls back
  to offered, drops empty/whitespace, dedupes, lowercases, drops
  non-strings, empty when both empty).
  8. Recommended endpoint — supported-only clinic.
  9. Recommended endpoint — legacy-only clinic surfaces canonical.
  10. Recommended endpoint — clinic with both fields prefers supported
  (legacy `braces` from offered is NOT in response).
  11. Recommended endpoint — whitespace dedup.
  12. Matching finds legacy-only clinic by `treatment_type`.
  13. Admin create writes canonical + mirror.
  14. Admin create accepts legacy `treatments_offered` body too.
  15. Admin patch writes both fields.
  16. Admin patch with legacy field still writes both.
  17. Admin GET single clinic returns normalized canonical.
  18. Admin GET list returns normalized canonical for every row.

- Regression run on related suites (each in isolation):
  - `test_patient_recommended_clinics.py` → **28/28 PASS**
  - `test_admin_clinic_profile_editor.py` → **24/24 PASS**
  - `test_patient_request_call.py` → **31/31 PASS**
  - `test_patient_assisted_choice.py` → **28/28 PASS**
  - `test_p4_p5_admin_notifications.py` → **11/11 PASS**
  - `test_admin_request_assignment.py` → **16/16 PASS**
  - `test_clinic_status_control.py` → **20/20 PASS**
  - `test_clinic_request_context_visibility.py` → **11/11 PASS**
  - `test_admin_patient_request_handling.py` → **12/12 PASS**
  - `test_patient_review_signals.py` → **23/23 PASS**
  - `test_strict_quiz_contact.py` → **13/13 PASS**
  - `test_security_audit.py` → **25/25 PASS**
  - `test_phase2_batch_a.py` → **24/24 PASS**
  - **Total: 284/284 PASS** (this batch + regression).

### TypeScript
`npx tsc --noEmit` → zero new errors. The 6 pre-existing errors in
unrelated files (`admin/blog/import` Set iteration,
`admin/dashboard` line 561 boolean comparison, `lib/api.ts` index
sig, `lib/articleTestRender`, `lib/attribution`) are unchanged.

### Frontend verification (live preview)
- Recommended-clinics endpoint for Sofia Premium Clinic returns
  `treatments_supported: ['invisalign', 'implants', 'full_mouth']`
  AND legacy `treatments` with the same list (curl-verified).
- Admin clinics list still shows treatment column (now reads canonical
  with legacy fallback).
- Public Sofia Premium profile renders treatment focus tags via the
  updated TREATMENT_LABELS map (`Invisalign`, `Импланти`, `Цяла уста`).

### Treatment label verification
| Code | Label |
|---|---|
| aligners | **Алайнери** (no `Алайнъри` typo anywhere) |
| braces | Брекети |
| implants | Импланти |
| whitening | Избелване |
| general | Обща стоматология |
| cosmetic | Естетична стоматология |
| orthodontics | Ортодонтия |
| diagnostic_quiz / diagnostic_quiz_v1 / quiz | Диагностичен въпросник |

Raw enum keys never leak in patient-facing UI: cards / profile /
quiz-source attribution all resolve through `TREATMENT_LABELS[t] || t`.

### No scope drift
- ✅ Patient quiz logic: untouched.
- ✅ Request-call modal / Assisted-choice modal: untouched.
- ✅ Admin request assignment flow: untouched.
- ✅ Clinic status control: untouched.
- ✅ Auth / session / CSRF: untouched.
- ✅ Analytics dashboard: untouched.
- ✅ Article importer: untouched.
- ✅ /za-kliniki: untouched.
- ✅ Care Pass copy: untouched.
- ✅ Resend / Twilio / ElevenLabs: not invoked.
- ✅ `package.json` / dependencies: unchanged.

### Unresolved risks
- 🔴 Git secrets-leak remains BLOCKED — local-only, NO push / NO deploy.
- 🟡 Legacy mirror in `treatments_offered` will keep being populated by
  the backend until we remove the bridge in a future batch. Removing
  the mirror should be done only AFTER:
    1. Confirming no external admin tools / scripts read it directly.
    2. A migration sweep that copies `treatments_offered` →
       `treatments_supported` for any unmigrated docs and unsets the
       legacy field. Out of scope of this non-destructive batch.
- 🟢 The cleanup is safe to proceed alongside Auth E5 / Resend
  sender-domain verification — both touch unrelated surfaces.

### Safe to proceed?
✅ Auth E5 (Session Governance) — independent surface, no overlap.
✅ Resend sender-domain verification — DNS-only, no code change here.


## 2026-05-16 — Admin Header Consistency

Standardized the admin chrome across every page under `/admin/*`. Single
shared `AdminHeader` component replaces the 8 different inline header
variants (full nav / compact / dark-themed public Header / no header).
**Frontend-only batch. Zero backend changes. Zero patient-flow / clinic-
portal / analytics-pipeline / dependency changes.**

### Files changed
- `frontend/components/admin/AdminHeader.tsx` — **new**, ~220 LOC.
  Single source of truth with two layouts:
    - **List mode** (default): brand "Zubite.bg" + page title + 6 nav
      icons (Табло / Заявки / Партньори / Кандидатури / Анализи / Блог)
      + Изход. Active item gets `aria-current="page"` + sky-50/sky-700
      pill styling. Labels collapse to icon-only below `lg`.
    - **Compact mode** (when `backHref` prop is set): hides nav, shows
      "← {backLabel}" link instead. Used on every detail / editor page.
  - Logout encapsulated: `POST /api/admin/logout` (credentials: include)
    + `localStorage.removeItem('admin_token','admin_user')` + `router.push('/admin')`.
  - Sticky `top-0 z-40`, white background, slate-200 border. data-testids
    on every interactive element: `admin-header`, `admin-header-brand`,
    `admin-header-back`, `admin-header-back-mobile`, `admin-header-logout`,
    `admin-nav-{dashboard|consultation-requests|clinics|applications|analytics|blog}`.

- `frontend/app/admin/dashboard/page.tsx` — replaced 60-line inline header.
- `frontend/app/admin/analytics/page.tsx` — replaced inline header,
  added `pageTitle="Анализи"`. Loading state now also renders header.
- `frontend/app/admin/blog/page.tsx` — replaced inline header,
  `pageTitle="Блог"`.
- `frontend/app/admin/clinic-applications/page.tsx` — replaced inline
  header, `pageTitle="Кандидатури за клиники"`.
- `frontend/app/admin/clinics/page.tsx` — replaced English-text minimal
  header ("Partner Clinics" / "Назад" / "New clinic") with full nav
  + Bulgarian H2 "Партньорски клиники" + "Нова клиника" button.
- `frontend/app/admin/consultation-requests/page.tsx` — replaced
  minimal header with full nav.
- `frontend/app/admin/consultation-requests/[id]/page.tsx` — compact
  variant (back to `/admin/consultation-requests`).
- `frontend/app/admin/clinics/[id]/page.tsx` — compact variant
  (`pageTitle="Профил: {clinicName}"`, back to `/admin/clinics`).
  Save button moved out of header chrome into a separate action row.
  Loading state also renders header.
- `frontend/app/admin/leads/page.tsx` — **major rewrite of chrome**:
  was using public `Header`/`Footer` + `bg-[#0f172a]` dark theme. Now
  light bg-slate-50 + AdminHeader compact (back to `/admin/dashboard`).
  Page body unchanged.
- `frontend/app/admin/leads/[id]/page.tsx` — compact variant
  (back to `/admin/leads`). Action buttons moved to action row below
  header. Loading + not-found states also render header.
- `frontend/app/admin/blog/new/page.tsx` — compact (back to `/admin/blog`),
  Save / Publish buttons moved to action row.
- `frontend/app/admin/blog/[id]/page.tsx` — compact, action row.
  Loading state renders header.
- `frontend/app/admin/blog/import/page.tsx` — compact, replaces the
  centered title+link top-bar.
- `memory/CHANGELOG.md` — appended entry.

### Login page (intentional exclusion)
`frontend/app/admin/page.tsx` — login UI is **not** wrapped in
`AdminHeader`. The login screen has its own dedicated lock-icon panel
("Админ Панел / Zubite.bg - Вход за администратори"); the chrome would
be misleading before authentication.

### Per-page titles (Bulgarian)
| Path | pageTitle |
|---|---|
| `/admin/dashboard` | (default) "Админ панел" |
| `/admin/consultation-requests` | "Заявки за консултации" |
| `/admin/clinics` | "Партньорски клиники" |
| `/admin/clinic-applications` | "Кандидатури за клиники" |
| `/admin/analytics` | "Анализи" |
| `/admin/blog` | "Блог" |
| `/admin/leads` | "Всички лийдове" |
| `/admin/clinics/{id}` | "Профил: {clinicName}" |
| `/admin/consultation-requests/{id}` | "Детайли на заявка" |
| `/admin/leads/{id}` | "Детайли на лийд" |
| `/admin/blog/new` | "Нова статия" |
| `/admin/blog/{id}` | "Редакция на статия" |
| `/admin/blog/import` | "Импортиране на статия" |

### Tests
- **Testing agent iteration_38**: 64/64 frontend checks PASS, 100%.
  Covered: shared header presence on every list + detail page, brand
  link, nav active states + `aria-current="page"`, compact back-link
  on all detail pages, mobile 390px readability, logout flow (POST
  `/api/admin/logout` + localStorage cleanup + redirect to `/admin`),
  login page correctly excludes header, no body regressions.
- **TypeScript** `npx tsc --noEmit` → zero new errors. The 6 pre-existing
  errors in `admin/blog/import` (Set iteration), `admin/dashboard`
  (line 561 boolean comparison), `lib/api.ts`, `lib/articleTestRender`,
  `lib/attribution` are unchanged.

### Out of scope (per user instruction)
✅ Backend: untouched.
✅ Patient flow: untouched.
✅ Clinic portal: untouched.
✅ Analytics pipeline: untouched.
✅ No new dependencies (`package.json` unchanged).
✅ No `Save to GitHub` / no push / no deploy.

### Unresolved risks
- 🔴 Git secrets-leak remains BLOCKED — local-only.
- 🟡 `frontend/app/admin/blog/page.tsx` and other blog pages still have
  unused `Link` imports left in place (no tsc/eslint warning); minor
  cleanup deferred to keep this batch chrome-only.


## 2026-05-16 — Lead Identity Capture Standardization + Duplicate Contact UX Fix

Tightened the patient onboarding contract: any lead destined for the
recommendation flow now has name + phone + email upfront, and the P4 /
P5 modals confirm what the patient already shared instead of asking
twice. **No design rewrite of the modals; no admin/clinic-portal
changes; no external providers invoked.**

### User-chosen scope
- Backend approach **1c — Quiz-only strict**: only `source ∈
  {diagnostic_quiz, diagnostic_quiz_v1, quiz}` triggers the new strict
  required-contact gate. Other lead sources (article snippets, soft
  commits, legacy `LeadCaptureForm`) keep the existing
  blank-string-to-None coercion → no regression for dormant forms.
- Phone validation: trim whitespace, allow `+`, digits, spaces, dashes,
  parentheses, require ≥6 digits. (BG E.164 not enforced — too brittle
  for the BG number variants in the field.)
- Email validation: friendly Bulgarian message; raw 422 never shown.
- Edit button label in modals: **"Промени данните"**.

### Files changed
- `backend/routers/public.py` — added `_STRICT_CONTACT_LEAD_SOURCES`
  set, `_validate_quiz_contact()` helper, called at the top of
  `create_lead`. Three structured error codes:
  `missing_required_contact`, `invalid_phone`, `invalid_phone_format`.
  Each returns HTTP 422 with a **friendly Bulgarian** `detail.message`.
- `frontend/lib/leadContact.ts` — **new**, ~70 LOC. localStorage-only
  helper (`zubite_lead_contact_v1` key, JSON-keyed by leadId). All
  read/write paths wrapped in `try/catch` so private mode / blocked
  storage silently no-ops. Never sends data back to the backend
  automatically — only prefills UI inputs.
- `frontend/components/MasterQuiz.tsx`:
  - `handleSubmit()` now enforces all 5 strict validations client-side
    with explicit Bulgarian messages before the network call.
  - On successful submit, calls `setStoredLeadContact(leadId, {...})`
    so the next page's modal can confirm-instead-of-ask.
  - Form rendering removed the `formVersion === 'A'` gates around
    Име and Имейл — all 3 fields are now visible & required regardless
    of A/B variant. `formVersion` analytics tag preserved.
  - Improved error surfacing: backend's `detail.message` flows through
    to the inline error so the patient sees the actual reason.
- `frontend/components/patient/RequestCallModal.tsx`:
  - New optional `initialContact?: {name, phone, email}` prop.
  - When ANY of name/phone/email is present, default mode = "confirm".
    Renders read-only block (data-testid `request-call-contact-confirm`)
    with name/phone/email + "Промени данните" button (data-testid
    `request-call-edit-contact-btn`).
  - "Промени данните" toggles to edit mode (existing phone input).
  - Backwards-compatible: callers that don't pass `initialContact`
    keep the empty-input layout exactly as before.
- `frontend/components/patient/AssistedChoiceModal.tsx` — same pattern
  with `assisted-choice-contact-confirm` / `assisted-choice-edit-contact-btn`.
- `frontend/components/patient/ClinicRecommendationCard.tsx`,
  `frontend/app/results/[leadId]/clinics/page.tsx`,
  `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` — read
  `getStoredLeadContact(leadId)` and pass `initialContact` to the
  modals.
- `backend/tests/test_strict_quiz_contact.py` — **new**, 13/13 PASS.
- `memory/CHANGELOG.md` — appended entry.

### Backend strict gate (server.py route untouched, all logic in
`_validate_quiz_contact()`)
| Condition | HTTP | detail.code | detail.message |
|---|---|---|---|
| Quiz source + missing name/phone/email (any) | 422 | `missing_required_contact` | "Моля, попълнете името, телефона и email-а си, за да получите препоръчани клиники." |
| Quiz source + phone has disallowed chars | 422 | `invalid_phone_format` | "Моля, въведете телефонен номер само с цифри, интервали, тирета, скоби или знака „+“." |
| Quiz source + phone has <6 digits | 422 | `invalid_phone` | "Моля, въведете валиден телефонен номер (поне 6 цифри)." |
| Quiz source + invalid email format | 422 | (Pydantic EmailStr) | (frontend translates to "Моля, въведете валиден email адрес.") |
| Non-quiz source + blank fields | 200 | – | (legacy coerce-to-None preserved) |
| No `source` provided | 200 | – | (backwards-compatible) |

`detail.missing` is a list of the offending field names so the
frontend can highlight them if it ever wants finer per-field UX.

### Frontend client-side messages (matches backend wording)
- "Моля, въведете името си."
- "Моля, въведете телефонен номер."
- "Моля, въведете телефонен номер само с цифри, интервали, тирета, скоби или знака „+“."
- "Моля, въведете валиден телефонен номер (поне 6 цифри)."
- "Моля, въведете email адрес."
- "Моля, въведете валиден email адрес."
- "Моля, изберете град."

### Modal UX
- **Confirm mode** (any of name/phone/email prefilled):
  ```
  ЩЕ СЕ СВЪРЖЕМ С ВАС НА:
    Име:     Тест Контакт
    Телефон: +359888112233
    Email:   contact-test@example.com
  [Промени данните]
  ```
- **Edit mode** (button clicked, or no prefill): existing phone input,
  exactly as it was before this batch.
- Consent checkbox + Care Pass note unchanged.
- Submit still posts only `phone` to the backend (P4) /
  `phone` + optional `message` (P5) — no schema change.

### Tests
- `pytest tests/test_strict_quiz_contact.py` → **13/13 PASS** (0.65s).
  Coverage:
  1. Quiz source happy path (all 3 fields valid) → 200.
  2. Missing name → 422 missing_required_contact.
  3. Missing phone → 422 missing_required_contact.
  4. Missing email → 422 missing_required_contact.
  5. All 3 missing → 422 with full `missing` list.
  6. Phone too short → 422 invalid_phone.
  7. Phone with disallowed chars → 422 invalid_phone_format.
  8. Phone with allowed chars `(02) 123-4567` → 200.
  9. Invalid email format → 422 (Pydantic).
  10. Non-quiz source + blank email + blank name → 200, fields = null
      (regression test).
  11. No source field → 200, no strict check.
  12. All 3 quiz aliases (`diagnostic_quiz`, `diagnostic_quiz_v1`,
      `quiz`) → strict.
  13. Whitespace-only name + phone → 422 missing_required_contact.

- Regression run on related backend suites (each in isolation):
  - `test_patient_request_call.py` → 31/31
  - `test_patient_assisted_choice.py` → 28/28
  - `test_p4_p5_admin_notifications.py` → 11/11
  - `test_clinic_status_control.py` → 20/20
  - `test_clinic_request_context_visibility.py` → 11/11
  - `test_admin_patient_request_handling.py` → 12/12
  - `test_admin_request_assignment.py` → 16/16
  - `test_security_audit.py` → 25/25
  - `test_admin_clinic_profile_editor.py` → 24/24
  - `test_phase2_batch_a.py` → 24/24
  - **Total: 215/215 PASS** (excl. pre-existing
    `test_lead_verification.py` BASE_URL env issue, unrelated).

### Frontend testing-agent verification
- 100% pass on `iteration_37.json`. Covered: form 3-field rendering,
  client-side validation strings, modal confirm-block + edit-toggle
  on both RequestCallModal and AssistedChoiceModal, full P4 + P5
  submit cycle with prefill, backwards-compat fallback when no
  prefill exists.
- Manual smoke screenshot confirmed the confirmation block renders:
  `ЩЕ СЕ СВЪРЖЕМ С ВАС НА: Име: Тест Контакт / Телефон: +359888112233
  / Email: contact-test@example.com / [Промени данните]`.

### Live preview smoke (curl)
- `POST /api/leads source=diagnostic_quiz_v1 name=phone=email=""` →
  422 + Bulgarian message "Моля, попълнете името, телефона и email-а си…".
- `POST /api/leads source=diagnostic_quiz_v1 valid` → 200 + lead id +
  all 3 fields persisted.

### TypeScript
`npx tsc --noEmit` → same 6 pre-existing errors in unrelated files
(`admin/blog/import`, `admin/dashboard`, `lib/articleTestRender`,
`lib/api.ts`, `lib/attribution.ts`). **Zero new errors from this
batch.**

### Out of scope (per user instruction)
- Admin assignment / clinic portal / clinic profile engagement: NOT
  touched.
- No modal redesign — only added the confirmation block on top.
- Other quiz components (`TreatmentQuiz`, `AlignersVsBracesQuiz`,
  `OrthodonticsQuiz`, `LeadCaptureForm`, `[city]/[treatment]/quiz`)
  intentionally left as-is; their `source` values are not in the
  strict set so they keep current behaviour.

### Unresolved risks
- 🔴 Git secrets-leak remains BLOCKED — local-only, NO push / NO deploy.
- 🟡 Future quiz variants (e.g. `diagnostic_quiz_v2`) need to be added
  to `_STRICT_CONTACT_LEAD_SOURCES` to participate in strict mode.
  Suggested follow-up: refactor to a regex `r"^(diagnostic_quiz|quiz)(_v\d+)?$"`.
- 🟡 `localStorage` prefill works only on the same browser. Patients
  switching device between quiz and modal will see the empty-input
  fallback (existing behaviour). A backend `GET /leads/{id}/contact`
  endpoint with the existing 60-min edit window would solve this; not
  implemented in this batch to keep scope minimal.


## 2026-05-16 — P0 Admin Request Handling Fix


Resolved five operational issues blocking admin from understanding,
assigning, and routing P4/P5 consultation requests.

### Files changed
- `frontend/lib/consultationLabels.ts` — fixed treatment typo
  `Алайнъри → Алайнери`; added `diagnostic_quiz` /
  `diagnostic_quiz_v1` / `quiz` → `Диагностичен въпросник` mappings;
  added `REQUEST_SOURCE_LABELS` map + `requestSourceLabel()` helper;
  changed `Друг източник` → `Неизвестен източник`.
- `frontend/app/admin/consultation-requests/page.tsx` — replaced the
  empty-by-default clinic dropdown for P4 selected-clinic rows with a
  read-only chip showing the selected clinic name, plus explicit
  fallbacks: `Липсва избрана клиника` (no id at all) and
  `Избраната клиника не е намерена` (id present but record missing).
- `frontend/app/admin/consultation-requests/[id]/page.tsx` — wired
  the existing `POST /api/admin/consultation-requests/{id}/assign-clinic`
  endpoint into the detail page: clinic selector + "Назначи клиника"
  button visible only on P5 assisted-choice rows that are still
  unassigned. After success, refetches detail and shows the assigned
  clinic prominently. P4 detail block now distinguishes the three
  states (assigned with clinic, assigned id but record not found,
  data inconsistency). Raw `source` mono-text replaced with
  `requestSourceLabel(r.source)`.
- `backend/tests/test_admin_request_assignment.py` — **new**, 16 tests.
- `memory/CHANGELOG.md` — appended entry.

**No backend code changes.** The assignment endpoint was already
fully wired in `consultations.py` (lines 558-627): canonical
`assigned_clinic_id` field, status → `assigned`, timeline event
`assigned_to_clinic` with `clinic_id` + admin `user_id` +
`previous_status` + `new_status`. This batch only added test
coverage and frontend wiring.

### Root cause of empty clinic dropdown
The list-page rendered a free-edit `<select>` for every assigned-clinic
column. For P4 selected-clinic rows the `<select>` had
`value={r.assigned_clinic_id || ''}`, but if (a) the `clinics` array
was still loading, (b) the assigned id matched no item in the list, or
(c) the id was simply missing on the doc, the browser had nothing to
preselect → a visually empty box. Fixed by replacing the dropdown with
a read-only chip when the row is a P4 selected-clinic row, and surfacing
two explicit fallback states for the other two cases.

### Canonical clinic-assignment field
- `consultation_requests.assigned_clinic_id` — the clinic currently
  routed to handle the request. Set on P4 creation; null on P5 until
  admin assigns; updated atomically on the assign-clinic endpoint.
- `leads.selected_clinic_id` — the patient-side pin for P4. Already
  written by the request-call endpoint (`public.py` step 7). Kept as
  read-only context.

No new fields introduced. No duplicate parallel assignment fields.

### Source label mapping
| created_from / source | label |
|---|---|
| `recommended_clinics_flow` | Пациентът избра клиника |
| `assisted_choice_flow` | Помощ от Zubite |
| `diagnostic_quiz` / `diagnostic_quiz_v1` / `quiz` | Диагностичен въпросник |
| `article` / `blog` | Статия / Блог |
| `campaign` | Кампания |
| `direct` | Директна заявка |
| missing / unknown | Неизвестен източник |

### Treatment label fixes
- `aligners` → `Алайнери` (was `Алайнъри` typo)
- `diagnostic_quiz` / `diagnostic_quiz_v1` / `quiz` → `Диагностичен въпросник` (raw enum no longer leaks)

### Tests run + results
- `pytest tests/test_admin_request_assignment.py` → **16/16 PASS**
- Regression suites:
  - `test_admin_patient_request_handling.py` → 12/12
  - `test_clinic_status_control.py` → 20/20
  - `test_clinic_request_context_visibility.py` → 11/11
  - `test_patient_request_call.py` → 31/31
  - `test_patient_assisted_choice.py` → 28/28
  - `test_p4_p5_admin_notifications.py` → 11/11
- **Total: 129/129 PASS.**

### TypeScript
`npx tsc --noEmit` → 6 pre-existing errors in unrelated files
(`admin/blog/import`, `admin/dashboard`, `lib/articleTestRender`,
`lib/api.ts`, `lib/attribution.ts`). **Zero new errors from this batch.**

### No scope drift
- ✅ Patient quiz / matching / clinic profile / request-call / assisted-choice
  modals: untouched.
- ✅ Clinic portal: untouched (clinic-side detail still reads canonical
  `assigned_clinic_id`, so the assignment from this batch is
  immediately visible to the assigned clinic, verified by tests 8 + 14).
- ✅ Auth / session / CSRF / analytics / audit / clinic profile editor /
  `/za-kliniki` / article importer: untouched.
- ✅ No new dependencies. `package.json` unchanged.
- ✅ No SMS, no Twilio, no ElevenLabs invocation. Resend SDK is fully
  mocked in tests; the existing best-effort assignment-notice email
  (pre-existing behaviour from a prior batch) is unchanged.

### Unresolved risks
- 🔴 Git secrets-leak remains BLOCKED — local-only, no push/deploy.
- 🟡 Reassignment UI not added — backend endpoint supports it
  (`reassigned_to_clinic` event), but the spec says "Do not implement
  reassignment unless already supported safely" → tracking as future
  work.
- 🟡 Resend sender domain `zubite.bg` not yet DNS-verified in preview
  env — admin assignment notice (pre-existing) logs an error and
  skips delivery. Not introduced by this batch.


## 2026-05-16 — P0 Hotfix: Empty Email Field Broke Lead Submission

### Symptom
User report: filling out the homepage / treatment-page lead form with
city + name + phone but **no email**, then pressing "Изпрати и получи
3 опции", surfaced the inline error "Възникна грешка. Моля, опитайте
отново.". Backend logs showed
`POST /api/leads → 422 value is not a valid email address`.

### Root cause
`schemas.LeadCreate.email: Optional[EmailStr] = None` accepts `null` or
a valid email but rejects the empty string `""`. Five separate frontend
lead-capture entry points (MasterQuiz, TreatmentQuiz, AlignersVsBracesQuiz,
LeadCaptureForm, `/[city]/[treatment]/quiz`) all default the email input
to `""` and submit that empty string when the patient leaves the field
blank.

### Fix
Defensive coercion at the **system boundary** (Pydantic schema). One new
`@field_validator` on `LeadCreate` runs in `mode="before"` and turns any
empty / whitespace-only string into `None` for `email`, `name`, `phone`.
This covers all current and future lead-capture entry points without
touching frontend components.

```python
@field_validator("email", "name", "phone", mode="before")
@classmethod
def _coerce_blank_string_to_none(cls, v):
    if isinstance(v, str) and not v.strip():
        return None
    return v
```

Belt-and-braces frontend hardening on `MasterQuiz.tsx` only: omit the
`email` key entirely when the field is blank, instead of sending
`email: ''`. Other lead-capture components are now protected by the
backend coercion so no further frontend changes are needed.

### Verification (curl against preview)
| Scenario | Before | After |
|---|---|---|
| `email: ""` (empty) | 422 | **200** + `email: null` |
| `email: "real@example.com"` | 200 | 200 |
| `email: "not-an-email"` | 422 | 422 (still rejected) |

### Regression
All seven backend test suites pass after the fix:
- `test_clinic_status_control.py` → 20/20
- `test_clinic_request_context_visibility.py` → 11/11
- `test_admin_patient_request_handling.py` → 12/12
- `test_patient_request_call.py` → 31/31
- `test_patient_assisted_choice.py` → 28/28
- `test_p4_p5_admin_notifications.py` → 11/11
- `test_consultation_workflow.py` → 25/25 (after a backend restart to
  clear the in-memory rate-limit bucket; this is unrelated to the fix —
  same bucket pollution causes 429s when running multiple suites in a
  single pytest invocation, as documented in the previous final-smoke
  report).

### Files changed
- `backend/schemas.py` — one `@field_validator` on `LeadCreate`.
- `frontend/components/MasterQuiz.tsx` — only sends `email` when
  non-empty (defense-in-depth).


## 2026-05-16 — Final Full-Platform Smoke Test + One Blocker Fix

End-to-end readiness pass across the whole patient → admin → clinic
journey. **No new features.** One UI blocker found and fixed; everything
else passed cleanly.

### Files changed (1 file, 2 lines)
- `frontend/app/admin/consultation-requests/page.tsx` — admin status
  filter dropdown was rendering raw enum keys (`needs_zubite_review`,
  `call_attempted`, `no_show`, …) as visible option labels. Imported
  the existing `STATUS_LABELS` map and resolved each option via
  `STATUS_LABELS[s]?.label || s`. Dropdown now shows
  `Всички статуси / Нова / Назначена / Видяна / Опит за обаждане /
  Свързано с пациента / Без отговор / Резервирана / Преместена /
  Посетила / Не се яви / Отменена / Чака преглед`. No data model
  change; existing values still post the canonical enum string.

### Backend regression (each suite in isolation)
| Suite | Result |
|---|---|
| `test_clinic_status_control.py` | 20/20 |
| `test_clinic_request_context_visibility.py` | 11/11 |
| `test_admin_patient_request_handling.py` | 12/12 |
| `test_patient_request_call.py` | 31/31 |
| `test_patient_assisted_choice.py` | 28/28 |
| `test_p4_p5_admin_notifications.py` | 11/11 |
| **Total** | **113/113** |

(When run as one pytest invocation the bootstrap fixtures of the
later suites collide on `os.environ.setdefault("DB_NAME", ...)`. This
is not a regression — each suite passes individually as designed.)

### Backend live smoke (preview, fresh leads)
- P4 fresh → 200 with `request_id`. Same-clinic retry → 200 +
  `already_requested=true`. Different clinic on locked lead → 409
  `already_requested`.
- P5 fresh → 200 with `request_id`. Retry → 200 `already_requested=true`.
- Admin queue: `?created_from=recommended_clinics_flow` and
  `?status=needs_zubite_review` both surface the new rows correctly.
- Resend admin alert was invoked (visible in backend logs); it
  returned `"zubite.bg domain is not verified"` from Resend, the
  helper logged the error and the patient endpoint still returned
  200 — proving the resilience contract one more time.

### TypeScript
`npx tsc --noEmit` → 6 pre-existing errors in unrelated files
(`admin/blog/import`, `admin/dashboard`, `lib/articleTestRender`,
`lib/api.ts`, `lib/attribution.ts`). Zero new errors from this pass.

### Mobile QA (4 viewports × 4 patient pages, plus admin & clinic)
| Page | 375 | 390 | 768 | 1440 |
|---|---|---|---|---|
| Homepage | ✅ | ✅ | ✅ | ✅ |
| Quiz success | ✅ | ✅ | ✅ | ✅ |
| Recommended clinics | ✅ | ✅ | ✅ | ✅ |
| Sofia Premium profile | ✅ | ✅ | ✅ | ✅ |
| Admin queue | ✅ | — | — | ✅ |
| Clinic request detail | ✅ | — | — | ✅ |

No horizontal overflow at any tested viewport. No forbidden patient
copy on any of the four patient pages. No raw enum keys leaking on
the clinic detail page (`call_attempted`, `patient_contacted`,
`mark_attended`, `not_suitable`, `patient_declined`, `action_type`
all absent). Admin queue raw enums **fixed** (see above).

### External providers
- **Resend** — invoked for admin alerts on every successful
  P4/P5 insert. Preview env's `zubite.bg` sender domain is **not yet
  verified**, so emails fail at the SDK level with
  `"domain is not verified"`. The patient flow returns 200 regardless.
- **Twilio** — never invoked.
- **ElevenLabs** — never invoked.
- **SMS** — none.
- **Patient confirmation email** — none.
- **Clinic notification email** — none (intentionally not yet
  implemented; admin-only alerts for now).


## 2026-05-16 — Care Pass Visibility R1 (Frontend Copy + Visual Only)

Patient-facing visibility of the Zubite Care Pass benefit: a partner-
benefits pass (oral-hygiene-brand discounts and partner offers) that
the clinic provides after a patient attends a consultation requested
through Zubite.bg.

**No backend / eligibility / QR / PDF / discount config / patient
email / clinic dashboard / admin tracking changes.** R1 is pure
copy + a single approved Care Pass image asset.

### Files changed
- `frontend/public/care-pass.png` — **new**: 1.4 MB approved image
  asset uploaded by the user (Zubite.bg Care Pass card with shield /
  gift / smile icons + Bulgarian copy).
- `frontend/app/quiz/success/page.tsx` — subtle Care Pass note with
  56×56 thumbnail under the helper-text line; does NOT compete with
  the primary "Виж препоръчаните клиники" CTA.
- `frontend/app/results/[leadId]/clinics/page.tsx` — strong but
  premium Care Pass benefit strip above the cards grid (image +
  ZUBITE CARE PASS badge + benefit copy + disclaimer
  "след реално посетена консултация").
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` —
  Care Pass section directly under the hero (above the rest of the
  body). Image is `aspect-square` capped at `140px` on desktop, never
  larger than the clinic CTA area.
- `frontend/components/patient/RequestCallModal.tsx` — Care Pass note
  with `ShieldCheck` icon between the inline-error and the submit
  buttons; success state gets a second Care Pass card prompting the
  patient to ask the clinic for their pass after attending.
- `frontend/components/patient/AssistedChoiceModal.tsx` — conditional
  Care Pass note inside the form (clinic not selected yet → uses "ако
  …заявите и посетите консултация…") and a success-state note ("Care
  Pass се предоставя от клиниката след реално посетена консултация").
- `memory/CHANGELOG.md` — appended entry.

### Care Pass image asset
✅ **Used** — `public/care-pass.png` (uploaded by user, approved).
Rendered via `next/image` with `fill` + `sizes` for responsive cropping.
On the clinic profile page it is imported as `NextImage` to avoid a
name collision with `lucide-react`'s `Image as ImageIcon`.

### Exact Care Pass copy per surface

**Quiz success page** (`data-testid="success-care-pass-note"`)
> **Zubite Care Pass.** След като посетите консултация, заявена през
> Zubite.bg, клиниката ще ви предостави Zubite Care Pass с партньорски
> ползи от марки за орална хигиена.

**Recommended clinics page** (`data-testid="care-pass-benefit-strip"`)
> ZUBITE CARE PASS  
> Изберете клиника, посетете консултацията и получете Care Pass от
> клиниката — с партньорски ползи и предложения за орална грижа.
>
> Care Pass се предоставя след реално посетена консултация през
> Zubite.bg.

**Clinic profile page** (`data-testid="profile-care-pass-section"`)
> ZUBITE CARE PASS ПРИ ПОСЕТЕНА КОНСУЛТАЦИЯ  
> Ако заявите консултация през Zubite.bg и я посетите, клиниката ще
> ви предостави Care Pass с партньорски ползи — например отстъпки от
> марки за орална хигиена.

**RequestCallModal — form** (`data-testid="request-call-care-pass-note"`)
> След посещение на консултацията ще получите **Zubite Care Pass** от
> клиниката — с партньорски ползи и предложения за орална грижа.

**RequestCallModal — success** (`data-testid="request-call-success-care-pass"`)
> След като посетите консултацията, попитайте клиниката за вашия
> **Zubite Care Pass**.

**AssistedChoiceModal — form** (`data-testid="assisted-choice-care-pass-note"`)
> Ако след помощ от Zubite заявите и посетите консултация през
> платформата, клиниката ще ви предостави **Zubite Care Pass**.

**AssistedChoiceModal — success** (`data-testid="assisted-choice-success-care-pass"`)
> Следващата стъпка е да уточним подходящия път. **Zubite Care Pass**
> се предоставя от клиниката след реално посетена консултация през
> Zubite.bg.

### Mobile verification (375 px live preview)
| Surface                    | Overflow | Care Pass visible | Forbidden copy |
|----------------------------|----------|-------------------|----------------|
| Quiz success               | none     | ✅                | none           |
| Recommended clinics        | none     | ✅                | none           |
| Sofia Premium profile      | none     | ✅                | none           |
| RequestCallModal           | none     | ✅                | none           |
| AssistedChoiceModal        | none     | ✅                | none           |

- Submit button on `RequestCallModal @ 375` is at `y=628` inside a 900 px
  viewport — Care Pass note did not push it off-screen.
- Forbidden phrases verified absent on every surface: `награда`,
  `подарък за избор`, `гарантирана отстъпка за лечение`,
  `безплатно лечение`, `Zubite плаща лечението`, `купон за лечение`,
  `гарантиран резултат`.
- All Care Pass copy stays in the allowed-vocabulary set:
  `Zubite Care Pass`, `партньорски ползи`, `отстъпки и предложения от
  марки за орална хигиена`, `след като посетите консултацията`,
  `получавате от клиниката`.

### TypeScript
`npx tsc --noEmit` → zero new errors. The 6 pre-existing errors in
unrelated files (`admin/blog/import`, `admin/dashboard`,
`lib/articleTestRender`, `lib/api.ts`, `lib/attribution.ts`) are
unchanged.

### No backend / admin / clinic-portal scope drift
✅ Backend: untouched (no route changes, no DB writes, no eligibility
flag).
✅ Admin frontend: untouched.
✅ Clinic portal: untouched.
✅ Auth / session / CSRF: untouched.
✅ Analytics: no new events fired by R1 (could be added in R2).
✅ No new dependencies. `package.json` unchanged.
✅ No external providers invoked. No Resend / Twilio / ElevenLabs.

### Eligibility / QR / pass generation
**Not implemented in R1.** Spec is visibility/copy only.

### Unresolved risks
- 🔴 Git secrets-leak remains BLOCKED — local-only, no push / deploy.
- 🟠 The asset is a 1.4 MB PNG; if pageload performance becomes
  important we can compress it or convert to WebP in a future polish
  pass. `next/image` already auto-resizes via `sizes`.

### Recommended R2 next step
- **R2 — Care Pass eligibility tracking & post-attended trigger.**
  Once a request reaches `status=attended`, write a simple
  `care_pass_eligibility` row (lead_id, clinic_id, request_id,
  attended_at, status=`earned`) so the admin team has a list to
  honour and partner brands have a future hook. Frontend would add a
  read-only "Вашият Care Pass" pill on a post-attendance landing
  page. Still no QR / no PDF / no patient email — just data plumbing.


## 2026-05-16 — Clinic Status Control Batch (Transition Safety + Test Lock)

Made the clinic portal operational by locking down the controlled-action
workflow on `POST /api/clinic/consultation-requests/{id}/action`. All 11
required action types already existed and worked; this batch adds the
missing **terminal-status transition guard** + comprehensive contract
tests + frontend regression coverage.

### Files changed
- `backend/routers/consultations.py` — added `_TERMINAL_STATUSES` and
  `_TRANSITION_EXEMPT_ACTIONS` frozensets; added a single guard
  block at the top of `clinic_perform_action` that returns HTTP 409
  with a Bulgarian message when a clinic tries to push a terminal
  request forward.
- `backend/tests/test_clinic_status_control.py` — **new**, 20 tests
  covering every action + access control + transition safety +
  event timeline + patient_context survivability.
- `memory/CHANGELOG.md` — appended entry.

**No frontend changes required.** The existing detail page already
implements every spec UI behaviour (loading state, friendly success
message via `actionSuccessMessage()`, friendly error via `j.detail`,
destructive-action confirmation via `ACTIONS_TERTIARY`, contextual
stage filtering via `ctaStageFromStatus()`, post-action refetch via
`load()`). All required Bulgarian labels already present in
`consultationLabels.ts`. **Per spec rule** ("if it already works,
do not redesign") nothing was touched in the UI.

### Pre-existing actions already supported (verified by tests)
All 11 required actions were already wired up in `_ACTION_TO_STATUS`
with consistent canonical status names:

| action_type        | → status            | event_type                |
|--------------------|---------------------|---------------------------|
| `mark_viewed`      | clinic_viewed       | clinic_viewed_request     |
| `call_attempted`   | call_attempted      | call_attempted            |
| `patient_contacted`| patient_contacted   | patient_contacted         |
| `no_answer`        | no_answer           | no_answer                 |
| `book_consultation`| booked              | appointment_booked        |
| `reschedule`       | rescheduled         | appointment_rescheduled   |
| `mark_attended`    | attended            | marked_attended           |
| `mark_no_show`     | no_show             | marked_no_show            |
| `patient_declined` | patient_declined    | patient_declined          |
| `not_suitable`     | not_suitable        | marked_not_suitable       |
| `cancel`           | cancelled           | cancelled                 |

### Added: transition safety
Terminal statuses (`attended`, `no_show`, `patient_declined`,
`not_suitable`, `cancelled`, `expired`) now reject any further
status-changing action with **HTTP 409** + body
`{"detail": "Заявката е приключена и не може да бъде променяна."}`.

Exempt actions (always allowed even on terminal requests):
- `mark_viewed` — idempotent, no status mutation, no timestamp overwrite.
- `admin_note` — non-mutating note attachment.

### Event timeline (already correct, locked by test 17)
Every successful action appends a `consultation_events` row with:
`action_type` (as `event_type`), `previous_status`, `new_status`,
`created_at`, `clinic_id`, optional `note`. No tokens / cookies /
passwords / verification tokens are ever written into the event.
Verified by test 17 against the freshly inserted document.

### Frontend UX (verified, no code changes)
- Action buttons disabled while `busy === true`.
- Friendly Bulgarian success message via existing `actionSuccessMessage()`
  helper ("Записано" / "Маркирано" / etc.); raw action keys never
  rendered.
- Backend 409 error renders inline as
  "Грешка: Заявката е приключена и не може да бъде променяна."
  via the existing `setActionMsg(`Грешка: …`)` branch.
- Destructive actions (`patient_declined`, `not_suitable`, `cancel`)
  collapsed under `ACTIONS_TERTIARY` with `window.confirm()` gate.
- Completed/terminal statuses render the "Заявката е приключена"
  read-only state via the existing `stage === 'completed'` branch.
- `patient_context` section keeps rendering across status changes
  (locked by test 20).

### Tests (isolated DB, no network, Resend mocked)
1.  ✅ Clinic can `mark_viewed` → `clinic_viewed` + timestamp set.
2.  ✅ `call_attempted` records status + event.
3.  ✅ `patient_contacted`.
4.  ✅ `no_answer`.
5.  ✅ `book_consultation` with valid appointment payload — request
    becomes `booked`, appointment row inserted with `status=booked`.
6.  ✅ `reschedule` on existing appointment — request becomes
    `rescheduled`, appointment doc updated with `status=rescheduled`.
7.  ✅ `mark_attended` after booking → `attended`.
8.  ✅ `mark_no_show` after booking → `no_show`.
9.  ✅ `patient_declined`.
10. ✅ `not_suitable`.
11. ✅ `cancel`.
12. ✅ Clinic B → 404 on Clinic A's request.
13. ✅ Unauthenticated → 401/403.
14. ✅ Admin token cannot use clinic action endpoint (401/403/404).
15. ✅ Invalid action_type rejected (422 from Pydantic).
16. ✅ **NEW**: Terminal transitions rejected (409). Tested across
    `cancel`, `not_suitable`, `patient_declined`, `call_attempted`,
    `patient_contacted` after attaining `attended`.
17. ✅ Event timeline entry written with all required fields.
18. ✅ Action response returns updated `request` with new status.
19. ✅ `mark_viewed` is idempotent — multiple calls do not overwrite
    `clinic_viewed_at`, do not rewind a later status.
20. ✅ `patient_context` payload still returned after status changes
    (visibility upgrade survives).

Regression run on all related suites:
- `test_clinic_status_control.py` → **20/20**
- `test_clinic_request_context_visibility.py` → 11/11
- `test_admin_patient_request_handling.py` → 12/12
- `test_patient_request_call.py` → 31/31
- `test_patient_assisted_choice.py` → 28/28
- `test_p4_p5_admin_notifications.py` → 11/11

**Total: 113/113 PASS.**

### TypeScript
`npx tsc --noEmit` → zero new errors. The 6 pre-existing errors in
unrelated files (`admin/blog/import`, `admin/dashboard`,
`lib/articleTestRender`, `lib/api.ts`, `lib/attribution.ts`) are
unchanged.

### Mobile verification (live preview)
- 375 px → no horizontal overflow (`sw=cw=375`).
- Action panel "Какво следва?" renders; status badge updates in-place
  on action click (`Видяна` → `Без отговор` smoke).
- `patient_context` section "Информация от пациента" continues to
  render after the status change (test 20 verified live, not just in
  unit tests).
- Zero raw enum keys (`call_attempted`, `patient_contacted`,
  `mark_attended`, `not_suitable`, etc.) visible to the user.

### Out of scope (intentionally untouched)
Patient quiz, patient matching, P4/P5 logic, admin frontend, admin
rich clinic profile editor, auth/session/CSRF, analytics tracking,
audit logs, `/za-kliniki`, article importer, Resend/Twilio/ElevenLabs,
package.json / dependencies. The frontend file was reviewed and left
unmodified per the "do not redesign if it already works" spec rule.

### Unresolved risks
- 🔴 Git secrets-leak remains BLOCKED — local-only, no push/deploy.
- 🟡 No-op: `disputed` and `expired` are surfaced in the BG label map
  but not yet reachable from any clinic action. If/when an admin-side
  expiry sweep is added, the terminal-status guard already protects
  them from clinic mutation.


## 2026-05-16 — Clinic Dashboard Visibility Upgrade: Patient Context + Source Attribution

Clinics now see patient-reported context behind each request after it
has been assigned to them — quiz answers, source of arrival, and any
patient-shared message. **Patient-reported only, never diagnostic.**
Strict allow-list approach: no raw JSON, no raw UTM dump, no internal
scoring breakdown, no content-path-by-page leak.

### Files changed
- `backend/routers/consultations.py` — added `_QUIZ_QUESTION_LABELS` +
  `_QUIZ_VALUE_LABELS` maps, `_classify_source_type()`,
  `_safe_quiz_summary()`, `_safe_source_context()`, and an async
  `_build_patient_context()` helper. Extended
  `GET /api/clinic/consultation-requests/{req_id}` to attach
  `patient_context` to the response.
- `frontend/app/clinic/dashboard/requests/[id]/page.tsx` — added the
  TS interfaces (`PatientContext`, `PatientContextSource`,
  `PatientContextQuizRow`) and a `PatientContextSection` component
  with 4 cards (Пациентски контекст / Какво споделя пациентът /
  Отговори от въпросника / Откъде дойде заявката), inserted right
  after the patient hero card. Empty states for every card.
- `backend/tests/test_clinic_request_context_visibility.py` — **new**,
  11 test cases.

### Backend response shape (added on
`GET /api/clinic/consultation-requests/{id}`)
```json
{
  "request": {...},
  "appointment": {...},
  "events": [...],
  "patient_context": {
    "label": "Информация, споделена от пациента",
    "treatment_interest": "aligners",
    "city": "sofia",
    "readiness": "ready",
    "urgency": "high",
    "main_concern": null,
    "patient_message": null,
    "quiz_summary": [
      {"question_label": "Кога планира лечение",
       "answer_label":   "В рамките на 3–6 месеца"}
    ],
    "source_context": {
      "source_type": "article",
      "article_title": "Алайнери vs Брекети…",
      "article_slug":  "aligners-vs-braces",
      "utm_source":    "meta",
      "utm_campaign":  "aligners-awareness-q2",
      "utm_ad":        "hero-video-01",
      "content_path_summary": "Пациентът е разгледал 4 страници, включително съдържание от блога…"
    }
  }
}
```

### Data sources used (allow-list)
- From `consultation_requests`: `treatment_interest`, `patient_city`,
  `readiness`, `urgency`, `patient_message` (P5).
- From `leads` (projection-filtered query, NEVER `find_one` of full doc):
  `answers` (then key-filtered against `_QUIZ_QUESTION_LABELS`),
  `first_article_title/slug`, `latest_article_title/slug`,
  `first_utm_source/campaign/ad`, `latest_utm_source/campaign/ad`,
  `first_landing_page_type`, `latest_landing_page_type`,
  `first_landing_page`, `first_referrer`,
  `pages_viewed_before_conversion`, `blog_assisted_conversion`.

### Privacy guardrails (verified by tests 4, 5, 9)
- `verification_token`, `internal_score_breakdown` and any non-allow-list
  lead field are dropped by the Mongo projection.
- `content_path_before_conversion` (raw page-by-page list) is **never**
  surfaced — only an aggregated `content_path_summary` sentence
  ("Пациентът е разгледал 4 страници, включително съдържание от блога…").
- Quiz keys not in `_QUIZ_QUESTION_LABELS` (e.g. `session_id`,
  experimental flags, nested dicts) are silently dropped.
- Nested dict/list values inside `answers` are rejected
  (`isinstance(raw, (str, int, float, bool))` filter).
- Long values capped at 200 chars; `patient_message` and `main_concern`
  capped at 1000 / 500 chars respectively.

### Frontend section
- Section data-testid: `patient-context-section` (under the patient
  hero card, above the booking summary).
- Four cards (each with its own data-testid): `patient-context-main`,
  `patient-context-shared`, `patient-context-quiz`, `patient-context-source`.
- Empty state for the quiz card: "Няма налични допълнителни отговори
  от въпросника."
- Empty state for the source card: "Източникът на заявката не е
  известен."
- Friendly UTM label composer: `meta + campaign-x` →
  "Meta / campaign-x" (no `utm_source=…` key dump).
- Article fallback: if `article_title` is missing but `article_slug`
  is present, slug is humanised (`-` → ` `).
- The section is gated by `data?.patient_context` so it only appears
  once the new endpoint shape lands; no UI churn if the field is null.

### Tests (isolated DB, no network)
1. ✅ Assigned clinic sees `patient_context` with all 9 keys + friendly
   value resolution for known quiz codes.
2. ✅ Clinic B requesting Clinic A's request → 404.
3. ✅ Unauthenticated → 401/403.
4. ✅ Internal lead fields (`verification_token`,
   `internal_score_breakdown`, technical answer keys) never leak.
5. ✅ Unknown keys + nested dicts dropped from `quiz_summary`.
6. ✅ Article source context returned when
   `first_article_title/slug` set.
7. ✅ UTM/campaign context returned with friendly classification
   `source_type=campaign`.
8. ✅ Missing quiz + missing source data → empty `quiz_summary`,
   `source_type=unknown`, no crash.
9. ✅ `content_path_before_conversion` raw list never surfaces; only
   the aggregated `content_path_summary` sentence does.
10. ✅ Existing `request` / `appointment` / `events` keys still in
    response.
11. ✅ P5 `patient_message` surfaces on the assigned clinic's view.

Full result: **`pytest tests/test_clinic_request_context_visibility.py`
→ 11/11 PASS**. Regression run on related suites:
`test_admin_patient_request_handling.py` (12/12),
`test_patient_request_call.py` (31/31),
`test_patient_assisted_choice.py` (28/28),
`test_p4_p5_admin_notifications.py` (11/11). **Total 93/93 PASS.**

### TypeScript
`npx tsc --noEmit` → zero new errors in the edited file. The 6
pre-existing errors in unrelated files (`admin/blog/import`,
`admin/dashboard`, `lib/articleTestRender`, `lib/api.ts` index sig,
`lib/attribution.ts`) are unchanged.

### Mobile verification
- 375 px viewport, scroll-width = client-width = 375 → no horizontal
  overflow.
- Quiz answer rows stack vertically below `sm` breakpoint
  (label above, value below). Long article titles wrap with
  `break-words`.
- Section is readable, cards do not overlap sticky elements.

### Out of scope (intentionally untouched)
Patient quiz, patient matching, P4 logic, P5 logic, admin frontend,
admin rich clinic profile editor, auth/session/CSRF, analytics tracking,
audit logs, `/za-kliniki`, article importer, Resend/Twilio/ElevenLabs,
package.json / dependencies. No clinic-side write actions added; the
upgrade is read-only.

### Unresolved risks
- 🔴 Git secrets-leak remains BLOCKED — local-only, no push / deploy.
- 🟠 Some lead documents store quiz data under nested keys like
  `answers.context.main_concern` rather than top-level
  `answers.main_concern`. Today we only read top-level keys; if the
  quiz emits nested objects we silently drop them (privacy-safe but
  may under-render). Track in the schema-cleanup backlog item.


## 2026-05-16 — P4 / P5 Admin Email Notifications

When a patient submits a P4 (selected-clinic) or P5 (assisted-choice)
request, the Zubite admin team is notified by email via the existing
Resend integration. No new provider added. No SMS / Twilio / ElevenLabs.

### Files changed
- `backend/emails.py` — added `send_admin_selected_clinic_request_alert()`
  and `send_admin_assisted_choice_request_alert()` helpers. Both reuse
  the existing `_send_email()` Resend wrapper. Best-effort: missing
  `RESEND_API_KEY` / `ADMIN_EMAIL` → log warning + return False. Both
  catch every internal exception so a Resend outage cannot bubble.
- `backend/routers/public.py` — imported the new helpers and added one
  `try/except` invocation at the very end of each successful insert path
  (P4 step 10, P5 step 8). Both calls happen AFTER the
  `consultation_requests.insert_one()` so duplicates / 409 / 422 paths
  never reach them.
- `backend/tests/test_p4_p5_admin_notifications.py` — new, 11 test cases.
- `backend/tests/test_patient_request_call.py` — updated `test_16`
  ("no_external_provider") to allow exactly one Resend call to
  `ADMIN_EMAIL` (the new admin alert). Still asserts the two legacy
  helpers (`send_lead_notification_email`, `send_lead_confirmation_email`)
  are NOT invoked.
- `backend/tests/test_patient_assisted_choice.py` — same update for
  `test_14`.

### Env vars used
- `ADMIN_EMAIL` (already documented in `.env.example`, default
  `admin@zubite.bg`).
- `RESEND_API_KEY` (already configured).
- `SENDER_EMAIL` (already configured; reused).
- `PRODUCTION_URL` (already configured; used to build absolute admin
  URLs in the email body).

### Trigger points (exact duplicate prevention)
- **P4** — `POST /api/leads/{lead_id}/request-call`. The email is sent
  ONLY after a brand-new `consultation_requests` insert succeeds.
  Idempotent retry (same clinic) returns at the `already_requested: True`
  short-circuit branches BEFORE reaching the insert; 409 paths raise
  before; 422 paths raise before. None of them reach the alert call.
- **P5** — `POST /api/leads/{lead_id}/request-zubite-help`. Same shape:
  email is fired ONLY after the new insert. The three idempotent-retry
  branches return early; the two 409 paths raise; 422 paths raise.

### Email subjects & bodies
- **P4 subject**: `Нова заявка към избрана клиника — Zubite`
  Body includes: тип заявка ("Пациентът избра конкретна клиника"),
  patient name, phone, city (resolved BG label), treatment label,
  selected clinic name + clinic id, lead id, consultation request id,
  source, created_at, and two admin links (detail + filtered list).
- **P5 subject**: `Нова заявка за помощ при избор — Zubite`
  Body includes: тип заявка ("Пациентът поиска помощ от Zubite"),
  patient name, phone, city, treatment, patient message
  (**truncated to 500 chars** with `…`), lead id, request id, source,
  created_at, and an admin link to the "Чака преглед" queue.

### Privacy
Patient name / phone are admin-visible already (admin queue surfaces them
in the dashboard). All other inputs are HTML-escaped via `html.escape()`.
Email body **never** carries any of: raw quiz answers, attribution
object, JWT/Bearer/session tokens, cookies, verification tokens,
password hashes, raw webhook payloads, MONGO_URL, JWT_SECRET, or
RESEND_API_KEY. Verified by `test_email_body_does_not_leak_forbidden_keys`.

### Tests (Resend SDK fully mocked)
1. ✅ P4 new request → exactly 1 admin email.
2. ✅ P5 new request → exactly 1 admin email.
3. ✅ P4 idempotent retry (same clinic) → no second email.
4. ✅ P5 idempotent retry → no second email.
5. ✅ P4 validation failure (no consent) → 0 emails.
6. ✅ P5 missing consent → 0 emails.
7. ✅ Missing `ADMIN_EMAIL` → request still 200, 0 Resend calls.
8. ✅ Resend raises → request still 200, no crash.
9. ✅ P4 long-form: subject + body include phone, clinic name, request id,
   lead id, source, treatment, recommended_clinics_flow tag.
10. ✅ P5 long-form: subject + body include phone, request id, lead id,
    `needs_zubite_review` deep link, patient message.
11. ✅ Patient message >500 chars truncated to 500 in email body.
12. ✅ No clinic notification fired from P4/P5 endpoints.
13. ✅ Email body contains none of the 13 forbidden keys.

Also: full re-run of `test_patient_request_call.py` (31/31 pass) and
`test_patient_assisted_choice.py` (28/28 pass) including the updated
"no_external_provider" assertions.

### Live preview smoke
- `POST /api/leads/{P4-fresh-lead}/request-call` → 200, request_id returned.
- Backend log shows the Resend call was attempted with the configured
  ADMIN_EMAIL recipient. Resend rejected this preview env's sender
  domain (`"zubite.bg domain is not verified"` — env-only config issue),
  the helper logged the error and the **patient endpoint still returned
  200**. This proves the resilience contract: external provider failure
  does NOT block patient flow.

### Out of scope (intentionally untouched)
Frontend, patient UI, clinic portal, admin frontend, auth / session /
CSRF, audit logs, analytics, matching algorithm, clinic profile editor,
`/za-kliniki`. No SMS, no Twilio, no ElevenLabs, no SendGrid / Mailgun
added. `package.json` unchanged. No new dependencies installed.

### Unresolved risks
- 🔴 Git secrets-leak BLOCKED — local-only, no push / no deploy.
- 🟠 Preview env's Resend sender domain is not verified, so emails will
  not actually deliver in this env until DNS verification is completed
  in the Resend dashboard. Production env may already have this set;
  no code change required either way.


## 2026-05-16 — Patient Layer Batch P7 — Final Polish & Mobile QA

End-to-end demo-readiness pass across the patient journey. **No new features.**
Strict scope-limited QA + one targeted layout fix. No backend changes,
no external providers (Resend / Twilio / ElevenLabs / Stripe / Meta) called.

### Files changed
- `frontend/app/page.tsx` — single line: added `overflow-x-hidden` to
  `<main className="...">`. Fixes horizontal overflow on the homepage at
  375 / 390 / 768 caused by `ScrollReveal animation="fade-left"`
  (`translateX(40px)` initial state) and a decorative blur blob
  (`absolute -right-40 w-[600px]`) inside `AnimatedHero`. Same pattern
  already used on the recommended-clinics page (`overflow-x-hidden` on
  `<main>`). One-line change only — no decoration / animation removed.

### Pages verified at 375 / 390 / 768 / 1440
| Page                       | Overflow | Forbidden copy | CTAs |
|----------------------------|----------|----------------|------|
| `/` (home)                 | none after fix | none | hero CTA → quiz |
| `/quiz/success`            | none     | none | "Виж препоръчаните клиники" → `/results/{leadId}/clinics` |
| `/results/{leadId}/clinics`| none     | none | "Виж профила" / "Искам обаждане" / "Помогнете ми да избера" all functional |
| Sofia Premium profile      | none     | none | tier-correct sections; honest media fallbacks |
| `RequestCallModal` @375    | none     | none | submit gated by phone≥6 digits + consent |
| `AssistedChoiceModal` @375 | none     | none | submit gated; optional message field present |

### Backend smoke (curl, no code changes)
- **P4** `POST /api/leads/{P4}/request-call` with Sofia Premium → 200 with
  `request_id`. `/selection-state` flips to `has_selected_clinic=true`.
  Resubmit to a different clinic → 409 `already_requested`.
- **P5** `POST /api/leads/{P5}/request-zubite-help` → 200 with `request_id`.
  Resubmit → 200 `already_requested=true` (idempotent).
- **Admin queue** — both requests visible in
  `/api/admin/consultation-requests` with the correct `created_from`
  (`recommended_clinics_flow` / `assisted_choice_flow`). P5 row is
  `status=needs_zubite_review` and the dashboard `Чакат преглед`
  counter increments. Dashboard link wires correctly to
  `/admin/consultation-requests?status=needs_zubite_review` → "Чака
  преглед" tab.

### Post-submit UX checks
- P4 lead's `/results/{leadId}/clinics`: green banner "Вече избрахте
  клиника" present; Sofia card shows submitted badge; the other 2 cards
  flip to disabled "Вече избрахте клиника"; the assisted-choice button
  locks. All 3 cards keep an active "Виж профила" link.
- P5 lead's `/results/{leadId}/clinics`: sky banner "Заявката е изпратена
  към Zubite"; all 3 cards lock with "Вече поискахте помощ от Zubite";
  assisted-choice section shows the submitted badge.

### Copy & safety
- Quiz success page contains *only* the safe "Какво следва?" steps. No
  forbidden phrases anywhere on the patient flow:
  `Ще се свържем с теб`, `Очаквайте обаждане`, `Ще ти помогнем да
  запазиш час`, `ще ви се обадим автоматично`, `най-добра клиника`,
  `топ клиника`, `гарантиран резултат`, `диагноза`, `Zubite рейтинг`,
  `проверено качество`, `сертифицирано от Zubite`.
- Medical disclaimer "Zubite не поставя диагноза и не заменя преглед
  при лекар." present on quiz success + bottom of recommendations page
  + bottom of clinic profile.

### Phone prefill (intentionally NOT implemented)
The public `GET /api/leads/{lead_id}` endpoint excludes PII (security
audit, Feb 2026: "PII excluded from public lead lookup endpoints"). The
modal still supports an `initialPhone` prop, but the parent does not
fetch lead phone client-side. Keeping the `+359 ...` placeholder is the
correct/secure design — patient re-enters phone on submit.

### TypeScript
`npx tsc --noEmit` → 6 pre-existing errors in non-P7 files
(`admin/blog/import`, `admin/dashboard`, `lib/articleTestRender`,
`lib/api.ts` index-signature, `lib/attribution.ts`). **Zero new errors
introduced by P7.** None of the P7-scope files emit TS errors.

### Out-of-scope (NOT touched)
Admin clinic editor, clinic portal, auth/session/CSRF, audit logs,
analytics tracking, article importer, `/za-kliniki`, matching algorithm,
pricing, package.json, dependencies. No notifications / emails / SMS /
Twilio / ElevenLabs calls triggered.

### Demo readiness
✅ Patient demo flow is presentation-ready end-to-end. No outstanding
P7 blockers.


## 2026-02-16 — Admin Rich Clinic Profile Editor — R1

Admin-managed tier control + admin-managed rich profile content. Tier
gating now drives **real** content (not just placeholders) on the
public clinic profile. **No backend rewrites — extended existing
`ClinicAdminUpdate` + reused existing `PATCH /api/admin/clinics/{id}`.
No external providers, no clinic-portal changes, no patient-flow
changes.**

### Existing tier fields found
- **`partner_tier`** — already canonical (added in earlier batches).
- Legacy: `is_premium: bool`, `is_featured: bool` — already read-side
  bridged via `_resolve_partner_tier()` in `backend/routers/public.py`.
- **`placement_label`** / **`placement_disclosure`** — already
  computed in public.py per tier.

### Canonical tier field chosen
**`partner_tier`** — values `standard | featured | premium`. Legacy
boolean fields continue to work on read; writes flow through this single
key. No migration script.

### Files changed
**Backend (3 + 1 test file):**
- `backend/schemas.py` — added `PARTNER_TIER_VALUES`, `PROFILE_STATUS_VALUES`,
  nested `ClinicProfileCase`, `ClinicReviewSources`, `ClinicProfile` models;
  extended `ClinicAdminUpdate` with `partner_tier` + `clinic_profile`.
- `backend/routers/consultations.py` — extended the existing
  `PATCH /api/admin/clinics/{clinic_id}` handler with the R1 validation
  block (tier whitelist, profile status, treatment_focus & case_library
  counts, case publish-without-consent rejection, auto-id for cases,
  `updated_at` / `published_at` stamping, audit metadata: changed_fields
  + partner_tier_before/after + profile_status_before/after).
- `backend/routers/public.py` — added `_public_profile_for_tier()`
  (tier-gated read-time projection of the published profile blob).
  Standard tier exposes only `short_description` + `treatment_focus`;
  Featured adds `patient_intro`; Premium adds the full media + story
  + case_library stack. Draft profiles excluded entirely. Read filter
  drops case rows that lack `status=published && consent_confirmed`.
  Extended `_safe_clinic_payload` projection field list with
  `clinic_profile`.
- `backend/tests/test_admin_clinic_profile_editor.py` (NEW, 24 cases) —
  **24/24 PASS in 6.07s**.

**Frontend (4):**
- `frontend/lib/api.ts` — added `clinic_profile` typing on
  `RecommendedClinic` so consumers get type-safe access to the
  tier-gated published fields.
- `frontend/app/admin/clinics/page.tsx` (existing partner-clinics admin
  page) — appended a "Профил" column with `Редактирай профил` link
  to the new editor.
- `frontend/app/admin/clinics/[id]/page.tsx` (NEW, ~470 LOC) — focused
  rich profile editor. 8 sections: Партньорски статус / Статус на
  профила / Основна информация / Външни сигнали за доверие /
  Медия URL-и / Лекар / екип / Premium съдържание / Библиотека със
  случаи. Tier-aware visibility hints on every field; CTA disabled
  state on `Публикуван` case option when consent_confirmed=false;
  sticky save bar at the bottom.
- `frontend/app/results/[leadId]/clinics/[clinicId]/page.tsx` — wired
  real content from `clinic.clinic_profile` for: hero image, clinic
  video, doctor spotlight (name/role/bio/team_note/doctor_video),
  clinic story, environment description, consultation process, case
  library. Existing placeholders kept as honest fallbacks when admin
  hasn't published the field. Tier gates already enforced by backend
  projection; UI follows.

**Docs:**
- `memory/CHANGELOG.md`.

### Backend endpoint
**Reused** — `PATCH /api/admin/clinics/{clinic_id}` (existing). No new
route. Request body now accepts the additional optional keys:
```json
{
  "partner_tier": "standard|featured|premium",
  "clinic_profile": { ...ClinicProfile fields }
}
```

### Data model implemented (`clinic.clinic_profile`)
```
profile_status:           "draft" | "published"
short_description:        str(max=500)
patient_intro:            str(max=500)
treatment_focus:          str[](max 12 items, each max 80)
hero_image_url:           str(max=500)
clinic_video_url:         str(max=500)
doctor_video_url:         str(max=500)
doctor_spotlight_name:    str(max=200)
doctor_spotlight_role:    str(max=200)
doctor_spotlight_bio:     str(max=1000)
team_note:                str(max=500)
clinic_story:             str(max=1500)
environment_description:  str(max=1000)
consultation_process:     str(max=1000)
review_sources: {
  google_rating, google_review_count, google_url,
  facebook_rating, facebook_review_count, facebook_url,
  superdoc_rating, superdoc_review_count, superdoc_url,
}
case_library: [
  { id (auto-uuid), title(120), category(80), summary(700),
    status: draft|published, consent_confirmed: bool }
] (max 12)
updated_at / published_at: ISO string (auto-stamped)
```

### Validation rules implemented
- `partner_tier ∈ {standard, featured, premium}`, else **400**.
- `profile_status ∈ {draft, published}`, else **400**.
- Ratings 0.0–5.0 (Pydantic `ge/le`), else **422**.
- Review counts integer 0–100,000, else **422**.
- Text length caps enforced at `Field(max_length=…)`, else **422**.
- `treatment_focus.length ≤ 12`; each item ≤ 80 chars, else **400**.
- `case_library.length ≤ 12`, else **400**.
- A case row with `status=published && consent_confirmed=false` →
  **400** at write time. (Read-time filter also drops such rows if
  they ever sneak in via legacy data.)
- Unknown keys silently dropped by Pydantic `extra="ignore"`. PII keys
  (`patient_name`, `patient_phone`, etc.) **never** persisted.

### Admin UI sections (Bulgarian)
1. **Партньорски статус** — 3-button pill picker + helper copy:
   "Партньорският статус контролира видимостта и дълбочината на
   публичния профил. Не означава медицински рейтинг или гаранция за
   качество."
2. **Статус на профила** — Чернова / Публикуван toggle.
3. **Основна информация** — short_description / patient_intro /
   treatment_focus chip-input.
4. **Външни сигнали за доверие** — google / facebook / superdoc
   rating + count + URL.
5. **Медия URL-и** — hero / clinic / doctor video URLs.
6. **Лекар / екип** — doctor name / role / bio / team note.
7. **Premium съдържание** — clinic_story / environment / consultation_process.
8. **Библиотека със случаи** — add/edit/remove cases with status +
   consent_confirmed gate.

### Tier assignment behaviour
- Admin can switch tier freely; saves the canonical `partner_tier`.
- Helper copy explicitly says tier is **visibility / profile depth**,
  not medical rating.
- Downgrade preserves saved profile data — fields are simply hidden
  publicly at read-time (test #22 pins this).

### Tier-aware admin hint behaviour
Each field carries a visibility hint when the current tier wouldn't
publish it:
- Premium-only fields on Standard / Featured → "Това поле ще се вижда
  публично само при Premium профил."
- Featured+Premium fields on Standard → "Това поле няма да се вижда
  публично при Standard профил."

Saved data is never deleted on tier change — only hidden publicly.

### Public profile integration
- **Standard** profile (published) → exposes `short_description` +
  `treatment_focus` + (existing) `review_signals`. No premium badge,
  no Featured-only sections, no Premium media stack.
- **Featured** profile → adds `patient_intro` (rendered in the
  existing "За клиниката" section). Premium stack still hidden.
- **Premium** profile → real hero image replaces the placeholder; real
  clinic video replaces VideoIntroSection placeholder; doctor section
  shows real name/role/bio + optional doctor video + team note; clinic
  story / environment / consultation_process render as new sections;
  case library renders only consent-confirmed published rows. Each
  field independently falls back to the existing honest placeholder if
  not published.

### Public card integration
Existing `ClinicRecommendationCard` already uses `placement_label`
("Premium партньор" / "Представена клиника") and `placement_disclosure`
copy, both computed by `public.py` from the canonical `partner_tier`.
No card change required.

### Tier gating behaviour (read-time)
Implemented in `_public_profile_for_tier()`:
- Returns `None` when `profile_status != "published"` → public view
  uses placeholders.
- For Standard, returns only the standard slice.
- For Featured, returns standard + `patient_intro`.
- For Premium, returns the full stack including `case_library` filtered
  to `status=published && consent_confirmed=true`.

### Case library consent behaviour
- Draft case without consent → **allowed** (test #14).
- Published case without consent → **400** at write (test #13).
- Even if a legacy / hand-edited row reaches MongoDB in a forbidden
  state, the read-time filter drops it (test #21).
- Admin UI: the `Публикуван` option in the status dropdown is
  `disabled={!consent_confirmed}`. Editor must check the consent
  checkbox first.

### Tests run/results
**Backend** (`test_admin_clinic_profile_editor.py`) — **24 / 24 PASS**
in 6.07s on isolated `zubite_test_admin_clinic_profile_r1` DB.
Coverage matrix:

| # | Test |
|---|---|
| 01–03 | Set tier to standard / featured / premium |
| 04 | Invalid tier rejected (400) |
| 05 | Clinic JWT cannot change tier |
| 06 | Anonymous cannot change tier |
| 07 | Admin can update basic profile fields |
| 08 | Rating > 5 rejected (422) |
| 09 | Negative review count rejected (422) |
| 10 | Overlong text rejected (422) |
| 11 | treatment_focus > 12 items rejected (400) |
| 12 | case_library > 12 items rejected (400) |
| 13 | Published case w/o consent rejected (400) |
| 14 | Draft case w/o consent allowed |
| 15 | Unknown / PII-like fields not persisted |
| 16 | Recos response includes `partner_tier` |
| 17 | Standard published profile exposes only Standard fields |
| 18 | Featured published profile exposes Featured-allowed fields, no Premium stack |
| 19 | Premium published profile exposes the full stack |
| 20 | Draft profile excluded from public response |
| 21 | Premium case w/o consent excluded at read-time (legacy-data safety) |
| 22 | Downgrade from Premium to Standard hides Premium publicly, preserves data |
| 23 | Clinic w/o `clinic_profile` still works (recos legacy shape intact) |
| 24 | Public payload excludes internal fields (password_hash, notification_email, …) |

**Live verification** (admin smoke):
- Edit page rendered all 8 sections (`section-partner-status`,
  `section-profile-status`, …, `section-cases`).
- Set tier=Premium, status=Публикуван, saved short_description +
  hero_image_url + treatment_focus="aligners" → toast "Профилът е
  запазен успешно." rendered.
- Visited public clinic profile (`/results/{leadId}/clinics/{clinicId}`)
  → `profile-clinic-hero-image` element present, image placeholder
  absent. Mobile 375 viewport → `scrollWidth - clientWidth = 0`.
- Cookie banner correctly hidden on `/admin/*` (admin portal exempt
  per earlier batch).
- Case `Публикуван` option disabled while `consent_confirmed=false` —
  caught by playwright "option being selected is not enabled" error,
  exactly the safety guard we wanted.

### TypeScript result
`tsc --noEmit` — clean for the four touched files + the new editor.
The single error in the repo (`lib/api.ts:31` — `AttributionPayload`
→ `Record<string, unknown>`) is **pre-existing** and unrelated to this
batch.

### Confirmation
- ✅ 0 patient quiz / quiz success / matching algorithm / P4 / P5 /
  clinic portal / auth / CSRF / analytics tracking changes.
- ✅ Existing `_resolve_partner_tier` / `_PLACEMENT_LABEL` /
  `_PLACEMENT_DISCLOSURE` infrastructure preserved; placement_label
  and placement_disclosure are unchanged copy.
- ✅ 0 new dependencies; URL-only media (no upload, no S3, no image
  processing).
- ✅ No fake clinic content added anywhere. No invented doctor names,
  review counts, case studies, videos, images, or testimonials —
  100% admin-entered.
- ✅ Audit emits `clinic.updated` (already used by the existing PATCH
  endpoint) with `changed_fields` keys-only + tier/profile_status
  before/after metadata. No profile body in audit log.
- ✅ Git not pushed, "Save to GitHub" not used, deploy not triggered.

### Unresolved risks
1. **No image upload** in R1 — by design, per brief. URL-only.
   Future R2 should add image upload (existing static storage or
   external CDN) so non-technical clinic admins don't need to host
   their own images.
2. **No clinic self-edit** in R1 — admin-only. Future R2: clinic-side
   "request changes" workflow with admin approval.
3. **No moderation workflow** — admin click directly publishes. Future
   R2 / R3: review queue before publish.
4. **No image dimension / domain validation** on URL fields beyond
   length cap. R2 could enforce HTTPS + safe domain list.
5. **`clinic_status` / `subscription_status`** unchanged by this batch;
   audit `clinic.status_changed` still emits as before.
6. **`clinic.review_signals`** still flows through the **flat** top-level
   review fields (`google_rating`, etc.) — same as before P4/P5.
   The nested `review_sources` inside `clinic_profile` is editor-only
   storage in R1; it does not feed the public `review_signals` block.
   R2 should pick **one** canonical store; deferred to avoid breaking
   the existing display path.

### R1 status
✅ **Complete.** Admin can set tier, edit rich profile content, publish
or save as draft, and the public profile renders the real fields with
honest placeholder fallbacks per tier. Backend persists the full
profile blob, public response is tier-gated, downgrade preserves data.

### Recommended R2 next step
**Image upload + clinic-side draft submission**:
1. Add an image-upload endpoint (multipart) that stores in
   `/app/backend/static/clinic-profiles/{clinic_id}/...` and returns
   a public URL. Plug it into the existing `hero_image_url` field —
   no schema change needed.
2. Add a **clinic-portal draft mode**: clinics can edit a parallel
   `clinic.clinic_profile_pending` blob; admin sees pending changes
   in the existing editor with a "Review & publish" CTA. Re-uses the
   same Pydantic model + validation.
3. Surface "Профил чака преглед" counter on `/admin/dashboard` next
   to the existing "Чакат преглед" P5 queue card.



## 2026-02-16 — Backend Analytics Schema Follow-up for P6

Extended the `AnalyticsEvent` Pydantic model to accept & persist the
P6 patient-funnel fields the frontend already sends. **Schema-only
backend change. No endpoint logic, no routing, no frontend changes,
no external providers, no auth changes.**

### Files touched
- `backend/schemas.py` — added 15 new `Optional[...]` fields to
  `AnalyticsEvent`. Explicit `model_config = ConfigDict(extra="ignore")`
  added so PII-looking keys stay dropped even if Pydantic defaults
  change in a future version.
- `backend/tests/test_patient_analytics_payload.py` (NEW, 11 cases) —
  **11/11 PASS** in 0.73s on isolated `zubite_test_p6_analytics_schema`
  DB.
- `memory/CHANGELOG.md`.

### Fields added
```python
# P6 patient-funnel fields (Feb 2026)
lead_id:          Optional[str] = None
clinic_id:        Optional[str] = None
partner_tier:     Optional[str] = None
placement_label:  Optional[str] = None
source:           Optional[str] = None
rank_position:    Optional[int] = None
success:          Optional[bool] = None
error_code:       Optional[str] = None
reason:           Optional[str] = None
attempted_action: Optional[str] = None
clinic_count:     Optional[int] = None
has_premium:      Optional[bool] = None
has_featured:     Optional[bool] = None
has_standard:     Optional[bool] = None
has_lead_id:      Optional[bool] = None
```

(`band`, `segment`, `city` were already declared on the legacy quiz
shape and are reused.)

All optional, all default to `None`. The endpoint already strips
`None` values before insert (existing dict-comp in
`backend/routers/analytics.py`), so absent fields don't pollute the
collection.

### Tests added (`test_patient_analytics_payload.py`)
| # | Test | Result |
|---|---|---|
| 01 | Legacy `article_view` event still works (extra keys dropped) | ✅ |
| 02 | Legacy `question_answered` quiz event still works | ✅ |
| 03 | P6 `request_call_submitted` — full attribution stored | ✅ |
| 04 | P6 minimal event with only required fields | ✅ |
| 05 | P6 `clinic_recommendations_viewed` with tier-flag booleans | ✅ |
| 06 | P6 `request_call_failed` — `error_code` persisted | ✅ |
| 07 | P6 `matching_choice_blocked` — `reason` + `attempted_action` persisted | ✅ |
| 08 | Unknown extra field silently dropped (`extra="ignore"`) | ✅ |
| 09 | **PII guard** — `name`/`phone`/`email`/`patient_*`/`message`/`consent_text`/`access_token`/`cookie` all dropped, values never reach Mongo | ✅ |
| 10 | Full 4-event funnel roundtrip — `lead_id` correlates all events | ✅ |
| 11 | Rate-limit (60/min) still enforced | ✅ |

**Total: 11/11 PASS in 0.73s** on isolated test DB.

### Live verification (production-equivalent preview)
```
$ curl -X POST .../api/analytics/events -d '{
    event_type: "p6_smoke_post_schema",
    session_id: "smoke-session-final",
    timestamp: "...",
    lead_id, clinic_id, partner_tier, placement_label,
    source, rank_position, success,
    phone: "+359888SHOULDDROP",     ← PII
    patient_message: "SHOULD NOT…"  ← PII
}'
{"status": "ok"}

$ db.analytics_events.findOne({session_id:"smoke-session-final"})
{
  id, event_type, session_id, timestamp, created_at,
  lead_id: "smoke-lead-1",
  clinic_id: "smoke-clinic-1",
  partner_tier: "premium",
  placement_label: "Premium партньор",
  source: "matching_card",
  rank_position: 1,
  success: true
}
PII keys present: []
```
All 7 declared P6 fields stored; both PII keys dropped silently.

### Legacy analytics — still works
- `articleAnalytics.ts` events (`article_view`, etc. with `post_slug`,
  `post_title`, `href`, `cta`) → POST 200, extras dropped, `event_type`
  + `session_id` + `timestamp` persisted exactly as before.
- `MasterQuiz.tsx` events (`question_answered`, `form_submitted`, etc.
  with `question_id`, `score`, `answers`) → all legacy fields still
  declared on the model, fully persisted.

### Privacy / PII guarantee
- `extra="ignore"` is now **explicit** on `AnalyticsEvent` — set by
  config, not just by Pydantic v2 default. A future framework upgrade
  or accidental config change can't silently turn it into
  `extra="allow"` and start leaking PII keys.
- The new fields are statically the non-PII subset listed in the
  brief. **No** `name`/`phone`/`email`/`message`/`consent`/`token`/
  `cookie` field declared on the model. Tests #08 and #09 pin this.

### Confirmation
- ✅ 0 frontend / admin / clinic-portal files changed.
- ✅ 0 auth / session / CSRF / audit / external-provider changes.
- ✅ 0 endpoint logic changed in `analytics.py` — purely schema-level.
- ✅ 0 new dependencies.
- ✅ Existing routes unchanged.
- ✅ Backend rate-limit (60/min) still enforced (test 11).
- ✅ Git not pushed, "Save to GitHub" not used, deploy not triggered.

### Unresolved risks
1. **Cross-suite DB pollution in some legacy test files**
   (`test_refactored_api.py::TestAnalyticsEndpoints` uses a global
   `BASE_URL` env var that's not set in this environment — pre-existing
   issue, unrelated to this change). Each individual test suite passes
   when run in isolation.
2. **`articleAnalytics.ts` extras still dropped.** The new fields are
   patient-funnel-specific; the blog tracking pipeline still drops
   `post_slug` / `post_title` / `href` / `cta`. Out of scope per brief
   ("avoid touching blog tracking unless necessary"). When/if needed,
   add those keys the same way.
3. **No mongo index** on `lead_id` or `clinic_id` in
   `analytics_events`. For the funnel admin view, an index on
   `(lead_id, timestamp)` will be helpful. Out of P6 scope; cheap
   follow-up.

### Safe to proceed to Admin Rich Clinic Profile Editor?
✅ **Yes.** P6 backend follow-up is purely additive at the schema
level. No surface area in admin / clinic / patient flows changed. The
Admin Rich Profile Editor batch can proceed with confidence.



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
