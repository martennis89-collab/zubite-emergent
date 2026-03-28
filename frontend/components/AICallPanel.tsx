'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Phone, PhoneCall, PhoneOff, PhoneMissed, Loader2, 
  Clock, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp,
  MessageSquare, User, Bot, AlertTriangle, Calendar
} from 'lucide-react'

// Call status types
const CALL_STATUSES = ['idle', 'calling', 'completed', 'failed', 'no_answer'] as const

interface CallOutcome {
  interested_in_treatment?: boolean | null
  treatment_interest?: string | null
  treatment_timeline?: string | null
  permission_to_share?: boolean | null
  willing_to_travel?: boolean | null
  follow_up_needed?: boolean | null
}

type CallStatus = typeof CALL_STATUSES[number]

interface TranscriptTurn {
  role: string
  message: string
  time_in_call_secs?: number
}

interface CallLog {
  id: string
  initiated_at: string
  completed_at?: string
  status: CallStatus
  answered?: boolean
  duration_seconds?: number
  summary?: string
  is_mock?: boolean
}

interface LeadCallData {
  call_status?: CallStatus
  call_attempts?: number
  last_call_at?: string
  last_call_duration_seconds?: number
  answered_call?: boolean
  interested_in_treatment?: boolean
  treatment_interest?: string
  treatment_timeline?: string
  permission_to_share?: boolean
  call_summary?: string
  call_transcript?: TranscriptTurn[]
  call_outcome_json?: CallOutcome
  call_error_message?: string
}

interface AICallPanelProps {
  leadId: string
  leadName: string
  leadPhone?: string
  callData: LeadCallData
  onCallInitiated?: () => void
  onRefresh?: () => void
}

const CALL_STATUS_CONFIG: Record<CallStatus, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { 
    label: 'Без обаждане', 
    color: 'bg-slate-100 text-slate-600',
    icon: <Phone className="w-4 h-4" />
  },
  calling: { 
    label: 'Обаждане...', 
    color: 'bg-amber-100 text-amber-700',
    icon: <PhoneCall className="w-4 h-4 animate-pulse" />
  },
  completed: { 
    label: 'Завършено', 
    color: 'bg-emerald-100 text-emerald-700',
    icon: <CheckCircle className="w-4 h-4" />
  },
  failed: { 
    label: 'Неуспешно', 
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-4 h-4" />
  },
  no_answer: { 
    label: 'Без отговор', 
    color: 'bg-orange-100 text-orange-700',
    icon: <PhoneMissed className="w-4 h-4" />
  },
}

const TREATMENT_LABELS: Record<string, string> = {
  aligners: 'Алайнери',
  braces: 'Брекети',
  not_sure: 'Не е сигурен',
  other: 'Друго',
}

const TIMELINE_LABELS: Record<string, string> = {
  asap: 'Веднага',
  '1-3_months': '1-3 месеца',
  later: 'По-късно',
  unknown: 'Неизвестно',
}

export function AICallPanel({ 
  leadId, 
  leadName, 
  leadPhone,
  callData, 
  onCallInitiated,
  onRefresh 
}: AICallPanelProps) {
  const [isInitiating, setIsInitiating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const status = (callData.call_status as CallStatus) || 'idle'
  const statusConfig = CALL_STATUS_CONFIG[status]
  const isCallInProgress = status === 'calling'
  const hasPhoneNumber = !!leadPhone

  // Auto-polling when call is in progress
  useEffect(() => {
    if (isCallInProgress && onRefresh) {
      // Start polling every 5 seconds
      pollingIntervalRef.current = setInterval(() => {
        console.log('Auto-refreshing call status...')
        onRefresh()
      }, 5000)

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    } else {
      // Clear interval when not calling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isCallInProgress, onRefresh])

  const initiateCall = async () => {
    if (!hasPhoneNumber) {
      setError('Този лийд няма телефонен номер')
      return
    }

    if (isCallInProgress) {
      setError('Обаждането вече е в процес')
      return
    }

    setIsInitiating(true)
    setError(null)

    try {
      const token = localStorage.getItem('admin_token')
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      
      const response = await fetch(`${API_URL}/api/admin/leads/${leadId}/call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Грешка при иницииране на обаждане')
      }

      if (data.success) {
        onCallInitiated?.()
        onRefresh?.()
      } else {
        throw new Error(data.message || 'Неуспешно обаждане')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестна грешка')
    } finally {
      setIsInitiating(false)
    }
  }

  const loadCallHistory = async () => {
    setLoadingHistory(true)
    try {
      const token = localStorage.getItem('admin_token')
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      
      const response = await fetch(`${API_URL}/api/admin/leads/${leadId}/call-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCallLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Failed to load call history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const toggleCallHistory = () => {
    if (!showCallHistory && callLogs.length === 0) {
      loadCallHistory()
    }
    setShowCallHistory(!showCallHistory)
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border border-violet-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-violet-200 bg-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">AI Обаждане</h3>
              <p className="text-xs text-slate-500">
                {callData.call_attempts || 0} опита • Последно: {formatDateTime(callData.last_call_at)}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Call Error from backend */}
        {callData.call_error_message && status === 'failed' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{callData.call_error_message}</span>
          </div>
        )}

        {/* Call Button */}
        <div className="flex gap-3">
          <button
            onClick={initiateCall}
            disabled={isInitiating || isCallInProgress || !hasPhoneNumber}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
              isInitiating || isCallInProgress
                ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                : !hasPhoneNumber
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200 hover:shadow-violet-300'
            }`}
          >
            {isInitiating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Иницииране...
              </>
            ) : isCallInProgress ? (
              <>
                <PhoneCall className="w-5 h-5 animate-pulse" />
                Обаждане в ход...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                {callData.call_attempts ? 'Обади се отново' : 'Обади се на пациента'}
              </>
            )}
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-3 rounded-xl border border-violet-200 text-violet-600 hover:bg-violet-100 transition-colors"
              title="Обнови статус"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>

        {!hasPhoneNumber && (
          <p className="text-xs text-amber-600 text-center">
            Този лийд няма записан телефонен номер
          </p>
        )}

        {/* Call Result - Show if completed */}
        {(status === 'completed' || status === 'no_answer') && (
          <div className="space-y-4 pt-2">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Продължителност</p>
                <p className="font-semibold text-slate-900">
                  {formatDuration(callData.last_call_duration_seconds)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Отговорено</p>
                <p className={`font-semibold ${callData.answered_call ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {callData.answered_call ? 'Да' : 'Не'}
                </p>
              </div>
            </div>

            {/* Extracted Data */}
            {callData.call_outcome_json && Object.keys(callData.call_outcome_json).length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Извлечена информация</h4>
                <div className="space-y-2 text-sm">
                  {callData.interested_in_treatment !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Интерес към лечение</span>
                      <span className={callData.interested_in_treatment ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                        {callData.interested_in_treatment ? 'Да' : 'Не'}
                      </span>
                    </div>
                  )}
                  {callData.treatment_interest && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Вид лечение</span>
                      <span className="text-slate-900">
                        {TREATMENT_LABELS[callData.treatment_interest] || callData.treatment_interest}
                      </span>
                    </div>
                  )}
                  {callData.treatment_timeline && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Времева рамка</span>
                      <span className="text-slate-900">
                        {TIMELINE_LABELS[callData.treatment_timeline] || callData.treatment_timeline}
                      </span>
                    </div>
                  )}
                  {callData.permission_to_share !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Съгласие за споделяне</span>
                      <span className={callData.permission_to_share ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                        {callData.permission_to_share ? 'Да' : 'Не'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            {callData.call_summary && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-500" />
                  AI Резюме
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {callData.call_summary}
                </p>
              </div>
            )}

            {/* Transcript (Collapsible) */}
            {callData.call_transcript && callData.call_transcript.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    Транскрипт ({callData.call_transcript.length} реплики)
                  </span>
                  {showTranscript ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                
                {showTranscript && (
                  <div className="border-t border-slate-200 px-4 py-3 max-h-80 overflow-y-auto">
                    <div className="space-y-3">
                      {callData.call_transcript.map((turn, idx) => (
                        <div 
                          key={idx}
                          className={`flex gap-3 ${turn.role === 'agent' ? '' : 'flex-row-reverse'}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            turn.role === 'agent' ? 'bg-violet-100' : 'bg-slate-100'
                          }`}>
                            {turn.role === 'agent' ? (
                              <Bot className="w-4 h-4 text-violet-600" />
                            ) : (
                              <User className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div className={`flex-1 ${turn.role === 'agent' ? 'pr-8' : 'pl-8'}`}>
                            <div className={`inline-block px-3 py-2 rounded-xl text-sm ${
                              turn.role === 'agent' 
                                ? 'bg-violet-50 text-violet-900' 
                                : 'bg-slate-100 text-slate-900'
                            }`}>
                              {turn.message}
                            </div>
                            {turn.time_in_call_secs !== undefined && (
                              <p className="text-xs text-slate-400 mt-1">
                                {formatDuration(turn.time_in_call_secs)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Call History */}
        <div className="border-t border-violet-200 pt-4">
          <button
            onClick={toggleCallHistory}
            className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              История на обажданията
            </span>
            {showCallHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showCallHistory && (
            <div className="mt-3 space-y-2">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                </div>
              ) : callLogs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Няма записани обаждания
                </p>
              ) : (
                callLogs.map(log => (
                  <div 
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        CALL_STATUS_CONFIG[log.status]?.color || 'bg-slate-100'
                      }`}>
                        {CALL_STATUS_CONFIG[log.status]?.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {CALL_STATUS_CONFIG[log.status]?.label}
                          {log.is_mock && <span className="ml-2 text-xs text-amber-600">(тест)</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(log.initiated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {formatDuration(log.duration_seconds)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {log.answered ? 'Отговорено' : 'Без отговор'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
