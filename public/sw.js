// ============================================================
// Service Worker - Açaí da Daiane
// Suporta: Web Push (Chrome, Edge, Firefox, Safari 16.4+ PWA)
// Arquivo: /public/sw.js
// ============================================================

const CACHE_NAME = 'acaidaiane-v1';

// ──────────────────────────────────────────────────────────────
// EVENTO: push — recebido mesmo com o site fechado
// ──────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Açaí da Daiane', body: 'Atualização no seu pedido!' };
  }

  const title = data.title || 'Açaí da Daiane 🥣';
  const options = {
    body: data.body || 'Seu pedido foi atualizado.',
    icon: data.icon || '/icon.png',
    badge: '/icon.png',
    tag: data.tag || 'pedido-update',           // tag evita duplicação no SO
    renotify: true,                              // renotifica mesma tag com novidade
    data: {
      orderCode: data.orderCode || '',
      url: data.url || '/',
    },
    actions: data.orderCode
      ? [{ action: 'open', title: 'Ver Pedido' }]
      : [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ──────────────────────────────────────────────────────────────
// EVENTO: notificationclick — ao clicar na notificação
// ──────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const orderCode = event.notification.data?.orderCode;
  const targetUrl = orderCode
    ? `/pedido/${orderCode}`
    : (event.notification.data?.url || '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já tem uma aba aberta do site, foca e navega
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Caso contrário abre nova aba
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ──────────────────────────────────────────────────────────────
// EVENTO: install / activate — limpeza de cache antigo
// ──────────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
