/**
 * JSON-LD helpers for the public `/kliniki` directory.
 *
 * Strict guardrails (per Feb 2026 product brief):
 *   - NEVER emit `aggregateRating` unless BOTH `reviewRating` and
 *     `reviewCount` are present from a real source on the clinic doc.
 *   - NEVER claim "best clinic" / "top clinic" / medical superiority.
 *   - NEVER imply that partner tier == clinical quality.
 *   - NEVER include sponsored clinics in organic `ItemList`.
 *   - Output only what we actually have — omit any field we can't safely
 *     vouch for.
 */

import type { PublicClinic } from '@/lib/publicClinics'
import {
  cityDisplay, treatmentLabel, clinicProfileHref,
} from '@/lib/publicClinics'

const SITE_ORIGIN = 'https://zubite.bg'

/* ─────────────────────────────────────────────────────────────
   Clinic profile — Dentist (preferred) or LocalBusiness fallback
   ───────────────────────────────────────────────────────────── */
export function buildClinicProfileJsonLd(c: PublicClinic): Record<string, unknown> {
  const url = `${SITE_ORIGIN}${clinicProfileHref(c)}`
  const services = c.treatments.map(treatmentLabel).filter(Boolean)
  const out: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    '@id': url,
    name: c.name,
    url,
  }
  if (c.hero_image_url) out.image = c.hero_image_url
  if (c.short_description) out.description = c.short_description
  if (c.city_name || c.area) {
    out.address = {
      '@type': 'PostalAddress',
      addressCountry: 'BG',
      ...(c.city_name ? { addressLocality: c.city_name } : {}),
      ...(c.area ? { addressRegion: c.area } : {}),
    }
  }
  if (services.length > 0) {
    out.makesOffer = services.map((s) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: s },
    }))
    out.availableService = services.map((s) => ({
      '@type': 'MedicalProcedure',
      name: s,
    }))
  }
  if (c.online_consultation) {
    out.potentialAction = {
      '@type': 'CommunicateAction',
      name: 'Онлайн консултация',
    }
  }
  // Only when BOTH rating AND count are present from a real review source.
  // The PublicClinic shape already enforces this constraint at the API
  // layer (`review` is null otherwise), but we double-check defensively.
  if (c.review && typeof c.review.rating === 'number' && c.review.count > 0) {
    out.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: c.review.rating,
      reviewCount: c.review.count,
    }
  }
  return out
}

/* ─────────────────────────────────────────────────────────────
   Listing page — CollectionPage + ItemList (organic, visible only)
   ───────────────────────────────────────────────────────────── */
export function buildClinicListingJsonLd(opts: {
  clinics: PublicClinic[]
  city?: string | null
  specialty?: string | null
  canonicalPath: string
  pageName: string
}): Record<string, unknown>[] {
  const { clinics, canonicalPath, pageName } = opts
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`
  // Defensive: if a future sponsored field gets added on the payload, we
  // exclude those entries from the organic ItemList per spec.
  const organicOnly = clinics.filter(
    (c) => !(c as unknown as { sponsored?: boolean }).sponsored
  )
  const collection: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: pageName,
    inLanguage: 'bg',
    isPartOf: { '@type': 'WebSite', name: 'Zubite.bg', url: SITE_ORIGIN },
  }
  if (organicOnly.length > 0) {
    collection.mainEntity = {
      '@type': 'ItemList',
      numberOfItems: organicOnly.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: organicOnly.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_ORIGIN}${clinicProfileHref(c)}`,
        item: {
          '@type': 'Dentist',
          name: c.name,
          url: `${SITE_ORIGIN}${clinicProfileHref(c)}`,
          ...(c.hero_image_url ? { image: c.hero_image_url } : {}),
          ...(c.city_name
            ? {
                address: {
                  '@type': 'PostalAddress',
                  addressCountry: 'BG',
                  addressLocality: c.city_name,
                  ...(c.area ? { addressRegion: c.area } : {}),
                },
              }
            : {}),
        },
      })),
    }
  }
  return [collection]
}

/* ─────────────────────────────────────────────────────────────
   Breadcrumbs — works for any depth of the /kliniki tree
   ───────────────────────────────────────────────────────────── */
export function buildClinicBreadcrumbJsonLd(opts: {
  city?: string | null
  specialty?: string | null
  clinic?: PublicClinic | null
}): Record<string, unknown> {
  const items: { name: string; href: string }[] = [
    { name: 'Клиники', href: '/kliniki' },
  ]
  if (opts.city) {
    items.push({ name: cityDisplay(opts.city), href: `/kliniki/${opts.city}` })
  }
  if (opts.city && opts.specialty) {
    // Breadcrumb is intentionally terse — "Invisalign", not "Invisalign клиники",
    // so it reads naturally inside `Клиники > София > Invisalign`.
    items.push({
      name: treatmentLabel(opts.specialty),
      href: `/kliniki/${opts.city}/${opts.specialty}`,
    })
  }
  if (opts.clinic && opts.city && opts.specialty) {
    items.push({
      name: opts.clinic.name,
      href: `/kliniki/${opts.city}/${opts.specialty}/${opts.clinic.slug || opts.clinic.id}`,
    })
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_ORIGIN}${it.href}`,
    })),
  }
}

/* ─────────────────────────────────────────────────────────────
   Safe serializer — escapes `</script>` and U+2028 / U+2029.
   ───────────────────────────────────────────────────────────── */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
