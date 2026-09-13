// Web Push client — registers the service worker and wires
// Notification.requestPermission() + PushManager.subscribe() to the
// backend's push_subscriptions store. Only ever called from a user
// gesture (the Follow button in QuestionThread), never on page load —
// asking for notification permission unprompted is the fastest way to
// get a browser's permission UI auto-denied for good.

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/** False in any environment where push simply can't work — Safari <16,
 *  no service worker support, non-secure context, etc. Callers use this to
 *  decide whether to offer the opt-in at all. */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function getVapidPublicKey(): Promise<{ publicKey: string; enabled: boolean }> {
  try {
    const res = await fetch(`${API_URL}/api/patient/push/vapid-public-key`)
    if (!res.ok) return { publicKey: '', enabled: false }
    const d = await res.json()
    return { publicKey: d.public_key || '', enabled: !!d.enabled }
  } catch {
    return { publicKey: '', enabled: false }
  }
}

/** Full opt-in flow: register the SW, ask for permission, subscribe, and
 *  persist the subscription server-side. Returns false on any failure
 *  (denied permission, unsupported browser, push not configured on the
 *  backend) — callers should treat that as "silently didn't enable push",
 *  not as an error to surface, since email notifications still work. */
export async function enablePushNotifications(): Promise<boolean> {
  if (!pushSupported()) return false

  const { publicKey, enabled } = await getVapidPublicKey()
  if (!enabled || !publicKey) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

    const res = await fetch(`${API_URL}/api/patient/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
      credentials: 'include' as RequestCredentials,
    })
    return res.ok
  } catch {
    return false
  }
}
