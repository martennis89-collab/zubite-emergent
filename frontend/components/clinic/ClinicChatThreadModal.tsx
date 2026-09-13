'use client'

/**
 * Clinic Dashboard · one consultation-chat thread.
 *
 * Mirrors `components/patient/PatientChatModal.tsx` in shape (same
 * bubble/composer/attachment layout) but talks to the clinic-session
 * endpoints (`lib/clinicChat.ts`, cookie auth) instead of the patient's
 * magic-link token. Sender alignment is flipped: "clinic" is "mine" here.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, Paperclip, Loader2, FileText } from 'lucide-react'
import {
  getClinicChatThread,
  sendClinicChatMessage,
  uploadClinicChatFile,
  clinicChatFileUrl,
  type ChatMessage,
  type ChatAttachment,
} from '@/lib/clinicChat'
import { PatientContextSection, type PatientContext } from '@/components/PatientContextSection'

interface Props {
  chatId: string
  onClose: () => void
  /** Called after the thread loads/refreshes, so the list page can clear
   *  the unread badge for this row without a full reload. */
  onRead?: () => void
}

const POLL_INTERVAL_MS = 7000
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_BYTES = 10 * 1024 * 1024

export function ClinicChatThreadModal({ chatId, onClose, onRead }: Props) {
  const [patientName, setPatientName] = useState('Пациент')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null)
  const [contextOpen, setContextOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      try {
        const thread = await getClinicChatThread(chatId)
        setMessages(thread.messages)
        setPatientName(thread.chat.patient_name)
        setPatientContext(thread.patient_context)
        if (!opts.silent) {
          setErr(null)
          // Only on the real (non-polling) load — the caller uses this to
          // refresh the list's unread badge, which doesn't need to happen
          // on every 7s silent poll tick.
          onRead?.()
        }
      } catch (e) {
        if (!opts.silent) setErr(e instanceof Error ? e.message : 'Грешка при зареждане.')
      } finally {
        if (!opts.silent) setLoading(false)
      }
    },
    [chatId, onRead],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const pickFile = (f: File | null) => {
    setErr(null)
    if (!f) {
      setPendingFile(null)
      return
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setErr('Приемаме снимки (JPG, PNG, WEBP) или PDF.')
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setErr('Максималният размер е 10 MB.')
      return
    }
    setPendingFile(f)
  }

  const send = async () => {
    const text = body.trim()
    if (!text && !pendingFile) return
    setSending(true)
    setErr(null)
    try {
      const attachmentIds: string[] = []
      if (pendingFile) {
        const uploaded = await uploadClinicChatFile(chatId, pendingFile)
        attachmentIds.push(uploaded.id)
      }
      const msg = await sendClinicChatMessage(chatId, text, attachmentIds)
      setMessages((prev) => [...prev, msg])
      setBody('')
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Съобщението не бе изпратено.')
    } finally {
      setSending(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinic-chat-title"
      className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-6"
      onClick={onClose}
      data-testid="clinic-chat-modal"
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg h-[85vh] sm:h-[70vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
          <div className="min-w-0">
            <h3
              id="clinic-chat-title"
              className="font-serif text-lg font-semibold text-slate-900 truncate"
            >
              {patientName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Онлайн разговор</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 shrink-0"
            aria-label="Затвори"
            data-testid="clinic-chat-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quiz context — shown immediately, above the message thread, so
            it never scrolls out of view (the message list autoscrolls to
            bottom on every update; this can't share that container).
            Absent entirely for a quick-chat lead with no quiz behind it. */}
        {patientContext && (
          <div className="border-b border-slate-100" data-testid="clinic-chat-patient-context">
            <button
              type="button"
              onClick={() => setContextOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
              data-testid="clinic-chat-context-toggle"
            >
              <span>Информация от въпросника</span>
              <span>{contextOpen ? 'Скрий' : 'Покажи'}</span>
            </button>
            {contextOpen && (
              <div className="max-h-[35vh] overflow-y-auto px-2 pb-2">
                <PatientContextSection ctx={patientContext} />
              </div>
            )}
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          data-testid="clinic-chat-messages"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-6">
              <p className="text-sm text-slate-400 leading-relaxed">Все още няма съобщения.</p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} message={m} chatId={chatId} />
            ))
          )}
        </div>

        <div className="border-t border-slate-100 p-3 sm:p-4 space-y-2">
          {err && (
            <p
              className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
              data-testid="clinic-chat-error"
            >
              {err}
            </p>
          )}
          {pendingFile && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              <Paperclip className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{pendingFile.name}</span>
              <button
                type="button"
                onClick={() => pickFile(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Премахни файла"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="hidden"
              data-testid="clinic-chat-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40 shrink-0"
              aria-label="Прикачи файл"
              data-testid="clinic-chat-attach"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Напишете отговор…"
              rows={1}
              disabled={sending}
              className="flex-1 resize-none border border-slate-200 rounded-2xl px-4 py-2.5 text-sm max-h-28 disabled:bg-slate-50"
              data-testid="clinic-chat-input"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || (!body.trim() && !pendingFile)}
              className="p-2.5 rounded-full text-white disabled:opacity-40 shrink-0"
              style={{
                backgroundImage:
                  'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
              }}
              aria-label="Изпрати"
              data-testid="clinic-chat-send"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function MessageBubble({ message, chatId }: { message: ChatMessage; chatId: string }) {
  const mine = message.sender === 'clinic'
  return (
    <div
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
      data-testid={`clinic-chat-msg-${message.id}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
          mine
            ? 'bg-teal-500 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
        }`}
      >
        {message.body && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {message.body}
          </p>
        )}
        {message.attachments.length > 0 && (
          <div className={`space-y-1.5 ${message.body ? 'mt-2' : ''}`}>
            {message.attachments.map((a) => (
              <AttachmentPreview key={a.id} attachment={a} chatId={chatId} mine={mine} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AttachmentPreview({
  attachment,
  chatId,
  mine,
}: {
  attachment: ChatAttachment
  chatId: string
  mine: boolean
}) {
  const url = clinicChatFileUrl(chatId, attachment.id)
  const isImage = (attachment.content_type || '').startsWith('image/')
  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`clinic-chat-attachment-${attachment.id}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={attachment.filename || 'Прикачен файл'}
          className="rounded-lg max-h-48 w-auto"
        />
      </a>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs underline ${
        mine ? 'text-white/90' : 'text-teal-700'
      }`}
      data-testid={`clinic-chat-attachment-${attachment.id}`}
    >
      <FileText className="w-3.5 h-3.5" />
      {attachment.filename || 'Файл'}
    </a>
  )
}
