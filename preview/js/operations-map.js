/* A live, schematic district: navigate real operations without changing the campaign. */
(function () {
  'use strict';
  const host = document.getElementById('ae-showroom');
  if (!host) return;
  const art = Object.freeze({
    url: new URL('../assets/district-buildings.webp', document.currentScript.src).href,
    width: 1536, height: 1024,
    boxes: Object.freeze({ garage: '99 384 389 282', factory: '582 370 390 308', projects: '1079 397 377 276' })
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
  host.innerHTML = '<div id="ae-operations-map"><div class="ae-map-heading"><span class="ae-map-kicker">SUA EMPRESA, EM MOVIMENTO</span><h1 id="ae-map-title">Seu distrito automotivo</h1><p>Toque em uma construção para cuidar do negócio.</p></div>' +
    '<div class="ae-district-board"><svg class="ae-district-roads" viewBox="0 0 320 380" preserveAspectRatio="none" aria-hidden="true"><path class="ae-road-edge" d="M75 100 160 195 245 100M160 195v130"/><path class="ae-road" d="M75 100 160 195 245 100M160 195v130"/><path class="ae-road-marking" d="M75 100 160 195 245 100M160 195v130"/></svg></div>' +
    '<p id="ae-map-simulation" class="ae-map-simulation"></p><p id="ae-map-network" class="ae-map-network" hidden></p>' +
    '<div class="ae-map-actions"><button id="ae-explore-market" type="button">Explorar mercado <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10"/></svg></button><a class="ae-gallery-link">Modelos e cores</a></div></div>';
  const board = host.querySelector('.ae-district-board');
  const nodes = new Map();
  for (const [id, label] of [['garage', 'Garagem'], ['factory', 'Fabricante'], ['projects', 'Projetos']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'ghost ae-map-node ae-map-' + id; button.dataset.mapNode = id;
    button.setAttribute('aria-labelledby', 'ae-map-name-' + id);
    button.setAttribute('aria-describedby', 'ae-map-status-' + id + ' ae-map-detail-' + id);
    button.innerHTML = '<span class="ae-district-art-wrap"><svg class="ae-district-art" viewBox="' + art.boxes[id] + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href="' + art.url + '" width="' + art.width + '" height="' + art.height + '"/></svg><span class="ae-map-node-arrow" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 15 15 5M5 5h10v10"/></svg></span></span><span class="ae-map-node-name" id="ae-map-name-' + id + '">' + label + '</span><span class="ae-map-node-status" data-map-status id="ae-map-status-' + id + '"></span><span class="ae-map-node-detail" data-map-detail id="ae-map-detail-' + id + '"></span>';
    button.addEventListener('click', () => visit(id));
    board.append(button);
    nodes.set(id, { button, status: button.querySelector('[data-map-status]'), detail: button.querySelector('[data-map-detail]') });
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
    const panelId=id === 'projects'?'ae-studio':'ae-economy';
    const foldId=id === 'projects'?'fold-ae-studio':'fold-ae-economy';
    if(typeof window.AEManagement?.openArea==='function')window.AEManagement.openArea('factory',foldId);
    const target=document.getElementById(panelId);
    if(target){
      for(let ancestor=target.parentElement;ancestor;ancestor=ancestor.parentElement){
        if(ancestor.classList.contains('ae-panel-content')&&ancestor.hidden){
          const toggle=ancestor.parentElement?.querySelector('.ae-panel-toggle');
          if(toggle)toggle.click();else ancestor.hidden=false;
        }
      }
      focusPanel(target);
    }else{
      const fallback=document.getElementById('ae-industrial-dashboard')||document.getElementById('garage');
      focusPanel(fallback);
    }
  }
  const previousRender = render;
  render = function () { const result = previousRender.apply(this, arguments); refresh(); return result; };
  (window.aeUiRefreshers || (window.aeUiRefreshers = [])).push(refresh);
  window.AEOperationsMap = Object.freeze({ snapshot, refresh, art });
  refresh();
})();
