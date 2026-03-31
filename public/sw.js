const CACHE_NAME = 'otium-v1'

// Install — cache only the offline fallback (auth pages can't be precached)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/offline']))
  )
  self.skipWaiting()
})

// Activate — purge old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network-first for navigations, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET, API, auth, and extension requests
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/next-auth/')) return
  if (!url.origin.startsWith('http')) return

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // Only cache successful responses
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return res
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline'))
        )
    )
    return
  }

  // Next.js static assets (_next/static/) — cache-first (hashed, immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Other static assets (images, fonts, icons) — stale-while-revalidate
  if (request.destination === 'image' || request.destination === 'font' ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/)) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return res
        }).catch(() => cached)
        return cached || fetched
      })
    )
    return
  }
})
