// 쓱싹 Service Worker v3
// v2 → v3: navigation(SSR HTML) 캐싱 제거 — stale HTML이 React hydration 오류 유발
const CACHE_NAME = 'sseuksak-v3'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/favicon.ico', '/manifest.json']).catch(() => {})
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// SSR HTML(navigation)은 캐싱하지 않음 — Next.js가 항상 fresh 응답 반환
// 정적 에셋(이미지·폰트)만 cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // supabase / API / navigation → SW 개입 없이 브라우저 직접 처리
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.endsWith('supabase.co') ||
    req.mode === 'navigate'
  ) return

  // 이미지·폰트만 cache-first (stale-while-revalidate)
  if (req.destination === 'image' || req.destination === 'font') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(req, clone))
          }
          return res
        })
        return cached ?? networkFetch
      })
    )
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: '쓱싹', message: event.data.text() } }
  const title = data.title || '쓱싹'
  const options = {
    body: data.message || '',
    icon: '/icon',
    badge: '/icon',
    vibrate: [80, 40, 80],
    tag: data.tag || 'sseuksak',
    data: { url: data.url || '/', ts: Date.now() },
    actions: data.actions || [],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && 'focus' in c) return c.focus()
      }
      return clients.openWindow(url)
    })
  )
})
