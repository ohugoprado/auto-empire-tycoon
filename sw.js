/* Motor District: network-first updates with a complete offline application shell. */
'use strict';
const PREFIX = 'auto-empire-';
const CACHE = PREFIX + 'motor-district-9001';
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
  "./preview/assets/fleet-models-c.webp",
  "./preview/assets/fleet-models-d.webp",
  "./preview/assets/fleet-models-e.webp",
  "./preview/assets/fleet-models-f.webp",
  "./preview/assets/fleet-models-g.webp",
  "./preview/assets/fleet-models-h.webp",
  "./preview/js/save-backups.js?v=9001",
  "./preview/js/trade-math.js?v=9001",
  "./preview/js/text-management.js?v=9001",
  "./preview/js/company-intro.js?v=9001",
  "./preview/js/staff-system.js?v=9001",
  "./preview/js/empire-systems.js?v=9001",
  "./preview/js/quality-pack.js?v=9001",
  "./preview/js/world-expansion.js?v=9001",
  "./preview/js/global-economy.js?v=9001",
  "./preview/js/operations-finance.js?v=9001",
  "./preview/js/vehicle-design-studio.js?v=9001",
  "./preview/js/iphone-experience.js?v=9001",
  "./preview/js/iphone-dashboard.js?v=9001",
  "./preview/js/iphone-command-center.js?v=9001",
  "./preview/js/iphone-trading.js?v=9001",
  "./preview/js/iphone-negotiation.js?v=9001",
  "./preview/js/negotiation-depth.js?v=9001",
  "./preview/js/buyer-intelligence.js?v=9001",
  "./preview/js/corporate-banking.js?v=9001",
  "./preview/js/icon-design-system.js?v=9001",
  "./preview/js/cohesive-layout.js?v=9001",
  "./preview/js/management-navigation.js?v=9001",
  "./preview/js/iphone-workspace.js?v=9001",
  "./preview/js/trading-flow.js?v=9001",
  "./preview/js/iphone-dialog-accessibility.js?v=9001",
  "./preview/js/factory-planning.js?v=9001",
  "./preview/js/manufacturer-rivals.js?v=9001",
  "./preview/js/vehicle-sprites.js?v=9001",
  "./preview/js/brand-growth.js?v=9001",
  "./preview/js/quality-recalls.js?v=9001",
  "./preview/js/industrial-network.js?v=9001",
  "./preview/js/industrial-dashboard.js?v=9001",
  "./preview/js/plant-profitability.js?v=9001",
  "./preview/js/fleet-variety.js?v=9001",
  "./preview/js/dealer-progression.js?v=9001",
  "./preview/js/market-dynamics.js?v=9001",
  "./preview/js/negotiation-upgrade.js?v=9001",
  "./preview/js/production-orders.js?v=9001",
  "./preview/js/industrial-planning.js?v=9001",
  "./preview/js/production-intelligence.js?v=9001",
  "./preview/js/industrial-cost-control.js?v=9001",
  "./preview/js/weekly-challenges.js?v=9001",
  "./preview/js/empire-levels.js?v=9001",
  "./preview/js/business-opportunities.js?v=9001",
  "./preview/js/market-rivals.js?v=9001",
  "./preview/js/rival-market-pressure.js?v=9001",
  "./preview/js/competitive-events.js?v=9001",
  "./preview/js/strategic-achievements.js?v=9001",
  "./preview/js/rare-opportunities.js?v=9001",
  "./preview/js/business-strategy.js?v=9001",
  "./preview/js/customer-loyalty.js?v=9001",
  "./preview/js/customer-referrals.js?v=9001",
  "./preview/js/mobile-management-hub.js?v=9001",
  "./preview/js/trading-quick-actions.js?v=9001",
  "./preview/js/vehicle-appearance.js?v=9001",
  "./preview/js/visual-redesign.js?v=9001",
  "./preview/js/trade-summary.js?v=9001",
  "./preview/js/first-sale-guide.js?v=9001",
  "./preview/js/progression-board.js?v=9001",
  "./preview/js/runtime-performance.js?v=9001",
  "./preview/js/pwa-updates.js?v=9001",
  "./preview/css/visual-redesign.css?v=9001",
  "./preview/css/vehicle-collection.css?v=9001",
  "./preview/css/trade-summary.css?v=9001",
  "./preview/css/first-sale-guide.css?v=9001",
  "./preview/css/motor-district-next.css?v=9001"
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
