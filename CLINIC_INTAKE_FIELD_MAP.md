# Zubite clinic intake field map

Audited against the real admin flow on 2026-07-24 using the test clinic
`INTAKE AUDIT — Verified & Growth 2026-07-24`.

## Intake rules

- A public application records **package interest**; it never grants a package,
  entitlement, billing state, verification, ranking, or publication.
- Approved applications start as `verified_profile` + draft. An admin makes the
  commercial/package decision.
- Clinic-authored profile content can be collected before approval and stored as
  draft. Public visibility remains package-gated.
- Ratings, review counts, provider verification, profile publication, billing,
  entitlements, add-ons and founding/private terms are admin-owned.
- Patient case assets are not published from the public form. Intake records a
  summary, a secure/share link and whether documented consent exists; structured
  cases are reviewed after approval.

## Field-by-field mapping

| Admin field/group | Verified | Growth | Intake | Ownership / handling |
|---|---:|---:|---|---|
| Clinic name, city, address, Sofia district, website | Yes | Yes | Yes | Clinic-supplied |
| Contact person, email, phone | Yes | Yes | Yes | Clinic-supplied; email also becomes notification email after approval |
| Base package | Yes | Yes | Interest only | Admin grants package |
| Founding status, billing status/cadence, monthly/annual/onboarding prices, dates, private terms | Commercial | Commercial | No | Admin-only |
| Entitlement overrides | Derived | Derived | No | Admin-only; derived from package/add-ons |
| Add-ons and add-on pricing/status | Optional | Optional | No | Admin/sales-only |
| Profile status (draft/published) | Yes | Yes | No | Admin editorial decision |
| Short description | Yes | Yes | Yes | Draft profile |
| Founded year | No | Yes | Growth/unsure | Draft profile |
| Patient introduction | No | Yes | Growth/unsure | Draft profile |
| Treatments supported | Yes | Yes | Yes | Up to 12 supplied; public treatment sections remain package-limited |
| Treatment focus | Up to 3 sections | Up to 8 sections | Yes | Draft profile |
| Completed-case totals by treatment + as-of year | No | Yes | Growth/unsure | Aggregate clinic declaration, visibly attributed |
| Google/Facebook/Superdoc URLs | Yes | Yes | Yes | Clinic supplies URLs |
| Google/Facebook/Superdoc rating and review count | Yes | Yes | No | Admin checks external source and records values |
| External review last-checked / verified-by-admin | Yes | Yes | No | Admin audit metadata |
| Hero image | No | Yes | Growth/unsure link | Reviewed and stored as draft |
| Clinic video | No | Yes | Growth/unsure link | Reviewed and stored as draft |
| Doctor video | No | Yes | Growth/unsure link | Reviewed and stored as draft |
| Doctor spotlight image | No | Yes | Growth/unsure link | Reviewed and stored as draft |
| Team image | No | Yes | Growth/unsure link | Reviewed and stored as draft |
| Environment/equipment image | No | Yes | Growth/unsure link | Reviewed and stored as draft |
| Doctor kind (owner/lead), name, role, specialties, biography | No | Yes | Growth/unsure | Draft profile |
| Assessment approach: breathing/airway, swallowing, speech, posture, asymmetry, functional orthodontics | No | Yes | Growth/unsure | Approach attribute only; never a quality/ranking signal |
| Team note | No | Yes | Growth/unsure | Draft profile |
| Clinic story | No | Yes | Growth/unsure | Draft profile |
| Environment/equipment description | No | Yes | Growth/unsure | Draft profile |
| Consultation process | No | Yes | Growth/unsure | Draft profile |
| Aligner brands used | Yes | Yes | Conditional when aligners are offered | Saved unverified |
| Claimed official-provider relationship | Yes | Yes | Yes | Saved as `pending_verification`; never displayed as official until admin verification |
| Provider verification status and public visibility | Yes | Yes | No | Admin-only |
| Case library title/category/treatment/duration/price/materials/specifics/status | No | When suitable | Summary in intake | Structured after approval |
| Case before/after images | No | When suitable | Secure/share link only | Reviewed after approval; max 3+3 per case |
| Patient consent confirmation | No | Required per published case | Availability question | Publication still requires case-level admin confirmation |
| Average response time | Operational | Operational | Yes | Used as a declared operational signal |
| Online booking preference | CTA-only | Included | Yes | Preference only; never enables feature |
| Viber/chat preference + Viber phone | Phone CTA | Included | Yes | Preference only; never enables feature |

## Entitlement matrix

| Entitlement | Verified Profile | Growth Partner |
|---|---|---|
| Structured profile | Included | Included |
| Enhanced profile | — | Included |
| Structured trust signals | Included | Included |
| Treatment map | Limited | Full |
| Treatment sections | 3 | 8 |
| Patient Journey eligibility | — | Included |
| Quiz/result-flow eligibility | — | Included |
| Patient-reported context | — | When available |
| Source/path attribution | — | When available |
| Basic profile performance view | Included | Included |
| Analytics dashboard | — | Included |
| Monthly mini-report | — | Included |
| Quarterly profile optimization | — | Included |
| Quarterly spotlight/expert quote | — | Included |
| Expert Q&A/interview every six months | — | Included |
| Case library | — | When suitable |
| Care Pass access | — | Included |
| Educational event access | — | Included |
| Partner brand/supplier offers | — | Included |
| Selected beta access | — | Included |
| Annual category insight snapshot | — | Included |
| Booking calendar | — | Included |
| Direct patient chat channels | — | Included |

## Approval projection

When an application is approved:

1. Contact, location and treatments populate the clinic record.
2. Clinic-authored content populates a **draft** `clinic_profile`.
3. Claimed official-provider brands are stored as `pending_verification`.
4. Package interest and operational preferences stay in `onboarding_intake`.
5. The new clinic starts as Verified; Growth, billing, publication, verified
   ratings and entitlements require explicit admin action.

## Private intake workflow

The admin page `/admin/clinic-applications` can create a private link for a
specific clinic:

1. Admin enters the clinic name, the clinic's email and the expiry period.
2. The server generates a high-entropy token and stores only its SHA-256 hash.
3. The full `/clinic-intake/{token}` link is shown once for copying.
4. With "Изпрати линка на посочения имейл" ticked, the same request emails the
   link to that address (`send_email: true`). A delivery failure is reported
   back but never fails the request — the admin still holds the token.
5. While the created link is still on screen, `POST
   /admin/clinic-intake-invites/{id}/send` re-sends it, optionally to a
   corrected address. The caller must supply the raw token; the server matches
   it against the invite's hash and refuses anything else. The link in the
   email is built from `PRODUCTION_URL` server-side, never from the request.
6. The page is `noindex`, `nofollow`, `noarchive`, `nosnippet` and `no-store`.
7. The token is single-use and can be revoked before submission.
8. On submission, the invite becomes `submitted` and the complete form appears
   in the existing clinic-applications table with source `private_intake`.
9. Creating, emailing, revoking and submitting a link each create an admin
   audit event (`clinic_intake_invite.created` / `.emailed` / `.revoked` /
   `.submitted`).

Emailing requires `RESEND_API_KEY`. Without it the send is skipped and reported
as failed; link creation is unaffected.

The invitation is sent from `CLINIC_ONBOARDING_SENDER_EMAIL`
(`onboarding@zubite.bg`), which covers exactly two emails — this invitation and
the approval email carrying a new clinic's first credentials. Everything else,
including clinic password resets, chat and booking notifications and all
patient-facing mail, stays on `SENDER_EMAIL` (`hello@zubite.bg`). Unset, the
onboarding sender falls back to `SENDER_EMAIL`. Both addresses are on the same
Resend-verified domain, so changing either needs no new verification.
