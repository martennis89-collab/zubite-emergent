'use client'

/**
 * Clinic Dashboard · Online consultation chats.
 *
 * Read + reply. Access control is enforced server-side — the clinic can
 * only ever see its own threads (`GET /api/clinic/chats`).
 */

import { useEffect, useState, useCallback } from 'react'
import { Loader2, MessageCircle, RefreshCw } from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { ClinicChatThreadModal } from '@/components/clinic/ClinicChatThreadModal'
import { listClinicChats, type ChatListRow } from '@/lib/clinicChat'

export default function ClinicChatsPage() {
  const [chats, setChats] = useState<ChatListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [openChatId, setOpenChatId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      setChats(await listClinicChats())
    } catch {
      setErr('Грешка при зареждане.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <ClinicShell>
      <div className="space-y-6" data-testid="clinic-chats-page">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Съобщения
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Онлайн разговори с пациенти, започнати през профила ви в Zubite.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
            data-testid="clinic-chats-refresh"
          >
            <RefreshCw className="w-4 h-4" /> Опресни
          </button>
        </header>

        {loading ? (
          <div className="inline-flex items-center gap-2 text-sm text-slate-500" data-testid="clinic-chats-loading">
            <Loader2 className="w-4 h-4 animate-spin" /> Зареждане…
          </div>
        ) : err ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3" data-testid="clinic-chats-error">
            {err}
          </div>
        ) : chats.length === 0 ? (
          <section
            className="bg-white border border-slate-200 rounded-2xl p-8 text-center"
            data-testid="clinic-chats-empty"
          >
            <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              Все още няма съобщения от пациенти.
            </p>
          </section>
        ) : (
          <ul className="space-y-2" data-testid="clinic-chats-list">
            {chats.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setOpenChatId(c.id)}
                  className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-teal-200 transition-colors"
                  data-testid={`clinic-chat-row-${c.id}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {c.patient_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.last_message_at
                        ? new Date(c.last_message_at).toLocaleString('bg-BG')
                        : 'Няма съобщения'}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span
                      className="shrink-0 inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full bg-teal-500 text-white text-xs font-semibold px-1.5"
                      data-testid={`clinic-chat-unread-${c.id}`}
                    >
                      {c.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {openChatId && (
        <ClinicChatThreadModal
          chatId={openChatId}
          onClose={() => {
            setOpenChatId(null)
            load()
          }}
          onRead={load}
        />
      )}
    </ClinicShell>
  )
}
