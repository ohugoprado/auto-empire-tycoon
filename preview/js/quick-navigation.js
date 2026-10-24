/* Familiar destinations within reach, without performing a purchase or a game-day advance. */
(function () {
  'use strict';
  if (document.getElementById('ae-quick-nav-button')) return;
  const icon = path => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>';
  const icons = {
    shortcuts: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    market: 'M3 10h18l-2-6H5l-2 6zM5 10v10h14V10M9 20v-6h6v6',
    garage: 'M3 11 12 4l9 7v9H3v-9zM7 20v-7h10v7M7 16h10',
    factory: 'M3 21V10l6 4V9l6 5V5h6v16H3zM7 18h2m3 0h2m3 0h2',
    projects: 'M8 3h8M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M8 14h8',
    network: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18',
    menu: 'M4 6h16M4 12h16M4 18h16',
    simulation: 'M9 5v14l11-7L9 5zM4 5v14'
  };
  const button = document.createElement('button');
  button.id = 'ae-quick-nav-button'; button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'ae-quick-nav'); button.setAttribute('aria-expanded', 'false');
  button.innerHTML = icon(icons.shortcuts) + '<span>Atalhos</span>';
  const dialog = document.createElement('dialog');
  dialog.id = 'ae-quick-nav';
  dialog.setAttribute('aria-labelledby', 'ae-quick-nav-title'); dialog.setAttribute('aria-describedby', 'ae-quick-nav-description');
  dialog.innerHTML = '<div class="ae-quick-nav-head"><div><h2 id="ae-quick-nav-title">Aonde você quer ir?</h2><p id="ae-quick-nav-description">Abra uma área para ver seus controles.</p></div><button id="ae-quick-nav-close" type="button" class="ghost">Fechar</button></div><div class="ae-quick-nav-links"></div><p class="ae-quick-nav-hint">Abrir uma área não compra nem produz veículos.</p>';
  const actions = new Map();
  for (const [id, title, description] of [
    ['market', 'Mercado', 'Encontrar carros e negociar antes de comprar.'],
    ['garage', 'Estoque e propostas', 'Ver seus veículos, anúncios e compradores.'],
    ['factory', 'Fabricante', 'Fundar sua fabricante ou acompanhar entregas.'],
    ['projects', 'Projetos e P&D', 'Pesquisar e desenvolver os seus modelos.'],
    ['network', 'Subsidiárias', 'Administrar unidades e escolher o mercado ativo.'],
    ['menu', 'Menu do jogo', 'Voltar às opções e à ajuda da campanha.'],
    ['simulation', 'Avançar 1 dia', 'Produzir, receber propostas e pagar as despesas do próximo dia.']
  ]) {
    const action = document.createElement('button'); action.type = 'button'; action.className = 'ghost'; action.dataset.quickNav = id;
    action.innerHTML = icon(icons[id]) + '<span><strong>' + title + '</strong><small>' + description + '</small></span>' + icon('M9 6l6 6-6 6');
    action.addEventListener('click', () => navigate(id)); dialog.querySelector('.ae-quick-nav-links').append(action);
    actions.set(id, { button: action, title: action.querySelector('strong'), description: action.querySelector('small') });
  }
  document.body.append(button, dialog);
  let restoreFocus = true, scheduled = false, signature = '';
  const editable = element => element?.matches?.('input,select,textarea,[contenteditable="true"]');
  function obstructed() {
    return Boolean(document.querySelector('#ae-company-screen.is-open, #modal:not(.hide), dialog[open], #ae-turn-overlay:not([hidden])')) || Boolean(editable(document.activeElement)) || Boolean(window.visualViewport && innerHeight - visualViewport.height > 120);
  }
  function position() {
    const nav = document.querySelector('.bottom');
    const height = nav?.getBoundingClientRect().height || 72;
    const offset = Math.ceil(height + 10) + 'px';
    if (button.style.getPropertyValue('--ae-quick-nav-bottom') !== offset) button.style.setProperty('--ae-quick-nav-bottom', offset);
    const clearance = Math.ceil(height) + 'px';
    if (document.body.style.getPropertyValue('--ae-quick-nav-height') !== clearance) document.body.style.setProperty('--ae-quick-nav-height', clearance);
  }
  function visibility() {
    const next = obstructed();
    if (button.hidden !== next) button.hidden = next;
    position();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; visibility(); });
  }
  const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  function refresh() {
    const state = typeof s === 'undefined' ? {} : s;
    const stock = Array.isArray(state.stock) ? state.stock : [];
    const economy = state.empire?.economy || {}, factory = economy.factory || {}, studio = economy.studio || {};
    const offers = stock.reduce((count, car) => count + (Array.isArray(car?.offers) ? car.offers.length : 0), 0);
    const isPaused = typeof paused === 'undefined' || Boolean(paused), ended = Boolean(economy.bankrupt);
    const gameMenuReady = typeof window.AEGameMenu?.open === 'function';
    const next = JSON.stringify([stock.length, offers, Boolean(factory.opened), studio.research || 0, studio.designs?.length || 0, isPaused, ended, gameMenuReady]);
    if (signature !== next) {
      signature = next;
      setText(actions.get('garage').description, stock.length + ' veículo(s) no estoque · ' + offers + ' proposta(s).');
      setText(actions.get('factory').description, factory.opened ? 'Ver linhas e acompanhar as entregas da produção.' : 'Conferir o investimento e fundar sua fabricante.');
      setText(actions.get('projects').description, (Number(studio.research) || 0) + ' pontos P&D · ' + (studio.designs?.length || 0) + ' modelo(s) homologado(s).');
      setText(actions.get('simulation').title, ended ? 'Campanha encerrada' : 'Avançar 1 dia');
      setText(actions.get('simulation').description, ended ? 'Consulte a situação financeira da campanha.' : 'Produzir, receber propostas e pagar as despesas do próximo dia.');
      actions.get('simulation').button.disabled = ended;
      actions.get('menu').button.disabled = !gameMenuReady;
    }
    visibility();
  }
  function openMenu() {
    if (obstructed()) return;
    refresh(); restoreFocus = true;
    dialog.showModal(); button.setAttribute('aria-expanded', 'true'); visibility();
    dialog.querySelector('#ae-quick-nav-close').focus();
  }
  function closeMenu(returnToButton = true) {
    restoreFocus = returnToButton;
    if (dialog.open) dialog.close();
    button.setAttribute('aria-expanded', 'false'); visibility();
  }
  function focusPanel(target) {
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.scrollIntoView({ block: 'start', behavior: 'auto' }); target.focus({ preventScroll: true });
  }
  function visitFallback(id) {
    show('garage');
    if (id === 'garage') {
      const overview = document.querySelector('[data-workspace="overview"]');
      if (overview?.getAttribute('aria-pressed') !== 'true') overview?.click();
      focusPanel(document.getElementById('stock'));
    } else {
      window.AEManagement?.openArea('factory', id === 'projects' ? 'fold-ae-studio' : 'fold-ae-economy');
      focusPanel(document.getElementById(id === 'projects' ? 'ae-studio' : 'ae-economy'));
    }
  }
  function navigate(id) {
    if (!actions.has(id)) return;
    if (id === 'simulation' && (typeof s === 'undefined' || s.empire?.economy?.bankrupt)) return;
    closeMenu(id === 'simulation');
    if (id === 'simulation') { advanceDay(); refresh(); }
    else if (id === 'market') { show('market'); focusPanel(document.getElementById('market')); }
    else if (id === 'network') {
      show('garage'); window.AEManagement?.openArea('network', 'fold-ae-world'); focusPanel(document.getElementById('ae-world'));
    }
    else if (id === 'menu') window.AEGameMenu?.open();
    else if (window.AEOperationsMap?.visit) window.AEOperationsMap.visit(id);
    else visitFallback(id);
  }
  button.addEventListener('click', openMenu);
  dialog.querySelector('#ae-quick-nav-close').addEventListener('click', () => closeMenu());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  dialog.addEventListener('close', () => {
    const shouldRestore = restoreFocus; restoreFocus = true;
    button.setAttribute('aria-expanded', 'false'); visibility();
    if (shouldRestore && !button.hidden) button.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
  });
  new MutationObserver(records => {
    if (records.some(record => record.type === 'attributes' && record.target.matches?.('#modal,#ae-company-screen,#ae-turn-overlay,dialog') || record.type === 'childList' && [...record.addedNodes].some(node => node.matches?.('dialog') || node.querySelector?.('dialog')))) schedule();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'open', 'hidden'] });
  document.addEventListener('focusin', schedule); document.addEventListener('focusout', schedule);
  window.addEventListener('resize', schedule); window.visualViewport?.addEventListener('resize', schedule);
  if (window.ResizeObserver) { const nav = document.querySelector('.bottom'); if (nav) new ResizeObserver(schedule).observe(nav); }
  const previousRender = render;
  render = function () { const result = previousRender.apply(this, arguments); refresh(); return result; };
  (window.aeUiRefreshers || (window.aeUiRefreshers = [])).push(refresh);
  window.AEQuickNavigation = Object.freeze({ open: openMenu, close: closeMenu, refresh });
  refresh();
})();
