'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, LogOut, ArrowLeft, RefreshCw,
  Users, TrendingUp, Clock, Target, 
  BarChart3, PieChart, Activity, FileText
} from 'lucide-react'

interface Analytics {
  total_starts: number
  total_completions: number
  completion_rate: number
  avg_time_seconds: number
  dropoff_by_question: Record<string, number>
  question_stats: Record<string, Record<string, number>>
  result_distribution: Record<string, number>
  funnel: Record<string, number>
  leads_per_day: Array<{ date: string; count: number }>
  leads_by_city: Record<string, number>
  form_version_stats: Record<string, number>
}

export default function AdminAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const router = useRouter()

  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token')
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
  }, [router])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin')
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </main>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">Анализи</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="hidden sm:inline">Лийдове</span>
              </Link>
              <Link
                href="/admin/blog"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">Блог</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
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
          <button
            onClick={() => fetchAnalytics()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Обнови
          </button>
        </div>

        {analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-sky-600" />
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

            {/* Funnel */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h2 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" />
                Фуния на конверсия
              </h2>
              
              <div className="space-y-4">
                {[
                  { key: 'quiz_start', label: 'Започнали теста', color: 'bg-sky-500' },
                  { key: 'quiz_completed', label: 'Завършили теста', color: 'bg-sky-400' },
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
                    <div className="flex-1 text-center p-3 bg-sky-50 rounded-lg">
                      <p className="text-xl font-bold text-sky-600">{analytics.leads_by_city.sofia || 0}</p>
                      <p className="text-xs text-slate-500">София</p>
                    </div>
                    <div className="flex-1 text-center p-3 bg-sky-50 rounded-lg">
                      <p className="text-xl font-bold text-sky-600">{analytics.leads_by_city.plovdiv || 0}</p>
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
                        className="flex-1 bg-sky-500 rounded-t hover:bg-sky-600 transition-colors"
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
