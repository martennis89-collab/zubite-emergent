# Zubite.bg — Visual prompt pack

Този файл е за отделното генериране на изображения. Промптовете създават само фон/кадър — без текст. Типографията, източникът и AI обозначението се добавят след това в Zubite layout системата.

## Общ master prompt

> Original hyperrealistic scientific-editorial health photograph for Zubite.bg, Bulgaria’s independent dental guidance platform. Calm, trustworthy, clear, human and premium; alive through composition and real texture, not through synthetic glow. Warm-neutral controlled light, authentic anatomy and natural people, restrained Zubite Trust Emerald and Signal Orange reflections. Independent public-health magazine aesthetic, never a clinic advertisement. No text, letters, labels, logos, watermark, clinic branding, dentist, branded product, perfect-smile glamour, fear, blood, gore, severe pathology, fake diagnostic scan, generic cyan hospital styling, glossy plastic CGI, or sensational microscopic callouts.

### Feed fact framing

- Canvas: vertical 4:5.
- Subject: upper 55–62%.
- Lower 38–45%: dark, quiet, low-detail negative space for headline.
- Export clean image only; no gradient slab or typography inside the generation.

### Story/Reel framing

- Canvas: vertical 9:16.
- Keep faces and the main signal inside the central 1080×1350 crop.
- Leave caption-safe space above and below.

## 01 · Устата и цялото тяло

Output: `01-whole-body-4x5.png`

> Calm three-quarter portrait of a real-looking Bulgarian/European adult from shoulders up, natural skin texture, honest neutral expression, natural teeth only subtly visible. Refined double-exposure concept: a barely visible translucent upper-torso silhouette and a few thin restrained emerald connective lines flowing from the mouth toward the body. Suggest connection without implying diagnosis. Warm-neutral studio daylight. Follow the Feed fact framing and master constraints.

## 02 · Кървящи венци

Output: `02-bleeding-gums-4x5.png`

> Medically plausible macro view of natural adult front teeth and gum line. Healthy-to-mildly inflamed gingival margin with subtle localized redness and slight puffiness, but absolutely no visible blood, wounds, instruments, decay spectacle, or frightening pathology. A faint out-of-focus human torso silhouette may sit far in the background to suggest general-health context without implying causation. Follow the Feed fact framing and master constraints.

## 03 · Венци и бременност

Output: `03-pregnancy-gums-4x5.png`

> Respectful side-profile portrait of a visibly pregnant adult woman, one hand resting naturally on her belly, relaxed and confident rather than idealized; authentic Bulgarian/European appearance, everyday premium clothing in warm neutrals, natural skin texture, soft window daylight. Add a subtle translucent circular crop suggesting a clean gum line, medically plausible and discreet, not a diagnostic callout. Leave generous Warm Paper-toned negative space on the left. No baby imagery, ultrasound, fear or inflamed tissue.

## 04 · Диабет и венци

Output: `04-diabetes-gums-4x5.png`

> Calm, medically plausible macro of natural adult front teeth and gum line, with a restrained visual split from healthy pink gingiva to subtly inflamed red gingiva. In the background, integrate an elegant abstract glucose motif made of a few translucent geometric molecules and a soft dotted measurement curve, clearly conceptual rather than a diagnostic device. Leave clean negative space in the upper-left. No needles, glucometer, syringes or dramatic medical imagery.

## 05 · Венци и сърце

Output: `05-gums-heart-4x5.png`

> Natural adult gum line in realistic macro at upper-left, mildly inflamed but with no blood or severe disease. In the upper-right/background, include a restrained anatomically plausible human heart rendered as a subtle translucent editorial model. Connect mouth and heart with one thin emerald line that suggests a research association — not a direct causal arrow. Deep warm neutral background. Follow the Feed fact framing. No artery spectacle, plaque visualization, blood, surgery or ECG.

## 06 · Постоянен лош дъх

Output: `06-bad-breath-4x5.png`

> Real-looking adult in calm three-quarter close-up, natural lips slightly parted, authentic skin texture, neutral thoughtful expression — not embarrassed or ashamed. A few almost invisible translucent particles drift gently away from the mouth as a sparse editorial metaphor, never dirty or smelly. Follow the Feed fact framing. No green fumes, disgust, hand covering mouth, stains or decay.

## 07 · Сухота и лекарства

Output: `07-dry-mouth-medicines-4x5.png`

> Natural adult lips in gentle close-up with realistic texture and a single clear saliva droplet on the lower lip, beside a discreet unbranded medicine blister pack and plain matte medication box with no writing. The person looks comfortable, not ill. Follow the Feed fact framing. No drug names, pills spilling, syringe, drooling or cracked bleeding lips.

## 08 · Reel: бруксизъм

Generate three 9:16 frames with the same man: short dark hair, light stubble, charcoal sleep T-shirt, ordinary warm-neutral bedroom.

### Scene A — sleep

Output: `08a-bruxism-sleep-9x16.png`

> The man sleeps on his side. Face and jaw visible in profile, expression mostly relaxed with only subtle masseter tension. Warm bedside practical light and deep neutral shadows. No teeth visible, no exaggerated grinding.

### Scene B — jaw tension

Output: `08b-bruxism-jaw-9x16.png`

> Tighter side-profile close-up of the same sleeping man. Lips closed, jaw gently but noticeably tense. Add only a very subtle emerald contour over the masseter area to guide attention, not a scan or anatomical diagram.

### Scene C — morning signal

Output: `08c-bruxism-morning-9x16.png`

> Early morning with soft window light. The same man sits on the edge of the bed, awake and calm, gently touching one side of his jaw. Expression suggests mild jaw fatigue or a dull morning headache, not severe pain.

## 09 · Рефлукс и емайл

Output: `09-reflux-enamel-4x5.png`

> Combine two calm, medically plausible elements in the upper 60%: a refined translucent side-profile cutaway showing stomach, esophagus and mouth in correct relative position, plus a macro of natural back teeth with subtle smoothing and thinning of enamel. Use one restrained warm line traveling upward through the esophagus to indicate reflux. Follow the Feed fact framing. No acid splash, flames, extreme erosion, open surgery or frightening anatomy.

## 10 · Четири сигнала в устата

These images are used as four separate carousel tiles.

### A — постоянна сухота

Output: `10a-dry-mouth-square.png`

Reuse the visual direction from post 07, cropped to a calm square detail of natural lips and a discreet saliva cue. Remove or minimize the medicine pack if it competes with the tile label.

### B — необичайно петно

Output: `10b-mouth-spot-square.png`

> Hyperrealistic square oral-health macro showing the inside of an adult cheek with one small, clearly visible but non-alarming pale-red spot on otherwise healthy oral mucosa. Medically plausible neutral anatomy, gentle light, plenty of clean surrounding tissue. No ulcer crater, blood, severe lesion or cancer implication.

### C — упорита раничка

Output: `10c-mouth-ulcer-square.png`

> Hyperrealistic square macro of the inner lower lip with one small common-looking shallow mouth ulcer, pale center with a narrow red rim, surrounded by otherwise healthy mucosa. Calm and non-alarming. No multiple lesions, blood, pus, severe pathology or diagnosis implication.

### D — кървящи венци

Output: `10d-bleeding-gums-square.png`

Reuse the visual direction from post 02, cropped square. Show mild inflammation with no visible blood; the copy explains the signal.

## Acceptance checklist

- The image does not contain generated text, labels, UI, watermark or another publisher’s composition.
- Anatomy looks plausible at normal viewing size.
- The image does not imply diagnosis or direct causation.
- No clinic, product or dentist branding appears.
- The intended text area is visually quiet.
- Real people are disclosed as AI-generated representative visualizations.
- The source supports the written claim; the image itself is never treated as evidence.
