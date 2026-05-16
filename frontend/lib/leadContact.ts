/**
 * Local-only contact prefill for patient modals.
 *
 * After a successful quiz submission we cache the lead's contact info
 * keyed by leadId so that subsequent flows on the SAME browser
 * (RequestCallModal P4, AssistedChoiceModal P5) can confirm what the
 * patient already shared instead of asking them again.
 *
 * Privacy contract:
 *   - Stored only in the patient's own browser (localStorage).
 *   - Never sent back to the backend untouched — only used to prefill
 *     UI inputs. The patient still presses "Изпрати заявка" themselves.
 *   - Never indexed by any other key than the lead UUID.
 *   - All read/write paths are wrapped in try/catch — a SecurityError
 *     (private mode, blocked storage, third-party context) silently
 *     no-ops; modals fall back to empty inputs.
 */
export interface LeadContact {
  name?: string | null
  phone?: string | null
  email?: string | null
}

const STORAGE_KEY = 'zubite_lead_contact_v1'

type StoreShape = Record<string, LeadContact>

function readStore(): StoreShape {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as StoreShape
    }
    return {}
  } catch {
    return {}
  }
}

function writeStore(s: StoreShape): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // private mode / quota exceeded — silent
  }
}

export function setStoredLeadContact(leadId: string, c: LeadContact): void {
  if (!leadId) return
  const store = readStore()
  store[leadId] = {
    name: c.name?.trim() || null,
    phone: c.phone?.trim() || null,
    email: c.email?.trim() || null,
  }
  writeStore(store)
}

export function getStoredLeadContact(leadId: string): LeadContact | null {
  if (!leadId) return null
  const store = readStore()
  return store[leadId] || null
}

export function hasStoredLeadContact(leadId: string): boolean {
  const c = getStoredLeadContact(leadId)
  return !!(c && (c.name || c.phone || c.email))
}
