self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); } catch { data = { title: event.data && event.data.text() || 'FILMKEYFİ' }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'FILMKEYFİ', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(event.notification.data && event.notification.data.url || '/');
    })
  );
});
