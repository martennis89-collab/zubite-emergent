'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, ArrowLeft, RefreshCw,
  Users, TrendingUp, Clock, Target, 
  BarChart3, PieChart, Activity, FileText, Trash2,
  Calendar, Info
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

interface Analytics {
  range: { start: string | null; end: string | null; label: string }
  total_starts: number
  total_completions: number
  completion_rate: number
  avg_time_seconds: number
  dropoff_by_question: Record<string, number>
  question_stats: Record<string, Record<string, number>>
  result_distribution: Record<string, number>
  funnel: Record<string, number>
  post_submit_funnel?: {
    contact_submitted: number
    shortlist_viewed: number
    directory_after_shortlist: number
    directory_viewed_total: number
  }
  starts_per_day: Array<{ date: string; count: number }>
  leads_per_day: Array<{ date: string; count: number }>
  leads_by_city: Record<string, number>
  form_version_stats: Record<string, number>
  total_leads?: number
  total_leads_in_range?: number
  starts_by_segment: Record<string, number>
  completions_by_segment: Record<string, number>
  sanity: {
    raw_quiz_start_events: number
    unique_started_sessions: number
    raw_quiz_completed_events: number
    unique_completed_sessions: number
    duplicate_starts_per_session: number
  }
}

type RangePreset = 'today' | '7d' | '30d' | 'all' | 'custom'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
function daysAgoStr(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function AdminAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isResetting, setIsResetting] = useState(false)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [preset, setPreset] = useState<RangePreset>('30d')
  const [customFrom, setCustomFrom] = useState<string>(daysAgoStr(7))
  const [customTo, setCustomTo] = useState<string>(todayStr())
  const router = useRouter()

  const fetchAnalytics = useCallback(async () => {
    // Build ?from/&to params from preset
    let qs = ''
    if (preset === 'today') qs = `?from=${todayStr()}&to=${todayStr()}`
    else if (preset === '7d') qs = `?from=${daysAgoStr(6)}&to=${todayStr()}`
    else if (preset === '30d') qs = `?from=${daysAgoStr(29)}&to=${todayStr()}`
    else if (preset === 'all') qs = `?from=all`
    else if (preset === 'custom') qs = `?from=${customFrom}&to=${customTo}`

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/analytics${qs}`, {
        headers: { 'Content-Type': 'application/json' }, credentials: 'include' as RequestCredentials,})

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
          router.push('/admin')
          return
        }
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router, preset, customFrom, customTo])

  const resetAnalytics = async () => {
    if (!confirm('⚠️ Сигурни ли сте, че искате да нулирате ВСИЧКИ analytics данни?\n\nТова ще изтрие:\n- Данни за започнати/завършени тестове\n- Отговори по въпроси\n- Soft commit статистика\n\nЛийдовете НЯМА да бъдат изтрити.')) {
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/reset-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, credentials: 'include' as RequestCredentials,})

      if (response.ok) {
        alert('✅ Analytics данните бяха нулирани успешно!')
        fetchAnalytics()
      } else {
        alert('❌ Грешка при нулиране на данните')
      }
    } catch (error) {
      console.error('Error resetting analytics:', error)
      alert('❌ Грешка при нулиране на данните')
    } finally {
      setIsResetting(false)
    }
  }

  const resetBlogViews = async () => {
    if (!confirm('⚠️ Сигурни ли сте, че искате да нулирате статистиката за blog прегледи?')) {
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/reset-blog-views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, credentials: 'include' as RequestCredentials,})

      if (response.ok) {
        alert('✅ Blog view статистиката беше нулирана!')
      } else {
        alert('❌ Грешка при нулиране')
      }
    } catch (error) {
      console.error('Error resetting blog views:', error)
    } finally {
      setIsResetting(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Logout is now handled by <AdminHeader />.

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <AdminHeader pageTitle="Анализи" />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      </main>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader pageTitle="Анализи" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link 
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Назад към лийдове</span>
            </Link>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">
              Анализи на теста
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetBlogViews}
              disabled={isResetting}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Нулирай blog views
            </button>
            <button
              onClick={resetAnalytics}
              disabled={isResetting}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Нулирай фунията
            </button>
            <button
              onClick={() => fetchAnalytics()}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Обнови
            </button>
          </div>
        </div>

        {analytics && (
          <>
            {/* Date Range Filter */}
            <div
              className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap"
              data-testid="analytics-range-filter"
            >
              <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                <Calendar className="w-4 h-4 text-slate-400" />
                Период:
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { key: 'today', label: 'Днес' },
                  { key: '7d', label: '7 дни' },
                  { key: '30d', label: '30 дни' },
                  { key: 'all', label: 'Всичко' },
                  { key: 'custom', label: 'По дати' },
                ] as const).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    data-testid={`analytics-preset-${p.key}`}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      preset === p.key
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {preset === 'custom' && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5"
                    data-testid="analytics-custom-from"
                  />
                  <span className="text-slate-400">до</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5"
                    data-testid="analytics-custom-to"
                  />
                </div>
              )}
              <span
                className="ml-auto text-xs text-slate-500 font-mono"
                data-testid="analytics-range-label"
              >
                {analytics.range.label}
              </span>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{analytics.total_starts}</p>
                <p className="text-sm text-slate-500">Започнали теста</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{analytics.completion_rate}%</p>
                <p className="text-sm text-slate-500">Завършили теста</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatTime(analytics.avg_time_seconds)}</p>
                <p className="text-sm text-slate-500">Средно време</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{analytics.funnel.form_submitted}</p>
                <p className="text-sm text-slate-500">Изпратени форми</p>
              </div>
            </div>

            {/* Segment breakdown + Sanity check */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div
                className="bg-white rounded-xl border border-slate-200 p-5"
                data-testid="analytics-segment-breakdown"
              >
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  Started vs Completed по сегмент
                </h3>
                <div className="space-y-2">
                  {(['adult', 'teen', 'child', 'unknown'] as const).map((seg) => {
                    const started = analytics.starts_by_segment[seg] || 0
                    const completed = analytics.completions_by_segment[seg] || 0
                    const rate = started > 0 ? Math.round((completed / started) * 100) : 0
                    if (started === 0 && seg !== 'unknown') return null
                    if (seg === 'unknown' && started === 0) return null
                    const segLabel: Record<string, string> = {
                      adult: 'Възрастни', teen: 'Тийнейджъри', child: 'Деца', unknown: 'Неизвестен'
                    }
                    return (
                      <div
                        key={seg}
                        className="flex items-center justify-between text-sm"
                        data-testid={`analytics-segment-${seg}`}
                      >
                        <span className="text-slate-600">{segLabel[seg]}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-900">{started}</span>
                          <span className="text-slate-300">→</span>
                          <span className="text-emerald-600">{completed}</span>
                          <span className="text-slate-400 text-xs w-10 text-right">{rate}%</span>
                        </div>
                      </div>
                    )
                  })}
                  {analytics.starts_by_segment.unknown > 0 && (
                    <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 mt-2">
                      Сегмент „Неизвестен" = стари сесии преди да се записва segment полето.
                    </div>
                  )}
                </div>
              </div>

              <div
                className="bg-white rounded-xl border border-slate-200 p-5"
                data-testid="analytics-sanity-check"
              >
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  Sanity check
                </h3>
                <div className="space-y-2 text-sm">
                  <SanityRow
                    label="quiz_start събития (raw)"
                    value={analytics.sanity.raw_quiz_start_events}
                  />
                  <SanityRow
                    label="Уникални започнали сесии"
                    value={analytics.sanity.unique_started_sessions}
                  />
                  <SanityRow
                    label="quiz_completed събития (raw)"
                    value={analytics.sanity.raw_quiz_completed_events}
                  />
                  <SanityRow
                    label="Уникални завършили сесии"
                    value={analytics.sanity.unique_completed_sessions}
                  />
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Дублирани starts в същата сесия</span>
                    <span
                      className={
                        analytics.sanity.duplicate_starts_per_session > 0
                          ? 'text-amber-600 font-mono font-semibold'
                          : 'text-emerald-600 font-mono font-semibold'
                      }
                      data-testid="analytics-sanity-duplicates"
                    >
                      {analytics.sanity.duplicate_starts_per_session === 0
                        ? '0 (чисто)'
                        : analytics.sanity.duplicate_starts_per_session}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Funnel */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h2 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" />
                Фуния на конверсия
              </h2>
              
              <div className="space-y-4">
                {[
                  { key: 'quiz_start', label: 'Започнали теста', color: 'bg-teal-500' },
                  { key: 'quiz_completed', label: 'Завършили теста', color: 'bg-teal-400' },
                  { key: 'soft_commit_yes', label: 'Искат опции', color: 'bg-emerald-500' },
                  { key: 'form_submitted', label: 'Изпратили форма', color: 'bg-emerald-600' },
                ].map((step, index) => {
                  const value = analytics.funnel[step.key] || 0
                  const maxValue = analytics.funnel.quiz_start || 1
                  const percentage = Math.round((value / maxValue) * 100)
                  const prevValue = index > 0 ? analytics.funnel[['quiz_start', 'quiz_completed', 'soft_commit_yes', 'form_submitted'][index - 1]] || 0 : value
                  const dropoff = prevValue > 0 ? Math.round(((prevValue - value) / prevValue) * 100) : 0
                  
                  return (
                    <div key={step.key}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">{step.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">{value}</span>
                          {index > 0 && dropoff > 0 && (
                            <span className="text-xs text-red-500">-{dropoff}%</span>
                          )}
                        </div>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${step.color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                
                {/* Soft commit "No" */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Отказали (Не сега)</span>
                    <span className="font-medium text-slate-700">{analytics.funnel.soft_commit_no || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Post-submit funnel — unique sessions */}
            {analytics.post_submit_funnel && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8" data-testid="analytics-post-submit-funnel">
                <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slate-400" />
                  След изпращане на контактите
                </h2>
                <p className="text-xs text-slate-500 mb-6">Уникални сесии за избрания период.</p>
                <div className="space-y-4">
                  {(() => {
                    const f = analytics.post_submit_funnel
                    const steps = [
                      { label: 'Изпратили контакти', value: f.contact_submitted, color: 'bg-teal-500' },
                      { label: 'Заредили страницата с клиники за тях', value: f.shortlist_viewed, color: 'bg-teal-400' },
                      { label: 'Посетили всички клиники след това', value: f.directory_after_shortlist, color: 'bg-emerald-600' },
                    ]
                    const max = Math.max(...steps.map((s) => s.value), 1)
                    return steps.map((step, index) => {
                      const prev = index > 0 ? steps[index - 1].value : 0
                      const rate = index > 0 && prev > 0 ? Math.round((step.value / prev) * 100) : null
                      return (
                        <div key={step.label}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{step.label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-900">{step.value}</span>
                              {rate !== null && <span className="text-xs text-slate-500">{rate}% от предишната</span>}
                            </div>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${step.color} transition-all duration-500`} style={{ width: `${Math.round((step.value / max) * 100)}%` }} />
                          </div>
                        </div>
                      )
                    })
                  })()}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Всички посещения на каталога с клиники (всякакъв източник)</span>
                    <span className="font-medium text-slate-700">{analytics.post_submit_funnel.directory_viewed_total}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Result Distribution */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-slate-400" />
                  Разпределение на резултати
                </h2>
                
                <div className="space-y-4">
                  {[
                    { key: 'early', label: 'Ранен етап', color: 'bg-emerald-500' },
                    { key: 'progressing', label: 'Развиващ се', color: 'bg-amber-500' },
                    { key: 'advanced', label: 'Напреднал', color: 'bg-red-500' },
                  ].map(band => {
                    const value = analytics.result_distribution[band.key] || 0
                    const total = Object.values(analytics.result_distribution).reduce((a, b) => a + b, 0)
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0
                    
                    return (
                      <div key={band.key}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600">{band.label}</span>
                          <span className="text-sm font-medium text-slate-900">{value} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${band.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Form A/B Test */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  A/B Тест на формата
                </h2>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-slate-900 mb-2">
                      {analytics.form_version_stats.A || 0}
                    </p>
                    <p className="text-sm text-slate-500">Версия A</p>
                    <p className="text-xs text-slate-400 mt-1">Име + Тел + Имейл</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-slate-900 mb-2">
                      {analytics.form_version_stats.B || 0}
                    </p>
                    <p className="text-sm text-slate-500">Версия B</p>
                    <p className="text-xs text-slate-400 mt-1">Само Телефон</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Лийдове по град</h3>
                  <div className="flex gap-4">
                    <div className="flex-1 text-center p-3 bg-teal-50 rounded-lg">
                      <p className="text-xl font-bold text-teal-600">{analytics.leads_by_city.sofia || 0}</p>
                      <p className="text-xs text-slate-500">София</p>
                    </div>
                    <div className="flex-1 text-center p-3 bg-teal-50 rounded-lg">
                      <p className="text-xl font-bold text-teal-600">{analytics.leads_by_city.plovdiv || 0}</p>
                      <p className="text-xs text-slate-500">Пловдив</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Analytics */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h2 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-400" />
                Анализ по въпроси
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Въпрос</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Да</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Понякога</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Не</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Отпаднали</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(q => {
                      const qKey = `q${q}`
                      const stats = analytics.question_stats[qKey] || {}
                      const dropoff = analytics.dropoff_by_question[qKey] || 0
                      
                      return (
                        <tr key={qKey} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-700">Въпрос {q}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              {stats.yes || 0}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {stats.sometimes || stats.unsure || 0}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              {stats.no || 0}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {dropoff > 0 ? (
                              <span className="text-sm text-red-500 font-medium">-{dropoff}</span>
                            ) : (
                              <span className="text-sm text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leads per day chart */}
            {analytics.leads_per_day.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  Лийдове по дни (последните 30 дни)
                </h2>
                
                <div className="h-40 flex items-end gap-1">
                  {analytics.leads_per_day.slice(-30).map((day, index) => {
                    const maxCount = Math.max(...analytics.leads_per_day.map(d => d.count), 1)
                    const height = (day.count / maxCount) * 100
                    
                    return (
                      <div 
                        key={index}
                        className="flex-1 bg-teal-500 rounded-t hover:bg-teal-600 transition-colors"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${day.date}: ${day.count} лийда`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>{analytics.leads_per_day[0]?.date || ''}</span>
                  <span>{analytics.leads_per_day[analytics.leads_per_day.length - 1]?.date || ''}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function SanityRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-mono text-slate-900 font-semibold">{value}</span>
    </div>
  )
}

