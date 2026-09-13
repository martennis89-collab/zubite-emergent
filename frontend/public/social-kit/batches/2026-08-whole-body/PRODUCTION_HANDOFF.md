# Zubite.bg — Production handoff

## Batch

- Campaign: `Оралното здраве и цялото тяло`
- Dates: 4–13 August 2026
- Timezone: Europe/Sofia
- Suggested scheduling time: 19:30
- Mix: 6 Hyperreal Facts, 3 seven-frame carousels, 1 Reel
- Language: Bulgarian

The suggested time is a production default, not data from the original workbook. Adjust it after the first month of reach and save/share data.

## Ready non-image files

- `schedule.csv` — scheduling rows and platform mapping.
- `manifest.json` — structured production manifest.
- `captions.md` — all ten final captions.
- `posts/*/caption.txt` — one caption per publication.
- `posts/*/alt.txt` — one accessibility description per publication.
- `posts/08-bruxism-stress-headache/captions.srt` — Reel subtitles.
- `posts/08-bruxism-stress-headache/shot-list.md` — Reel sequence.
- `VISUAL_PROMPT_PACK.md` — prompts for your separate image workflow.
- `SOURCE_NOTES.md` — claim boundaries and required qualifiers.

## Image replacement workflow

1. Generate the source images separately using `VISUAL_PROMPT_PACK.md`.
2. Keep the filenames listed in that file, or map them to the matching post directory.
3. Add typography after generation; never ask the image model to render Bulgarian copy.
4. Put a short source on every fact frame and the full URLs in the caption.
5. Add `AI-генерирана представителна визуализация` wherever a generated person, anatomy or symptom image is used.
6. Review medical plausibility at normal feed size before export.

## Export checklist

### Hyperreal Fact

- Feed: 1080×1350 PNG or high-quality JPG.
- Story: 1080×1920 PNG or JPG.
- One fact only; maximum five display lines.
- Smooth image-to-dark gradient, not an opaque text slab.
- Source, AI disclosure and Zubite wordmark remain readable.

### Carousel

- Seven 1080×1350 frames in numbered order.
- Cover promise remains legible in the Instagram grid crop.
- Each interior frame communicates one distinction.
- Final frame includes the CTA and `Ориентир, не диагноза.`

### Reel

- 1080×1920 H.264.
- Static first frame carries the topic without sound.
- Burned-in Bulgarian text plus the supplied SRT file.
- No flashing or fast zoom; transitions 300–600 ms.
- Keep critical text out of the top 180 px and bottom 260 px.

## Publication QA

- Caption and artwork express the same level of certainty.
- Full source URLs open and support the specific claim.
- No claim is strengthened from association to causation.
- No clinic, treatment brand or product appears as Zubite’s owner or preferred provider.
- Alt text describes both the visual and the key written message.
- The CTA from the workbook is retained.
- The correct date, platforms and frame order are selected before scheduling.
