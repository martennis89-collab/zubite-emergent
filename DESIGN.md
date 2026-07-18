---
name: Zubite.bg
description: Independent dental guidance and transparent clinic matching for Bulgaria.
colors:
  canvas-warm: "#f5f4f2"
  paper: "#ffffff"
  ink: "#0a0a0a"
  ink-soft: "#171717"
  text-muted: "#525252"
  text-faint: "#6b6b6b"
  border: "#e5e5e5"
  action-orange: "#ff6b00"
  action-orange-deep: "#cc5400"
  action-orange-text: "#b84900"
  profile-coral: "#ec6b2d"
  trust-emerald: "#007956"
  trust-emerald-bright: "#00d294"
  trust-emerald-soft: "#d0fae5"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(56px, 6.6vw, 96px)"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-0.065em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(48px, 5vw, 72px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.055em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  control:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.12em"
  editorial-accent:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.04em"
rounded:
  input: "9px"
  control: "12px"
  panel: "14px"
  card: "16px"
  feature: "18px"
  visual: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  control-gap: "12px"
  md: "16px"
  card: "24px"
  lg: "32px"
  section: "48px"
  wide: "64px"
  section-y: "112px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "52px"
  button-action:
    backgroundColor: "{colors.action-orange}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "52px"
  profile-action-primary:
    backgroundColor: "{colors.profile-coral}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "15px 16px"
    height: "88px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: "12px 14px"
    height: "44px"
  chip-trust:
    backgroundColor: "{colors.trust-emerald-soft}"
    textColor: "{colors.trust-emerald}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  navigation-active:
    backgroundColor: "{colors.canvas-warm}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: Zubite.bg

## 1. Overview

**Creative North Star: "The Independent Editorial Guide"**

Zubite feels like an independent editor who understands dental care and knows how to make the next step legible. The public experience uses generous space, decisive headlines, warm paper surfaces, and immersive but disciplined storytelling. Authenticated clinic and admin surfaces compress the same language into precise, familiar tools that disappear into the task.

The atmosphere is premium healthcare with approachable warmth. It is alive through responsive state changes, tactile controls, layered composition, and moments of editorial emphasis—not through generic gradients, decorative spectacle, or frictionless “AI calm.” Trust must remain visible in the hierarchy: education comes before conversion, evidence is separated from promotion, and every action explains its real-world outcome.

The system explicitly rejects the appearance of affiliation with any specific clinic. It must never resemble a generic AI wellness site, a sterile hospital portal, a discount marketplace, an aggressive lead-generation funnel, or a glossy luxury-clinic advertisement.

**Key Characteristics:**

- Warm editorial canvas with crisp white working surfaces.
- Dense black typography, rare serif emphasis, and technical mono labels.
- Signal Orange for action; Trust Emerald for evidence and assurance.
- Restrained ambient depth, precise borders, and tactile state feedback.
- Spacious public narratives; compact, familiar product workflows.
- Responsive web patterns that can translate into a future native mobile app.

## 2. Colors

The palette pairs warm paper neutrals with two deliberately separate signals: orange moves the user forward, while emerald proves, verifies, and reassures.

### Primary

- **Signal Orange** (`colors.action-orange`): primary transactional actions, progress, active markers, and the single strongest next step in a task. Its deep variant is reserved for hover and pressed states.
- **Editorial Ink** (`colors.ink`): primary text, structural contrast, and the dark editorial CTA used when the public story needs quiet authority rather than transactional urgency.

### Secondary

- **Trust Emerald** (`colors.trust-emerald`): verified information, guidance, success, clinic-neutral assurance, and explanatory emphasis. The bright and soft variants support status dots, chips, callouts, and quiet evidence surfaces.

### Tertiary

- **Profile Coral** (`colors.profile-coral`): the warmer action tone used in the public clinic-profile action hub. It must remain localized to that profile context and must not become a competing site-wide accent.

### Neutral

- **Warm Paper** (`colors.canvas-warm`): the shared public canvas and emotional baseline.
- **Paper White** (`colors.paper`): cards, forms, tool surfaces, and contained navigation.
- **Soft Ink** (`colors.ink-soft`): dark hover and pressed surfaces.
- **Muted Copy** (`colors.text-muted`): explanatory paragraphs and secondary labels.
- **Faint Copy** (`colors.text-faint`): metadata and low-priority supporting text; never use it for essential instructions.
- **Precision Border** (`colors.border`): the default separator and component outline.

**The Action Means Outcome Rule.** Orange is not decoration. It appears only where a user can advance, submit, select, or understand the active state.

**The Trust Is Evidence Rule.** Emerald signals verified information, transparent guidance, positive status, or reassurance. Never use it to disguise a commercial action as proof.

**The Warm Canvas Rule.** Public and patient surfaces begin on Warm Paper. Clinic and admin tools may use a slightly denser warm-neutral canvas, but never cold blue-gray as the dominant environment.

## 3. Typography

**Display Font:** Manrope (with sans-serif fallback)  
**Body Font:** Manrope (with sans-serif fallback)  
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)  
**Editorial Accent:** Playfair Display (with Georgia and serif fallbacks)

**Character:** Manrope carries the product with direct, contemporary confidence. Playfair Display is a scarce editorial gesture for emphasized words and reflective statements; IBM Plex Mono makes evidence labels, steps, and metadata feel inspectable rather than promotional.

### Hierarchy

- **Display** (`typography.display`): hero statements and major public page openings only. Balance the line breaks deliberately; never let it leak into dashboards or form labels.
- **Headline** (`typography.headline`): major section introductions, result summaries, directory titles, and clinic-profile identity.
- **Title** (`typography.title`): card headings, task modules, and action-hub labels.
- **Body** (`typography.body`): explanations and guidance, normally held to 65–75 characters per line on public surfaces.
- **Control** (`typography.control`): buttons, tabs, and important compact actions.
- **Label** (`typography.label`): short uppercase evidence labels, step markers, table headings, and status metadata.
- **Editorial Accent** (`typography.editorial-accent`): a short emphasized phrase, never an entire interface or dense paragraph.

**The One Working Voice Rule.** Manrope owns every functional surface. Display type is a hierarchy tool, not a substitute for layout.

**The Serif Is a Gesture Rule.** Playfair Display may emphasize one human phrase inside a headline or one short reflective sentence. It is forbidden in buttons, navigation, form controls, data, and tables.

**The Mono Must Explain Rule.** IBM Plex Mono is for inspectable metadata and orientation. Never use tiny uppercase mono labels as decorative filler.

## 4. Elevation

Elevation is layered but restrained. Borders and tonal surfaces establish most hierarchy; shadows provide ambient separation for floating navigation, interactive cards, hero-stage compositions, and high-value panels. Public clinic-profile content remains predominantly flat so clinic information reads as evidence rather than advertising.

### Shadow Vocabulary

- **Quiet Surface** (`0 1px 2px rgba(0,0,0,0.03)`): a nearly imperceptible lift on resting editorial cards.
- **Ambient Card** (`0 14px 30px -12px rgba(15,15,15,0.18)`): hover feedback and compact floating surfaces.
- **Working Panel** (`0 28px 70px -50px rgba(10,10,10,0.36)`): quiz panels, forms, and sticky decision modules.
- **Floating Navigation** (`0 6px 18px -6px rgba(15,15,15,0.18), 0 1px 2px rgba(0,0,0,0.04)`): pill navigation and brand controls above the canvas.
- **Editorial Stage** (`0 22px 44px -26px rgba(15,15,15,0.20), 0 2px 6px -2px rgba(15,15,15,0.06)`): layered visual cards that support storytelling.

**The Border Before Shadow Rule.** Use the Precision Border first. Add a shadow only when a surface floats, responds, or must remain visually above nearby content.

**The Ambient Shadow Rule.** Shadows must be broad, low-opacity, and vertically restrained. If the component looks outlined by darkness, the shadow is wrong.

**The Flat Evidence Rule.** Clinic facts, matching explanations, tables, and trust statements stay flat or border-led; credibility must not depend on promotional lift.

## 5. Components

The component language is tactile, precise, and confident. Standard controls remain familiar, but each state should answer the user immediately and gracefully.

### Buttons

- **Shape:** gently squared controls (`rounded.control`) for editorial and descriptive actions; full pills (`rounded.pill`) for singular transactional CTAs and compact progress actions.
- **Primary:** Editorial Ink on Paper White, with a 52px minimum height and confident compact copy. Use on public hero conversion when calm authority is more appropriate than urgency.
- **Action:** Signal Orange on Paper White, with a 52px minimum height. Use for the strongest transactional next step: start, submit, continue, request, or open the clinic path.
- **Hover / Focus:** lift by no more than 2–3px; transition most task states in 150–250ms. Focus uses a clearly visible orange or emerald ring with at least a 3px perceived boundary and no shadow substitution.
- **Secondary:** Paper White, Editorial Ink, and a Precision Border. The hover state may add an Ambient Card shadow or an emerald-tinted surface when the action is trust-related.
- **Descriptive action tiles:** clinic-profile visit and callback actions are 88px-tall tiles containing a label and a plain-language outcome. The label alone is never enough.
- **Disabled / Loading:** preserve the control's dimensions; reduce emphasis without removing the label. Use an inline indicator and an explicit state message rather than a detached spinner.

### Chips

- **Style:** pill geometry, concise wording, and a semantic rather than decorative color assignment.
- **Trust / status:** Trust Emerald on the soft emerald surface; reserve bright emerald for small live indicators.
- **Selected / active:** use Signal Orange only when the chip changes task state. Passive categories remain neutral.

### Cards / Containers

- **Corner Style:** panels and cards use 14–18px corners; editorial visual frames may reach 20px.
- **Background:** Paper White on Warm Paper. Transparent warm surfaces are permitted only in public storytelling where the border remains clear.
- **Shadow Strategy:** flat at rest by default; use Quiet Surface or Ambient Card for interactive lift, Working Panel for task-critical modules.
- **Border:** a 1px Precision Border is the default. Matching explanations and findings may use one 4px semantic edge to clarify meaning.
- **Internal Padding:** 24px by default; 32–48px for major decision panels; 14–18px for compact grouped controls.

### Inputs / Fields

- **Style:** Paper White, a 1px Precision Border, and 9px corners with a minimum 44px height.
- **Focus:** shift the border toward Trust Emerald or Signal Orange and show a visible focus ring. Never rely on shadow alone.
- **Error / Disabled:** preserve labels and instructions; error copy is explicit and adjacent to the field. Disabled fields remain legible and cannot look selected.

### Navigation

- **Public:** floating white pill groups over Warm Paper; active items use a warm neutral fill plus a small Signal Orange marker.
- **Clinic and admin:** familiar top bar plus side navigation. Active task items use Signal Orange; inactive items remain quiet. Mobile navigation collapses structurally into a clear drawer or bottom-safe pattern.
- **Behavior:** navigation responds in 150–250ms, maintains visible focus states, and never uses decorative choreography that delays access to the task.

### Clinic Profile Action Hub

This is the signature conversion component. It groups one visit-booking action, one callback action, and two clearly secondary conversation channels. Each action includes an outcome explanation, uses true button or link affordance, and appears once near the clinic identity. The rest of the profile points users back to this hub instead of repeating competing CTAs.

### Data and Operational Surfaces

Tables use Paper White, a Precision Border, warm-neutral headers, and IBM Plex Mono labels. Loading uses structural skeletons; empty states explain what belongs in the space and the next available action. Dashboard motion communicates state only and completes within 150–250ms.

## 6. Do's and Don'ts

### Do:

- **Do** make Zubite's independence visible through transparent matching explanations, verified-information treatments, and clinic-neutral language.
- **Do** use Signal Orange for the one strongest action or active state and Trust Emerald for evidence, verification, guidance, and positive status.
- **Do** explain the real-world outcome of every consequential CTA: clinic visit, callback, Zubite chat, Viber conversation, booking, or Care Pass use.
- **Do** make the interface feel alive with tactile 150–250ms state feedback, layered depth, responsive layout, and purposeful editorial motion.
- **Do** provide reduced-motion equivalents, visible focus states, 44px-or-larger touch targets, and WCAG 2.2 AA contrast.
- **Do** keep public narratives spacious and immersive while keeping clinic and admin workflows compact, familiar, and fast.

### Don't:

- **Don't** make Zubite appear connected to, controlled by, or biased toward a specific clinic.
- **Don't** make it resemble a generic AI wellness site; avoid default purple-blue gradients, frictionless glass panels, synthetic glow, and vague reassurance.
- **Don't** make it resemble a sterile hospital portal; warm the environment without weakening clinical clarity.
- **Don't** make it resemble a discount marketplace; never use price slashes, urgency badges, promotional countdowns, or Care Pass as the dominant conversion hook.
- **Don't** build an aggressive lead-generation funnel; education, consent, and expectation-setting must precede the request for contact details.
- **Don't** make it resemble a glossy luxury-clinic advertisement; avoid aspirational clinic glamour, oversized clinic logos, promotional portraiture, and unqualified “best clinic” language.
- **Don't** repeat clinic-profile CTAs across the hero, sidebar, body, sticky bar, and footer. One clear action hub owns the decision.
- **Don't** use Playfair Display in controls or IBM Plex Mono as decorative filler.
- **Don't** add heavy shadows to evidence, tables, clinic facts, or matching explanations.
- **Don't** use decorative motion inside task flows or make users wait through orchestrated dashboard entrances.
