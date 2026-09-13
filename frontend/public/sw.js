// Zubite service worker — Web Push only, no offline/caching strategy.
// Registered lazily by lib/push.ts, only once a patient opts in to
// thread-follow notifications (see QuestionThread's Follow button).

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // Malformed/non-JSON payload — fall back to the defaults below.
  }
  const title = data.title || 'Zubite.bg'
  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url === url)
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    }),
  )
})
