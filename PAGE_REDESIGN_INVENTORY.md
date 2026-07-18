# Zubite.bg page redesign inventory

Source of truth: `frontend/app/**/page.tsx`, verified against the latest Next.js route manifest.

- **79 page templates** are currently present and redesigned.
- **Migration status: complete.** Every route family below now inherits the TasteSkill design system through the shared route scope, with dedicated treatments for the quiz, results, recommendations, clinic directory/profile, clinic portal, and admin portal.
- Dynamic routes are listed once as templates because their concrete IDs, clinic slugs, and blog slugs come from live data.
- The 15 statically generated city/treatment URLs and 4 symptom URLs are expanded below.
- API routes, icons, the sitemap, and the framework 404 are intentionally excluded because they are not website pages.

## Redesign order

| Order | Surface | Route | Status |
| --- | --- | --- | --- |
| 0 | Homepage | `/` | Complete |
| 1 | Main diagnostic quiz | `/quiz` | Complete |
| 2 | Personalized result / unlock | `/results/[leadId]` | Complete |
| 3 | Three-clinic recommendations | `/results/[leadId]/clinics` | Complete |
| 4 | Recommended clinic detail | `/results/[leadId]/clinics/[clinicId]` | Complete |
| 5 | Public clinics landing/listing | `/kliniki` | Complete |
| 6 | Clinic city, specialty, and profile pages | `/kliniki/[city]`, `/kliniki/[city]/[specialty]`, `/kliniki/[city]/[specialty]/[clinicSlug]` | Complete |
| 7 | Everything else below | — | Complete |

## Patient funnel and transactional pages

| Route | Purpose | Status |
| --- | --- | --- |
| `/quiz` | Main diagnostic quiz | Complete |
| `/quiz/success` | Manual-recommendation confirmation | Complete |
| `/results/[leadId]` | Personalized result and contact unlock | Complete |
| `/results/[leadId]/clinics` | Three recommended clinics | Complete |
| `/results/[leadId]/clinics/[clinicId]` | Recommended clinic detail | Complete |
| `/assessment` | Assessment landing | Complete |
| `/assessment/quiz` | Legacy assessment quiz | Complete |
| `/booking/[clinicId]` | Clinic booking | Complete |
| `/review/clinic/[clinicId]` | Patient review form | Complete |
| `/verify/[token]` | Verification link landing | Complete |
| `/patient/orientir/[accessToken]` | Patient orientation access | Complete |
| `/[city]/[treatment]/quiz` | Legacy localized quiz family | Complete |

## Public clinic directory

| Route | Purpose | Status |
| --- | --- | --- |
| `/kliniki` | All-clinics landing and listing | Complete |
| `/kliniki/[city]` | City-filtered clinic listing | Complete |
| `/kliniki/[city]/[specialty]` | City + specialty clinic listing | Complete |
| `/kliniki/[city]/[specialty]/[clinicSlug]` | Public clinic profile | Complete |

Known city slugs are `sofia`, `plovdiv`, `varna`, `burgas`, `haskovo`, `ruse`, and `stara_zagora`. Known specialty URL aliases include `invisalign`, `aligners`, `implants`, `full_mouth`, `cosmetic`, `ortodontia`, `ortodontiya`, `orthodontics`, `implantologia`, `dentalni-implanti`, `estetichna-stomatologia`, `detska-stomatologia`, and `pediatric`. Concrete clinic profile URLs are data-driven.

## Treatment, symptom, and education pages

| Route | Purpose | Status |
| --- | --- | --- |
| `/treatments` | Treatments hub | Complete |
| `/orthodontics` | Orthodontics landing | Complete |
| `/orthodontics/quiz` | Orthodontics quiz | Complete |
| `/implants` | Implants landing | Complete |
| `/implants/quiz` | Implants quiz | Complete |
| `/cosmetic-dentistry` | Cosmetic dentistry landing | Complete |
| `/cosmetic-dentistry/quiz` | Cosmetic dentistry quiz | Complete |
| `/sleep-airway` | Sleep and airway landing | Complete |
| `/sleep-airway/quiz` | Sleep and airway quiz | Complete |
| `/tmj` | TMJ landing | Complete |
| `/tmj/quiz` | TMJ quiz | Complete |
| `/breketi` | Braces guide | Complete |
| `/care-pass` | Care Pass | Complete |
| `/aligners-comparison` | Aligner comparison | Complete |
| `/aligners-vs-braces` | Aligners vs. braces | Complete |
| `/crooked-teeth` | Crooked teeth guide | Complete |
| `/implant-price` | Implant price guide | Complete |
| `/invisalign-bulgaria` | Invisalign in Bulgaria guide | Complete |
| `/invisalign-price` | Invisalign price guide | Complete |
| `/what-is-invisalign` | Invisalign explainer | Complete |
| `/symptoms` | Symptoms hub | Complete |
| `/symptoms/[symptomSlug]` | Generated symptom-guide family | Complete |
| `/symptoms/toothache` | Toothache guide | Complete |
| `/symptoms/sensitivity` | Tooth sensitivity guide | Complete |
| `/symptoms/bleeding-gums` | Bleeding gums guide | Complete |
| `/symptoms/aesthetic` | Aesthetic concerns guide | Complete |
| `/[city]/[treatment]` | Generated local treatment landing family | Complete |
| `/standart-za-kliniki` | Zubite clinic standard | Complete |

All 15 concrete local-treatment URLs:

| City | Route | Status |
| --- | --- | --- |
| Sofia | `/sofia/orthodontics` | Complete |
| Sofia | `/sofia/implants` | Complete |
| Sofia | `/sofia/cosmetic-dentistry` | Complete |
| Sofia | `/sofia/sleep-airway` | Complete |
| Sofia | `/sofia/tmj` | Complete |
| Plovdiv | `/plovdiv/orthodontics` | Complete |
| Plovdiv | `/plovdiv/implants` | Complete |
| Plovdiv | `/plovdiv/cosmetic-dentistry` | Complete |
| Plovdiv | `/plovdiv/sleep-airway` | Complete |
| Plovdiv | `/plovdiv/tmj` | Complete |
| Varna | `/varna/orthodontics` | Complete |
| Varna | `/varna/implants` | Complete |
| Varna | `/varna/cosmetic-dentistry` | Complete |
| Varna | `/varna/sleep-airway` | Complete |
| Varna | `/varna/tmj` | Complete |

## Editorial, company, and legal pages

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Homepage | Complete |
| `/blog` | Blog index | Complete |
| `/blog/[slug]` | Blog article (data-driven) | Complete |
| `/contact` | Contact | Complete |
| `/za-kliniki` | For clinics / partner acquisition | Complete |
| `/clinic` | Clinic sign-in / entry | Complete |
| `/privacy` | Privacy policy | Complete |
| `/terms` | Terms | Complete |
| `/cookies` | Cookie policy | Complete |
| `/care-pass` | Care Pass public program page (also tracked with treatment/education content) | Complete |

`/care-pass` is one route; it appears in two planning contexts but counts once in the 79-template total.

## Clinic portal pages

| Route | Purpose | Status |
| --- | --- | --- |
| `/clinic` | Clinic portal entry | Complete |
| `/clinic/dashboard` | Clinic dashboard | Complete |
| `/clinic/dashboard/availability` | Availability | Complete |
| `/clinic/dashboard/bookings` | Bookings | Complete |
| `/clinic/dashboard/calendar` | Calendar | Complete |
| `/clinic/dashboard/chats` | Patient chats | Complete |
| `/clinic/dashboard/online-orientation` | Online orientation | Complete |
| `/clinic/dashboard/performance` | Performance | Complete |
| `/clinic/dashboard/requests` | Consultation requests | Complete |
| `/clinic/dashboard/requests/[id]` | Consultation request detail | Complete |
| `/clinic/dashboard/reviews` | Reviews | Complete |
| `/clinic/dashboard/settings` | Clinic settings | Complete |

## Admin portal pages

| Route | Purpose | Status |
| --- | --- | --- |
| `/admin` | Admin sign-in / entry | Complete |
| `/admin/dashboard` | Admin dashboard | Complete |
| `/admin/analytics` | Analytics | Complete |
| `/admin/blog` | Blog management | Complete |
| `/admin/blog/new` | New article | Complete |
| `/admin/blog/import` | Article import | Complete |
| `/admin/blog/[id]` | Article editor | Complete |
| `/admin/bookings` | Booking management | Complete |
| `/admin/clinic-applications` | Clinic applications | Complete |
| `/admin/clinics` | Clinic management | Complete |
| `/admin/clinics/[id]` | Clinic detail/editor | Complete |
| `/admin/clinics/[id]/orientation` | Clinic orientation | Complete |
| `/admin/consultation-requests` | Consultation requests | Complete |
| `/admin/consultation-requests/[id]` | Consultation request detail | Complete |
| `/admin/content-automation` | Content automation | Complete |
| `/admin/leads` | Lead management | Complete |
| `/admin/leads/[id]` | Lead detail | Complete |
| `/admin/online-orientation-bookings` | Online orientation bookings | Complete |
| `/admin/reviews` | Review moderation | Complete |

## Definition of done for each redesign

- TasteSkill visual system applied consistently: warm ivory canvas, editorial typography, orange action color, emerald trust accents, precise borders, generous whitespace, and no unnecessary glass/blur effects.
- Existing URLs, SEO metadata, analytics events, API payloads, permissions, scoring, and state transitions preserved.
- Keyboard focus, semantic labels, contrast, reduced-motion behavior, and responsive layout checked.
- TypeScript and production build pass.
- Desktop and mobile interaction smoke tests pass with no console errors or horizontal overflow.
