/**
 * JSON-LD for a single Общност question page — schema.org QAPage.
 *
 * All answers are emitted as `suggestedAnswer` (never `acceptedAnswer`):
 * this build has no "mark as accepted" feature, and claiming one canonical
 * answer per question would misrepresent a page that intentionally shows
 * both expert and peer perspectives side by side.
 */
import type { QuestionDetail } from '@/lib/community'

const SITE_ORIGIN = 'https://zubite.bg'

export function buildQuestionJsonLd(q: QuestionDetail): Record<string, unknown> {
  const url = `${SITE_ORIGIN}/community/v/${q.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      '@id': url,
      name: q.title,
      text: q.body,
      answerCount: q.answers.length,
      ...(q.created_at ? { dateCreated: q.created_at } : {}),
      author: { '@type': 'Person', name: q.asker_display || 'Пациент' },
      suggestedAnswer: q.answers.map((a) => ({
        '@type': 'Answer',
        text: a.body,
        upvoteCount: a.upvotes,
        url,
        ...(a.created_at ? { dateCreated: a.created_at } : {}),
        author: {
          '@type': a.is_expert ? 'Organization' : 'Person',
          name: a.author_display || (a.is_expert ? 'Партньорска клиника' : 'Пациент'),
        },
      })),
    },
  }
}
