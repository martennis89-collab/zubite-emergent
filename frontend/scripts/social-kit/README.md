# Social-kit generator

Merges copy into the editable SVG masters in
`public/social-kit/templates/` to produce finished, on-brand posts.

Two front ends, **one implementation** — both import the same slot-merge
logic from `lib/socialKit/merge.mjs`, so they cannot drift apart.

## 1. Admin UI — `/admin/social-kit`

Pick a template, edit the fields (pre-filled with the master's own copy),
watch the live preview, download SVG or PNG. Best for one-off posts.

Runs **entirely client-side**: the masters and the brand fonts are
already public static assets, so there is no backend call and nothing is
persisted server-side. That is also what makes it work in production —
Vercel's filesystem is read-only and ephemeral, so the CLI's
write-to-disk approach cannot run there, but fetch-merge-download can.

PNG export inlines the four brand fonts as data URIs first. This is
required, not cosmetic: an SVG rasterised through an `<img>` refuses to
load external resources, so without embedding, the export would silently
fall back to Arial.

## 2. CLI — batches

Best for a whole campaign at once, and the only path that writes files
into the repo.

```bash
npm run social-kit -- scripts/social-kit/example-content.json
npm run social-kit -- path/to/content.json --dry   # preview, writes nothing
```

Output goes to `public/social-kit/batches/<batch>/posts/<id>/<out>`.

## Why not Canva / Placid / Bannerbear

Those want the templates rebuilt inside their system, which re-interprets
the design. The masters here already *are* the brand — exact palette,
type scale, leading and layout live in the SVG — so swapping text nodes
in place is both higher fidelity and free. Verified: regenerating a post
with the master's own copy produces a **pixel-identical** render.

The tradeoff is scope. This handles content that fits the existing ten
layouts. Copy that needs a genuinely new layout still needs a new master
(or a general-purpose design tool).

## Content file

See `example-content.json` for a working file that exercises every case.

```jsonc
{
  "batch": "2026-09-my-campaign",
  "defaults": { "disclaimer": "Ориентир, не диагноза.", "cta": "Прочети повече →" },
  "posts": [
    {
      "id": "01-bleeding-gums",
      "template": "01-educational-portrait",   // filename in templates/, no .svg
      "out": "feed.svg",                        // default: feed.svg
      "background": "./art/01.png",             // photo templates only, relative to the content file
      "slots": {
        "headline": ["Кървящите", "венци не са", "„нормални“."],
        "step1.title": "Забележи кога се случва"
      }
    }
  ]
}
```

- **String** value → one-line node.
- **Array** value → multi-line block.
- `defaults` fill only slots a post didn't set; a per-post value always wins.
- Naming a slot a template doesn't have is skipped silently for `defaults`
  (so one shared default can serve every template) but warns when set
  explicitly on a post — that's usually a typo.

## Slots per template

Every editable node carries `data-slot="…"`. Nothing is matched
positionally, so restyling or re-ordering a template never silently
repoints a slot. To list the slots of any template:

```bash
grep -o 'data-slot="[^"]*"' public/social-kit/templates/01-educational-portrait.svg
```

| Template | Slots |
| --- | --- |
| `01-educational-portrait` | eyebrow, headline, body, step1–3.title/.desc, disclaimer, cta |
| `02-carousel-cover` | eyebrow, headline, body, card.label, card.headline, cta, disclaimer |
| `03-parent-guide` | eyebrow, headline, body, listLabel, signal1–3.title/.desc, disclaimer, cta |
| `04-clinic-matching` | eyebrow, headline, kicker, body, col1–3.label/.title/.desc, disclaimer, cta |
| `05-proof-square` | eyebrow, headline, body, card1–4.title/.desc, cta, disclaimer |
| `06-story-question` | eyebrow, headline, body, optionA/B/C, cta, disclaimer, url |
| `07-reel-cover` | eyebrow, headline, body, photoNote, cta, disclaimer |
| `08-care-pass-portrait` | eyebrow, headline, body, note.title/.desc/.badge, disclaimer, cta |
| `09-hyperreal-fact` | background, eyebrow, fact, aiDisclosure, source, sourceNote, url |
| `10-review-poster-a3` / `-a4` | eyebrow, headline2, clinicName, clinicCity, qrLabel, instruction, footer |

## Multi-line behaviour

Arrays regenerate the element's `<tspan>` children reusing the
template's **own** tspan attributes, so the designed leading survives at
any line count, and the final italic Playfair accent line stays on the
last line:

- 3-line template given 4 lines → 4th line inherits the leading, accent moves to it.
- 3-line template given 2 lines → accent lands on line 2.

## Photo-backed templates

`09-hyperreal-fact` carries a background image. The image is generated
**separately** (see a batch's `VISUAL_PROMPT_PACK.md`) and typography is
added after — deliberately, because image models cannot render Bulgarian
copy reliably. Supply `"background": "./art/x.png"` to embed it as a data
URI; omit it and the generator lists the post under *needs artwork* and
leaves the master's placeholder in place.

`07-reel-cover` has a photo *placeholder area* rather than an embedded
image; its `photoNote` slot is the instruction text sitting in that area.

## Not generated

Captions, alt text, schedule rows and source notes are content, not
artwork — keep authoring them as in `batches/2026-08-whole-body/`
(`captions.md`, `posts/*/caption.txt`, `posts/*/alt.txt`, `schedule.csv`).
PNG/JPG export from the finished SVGs stays a design-tool step; see that
batch's `PRODUCTION_HANDOFF.md` for the export checklist and QA gates.
