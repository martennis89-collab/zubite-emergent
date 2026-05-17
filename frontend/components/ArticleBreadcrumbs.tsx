'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * Article-style breadcrumbs: Начало > Категория > Заглавие.
 *
 * Renders both the visible nav and a BreadcrumbList JSON-LD script for SEO.
 */
export function ArticleBreadcrumbs({
  items,
  baseUrl = 'https://zubite.bg',
}: {
  items: BreadcrumbItem[]
  baseUrl?: string
}) {
  if (items.length === 0) return null

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: it.href.startsWith('http') ? it.href : `${baseUrl}${it.href}` } : {}),
    })),
  }

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-sm flex items-center gap-1.5 flex-wrap text-slate-500"
        data-testid="article-breadcrumbs"
      >
        {items.map((it, i) => {
          const isLast = i === items.length - 1
          return (
            <span key={`${it.label}-${i}`} className="flex items-center gap-1.5">
              {it.href && !isLast ? (
                <Link
                  href={it.href}
                  className="hover:text-teal-600 transition-colors"
                  data-testid={`breadcrumb-${i}`}
                >
                  {it.label}
                </Link>
              ) : (
                <span className="text-slate-700 font-medium" data-testid={`breadcrumb-${i}`}>
                  {it.label}
                </span>
              )}
              {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />}
            </span>
          )
        })}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </>
  )
}
