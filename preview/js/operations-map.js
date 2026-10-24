/* A live, schematic district: navigate real operations without changing the campaign. */
(function () {
  'use strict';
  const host = document.getElementById('ae-showroom');
  if (!host) return;
  const art = Object.freeze({
    url: new URL('../assets/district-campus.webp', document.currentScript.src).href,
    width: 1024, height: 1536,
    zones: Object.freeze({
      garage: Object.freeze([.0537, .3320, .4688, .2930]),
      factory: Object.freeze([.4004, .0586, .5615, .3320]),
      projects: Object.freeze([.4443, .5697, .5225, .3125])
    })
  });
  const amount = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const positive = value => Math.max(0, amount(value));
  const money = value => Math.round(value).toLocaleString('pt-BR') + ' CR';
  const plural = (value, one, many) => value + ' ' + (value === 1 ? one : many);
  function snapshot() {
    const game = typeof s === 'undefined' ? {} : s;
    const economy = game.empire?.economy || {};
    const factory = economy.factory || {};
    const studio = economy.studio || {};
    const stock = Array.isArray(game.stock) ? game.stock : [];
    const jobs = Array.isArray(factory.queue) ? factory.queue.filter(job => job && typeof job === 'object') : [];
    const main = jobs.filter(job => !job.plantId);
    const day = Math.max(1, Math.floor(positive(game.day)));
    const capacity = Math.max(0, Math.floor(positive(game.slots)));
    const free = Math.max(0, capacity - stock.length - jobs.length);
    const offers = stock.reduce((sum, car) => sum + (Array.isArray(car?.offers) ? car.offers.length : 0), 0);
    const dueDates = main.map(job => Number(job.due)).filter(Number.isFinite);
    const dueDay = dueDates.length ? Math.min(...dueDates) : null;
    const rawCrisis = economy.crisis || {};
    const city = window.AEWorld?.cities?.find(item => item.id === game.empire?.world?.active);
    const applies = rawCrisis.id && rawCrisis.id !== 'stable' && day < amount(rawCrisis.end) && (!rawCrisis.region || rawCrisis.region === city?.country);
    const crisis = applies ? { id: rawCrisis.id, name: String(rawCrisis.name || 'Crise regional') } : { id: 'stable', name: 'Estabilidade' };
    const opened = Boolean(factory.opened);
    const cost = Math.round(110000 * Math.max(1, Math.min(3, amount(economy.inflation) || 1)));
    const status = economy.bankrupt ? 'bankrupt' : !opened ? 'unbuilt' : ['war', 'supply'].includes(crisis.id) ? 'crisis' : main.length && stock.length >= capacity ? 'storage-full' : main.length ? 'working' : 'ready';
    return Object.freeze({
      day, paused: typeof paused === 'undefined' || Boolean(paused), bankrupt: Boolean(economy.bankrupt),
      garage: Object.freeze({ stock: stock.length, capacity, offers, reserved: jobs.length, free,
        status: offers ? 'offers' : stock.length >= capacity ? 'full' : !free ? 'reserved' : 'ready' }),
      factory: Object.freeze({ opened, mainJobs: main.length, totalJobs: jobs.length,
        capacity: Math.max(1, Math.min(4, Math.floor(positive(factory.level)) || 1)) * 2,
        etaDays: dueDay === null ? null : Math.max(0, Math.ceil(dueDay - day)), dueDay,
        status, cost, missing: opened ? 0 : Math.max(0, cost - amount(game.cash)), brand: String(factory.brand || '') }),
      projects: Object.freeze({ count: Array.isArray(studio.designs) ? studio.designs.length : 0,
        research: positive(studio.research), status: studio.designs?.length ? 'ready' : 'empty' }),
      crisis: Object.freeze(crisis)
    });
  }
  host.classList.add('ae-map-host');
  host.setAttribute('aria-labelledby', 'ae-map-title');
  host.innerHTML = '<div id="ae-operations-map"><div class="ae-map-heading"><span class="ae-map-kicker">SEU IMPÉRIO AUTOMOTIVO</span><h1 id="ae-map-title">O seu distrito</h1><p>Explore o mapa. Toque nos prédios para administrar.</p></div>' +
    '<div class="ae-district-board"><img class="ae-campus-scene" src="' + art.url + '" width="' + art.width + '" height="' + art.height + '" alt="Distrito automotivo com garagem, fábrica e centro de projetos ligados por ruas" decoding="async" fetchpriority="high"/></div>' +
    '<div class="ae-map-readout" aria-label="Situação da empresa"></div>' +
    '<p id="ae-map-simulation" class="ae-map-simulation"></p><p id="ae-map-network" class="ae-map-network" hidden></p>' +
    '<div class="ae-map-actions"><button id="ae-explore-market" type="button">Explorar mercado <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10"/></svg></button><a class="ae-gallery-link">Modelos e cores</a></div></div>';
  const board = host.querySelector('.ae-district-board');
  const readout = host.querySelector('.ae-map-readout');
  const nodes = new Map();
  for (const [id, label] of [['garage', 'Garagem'], ['factory', 'Fabricante'], ['projects', 'Projetos e P&D']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'ghost ae-map-node ae-map-' + id; button.dataset.mapNode = id;
    button.setAttribute('aria-labelledby', 'ae-map-name-' + id);
    button.setAttribute('aria-describedby', 'ae-map-status-' + id + ' ae-map-detail-' + id);
    const [x, y, width, height] = art.zones[id];
    button.style.left = x * 100 + '%'; button.style.top = y * 100 + '%';
    button.style.width = width * 100 + '%'; button.style.height = height * 100 + '%';
    button.innerHTML = '<span class="ae-map-place"><span class="ae-map-place-dot" aria-hidden="true"></span><span id="ae-map-name-' + id + '">' + label + '</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10"/></svg></span>';
    const row = document.createElement('div'); row.className = 'ae-map-readout-row'; row.dataset.mapReadout = id;
    row.innerHTML = '<strong>' + label + '</strong><span data-map-status id="ae-map-status-' + id + '"></span><small data-map-detail id="ae-map-detail-' + id + '"></small>';
    button.addEventListener('click', () => visit(id)); board.append(button); readout.append(row);
    nodes.set(id, { button, row, status: row.querySelector('[data-map-status]'), detail: row.querySelector('[data-map-detail]') });
  }
  const gallery = host.querySelector('.ae-gallery-link');
  gallery.href = new URLSearchParams(location.search).get('campaign') === 'main' ? './galeria/?campaign=main' : './galeria/';
  host.querySelector('#ae-explore-market').addEventListener('click', () => { show('market'); window.scrollTo({ top: 0, behavior: 'auto' }); });
  const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  let signature = '';
  function refresh() {
    const next = snapshot(), key = JSON.stringify(next);
    if (key === signature) return;
    signature = key;
    const { garage, factory, projects } = next;
    for (const [id, value] of [['garage', garage], ['factory', factory], ['projects', projects]]) {
      const node = nodes.get(id);
      if (node.button.dataset.state !== value.status) node.button.dataset.state = value.status;
      if (node.row.dataset.state !== value.status) node.row.dataset.state = value.status;
    }
    setText(nodes.get('garage').status, garage.offers ? plural(garage.offers, 'proposta', 'propostas') : garage.status === 'full' ? 'Estoque cheio' : garage.status === 'reserved' ? 'Vagas reservadas' : 'Seu estoque');
    setText(nodes.get('garage').detail, garage.stock + '/' + garage.capacity + ' veículos · ' + plural(garage.free, 'vaga livre', 'vagas livres') + (garage.reserved ? ' · ' + plural(garage.reserved, 'reserva', 'reservas') : ''));
    const labels = { unbuilt: 'Falta fundar', ready: 'Sem ordens na fila', working: plural(factory.mainJobs, 'ordem na fila', 'ordens na fila'), 'storage-full': 'Estoque cheio', crisis: 'Produção suspensa', bankrupt: 'Campanha encerrada' };
    setText(nodes.get('factory').status, labels[factory.status]);
    let detail;
    if (factory.status === 'bankrupt') detail = 'Confira a situação da empresa.';
    else if (!factory.opened) detail = 'Fundação: ' + money(factory.cost) + (factory.missing ? ' · faltam ' + money(factory.missing) : ' · capital disponível');
    else if (factory.status === 'crisis') detail = next.crisis.name + ' · consulte a previsão.';
    else if (factory.status === 'storage-full') detail = (factory.etaDays === 0 ? 'Entrega aguarda vaga' : factory.etaDays === null ? 'Produção com entrega a confirmar' : 'Próxima entrega em ' + plural(factory.etaDays, 'dia', 'dias')) + ' · libere espaço no estoque compartilhado.';
    else detail = factory.mainJobs + '/' + factory.capacity + ' linhas ocupadas' + (factory.dueDay === null ? '' : factory.etaDays ? ' · próxima entrega em ' + plural(factory.etaDays, 'dia', 'dias') : ' · entrega aguarda avanço');
    setText(nodes.get('factory').detail, detail);
    setText(nodes.get('projects').status, projects.count ? plural(projects.count, 'homologado', 'homologados') : 'Crie seu primeiro modelo');
    setText(nodes.get('projects').detail, plural(projects.research, 'ponto P&D', 'pontos P&D'));
    setText(host.querySelector('#ae-map-simulation'), next.paused ? 'Simulação pausada · avance os dias para produzir.' : 'Simulação em andamento · prazos em dias do jogo.');
    const network = host.querySelector('#ae-map-network'), otherJobs = factory.totalJobs - factory.mainJobs;
    network.hidden = !otherJobs;
    setText(network, otherJobs ? plural(otherJobs, 'ordem em outra unidade', 'ordens em outras unidades') + ' · estoque compartilhado.' : '');
  }
  function focusPanel(target) {
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.scrollIntoView({ block: 'start', behavior: 'auto' });
    target.focus({ preventScroll: true });
  }
  function visit(id) {
    show('garage');
    if (id === 'garage') {
      const overview = document.querySelector('[data-workspace="overview"]');
      if (overview?.getAttribute('aria-pressed') !== 'true') overview?.click();
      focusPanel(document.getElementById('stock'));
      return;
    }
    window.AEManagement?.openArea('factory', id === 'projects' ? 'fold-ae-studio' : 'fold-ae-economy');
    focusPanel(document.getElementById(id === 'projects' ? 'ae-studio' : snapshot().factory.mainJobs ? 'ae-factory-planning' : 'ae-economy'));
  }
  const previousRender = render;
  render = function () { const result = previousRender.apply(this, arguments); refresh(); return result; };
  (window.aeUiRefreshers || (window.aeUiRefreshers = [])).push(refresh);
  window.AEOperationsMap = Object.freeze({ snapshot, refresh, art, visit });
  refresh();
})();
