// Shared display helpers for Общност — used by QuestionCard and
// QuestionThread's AnswerCard so the two don't duplicate the same
// formatting logic.

export function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'днес'
  if (days === 1) return 'вчера'
  if (days < 30) return `преди ${days} дни`
  return new Date(iso).toLocaleDateString('bg-BG')
}

/** First letter of the anonymised display name, or a neutral "П"
 *  ("Пациент") fallback. Patients have no avatar/photo field at all in
 *  the data model — this generated initial badge IS the identity
 *  affordance, not a stand-in for a future photo. */
export function initial(displayName: string | null | undefined): string {
  const ch = (displayName || '').trim().charAt(0)
  return (ch || 'П').toUpperCase()
}
