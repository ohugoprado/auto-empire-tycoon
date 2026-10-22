/* Motor District: network-first updates with a complete offline application shell. */
'use strict';
const PREFIX = 'auto-empire-';
const CACHE = PREFIX + 'motor-district-6000';
const ASSETS = [
  "./",
  "./index.html",
  "./preview/",
  "./preview/?campaign=main",
  "./preview/index.html",
  "./preview/galeria/",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./preview/assets/fleet-models-a.webp",
  "./preview/assets/fleet-models-b.webp",
  "./preview/js/save-backups.js?v=5200",
  "./preview/js/trade-math.js?v=1930",
  "./preview/js/text-management.js?v=1930",
  "./preview/js/company-intro.js?v=2400",
  "./preview/js/staff-system.js?v=5200",
  "./preview/js/empire-systems.js?v=5200",
  "./preview/js/quality-pack.js?v=5200",
  "./preview/js/world-expansion.js?v=2400",
  "./preview/js/global-economy.js?v=4400",
  "./preview/js/operations-finance.js?v=5200",
  "./preview/js/vehicle-design-studio.js?v=2700",
  "./preview/js/iphone-experience.js?v=5200",
  "./preview/js/iphone-dashboard.js?v=3000",
  "./preview/js/iphone-command-center.js?v=3100",
  "./preview/js/iphone-trading.js?v=5100",
  "./preview/js/iphone-negotiation.js?v=3300",
  "./preview/js/negotiation-depth.js?v=3400",
  "./preview/js/buyer-intelligence.js?v=3500",
  "./preview/js/corporate-banking.js?v=5100",
  "./preview/js/icon-design-system.js?v=3800",
  "./preview/js/cohesive-layout.js?v=3900",
  "./preview/js/management-navigation.js?v=4000",
  "./preview/js/iphone-workspace.js?v=4100",
  "./preview/js/trading-flow.js?v=4200",
  "./preview/js/iphone-dialog-accessibility.js?v=5201",
  "./preview/js/factory-planning.js?v=4600",
  "./preview/js/manufacturer-rivals.js?v=4700",
  "./preview/js/vehicle-sprites.js?v=6000",
  "./preview/js/vehicle-appearance.js?v=6000",
  "./preview/js/visual-redesign.js?v=6000",
  "./preview/js/trade-summary.js?v=6000",
  "./preview/js/first-sale-guide.js?v=6000",
  "./preview/js/progression-board.js?v=6000",
  "./preview/js/runtime-performance.js?v=5100",
  "./preview/js/pwa-updates.js?v=5100",
  "./preview/css/visual-redesign.css?v=5200",
  "./preview/css/vehicle-collection.css?v=6000",
  "./preview/css/trade-summary.css?v=6000",
  "./preview/css/first-sale-guide.css?v=6000",
  "./preview/css/motor-district-next.css?v=6000"
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const saved = await cache.match(request, { ignoreSearch: true });
      if (saved) return saved;
      if (request.mode === 'navigate') {
        const app = await cache.match(new URL('./preview/', self.registration.scope).href);
        if (app) return app;
      }
      return Response.error();
    }
  })());
});
