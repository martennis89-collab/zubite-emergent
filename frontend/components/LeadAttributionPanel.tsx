'use client'

import { Globe, Tag, Megaphone, FileText, Clock, ChevronRight } from 'lucide-react'

interface ContentPathEntry {
  path: string
  page_type: string
  article_slug?: string | null
  article_title?: string | null
  timestamp: string
}

interface LeadAttribution {
  // First-touch
  first_utm_source?: string | null
  first_utm_medium?: string | null
  first_utm_campaign?: string | null
  first_utm_adset?: string | null
  first_utm_ad?: string | null
  first_utm_campaign_id?: string | null
  first_utm_adset_id?: string | null
  first_utm_ad_id?: string | null
  first_utm_content?: string | null
  first_utm_term?: string | null
  first_fbclid?: string | null
  first_gclid?: string | null
  first_landing_page?: string | null
  first_landing_page_type?: string | null
  first_referrer?: string | null
  first_lead_source_type?: string | null
  first_article_slug?: string | null
  first_article_title?: string | null
  first_seen_at?: string | null
  // Latest-touch
  latest_utm_source?: string | null
  latest_utm_medium?: string | null
  latest_utm_campaign?: string | null
  latest_utm_adset?: string | null
  latest_utm_ad?: string | null
  latest_utm_campaign_id?: string | null
  latest_utm_adset_id?: string | null
  latest_utm_ad_id?: string | null
  latest_utm_content?: string | null
  latest_utm_term?: string | null
  latest_fbclid?: string | null
  latest_gclid?: string | null
  latest_landing_page?: string | null
  latest_landing_page_type?: string | null
  latest_referrer?: string | null
  latest_lead_source_type?: string | null
  latest_article_slug?: string | null
  latest_article_title?: string | null
  last_seen_at?: string | null
  // Conversion
  content_path_before_conversion?: ContentPathEntry[] | null
  pages_viewed_before_conversion?: number | null
  blog_assisted_conversion?: boolean | null
  internal_content_assisted_conversion?: boolean | null
  conversion_page?: string | null
  submitted_at?: string | null
  time_to_submit_seconds?: number | null
}

const SOURCE_TYPE_COLORS: Record<string, string> = {
  paid: 'bg-purple-100 text-purple-700',
  organic_search: 'bg-emerald-100 text-emerald-700',
  organic_social: 'bg-pink-100 text-pink-700',
  referral: 'bg-amber-100 text-amber-700',
  direct: 'bg-slate-100 text-slate-700',
  blog: 'bg-teal-100 text-teal-700',
  internal_content: 'bg-indigo-100 text-indigo-700',
  unknown: 'bg-slate-100 text-slate-500',
}

function Row({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-900 break-all ${mono ? 'font-mono text-xs' : ''}`} title={value}>
        {value}
      </span>
    </div>
  )
}

function SourceTypeBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>
  const cls = SOURCE_TYPE_COLORS[value] || SOURCE_TYPE_COLORS.unknown
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{value}</span>
}

function fmtDate(iso?: string | null) {
  if (!iso) return null
  try { return new Date(iso).toLocaleString('bg-BG') } catch { return iso }
}

function fmtDuration(seconds?: number | null) {
  if (seconds == null) return null
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

export function LeadAttributionPanel({ lead }: { lead: LeadAttribution }) {
  const hasAnyAttr =
    lead.first_lead_source_type || lead.latest_lead_source_type ||
    lead.first_utm_source || lead.latest_utm_source ||
    lead.first_landing_page || lead.latest_landing_page ||
    lead.first_referrer || lead.latest_referrer

  if (!hasAnyAttr && !(lead.content_path_before_conversion && lead.content_path_before_conversion.length)) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="lead-attribution-empty">
        <h3 className="font-semibold text-slate-900 mb-1">Attribution</h3>
        <p className="text-sm text-slate-400">Няма attribution данни (стар лийд).</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="lead-attribution">
      {/* Source type summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-teal-500" />
          Източник
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">First-touch</div>
            <SourceTypeBadge value={lead.first_lead_source_type} />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Latest-touch</div>
            <SourceTypeBadge value={lead.latest_lead_source_type} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {lead.blog_assisted_conversion && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-700 border border-teal-100">
              <FileText className="w-3 h-3" /> Blog-assisted
            </span>
          )}
          {lead.internal_content_assisted_conversion && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
              <FileText className="w-3 h-3" /> Content-assisted
            </span>
          )}
          {lead.time_to_submit_seconds != null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-50 text-slate-700 border border-slate-100">
              <Clock className="w-3 h-3" /> До submit: {fmtDuration(lead.time_to_submit_seconds)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First-touch */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-500" />
            First-touch
          </h4>
          <Row label="UTM Source" value={lead.first_utm_source} />
          <Row label="UTM Medium" value={lead.first_utm_medium} />
          <Row label="UTM Campaign" value={lead.first_utm_campaign} />
          <Row label="UTM Ad Set" value={lead.first_utm_adset} />
          <Row label="UTM Ad" value={lead.first_utm_ad} />
          <Row label="Campaign ID" value={lead.first_utm_campaign_id} mono />
          <Row label="Ad Set ID" value={lead.first_utm_adset_id} mono />
          <Row label="Ad ID" value={lead.first_utm_ad_id} mono />
          <Row label="UTM Content" value={lead.first_utm_content} />
          <Row label="UTM Term" value={lead.first_utm_term} />
          <Row label="fbclid" value={lead.first_fbclid} mono />
          <Row label="gclid" value={lead.first_gclid} mono />
          <Row label="Landing page" value={lead.first_landing_page} mono />
          <Row label="Page type" value={lead.first_landing_page_type} />
          <Row label="Referrer" value={lead.first_referrer} mono />
          <Row label="Article slug" value={lead.first_article_slug} mono />
          <Row label="Article title" value={lead.first_article_title} />
          <Row label="First seen" value={fmtDate(lead.first_seen_at)} />
        </div>

        {/* Latest-touch */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-500" />
            Latest-touch
          </h4>
          <Row label="UTM Source" value={lead.latest_utm_source} />
          <Row label="UTM Medium" value={lead.latest_utm_medium} />
          <Row label="UTM Campaign" value={lead.latest_utm_campaign} />
          <Row label="UTM Ad Set" value={lead.latest_utm_adset} />
          <Row label="UTM Ad" value={lead.latest_utm_ad} />
          <Row label="Campaign ID" value={lead.latest_utm_campaign_id} mono />
          <Row label="Ad Set ID" value={lead.latest_utm_adset_id} mono />
          <Row label="Ad ID" value={lead.latest_utm_ad_id} mono />
          <Row label="UTM Content" value={lead.latest_utm_content} />
          <Row label="UTM Term" value={lead.latest_utm_term} />
          <Row label="fbclid" value={lead.latest_fbclid} mono />
          <Row label="gclid" value={lead.latest_gclid} mono />
          <Row label="Landing page" value={lead.latest_landing_page} mono />
          <Row label="Page type" value={lead.latest_landing_page_type} />
          <Row label="Referrer" value={lead.latest_referrer} mono />
          <Row label="Article slug" value={lead.latest_article_slug} mono />
          <Row label="Article title" value={lead.latest_article_title} />
          <Row label="Last seen" value={fmtDate(lead.last_seen_at)} />
        </div>
      </div>

      {/* Content path */}
      {lead.content_path_before_conversion && lead.content_path_before_conversion.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-500" />
            Content path преди конверсия ({lead.content_path_before_conversion.length})
          </h4>
          <ol className="space-y-2">
            {lead.content_path_before_conversion.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-medium grid place-items-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-700 truncate">{p.path}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{p.page_type}</span>
                  </div>
                  {p.article_title && <div className="text-slate-500 truncate">{p.article_title}</div>}
                  <div className="text-slate-400">{fmtDate(p.timestamp)}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            Conversion page: <span className="font-mono text-slate-700">{lead.conversion_page || '—'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
