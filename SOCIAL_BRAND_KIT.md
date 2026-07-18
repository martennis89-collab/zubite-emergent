# Zubite.bg Social Brand Kit

This is the portable social-media extension of `PRODUCT.md` and `DESIGN.md`. It is written for humans, Claude Design, Figma, Canva, and any agent producing Zubite.bg content. Where this file conflicts with those canonical files, `PRODUCT.md` decides strategy and `DESIGN.md` decides visual tokens.

## 1. Brand role on social media

Zubite.bg is an independent dental guide. Social content should help a person recognize a signal, understand a topic, prepare a useful question, or choose a sensible next step. It should not diagnose, create fear, rank clinics as “best,” or make the platform appear affiliated with a particular clinic.

The social presence must feel:

- Calm without looking like generic AI wellness content.
- Trustworthy, clear, and transparent.
- Human and premium, with approachable healthcare warmth.
- Alive through composition, pacing, tactile shapes, and purposeful motion.
- Independent from every clinic, manufacturer, and treatment brand.

The line to remember is:

> Първо яснота. После правилният избор.

Supporting sign-off:

> Ориентир, не диагноза.

## 2. Visual North Star

**The Independent Editorial Guide.** Think of a high-quality Bulgarian health magazine combined with a precise product interface. Use decisive editorial hierarchy and generous space, then support it with small inspectable labels, clear evidence blocks, and direct next steps.

Do not imitate:

- A generic AI wellness account with purple-blue gradients, synthetic glow, glass cards, and vague reassurance.
- A sterile hospital portal dominated by cold blue-gray.
- A discount marketplace with price slashes, timers, urgency, or coupon aesthetics.
- An aggressive lead funnel that asks for contact details before explaining value.
- A glossy luxury-clinic advertisement with aspirational portraits, clinic glamour, or “best clinic” claims.

## 3. Social palette

Use only these core colors unless a verified asset must be shown as a product photograph.

| Role | Name | Value | Use |
|---|---|---:|---|
| Canvas | Warm Paper | `#F5F4F2` | Default post and Story background |
| Surface | Paper White | `#FFFFFF` | Cards, evidence panels, text fields |
| Text | Editorial Ink | `#0A0A0A` | Headlines, body, structural contrast |
| Text | Soft Ink | `#171717` | Dark hover/alternate black surface |
| Secondary text | Muted Copy | `#525252` | Explanations and captions |
| Metadata | Faint Copy | `#737373` | Non-essential metadata only |
| Divider | Precision Border | `#E5E5E5` | 1px outlines and separators |
| Action | Signal Orange | `#FF6B00` | One primary action, step, or active signal |
| Action state | Deep Signal Orange | `#CC5400` | Pressed/hover or darker editorial marker |
| Trust | Trust Emerald | `#007956` | Verified information, guidance, reassurance |
| Live status | Live Emerald | `#00D294` | Tiny dots and status details only |
| Trust surface | Soft Trust | `#D0FAE5` | Evidence panels, chips, parent guidance |

### Color discipline

- Signal Orange means movement or an active next step. It is not decoration.
- Trust Emerald means evidence, verification, orientation, or positive status. It is not a commercial CTA color.
- Use one dominant signal color per frame. Orange and emerald may coexist, but they must not compete at equal visual weight.
- Warm Paper should occupy at least half of most educational frames.
- Dark posts are permitted for strong campaign or Reel covers, but must use Editorial Ink—not navy, charcoal-blue, or a clinic’s brand color.

## 4. Typography

### Font families

- **Manrope:** every headline, body paragraph, CTA, number, and functional label.
- **Playfair Display:** one short human or editorial phrase inside a headline. Never use it for complete posts, buttons, disclaimers, or data.
- **IBM Plex Mono:** evidence labels, carousel numbering, short metadata, and source-like annotations. Never use it as decorative filler.

The font files are available in `frontend/public/fonts/taste/`.

### Recommended social sizes

Sizes are starting points at 1080px width and may be adjusted to preserve line breaks.

| Role | Portrait / Square | Story / Reel |
|---|---:|---:|
| Display headline | 86–112px / 0.92–1.02 line height | 112–150px / 0.9–1.0 |
| Section headline | 58–78px / 1.0–1.08 | 76–104px / 1.0 |
| Body | 28–36px / 1.4–1.6 | 34–44px / 1.4–1.55 |
| Label | 18–22px / `0.12em` tracking | 22–26px / `0.12em` |
| Disclaimer | 18–22px / 1.45 | 22–26px / 1.45 |

### Typography rules

- Keep Bulgarian headlines conversational and direct.
- Use sentence case. Avoid all-caps headlines.
- Keep carousel-cover headlines to 3–8 words when possible.
- Use manual line breaks to create meaning, not just to fill space.
- Avoid centered paragraphs longer than two lines.
- Use Playfair Display on no more than one short phrase per frame.

## 5. Logo and brand mark

The current canonical mark is a wordmark, not an icon:

> **Zubite** in Editorial Ink + **.bg** in Trust Emerald

Use Manrope Extra Bold/Bold with tight tracking. Do not borrow the old blue serif treatment from the existing Care Pass artwork as the master brand logo.

### Clear space

- Minimum clear space: the cap height of the letter `Z` on all sides.
- Minimum digital width at 1080px canvas: 170px.
- Preferred placement: top-left or bottom-left.
- Do not place clinic logos beside the Zubite wordmark as an equal lockup.
- Co-branded content must say `С участието на` or `Експертен коментар от`, with the clinic or dentist clearly identified as a contributor rather than the platform owner.

## 6. Grid and safe areas

### Instagram / Facebook portrait — 1080 × 1350

- Outer safe margin: 72px.
- Text column: 720–900px depending on composition.
- Baseline spacing unit: 12px.
- Keep critical text within `x: 72–1008` and `y: 72–1278`.
- Reserve the bottom 90–130px for sign-off, page number, or CTA—not all three.

### Square — 1080 × 1080

- Outer safe margin: 72px.
- Keep the principal statement above `y: 720` so it survives grid cropping.
- Use for proof, quotes, short definitions, and announcements—not long education.

### Stories / Reels — 1080 × 1920

- Left/right safe margin: 84px.
- Top safe area: 180px.
- Bottom safe area: 260px.
- Avoid critical text under platform UI zones.
- Put interaction stickers or response controls between `y: 1160–1500`.
- Reel-cover title must remain legible inside the central 1080 × 1350 crop.

## 7. Composition system

Use three layers:

1. **Canvas:** Warm Paper or Editorial Ink.
2. **Editorial structure:** headline, line, number, cropped circle, grid, or large geometric field.
3. **Evidence/action surface:** a white or Soft Trust panel with precise 1px border and one clearly labeled next step.

The system should feel alive through asymmetry, overlap, directional lines, numbered sequences, and deliberate cropping. Do not create liveliness with random blobs, excessive blur, or multiple glowing gradients.

Recommended corner radii at 1080px:

- Small chip: 999px.
- Compact panel: 20–24px.
- Main card: 28–36px.
- Image window: 36–48px.

Recommended strokes:

- Default border: 2px at social resolution.
- Emphasis edge: 6–8px.
- Illustration stroke: 4–6px with round caps.

## 8. Photography and illustration

### Photography

- Prefer real people, real environments, honest expressions, and daylight or warm-neutral lighting.
- Crop for human context rather than perfect teeth close-ups.
- Do not use aspirational “perfect smile” glamour as proof.
- Do not present stock models as patients, dentists, or testimonials.
- Apply Warm Paper or emerald-tinted framing; do not color-grade every image teal.
- Name the source or contributor where required.

### Illustration

- Use simple editorial line diagrams and abstract dental forms.
- Lines are Editorial Ink or Trust Emerald; one Signal Orange annotation may mark the focus.
- Avoid cartoon teeth with faces unless content is explicitly for younger children.
- Avoid generic 3D AI healthcare imagery as the master social style.

### Lumi

Lumi may appear in dedicated explainer or video content, but should not become the visual default for every post. The character must support a specific explanation and never replace evidence, a dentist’s attributed expertise, or plain-language content.

## 9. Copy system

### Voice

- Begin with what the person sees, feels, or needs to decide.
- Explain medical terms immediately in ordinary Bulgarian.
- Distinguish facts, possibilities, and questions for a professional.
- Use `може`, `възможно е`, and `ориентир` when certainty is not justified.
- Never promise a result or imply diagnosis from a post.

### High-performing headline patterns

- `Какво означава, ако…`
- `3 сигнала, които си струва да провериш`
- `Какво да попиташ преди…`
- `Не е нужно да знаеш термина.`
- `Кога е време за консултация?`
- `Как подбираме клиниките?`
- `За родители: …`

### CTA hierarchy

Primary social CTA:

> Провери своя случай

Secondary CTAs:

- Прочети ръководството
- Виж как работи
- Подготви въпросите си
- Разгледай проверима информация

Avoid `Запази час сега`, `Последни места`, `Най-добрата клиника`, and any CTA that implies urgency or clinic preference.

## 10. Template families

### Educational signal

Use for symptoms, treatments, preparation, and myths. Structure: signal → plain explanation → what to do next → disclaimer.

### Carousel explainer

Use 5–7 frames:

1. One clear promise or question.
2. Context in ordinary language.
3. First useful distinction.
4. Second useful distinction.
5. What requires professional evaluation.
6. Questions to ask.
7. Calm next step and disclaimer.

### Parent guide

Use a visible `ЗА РОДИТЕЛИ` label, calmer emerald evidence surfaces, age context, and concrete observation language. Never shame parents or create fear around development.

### Clinic matching transparency

Explain criteria such as city, relevant service, published profile information, response behavior, and Zubite trust signals. Always include `Насочване, не класация.`

### Proof / trust card

Use only verified proof: clinic information, transparent matching criteria, response-time data, and expert-reviewed educational content. Never manufacture testimonials, counts, ratings, or claims.

### Hyperreal Fact

Use for one memorable, verifiable oral-health fact over an original AI-generated or commissioned photographic background. This is the most visually immersive social format in the system, but it must remain editorial rather than sensational.

**Claim rules**

- One fact per frame; aim for 12–24 Bulgarian words and no more than five display lines.
- Verify the claim against a named primary or authoritative health source before design begins. Put the short source on the artwork and the full citation in the caption.
- Preserve qualifiers such as `може`, `свързано е` or `проучванията показват`. Never strengthen correlation into causation.
- Prefer useful, durable facts over alarming edge cases, celebrity trivia, miracle products, or speculative research.
- The image is illustrative, not evidence. Never use generated anatomy to imply a diagnosis, treatment outcome, or microscopic finding.

**Composition**

- Canvas: 1080 × 1350. Keep the photographic subject in the upper 55–65% and reserve the lower 35–45% for the statement.
- Use a smooth black-to-transparent gradient, not an opaque text slab. The image should remain visible beneath the copy.
- Place a short warm/emerald divider above the statement. Use Manrope Bold, sentence case, and one highlighted phrase at most.
- Keep the Zubite wordmark visible but quiet. Do not reproduce another publisher’s logo, typography, composition, or watermark.
- Add `AI-генерирана представителна визуализация` when AI is used and a short `Източник:` line on every fact post.

**Image-generation recipe**

> Create an original, hyperrealistic 4:5 scientific-editorial dental photograph for Zubite.bg. Keep the medically plausible subject in the upper 60% and the lower 40% dark, simple, and low-detail for copy. Use realistic neutral anatomy, controlled warm light, and restrained Zubite emerald/orange reflections. No text, labels, logos, watermarks, arrows, fake microscopic callouts, blood, gore, frightening pathology, plastic CGI, generic blue hospital styling, or clinic branding.

Before publishing, an editor confirms the source, exact wording, visual plausibility, AI disclosure, caption nuance, and alt text. If the image could be mistaken for a real patient or diagnostic scan, rewrite the disclosure or replace the image.

### Story interaction

Ask one observable question, offer 2–3 simple choices, then point to the quiz or guide. A Story poll is orientation—not assessment or diagnosis.

### Reel cover

One subject, one headline, one supporting label. Ensure the central crop works for both Reel grid and full-screen Story placement.

### Care Pass

Care Pass appears after the consultation journey, never as the master acquisition hook. Use these rules:

- Explain it as partner benefits for everyday oral-care products.
- State that it is provided after a consultation reached through Zubite.bg.
- State `Не е отстъпка от лечение.`
- Never imply insurance, medical coverage, guaranteed savings, or treatment discounts.
- The existing blue Care Pass artwork is a product image only. Do not derive the Zubite social palette or wordmark from it.

## 11. Accessibility and platform behavior

- Meet WCAG 2.2 AA contrast for all essential text.
- Minimum social text size: 18px at 1080px canvas; 22px for disclaimers when possible.
- Do not communicate meaning through color alone.
- Caption every video and provide meaningful alt text.
- Keep motion transitions readable at 300–600ms; avoid rapid zoom, flashing, or continuous decorative movement.
- Provide a static first frame that carries the key message without sound.
- Keep touch targets and Story response areas visually obvious.

## 12. Export and handoff

### Master format

- Keep SVG as the editable source of truth.
- Import SVG into Figma, Illustrator, or Canva and preserve text layers when supported.
- Install Manrope, Playfair Display, and IBM Plex Mono before editing.
- Convert text to outlines only for final vendor handoff, never in the editable master.

### Export

- Feed posts: PNG, sRGB, exact canvas dimensions.
- Photography-heavy posts: high-quality JPG at 90% or better.
- Stories/Reels: MP4 H.264, 1080 × 1920, with caption-safe composition.
- Keep one clean master without platform UI or sticker graphics.

### File naming

`YYYY-MM-DD_channel_family_topic_frame.ext`

Example:

`2026-07-18_instagram_parent-guide_first-orthodontic-check_01.svg`

## 13. Prompt for Claude Design or another design agent

Attach `PRODUCT.md`, `DESIGN.md`, and this file, then use:

> Treat the attached Zubite.bg files as authoritative. Create editable Bulgarian social-media assets using the supplied dimensions and template families. Do not invent colors, fonts, logos, statistics, testimonials, ratings, clinic claims, or medical certainty. Preserve Zubite’s visible independence from individual clinics. Use Warm Paper as the default canvas, Signal Orange only for action or active state, and Trust Emerald only for verification, guidance, or positive status. The result must feel like “The Independent Editorial Guide”: premium healthcare with approachable warmth, clear hierarchy, tactile precision, and purposeful energy—not generic AI wellness, a sterile hospital portal, a discount marketplace, an aggressive lead funnel, or a luxury-clinic advertisement. Include editable text, explicit safe areas, Bulgarian copy, alt text, and an `Ориентир, не диагноза.` sign-off where relevant.

## 14. Included starter templates

The editable SVG starter library lives in `frontend/public/social-kit/templates/`:

1. Educational portrait post — 1080 × 1350.
2. Carousel cover — 1080 × 1350.
3. Parent guide — 1080 × 1350.
4. Clinic-matching transparency — 1080 × 1350.
5. Proof card — 1080 × 1080.
6. Story question — 1080 × 1920.
7. Reel cover — 1080 × 1920.
8. Care Pass explainer — 1080 × 1350.
9. Hyperreal Fact — 1080 × 1350, with an original AI-generated background and verified source treatment.

Open `frontend/public/social-kit/index.html` for a visual overview and download the SVG masters directly. The Hyperreal Fact background master lives in `frontend/public/social-kit/assets/` and remains separate from the editable typography overlay.
