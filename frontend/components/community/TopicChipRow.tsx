import Link from 'next/link'
import type { CommunityTopic } from '@/lib/community'

export function TopicChipRow({ topics, active }: { topics: CommunityTopic[]; active?: string }) {
  const base = 'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition'
  const activeCls = 'border-[#0a0a0a] bg-[#0a0a0a] text-white'
  const idleCls = 'border-[#e5e5e5] bg-white text-[#525252] hover:border-[#0a0a0a] hover:text-[#0a0a0a]'
  return (
    <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      <Link href="/community" className={`${base} ${!active ? activeCls : idleCls}`}>Всички</Link>
      {topics.map((t) => (
        <Link
          key={t.slug}
          href={`/community/${t.slug}`}
          className={`${base} ${active === t.slug ? activeCls : idleCls}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
