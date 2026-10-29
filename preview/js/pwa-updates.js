/* Refresh installed copies as well as the hosted site; keep campaign data local. */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const worker = new URL('../../sw.js', document.currentScript.src);
  const initialController = navigator.serviceWorker.controller;
  let refreshed = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // A first-install claim can already be visible when this script starts,
    // while its controllerchange event is still queued. Only a replacement
    // worker calls for a reload; reloading the same controller interrupts boot.
    if (!initialController || !navigator.serviceWorker.controller || navigator.serviceWorker.controller === initialController || refreshed) return;
    refreshed = true;
    try {
      if (typeof save === 'function') save();
    } catch (error) {
      // Never discard an unsaved campaign just to activate a new worker.
      refreshed = false;
      console.warn('Atualização adiada: não foi possível salvar a campanha.', error);
      return;
    }
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(worker.href, { updateViaCache: 'none' })
      .catch(error => console.warn('Modo offline indisponível:', error.message));
  }, { once: true });
})();
