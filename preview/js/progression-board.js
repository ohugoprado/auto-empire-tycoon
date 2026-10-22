/* Visible company milestones, derived from campaign progress without new rewards. */
(function () {
  'use strict';
  const overview = document.getElementById('ae-workspace-overview');
  if (!overview) return;
  const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const definitions = [
    { id: 'first', title: 'Feche sua primeira venda', target: 1, unit: 'venda', read: game => number(game.sales), action: 'trade' },
    { id: 'garage', title: 'Dê espaço ao próximo negócio', target: 3, unit: 'vagas', read: game => number(game.slots), action: 'expand' },
    { id: 'team', title: 'Forme sua primeira equipe', target: 1, unit: 'pessoa', read: game => Object.values(game.empire?.staff || {}).reduce((sum, count) => sum + number(count), 0), action: 'team' },
    { id: 'five', title: 'Conclua cinco vendas', target: 5, unit: 'vendas', read: game => number(game.sales), action: 'trade' },
    { id: 'reputation', title: 'Construa uma boa reputação', target: 70, unit: 'de reputação', read: game => number(game.rep), action: 'trade' },
    { id: 'network', title: 'Abra sua segunda unidade', target: 2, unit: 'unidades', read: game => number(game.empire?.branches), action: 'branch' },
    { id: 'ten', title: 'Chegue à décima venda', target: 10, unit: 'vendas', read: game => number(game.sales), action: 'trade' },
    { id: 'capital', title: 'Construa sua reserva de caixa', target: 100000, unit: 'CR', read: game => number(game.cash), action: 'trade' }
  ];

  function snapshot() {
    if (typeof s === 'undefined' || !s) return Object.freeze({ completed: 0, total: definitions.length, current: null, goals: Object.freeze([]) });
    const recorded = s.empire?.achievements || {};
    const goals = definitions.map(goal => {
      const actual = goal.read(s);
      const completed = Boolean(recorded[goal.id]) || actual >= goal.target;
      return Object.freeze({
        id: goal.id, title: goal.title, value: completed ? goal.target : Math.min(goal.target, actual),
        target: goal.target, unit: goal.unit, percent: completed ? 100 : Math.round(Math.min(1, actual / goal.target) * 100),
        completed, action: goal.action
      });
    });
    return Object.freeze({ completed: goals.filter(goal => goal.completed).length, total: goals.length, current: goals.find(goal => !goal.completed) || null, goals: Object.freeze(goals) });
  }

  const panel = document.createElement('section');
  panel.id = 'ae-progression-board';
  panel.setAttribute('aria-labelledby', 'ae-progression-title');
  panel.innerHTML = '<div class="ae-progression-head"><span class="ae-progression-eyebrow">SEU PRÓXIMO MARCO</span><span id="ae-progression-count"></span></div>' +
    '<div class="ae-progression-main"><div><h2 id="ae-progression-title"></h2><p id="ae-progression-value"></p></div><button type="button" id="ae-progression-action"></button></div>' +
    '<div class="ae-progression-track" id="ae-progression-bar" role="progressbar" aria-valuemin="0"><span></span></div>' +
    '<details class="ae-progression-details"><summary>Marcos da empresa</summary><ol id="ae-progression-goals"></ol><p>O progresso usa os marcos da sua campanha. Você escolhe quando jogar e o que fazer a seguir.</p></details>';
  const showroom = document.getElementById('ae-showroom');
  if (showroom) showroom.before(panel); else overview.prepend(panel);
  const rows = new Map();
  for (const goal of definitions) {
    const row = document.createElement('li');
    const state = document.createElement('span'); state.className = 'ae-progression-goal-state'; state.setAttribute('aria-hidden', 'true');
    const title = document.createElement('span'); title.textContent = goal.title;
    const value = document.createElement('span'); value.className = 'ae-progression-goal-value';
    row.append(state, title, value); panel.querySelector('ol').append(row);
    rows.set(goal.id, { row, state, value });
  }
  const title = panel.querySelector('h2'), value = panel.querySelector('#ae-progression-value');
  const bar = panel.querySelector('[role="progressbar"]'), fill = bar.firstElementChild;
  const action = panel.querySelector('button');
  const count = panel.querySelector('#ae-progression-count');
  let last = '';
  function formatting(goal) {
    const amount = Math.floor(goal.value).toLocaleString('pt-BR');
    const target = goal.target.toLocaleString('pt-BR');
    return amount + ' / ' + target + ' ' + goal.unit;
  }
  function actionFor(goal) {
    if (!goal) return { id: 'garage', label: 'Ver minha garagem' };
    if (goal.action === 'expand') return { id: 'expand', label: 'Ver expansão' };
    if (goal.action === 'team') return { id: 'team', label: 'Conhecer a equipe' };
    if (goal.action === 'branch') return { id: 'branch', label: 'Ver próxima unidade' };
    if (s.stock.some(car => car.offers?.length)) return { id: 'offers', label: 'Analisar propostas' };
    if (s.stock.length) return { id: 'garage', label: 'Cuidar do estoque' };
    return { id: 'market', label: 'Encontrar um carro' };
  }
  function refresh() {
    const next = snapshot();
    const choice = actionFor(next.current);
    const signature = JSON.stringify([next, choice, s.stock.length > 0, number(s.sales) > 0]);
    if (signature === last) return;
    last = signature;
    document.body.classList.add('ae-next');
    document.body.classList.toggle('ae-has-stock', s.stock.length > 0);
    document.body.classList.toggle('ae-has-sales', number(s.sales) > 0);
    count.textContent = next.completed + ' / ' + next.total + ' marcos';
    title.textContent = next.current?.title || 'Seu império está crescendo';
    value.textContent = next.current ? formatting(next.current) : 'Todos os oito marcos desta etapa foram conquistados.';
    action.dataset.progressionAction = choice.id; action.textContent = choice.label;
    const current = next.current;
    bar.setAttribute('aria-label', current?.title || 'Marcos da empresa');
    bar.setAttribute('aria-valuemax', String(current?.target || next.total));
    bar.setAttribute('aria-valuenow', String(current?.value ?? next.completed));
    bar.setAttribute('aria-valuetext', current ? formatting(current) : next.completed + ' marcos conquistados');
    fill.style.width = (current?.percent ?? 100) + '%';
    for (const goal of next.goals) {
      const nodes = rows.get(goal.id);
      nodes.row.dataset.completed = String(goal.completed);
      nodes.state.textContent = goal.completed ? '✓' : '○';
      nodes.value.textContent = goal.completed ? 'Conquistado' : formatting(goal);
    }
  }
  function showOverview() {
    show('garage');
    const tab = document.querySelector('[data-workspace="overview"]');
    if (tab?.getAttribute('aria-pressed') !== 'true') tab?.click();
  }
  function openGrowth(tabName) {
    show('garage');
    const management = document.querySelector('[data-workspace="management"]');
    if (management?.getAttribute('aria-pressed') !== 'true') management?.click();
    const target = document.getElementById('ae-empire-panel');
    const details = target?.closest('details');
    if (details) details.open = true;
    target?.querySelector('[data-empire-tab="' + tabName + '"]')?.click();
    target?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  action.addEventListener('click', () => {
    const choice = actionFor(snapshot().current).id;
    if (choice === 'market') { show('market'); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
    if (choice === 'team') return openGrowth('staff');
    if (choice === 'branch') return openGrowth('expansion');
    if (choice === 'expand') { showOverview(); document.getElementById('ae-expand-garage')?.scrollIntoView({ block: 'center', behavior: 'auto' }); return; }
    if (choice === 'offers') {
      const car = s.stock.find(item => item.offers?.length);
      if (car) offersDialog(car.id);
      return;
    }
    showOverview(); document.getElementById('stock')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  });

  const heroTitle = document.getElementById('ae-showroom-title');
  if (heroTitle) heroTitle.innerHTML = 'Da garagem<br><em>ao império.</em>';
  const heroCopy = document.querySelector('#ae-showroom .ae-showroom-copy > p');
  if (heroCopy) heroCopy.textContent = 'Escolha seu próximo carro. Faça um bom negócio. Construa sua própria história.';
  const galleryLink = document.querySelector('#ae-showroom .ae-gallery-link');
  if (galleryLink) galleryLink.textContent = 'Explorar modelos e cores';
  const tag = document.querySelector('.top .tag');
  if (tag) tag.textContent = 'MOTOR DISTRICT · SEU IMPÉRIO AUTOMOTIVO';
  const oldRender = render;
  render = function () { const result = oldRender.apply(this, arguments); refresh(); return result; };
  (window.aeUiRefreshers || (window.aeUiRefreshers = [])).push(refresh);
  window.AEProgression = Object.freeze({ snapshot, refresh });
  refresh();
})();
