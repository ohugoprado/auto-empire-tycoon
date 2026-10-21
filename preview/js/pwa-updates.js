/* Refresh installed copies as well as the hosted site; keep campaign data local. */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const worker = new URL('../../sw.js', document.currentScript.src);
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshed = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshed) return;
    refreshed = true;
    if (typeof save === 'function') save();
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(worker.href, { updateViaCache: 'none' })
      .catch(error => console.warn('Modo offline indisponível:', error.message));
  }, { once: true });
})();
