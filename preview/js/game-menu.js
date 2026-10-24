/* Campaign entry and useful options, using the game's existing profile and save flows. */
(function () {
  'use strict';
  if (document.getElementById('ae-game-menu') || !window.AECompanyProfile) return;
  const profile = window.AECompanyProfile;
  const artwork = new URL('../assets/district-campus.webp', document.currentScript.src).href;
  const dialog = document.createElement('dialog');
  dialog.id = 'ae-game-menu';
  dialog.setAttribute('aria-labelledby', 'ae-game-menu-title');
  dialog.setAttribute('aria-describedby', 'ae-game-menu-intro');
  dialog.innerHTML = '<div class="ae-game-menu-hero"><img src="' + artwork + '" width="1024" height="1536" alt="" decoding="async"><div class="ae-game-menu-hero-shade"></div><button type="button" class="ghost" id="ae-game-menu-close" aria-label="Fechar menu do jogo">Voltar ao jogo</button><div class="ae-game-menu-brand"><p>MOTOR DISTRICT</p><h1 id="ae-game-menu-title">AUTO <span>EMPIRE</span><small>TYCOON</small></h1><p id="ae-game-menu-intro">Da primeira garagem ao seu império automotivo.</p></div></div>' +
    '<div class="ae-game-menu-body"><section data-menu-view="home"><p class="ae-game-menu-kicker">SUA PRÓXIMA CONQUISTA COMEÇA AQUI</p><p id="ae-game-menu-campaign"></p><div class="ae-game-menu-actions"><button type="button" data-menu-action="continue">Continuar campanha</button><button type="button" class="ghost" data-menu-action="new">Nova campanha</button><div class="ae-game-menu-secondary"><button type="button" class="ghost" data-menu-action="options">Opções</button><button type="button" class="ghost" data-menu-action="help">Como jogar</button></div></div><p class="ae-game-menu-local">Seu progresso fica salvo neste navegador. A campanha volta pausada.</p></section>' +
    '<section data-menu-view="new" hidden><button type="button" class="ae-game-menu-back ghost" data-menu-action="home">← Menu principal</button><h2>Escolha seu desafio</h2><p>Defina a dificuldade da nova campanha. Em seguida, escolha sua empresa e sede.</p><fieldset id="ae-game-menu-difficulties"><legend>Dificuldade da nova campanha</legend></fieldset><button type="button" data-menu-action="create">Configurar nova empresa</button><p class="ae-game-menu-local">Se já existe uma campanha, ela só é substituída ao confirmar a criação da empresa.</p></section>' +
    '<section data-menu-view="options" hidden><button type="button" class="ae-game-menu-back ghost" data-menu-action="home">← Menu principal</button><h2>Opções da campanha</h2><div class="ae-game-menu-option-list"><button type="button" class="ghost" data-menu-action="identity"><strong>Identidade da empresa</strong><small>Editar empresa e proprietário.</small></button><button type="button" class="ghost" data-menu-action="backup"><strong>Salvamentos e backup</strong><small>Abrir os controles de exportação e recuperação.</small></button><button type="button" class="ghost" data-menu-action="guide"><strong>Guia da primeira venda</strong><small>Aprender o ciclo de compra, preparação e venda.</small></button></div><p class="ae-game-menu-local">A dificuldade de uma campanha em andamento é mantida. Animações respeitam a redução de movimento do aparelho.</p></section>' +
    '<section data-menu-view="help" hidden><button type="button" class="ae-game-menu-back ghost" data-menu-action="home">← Menu principal</button><h2>Seu primeiro negócio</h2><ol class="ae-game-menu-help"><li><strong>Encontre uma oportunidade</strong><span>Compare preço, conservação e custo de preparação no mercado.</span></li><li><strong>Prepare e anuncie</strong><span>Reparar é opcional. Compare o investimento com o preço desejado.</span></li><li><strong>Espere e negocie</strong><span>Retome a simulação para avançar os dias e receber propostas.</span></li><li><strong>Reinvista e cresça</strong><span>Use o mapa para chegar à fabricante, projetos e estoque.</span></li></ol><p class="ae-game-menu-local">O tempo não avança com o jogo fechado. As campanhas principal e de prévia têm progresso separado; o perfil da empresa é compartilhado. Exporte backups pelos controles em Eventos.</p><button type="button" data-menu-action="guide">Abrir guia da venda</button></section></div>';
  document.body.append(dialog);
  const difficultySet = dialog.querySelector('#ae-game-menu-difficulties');
  for (const [id, mode] of Object.entries(profile.difficulties)) {
    const label = document.createElement('label');
    label.className = 'ae-game-menu-difficulty';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'ae-menu-difficulty'; input.value = id;
    const copy = document.createElement('span'), title = document.createElement('strong'), details = document.createElement('small'), numbers = document.createElement('span');
    title.textContent = mode.name; details.textContent = mode.description;
    numbers.className = 'ae-game-menu-difficulty-numbers';
    numbers.textContent = mode.cash.toLocaleString('pt-BR') + ' CR iniciais · aluguel ' + mode.rent.toLocaleString('pt-BR') + ' CR/30 dias';
    copy.append(title, details, numbers); label.append(input, copy); difficultySet.append(label);
  }
  const views = [...dialog.querySelectorAll('[data-menu-view]')];
  let returnTarget = null;
  function focusPanel(target) {
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.scrollIntoView({ block: 'start', behavior: 'auto' }); target.focus({ preventScroll: true });
  }
  function setView(name, focus = true) {
    for (const view of views) view.hidden = view.dataset.menuView !== name;
    dialog.dataset.view = name;
    if (name === 'new') {
      const value = typeof s !== 'undefined' && Object.hasOwn(profile.difficulties, s.difficulty) ? s.difficulty : 'normal';
      const input = difficultySet.querySelector('input[value="' + value + '"]');
      if (input) input.checked = true;
    }
    if (focus) dialog.querySelector('[data-menu-view="' + name + '"] button, [data-menu-view="' + name + '"] input')?.focus({ preventScroll: true });
    dialog.scrollTop = 0;
  }
  function refresh() {
    const hasProfile = profile.hasProfile();
    dialog.querySelector('[data-menu-action="continue"]').hidden = !hasProfile;
    dialog.querySelector('#ae-game-menu-close').textContent = hasProfile ? 'Voltar ao jogo' : 'Configurar empresa';
    dialog.querySelector('#ae-game-menu-close').setAttribute('aria-label', hasProfile ? 'Fechar menu do jogo' : 'Configurar empresa');
    const state = typeof s === 'undefined' ? {} : s;
    const mode = profile.difficulties[state.difficulty] || profile.difficulties.normal;
    const company = document.querySelector('#ae-company-identity strong')?.textContent || 'Sua nova concessionária';
    dialog.querySelector('#ae-game-menu-campaign').textContent = hasProfile ? company + ' · dia ' + Math.max(1, Math.floor(Number(state.day) || 1)) + ' · ' + mode.name : 'Escolha uma dificuldade e dê o primeiro passo.';
    for (const button of dialog.querySelectorAll('[data-menu-action="identity"],[data-menu-action="backup"],[data-menu-action="guide"]')) button.disabled = !hasProfile;
  }
  function openMenu() {
    if (dialog.open) { refresh(); return true; }
    if (document.querySelector('#modal:not(.hide),dialog[open]')) return false;
    returnTarget = document.activeElement;
    // The main menu is a planning stop. Continuing never resumes the clock or
    // incurs another day of expenses without the player's simulation control.
    if (typeof paused !== 'undefined') paused = true;
    if (typeof render === 'function') render();
    refresh(); setView('home', false); dialog.showModal();
    (dialog.querySelector('[data-menu-action="continue"]:not([hidden])') || dialog.querySelector('[data-menu-action="new"]')).focus({ preventScroll: true });
    return true;
  }
  function closeMenu(restore = true) {
    if (!dialog.open) return;
    dialog.close();
    if (restore) {
      window.AEQuickNavigation?.refresh();
      const canReturn = returnTarget?.isConnected && returnTarget.matches?.('button,a[href],input,select,textarea,[tabindex]') && returnTarget.getClientRects().length && !returnTarget.closest?.('[hidden],dialog:not([open])');
      const target = canReturn ? returnTarget : document.getElementById('ae-quick-nav-button');
      if (target && !target.hidden) target.focus({ preventScroll: true });
    }
    if (!profile.hasProfile() && !document.querySelector('#ae-company-screen.is-open')) profile.edit();
  }
  function openGuide() {
    closeMenu(false);
    window.AEFirstSaleGuide?.resume();
  }
  dialog.addEventListener('click', event => {
    const button = event.target.closest('[data-menu-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.menuAction;
    if (['home', 'new', 'options', 'help'].includes(action)) return setView(action);
    if (action === 'continue') return closeMenu();
    if (action === 'create') {
      const mode = difficultySet.querySelector('input:checked')?.value || 'normal';
      if (profile.startNew(mode)) closeMenu(false);
    } else if (action === 'identity') { closeMenu(false); profile.edit(); }
    else if (action === 'backup') { closeMenu(false); show('events'); focusPanel(document.getElementById('ae-backups') || document.getElementById('events')); }
    else if (action === 'guide') openGuide();
  });
  dialog.querySelector('#ae-game-menu-close').addEventListener('click', () => closeMenu());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  window.AEGameMenu = Object.freeze({ open: openMenu, close: closeMenu, refresh });
  const params = new URLSearchParams(location.search);
  if (params.get('menu') === '1') {
    openMenu();
    params.delete('menu');
    const query = params.toString();
    history.replaceState(history.state, '', location.pathname + (query ? '?' + query : '') + location.hash);
  }
})();
