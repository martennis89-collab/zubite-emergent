'use client'

/**
 * Patient-side consultation chat — "Съобщение до клиниката".
 *
 * A floating widget anchored bottom-right, not a page-blocking modal —
 * the patient can keep browsing the clinic profile while chatting. Three
 * states: `open` (full panel), `minimized` (small bubble with an unread
 * badge — polling keeps running so the count stays live), and unmounted
 * (the parent stops rendering this component at all, ending polling).
 *
 * Two entry paths, both converging on the same `token` bootstrap:
 *   - `leadId` prop present (results-page context, quiz already taken) →
 *     mint/reuse a chat token for that lead directly.
 *   - `leadId` absent (public /kliniki profile, no quiz behind this
 *     visitor) → a small name-gate view first. Submitting it creates a
 *     minimal lead server-side (`createQuickChatLead`) and caches it in
 *     sessionStorage, so opening chat with a DIFFERENT clinic later in
 *     the same visit reuses the same identity instead of asking again.
 *
 * No websockets in this stack — polls every 7s while mounted, same
 * trade-off the rest of the platform makes elsewhere.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, Paperclip, Loader2, FileText, Minus, MessageCircle } from 'lucide-react'
import {
  getOrMintChatAccessToken,
  getCachedQuickChatLeadId,
  createQuickChatLead,
  getClinicChat,
  sendChatMessage,
  uploadChatFile,
  chatFileUrl,
  readChatError,
  type ChatMessage,
  type ChatAttachment,
} from '@/lib/patientChat'

interface Props {
  /** Present only when reached from lead-context (quiz already taken). */
  leadId?: string
  clinic: { id: string; name: string }
  /** Bumped by the parent on every "Съобщение до клиниката" click, so a
   *  minimized widget re-maximizes instead of the click being a no-op —
   *  the parent only knows "is this mounted", not this component's own
   *  open/minimized subview. */
  openSignal?: number
  onClose: () => void
}

const POLL_INTERVAL_MS = 7000
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_BYTES = 10 * 1024 * 1024

type View = 'name_gate' | 'open' | 'minimized'

export function PatientChatModal({ leadId, clinic, openSignal, onClose }: Props) {
  const [view, setView] = useState<View>(
    () => (leadId || getCachedQuickChatLeadId() ? 'open' : 'name_gate'),
  )
  const [resolvedLeadId, setResolvedLeadId] = useState<string | null>(
    () => leadId ?? getCachedQuickChatLeadId(),
  )
  const [nameInput, setNameInput] = useState('')
  const [nameSubmitting, setNameSubmitting] = useState(false)

  const [token, setToken] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Mirrors `view` for the poll callback, which must not be recreated
  // (and its interval torn down/rebuilt) on every minimize/maximize.
  const viewRef = useRef<View>(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])
  const seenIdsRef = useRef<Set<string>>(new Set())

  // Re-maximize on every bump, including the one that accompanies this
  // component's own first mount — harmless there since the initial view
  // is already correct; never interrupts an in-progress name entry.
  useEffect(() => {
    if (openSignal === undefined) return
    setView((v) => (v === 'name_gate' ? v : 'open'))
    setUnreadCount(0)
  }, [openSignal])

  const load = useCallback(
    async (tok: string, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      try {
        const thread = await getClinicChat(tok, clinic.id)
        if (opts.silent && viewRef.current === 'minimized') {
          const arrived = thread.messages.filter(
            (m) => m.sender === 'clinic' && !seenIdsRef.current.has(m.id),
          )
          if (arrived.length > 0) setUnreadCount((c) => c + arrived.length)
        }
        seenIdsRef.current = new Set(thread.messages.map((m) => m.id))
        setMessages(thread.messages)
        if (!opts.silent) setErr(null)
      } catch (e) {
        if (!opts.silent) setErr(readChatError(e).message || 'Грешка при зареждане.')
      } finally {
        if (!opts.silent) setLoading(false)
      }
    },
    [clinic.id],
  )

  // Bootstrap: mint/reuse token for a resolved lead id, then the first load.
  useEffect(() => {
    if (!resolvedLeadId) return
    let cancelled = false
    ;(async () => {
      try {
        const tok = await getOrMintChatAccessToken(resolvedLeadId)
        if (cancelled) return
        setToken(tok)
        await load(tok)
      } catch (e) {
        if (!cancelled) {
          setErr(readChatError(e).message || 'Не успяхме да отворим разговора.')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolvedLeadId, load])

  // Poll for the clinic's replies for as long as the widget is mounted —
  // including while minimized, so the unread badge stays live.
  useEffect(() => {
    if (!token) return
    const id = setInterval(() => load(token, { silent: true }), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [token, load])

  useEffect(() => {
    if (view === 'open') scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, view])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'open') setView('minimized')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [view])

  const submitName = async () => {
    const name = nameInput.trim()
    if (!name) return
    setNameSubmitting(true)
    setErr(null)
    try {
      const { lead_id } = await createQuickChatLead(name)
      setResolvedLeadId(lead_id)
      setView('open')
    } catch (e) {
      setErr(readChatError(e).message || 'Не успяхме да започнем разговора.')
    } finally {
      setNameSubmitting(false)
    }
  }

  const maximize = () => {
    setView('open')
    setUnreadCount(0)
  }

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
    if (!token) return
    const text = body.trim()
    if (!text && !pendingFile) return
    setSending(true)
    setErr(null)
    try {
      const attachmentIds: string[] = []
      if (pendingFile) {
        const uploaded = await uploadChatFile(token, clinic.id, pendingFile)
        attachmentIds.push(uploaded.id)
      }
      const msg = await sendChatMessage(token, clinic.id, text, attachmentIds)
      seenIdsRef.current.add(msg.id)
      setMessages((prev) => [...prev, msg])
      setBody('')
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setErr(readChatError(e).message || 'Съобщението не бе изпратено.')
    } finally {
      setSending(false)
    }
  }

  if (typeof document === 'undefined') return null

  if (view === 'minimized') {
    return createPortal(
      <button
        type="button"
        onClick={maximize}
        className="fixed bottom-5 right-5 z-[100] w-14 h-14 rounded-full text-white shadow-[0_10px_30px_-8px_rgba(13,148,136,0.6)] flex items-center justify-center hover:-translate-y-0.5 transition-transform"
        style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
        aria-label="Отвори разговора"
        data-testid="patient-chat-bubble"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[1.35rem] h-[1.35rem] rounded-full bg-rose-500 text-white text-[11px] font-semibold flex items-center justify-center px-1 ring-2 ring-white"
            data-testid="patient-chat-unread-badge"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>,
      document.body,
    )
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="patient-chat-title"
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-[100] w-[calc(100vw-2rem)] sm:w-[380px] h-[75vh] sm:h-[560px] max-h-[85vh] bg-white rounded-2xl flex flex-col shadow-[0_24px_60px_-16px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
      data-testid="patient-chat-modal"
    >
      <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 shrink-0">
        <div className="min-w-0">
          <h3
            id="patient-chat-title"
            className="font-serif text-base font-semibold text-slate-900 truncate"
          >
            {view === 'name_gate' ? 'Чат с клиниката' : `Чат с ${clinic.name}`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Разговорът е видим само за теб и клиниката.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {view === 'open' && (
            <button
              type="button"
              onClick={() => setView('minimized')}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              aria-label="Минимизирай"
              data-testid="patient-chat-minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Затвори"
            data-testid="patient-chat-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'name_gate' ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
            Как да Ви наричаме? Клиниката ще види само това име и съобщенията, които изпратите.
          </p>
          <div className="w-full max-w-xs space-y-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitName()
              }}
              placeholder="Вашето име"
              disabled={nameSubmitting}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-center disabled:bg-slate-50"
              data-testid="patient-chat-name-input"
              autoFocus
            />
            {err && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="patient-chat-error">
                {err}
              </p>
            )}
            <button
              type="button"
              onClick={submitName}
              disabled={nameSubmitting || !nameInput.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
              data-testid="patient-chat-name-submit"
            >
              {nameSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Продължи
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            data-testid="patient-chat-messages"
          >
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-6">
                <p className="text-sm text-slate-400 leading-relaxed">
                  Все още няма съобщения. Напишете няколко думи за случая си —
                  клиниката ще отговори тук.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} message={m} token={token!} />
              ))
            )}
          </div>

          <div className="border-t border-slate-100 p-3 space-y-2 shrink-0">
            {err && (
              <p
                className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
                data-testid="patient-chat-error"
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
                data-testid="patient-chat-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || !token}
                className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40 shrink-0"
                aria-label="Прикачи файл (OPG или снимка)"
                data-testid="patient-chat-attach"
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
                placeholder="Напишете съобщение…"
                rows={1}
                disabled={sending || !token}
                className="flex-1 resize-none border border-slate-200 rounded-2xl px-4 py-2.5 text-sm max-h-28 disabled:bg-slate-50"
                data-testid="patient-chat-input"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !token || (!body.trim() && !pendingFile)}
                className="p-2.5 rounded-full text-white disabled:opacity-40 shrink-0"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
                }}
                aria-label="Изпрати"
                data-testid="patient-chat-send"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}

function MessageBubble({ message, token }: { message: ChatMessage; token: string }) {
  const mine = message.sender === 'patient'
  return (
    <div
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
      data-testid={`patient-chat-msg-${message.id}`}
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
              <AttachmentPreview key={a.id} attachment={a} token={token} mine={mine} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AttachmentPreview({
  attachment,
  token,
  mine,
}: {
  attachment: ChatAttachment
  token: string
  mine: boolean
}) {
  const url = chatFileUrl(token, attachment.id)
  const isImage = (attachment.content_type || '').startsWith('image/')
  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`patient-chat-attachment-${attachment.id}`}
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
      data-testid={`patient-chat-attachment-${attachment.id}`}
    >
      <FileText className="w-3.5 h-3.5" />
      {attachment.filename || 'Файл'}
    </a>
  )
}
