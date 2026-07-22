import Link from 'next/link'
import { MessageCircle, ThumbsUp } from 'lucide-react'
import type { QuestionListItem } from '@/lib/community'
import { timeAgo, initial } from '@/lib/communityDisplay'

export function QuestionCard({
  q, onUpvote,
}: {
  q: QuestionListItem
  onUpvote: (questionId: string) => void
}) {
  return (
    <article className="taste-community-question-card group">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="taste-community-question-topic">
          {q.topic_label}
        </span>
        {(q.published_at || q.created_at) && (
          <span className="text-xs text-[#6b6b6b]">{timeAgo(q.published_at || q.created_at)}</span>
        )}
      </div>

      <Link href={`/community/v/${q.slug}`} className="block">
        <h3 className="text-base font-bold leading-snug text-[#0a0a0a] group-hover:text-[#007956] sm:text-lg">
          {q.title}
        </h3>
        {q.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm text-[#525252]">{q.excerpt}</p>
        )}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d0fae5] text-xs font-bold text-[#007956]">
          {initial(q.asker_display)}
        </div>
        <span className="truncate text-sm text-[#525252]">{q.asker_display}</span>

        <div className="ml-auto flex items-center gap-3 text-sm text-[#6b6b6b]">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> {q.answer_count}
          </span>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onUpvote(q.id) }}
            aria-label={`${q.has_upvoted ? 'Премахни гласа си за' : 'Гласувай за'}: ${q.title}`}
            aria-pressed={q.has_upvoted}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition ${
              q.has_upvoted ? 'bg-[#d0fae5] text-[#007956]' : 'hover:bg-[#f5f4f2]'
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> {q.upvotes > 0 ? q.upvotes : ''}
          </button>
        </div>
      </div>
    </article>
  )
}
