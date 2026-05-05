'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { trackArticleEvent } from '@/lib/articleAnalytics'

type Event = 'article_cta_click' | 'related_article_click' | 'external_source_click'

interface Props {
  href: string
  event: Event
  slug: string
  title: string
  cta?: string
  external?: boolean
  className?: string
  children: ReactNode
  testId?: string
}

/**
 * Tracked link wrapper. Fires the matching article event then performs
 * default navigation. Internal links use Next's <Link>; external links use
 * a plain <a> with target="_blank".
 */
export function TrackedLink({
  href, event, slug, title, cta, external, className, children, testId,
}: Props) {
  const onClick = () => {
    trackArticleEvent(event, { slug, title, href, cta })
  }
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={onClick}
        className={className}
        data-testid={testId}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={href} onClick={onClick} className={className} data-testid={testId}>
      {children}
    </Link>
  )
}
