// JSON-LD Schema helpers for SEO

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Zubite.bg',
    url: 'https://zubite.bg',
    logo: 'https://zubite.bg/logo.png',
    description: 'Навигатор за дентални решения в България',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BG',
      addressLocality: 'София'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@zubite.bg'
    },
    sameAs: [
      'https://facebook.com/zubitebg',
      'https://instagram.com/zubitebg'
    ]
  };
}

export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Zubite.bg',
    url: 'https://zubite.bg',
    description: 'Навигатор за дентални решения в България - ортодонтия, импланти, естетична стоматология',
    inLanguage: 'bg',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://zubite.bg/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function generateFAQSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a
      }
    }))
  };
}

export function generateMedicalServiceSchema(
  name: string,
  description: string,
  url: string,
  areaServed?: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: name,
    description: description,
    url: url,
    ...(areaServed && {
      areaServed: {
        '@type': 'City',
        name: areaServed
      }
    }),
    medicalSpecialty: 'Dentistry',
    priceRange: '$$'
  };
}

export function generateLocalBusinessSchema(
  city: string,
  cityNameBg: string,
  treatment: string,
  treatmentNameBg: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: `${treatmentNameBg} в ${cityNameBg} | Zubite.bg`,
    description: `Намерете най-добрите клиники за ${treatmentNameBg.toLowerCase()} в ${cityNameBg}`,
    url: `https://zubite.bg/${city}/${treatment}`,
    areaServed: {
      '@type': 'City',
      name: cityNameBg,
      containedInPlace: {
        '@type': 'Country',
        name: 'България'
      }
    },
    medicalSpecialty: 'Dentistry'
  };
}
