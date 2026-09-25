'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  FileText,
  XCircle,
  Trash2,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface AutomationJob {
  id: string
  make_run_id: string | null
  article_id: string | null
  title: string | null
  slug: string | null
  status: string
  source: string
  requested_by: string | null
  topic_hint: string | null
  raw_markdown_received: boolean
  validation_result: Record<string, unknown> | null
  warnings: string[]
  errors: string[]
  created_article_id: string | null
  created_at: string
  updated_at: string
}

type Toast = { kind: 'success' | 'error' | 'info'; text: string } | null

const STATUS_META: Record<
  string,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  queued: {
    label: 'В опашка',
    cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    icon: Clock,
  },
  running: {
    label: 'Изпълнява се',
    cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    icon: Loader2,
  },
  needs_images: {
    label: 'Нужни изображения',
    cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    icon: ImageIcon,
  },
  imported_as_draft: {
    label: 'Импортирана като чернова',
    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    icon: CheckCircle2,
  },
  start_failed: {
    label: 'Грешка при стартиране',
    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    icon: XCircle,
  },
  import_failed: {
    label: 'Грешка при импорт',
    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    icon: XCircle,
  },
  timed_out: {
    label: 'Без отговор от Make',
    cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    icon: Clock,
  },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || {
    label: status,
    cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    icon: FileText,
  }
  const Icon = meta.icon
  const spin = status === 'running'
  return (
    <span
      data-testid={`job-status-badge-${status}`}
      className={
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ' +
        meta.cls
      }
    >
      <Icon className={'w-3.5 h-3.5 ' + (spin ? 'animate-spin' : '')} />
      {meta.label}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function ContentAutomationPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<AutomationJob[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const showToast = useCallback((t: Toast) => {
    setToast(t)
    if (t) {
      window.setTimeout(() => setToast(null), 6000)
    }
  }, [])

  const fetchJobs = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await fetch(`${API_URL}/api/admin/content-automation/jobs`, {
          credentials: 'include' as RequestCredentials,
        })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/admin')
            return
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        setJobs(Array.isArray(data.jobs) ? data.jobs : [])
      } catch (e) {
        if (!silent) {
          showToast({
            kind: 'error',
            text: 'Грешка при зареждане на задачите.',
          })
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [router, showToast]
  )

  // Initial load
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Auto-refresh while there is at least one queued/running job
  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status === 'queued' || j.status === 'running'
    )
    if (hasActive) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => fetchJobs(true), 10_000)
      }
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [jobs, fetchJobs])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/content-automation/start-next`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include' as RequestCredentials,
          body: JSON.stringify({}),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        showToast({
          kind: 'success',
          text: 'Заявката е изпратена към Make.com. Изчакваме отговор…',
        })
        fetchJobs(true)
      } else if (res.status === 503) {
        const code = data?.detail?.code
        if (code === 'make_not_configured') {
          showToast({
            kind: 'error',
            text:
              'Make webhook не е конфигуриран. Добави MAKE_CONTENT_AUTOMATION_WEBHOOK_URL в env, преди да използваш автоматизацията.',
          })
        } else {
          showToast({
            kind: 'error',
            text:
              data?.detail?.message ||
              'Услугата не е достъпна в момента.',
          })
        }
        fetchJobs(true)
      } else if (res.status === 401 || res.status === 403) {
        router.push('/admin')
      } else {
        showToast({
          kind: 'error',
          text:
            data?.detail?.message ||
            `Грешка при стартиране (HTTP ${res.status}).`,
        })
        fetchJobs(true)
      }
    } catch (e) {
      showToast({
        kind: 'error',
        text: 'Мрежова грешка. Опитай отново.',
      })
    } finally {
      setGenerating(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async (job: AutomationJob) => {
    const label = job.title || job.slug || job.id.slice(0, 8)
    if (
      !window.confirm(
        `Сигурен ли си, че искаш да изтриеш този запис?\n\n"${label}"\n\nДраfta статия (ако има) НЕ се изтрива — само jobs записът от тази таблица.`
      )
    ) {
      return
    }
    setDeletingId(job.id)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/content-automation/jobs/${job.id}`,
        {
          method: 'DELETE',
          credentials: 'include' as RequestCredentials,
        }
      )
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== job.id))
        showToast({ kind: 'success', text: 'Записът е изтрит.' })
      } else if (res.status === 401 || res.status === 403) {
        router.push('/admin')
      } else {
        const body = await res.json().catch(() => ({}))
        showToast({
          kind: 'error',
          text:
            body?.detail?.message ||
            `Грешка при изтриване (HTTP ${res.status}).`,
        })
      }
    } catch (e) {
      showToast({ kind: 'error', text: 'Мрежова грешка при изтриване.' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader pageTitle="Автоматизация на съдържание" />

      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10"
        data-testid="content-automation-page"
      >
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-serif font-semibold text-slate-900"
              data-testid="content-automation-title"
            >
              Автоматизация на съдържание
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Стартирай генериране на следваща статия чрез Make.com.
              Резултатите винаги се импортират като чернова — никога не се
              публикуват автоматично.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchJobs()}
              disabled={loading}
              data-testid="refresh-jobs-button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-slate-700 bg-white ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')}
              />
              Обнови
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              data-testid="generate-next-article-button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? 'Стартирам…' : 'Генерирай следваща статия'}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            data-testid="content-automation-toast"
            className={
              'mb-4 px-4 py-3 rounded-md text-sm flex items-start gap-2 ' +
              (toast.kind === 'success'
                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                : toast.kind === 'error'
                ? 'bg-red-50 text-red-800 ring-1 ring-red-200'
                : 'bg-blue-50 text-blue-800 ring-1 ring-blue-200')
            }
            role="status"
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : toast.kind === 'error' ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg ring-1 ring-slate-200 overflow-hidden">
          {loading && jobs.length === 0 ? (
            <div
              className="p-12 text-center text-slate-500"
              data-testid="jobs-loading-state"
            >
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Зареждам задачи…
            </div>
          ) : jobs.length === 0 ? (
            <div
              className="p-12 text-center"
              data-testid="jobs-empty-state"
            >
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-700 font-medium">
                Все още няма генерирани статии
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Натисни „Генерирай следваща статия“, за да започнеш.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Дата</th>
                    <th className="px-4 py-3 font-medium">Заглавие</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Източник</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const isExp = expanded.has(job.id)
                    const hasIssues =
                      (job.warnings && job.warnings.length > 0) ||
                      (job.errors && job.errors.length > 0)
                    return (
                      <Fragment key={job.id}>
                        <tr
                          data-testid={`job-row-${job.id}`}
                          className="hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap align-top">
                            {formatDate(job.created_at)}
                          </td>
                          <td className="px-4 py-3 text-slate-900 align-top">
                            <div className="font-medium">
                              {job.title || (
                                <span className="text-slate-400 italic">
                                  (без заглавие)
                                </span>
                              )}
                            </div>
                            {job.topic_hint && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                Тема: {job.topic_hint}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 align-top">
                            {job.slug ? (
                              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                {job.slug}
                              </code>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge status={job.status} />
                          </td>
                          <td className="px-4 py-3 text-slate-600 align-top">
                            <span className="text-xs">
                              {job.source === 'zubite_admin'
                                ? 'Админ'
                                : job.source === 'make_callback'
                                ? 'Make.com'
                                : job.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {job.created_article_id && (
                                <Link
                                  href={`/admin/blog/${job.created_article_id}`}
                                  data-testid={`open-draft-${job.id}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-teal-700 bg-teal-50 ring-1 ring-teal-200 hover:bg-teal-100 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Виж черновата
                                </Link>
                              )}
                              {hasIssues && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(job.id)}
                                  data-testid={`toggle-issues-${job.id}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                  {isExp ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                  Детайли
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDelete(job)}
                                disabled={deletingId === job.id}
                                data-testid={`delete-job-${job.id}`}
                                title="Изтрий запис от таблицата (драфта остава)"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-700 bg-red-50 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                              >
                                {deletingId === job.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Изтрий
                              </button>
                            </div>
                          </td>
                        </tr>
                        {hasIssues && isExp && (
                          <tr
                            data-testid={`job-issues-${job.id}`}
                          >
                            <td colSpan={6} className="bg-slate-50 px-4 py-3">
                              {job.errors && job.errors.length > 0 && (
                                <div className="mb-2">
                                  <div className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Грешки
                                  </div>
                                  <ul className="list-disc list-inside text-xs text-red-800 space-y-0.5">
                                    {job.errors.map((e, i) => (
                                      <li key={i}>{e}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {job.warnings && job.warnings.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Предупреждения
                                  </div>
                                  <ul className="list-disc list-inside text-xs text-amber-900 space-y-0.5">
                                    {job.warnings.map((w, i) => (
                                      <li key={i}>{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-4">
          Чернови от автоматизацията се запазват в Блог секцията със статус
          „Чернова“. Преди публикуване винаги проверявай съдържанието и
          добавяй необходимите изображения ръчно.
        </p>
      </main>
    </div>
  )
}
