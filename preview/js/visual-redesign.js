/* One showroom, one inventory, one management workspace. Campaign data stays intact. */
(function () {
  'use strict';
  const sprite = window.AESprites.render;
  carSvg = car => sprite(car, false);
  carRow = function (car) {
    const condition = Math.max(0, Math.min(100, Number(car.condition) || 0));
    const paint = window.AESprites.paintFor(car);
    return '<div class="vehicle" data-car-id="' + Number(car.id) + '">' +
      '<div class="carart">' + sprite(car, false) + '</div><div class="vinfo">' +
      '<div class="ae-car-category">' + esc(car.kind) + '</div><div class="vname">' + esc(car.name) + '</div>' +
      '<div class="ae-car-paint"><span style="background:' + paint.hex + '" aria-hidden="true"></span>' + esc(paint.name) + '</div>' +
      '<div class="tiny">' + esc(car.year) + ' · ' + Number(car.km).toLocaleString('pt-BR') + ' km</div>' +
      '<div class="ae-condition"><span>Conservação</span><b>' + condition + '%</b><span class="ae-condition-track"><i style="width:' + condition + '%"></i></span></div>' +
      '<div class="tiny">Avaliação de mercado · ' + fmt(car.value) + '</div></div></div>';
  };

  document.body.classList.add('ae-redesign');
  document.title = 'Auto Empire Tycoon — Motor District';
  const tag = document.querySelector('.top .tag');
  if (tag) tag.textContent = 'MOTOR DISTRICT · SUA CONCESSIONÁRIA';
  const version = document.getElementById('ae-version');
  if (version) version.textContent = 'AUTO EMPIRE / MOTOR DISTRICT';

  const overview = document.getElementById('ae-workspace-overview');
  const management = document.getElementById('ae-business-section');
  if (!overview || !management) return;
  const showroom = document.createElement('section');
  showroom.id = 'ae-showroom';
  showroom.setAttribute('aria-labelledby', 'ae-showroom-title');
  const arrow = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
  showroom.innerHTML = '<div class="ae-showroom-copy"><div class="ae-kicker"><span></span> SUA CONCESSIONÁRIA, SEU IMPÉRIO</div>' +
    '<h1 id="ae-showroom-title">Pequeno começo.<br><em>Grandes negócios.</em></h1>' +
    '<p>Encontre oportunidades. Prepare sua frota.<br>Transforme boas escolhas em um legado.</p>' +
    '<button type="button" class="ae-primary" id="ae-explore-market">Explorar mercado ' + arrow + '</button>' +
    '<div class="ae-showroom-location"><span aria-hidden="true">◉</span> <span id="ae-showroom-location">São Paulo · Sede principal</span></div></div>' +
    '<div class="ae-showroom-scene" aria-label="Showroom de veículos"><div class="ae-scene-orbit"></div>' +
    '<div class="ae-building"><div class="ae-building-sign">AUTO<span>EMPIRE</span><small>MOTOR DISTRICT</small></div><div class="ae-building-windows"></div></div>' +
    '<div class="ae-showroom-floor"></div><div id="ae-showroom-cars"></div><span class="ae-scene-caption" id="ae-scene-caption">FROTA ILUSTRATIVA</span></div>';
  showroom.querySelector('button').addEventListener('click', () => show('market'));
  const galleryLink = document.createElement('a');
  galleryLink.href = new URLSearchParams(location.search).get('campaign') === 'main' ? './galeria/?campaign=main' : './galeria/';
  galleryLink.className = 'ae-gallery-link';
  galleryLink.textContent = 'Conheça a frota';
  showroom.querySelector('.ae-showroom-location').before(galleryLink);
  overview.prepend(showroom);

  const grid = document.createElement('div');
  grid.className = 'ae-overview-grid';
  showroom.after(grid);
  const command = document.getElementById('ae-command');
  if (command) {
    const title = command.querySelector('h2');
    if (title) title.textContent = 'Sua operação';
    grid.append(command);
  }
  const inventory = document.createElement('section');
  inventory.className = 'ae-inventory';
  inventory.setAttribute('aria-labelledby', 'ae-inventory-title');
  inventory.innerHTML = '<div class="ae-inventory-heading"><div><div class="ae-kicker">SEU PRÓXIMO CAPÍTULO</div><h2 id="ae-inventory-title">Estoque e vendas<span id="ae-inventory-count">0</span></h2></div><button class="ghost" type="button" id="ae-expand-garage">＋ Expandir<small>15.000 CR</small></button></div>';
  inventory.querySelector('button').addEventListener('click', () => expand());
  for (const id of ['ae-trade-stock', 'ae-stock-filters', 'ae-trade-stock-summary', 'stock']) {
    const node = document.getElementById(id);
    if (node) inventory.append(node);
  }
  const legacyStockSort = inventory.querySelector('#ae-stock-sort');
  if (legacyStockSort) legacyStockSort.hidden = true;
  const search = inventory.querySelector('#ae-stock-search');
  if (search) search.placeholder = 'Buscar veículo';
  grid.append(inventory);

  // Keep existing controls and listeners; relocate them to named, collapsible areas.
  const groups = [
    ['Equipe e crescimento', ['ae-staff', 'ae-empire-panel']],
    ['Análise do estoque', ['ae-trade-intelligence', 'ae-management']],
    ['Ferramentas da campanha', ['ae-tools', 'ae-test-bar']]
  ];
  for (const [label, ids] of groups) {
    const details = document.createElement('details');
    details.className = 'ae-management-extra';
    const summary = document.createElement('summary');
    summary.textContent = label;
    details.append(summary);
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) details.append(node);
    }
    management.append(details);
  }
  // Superseded visual/debug summaries remain available to old refreshers, hidden.
  for (const child of [...overview.children]) {
    if (child === showroom || child === grid) continue;
    child.classList.add('ae-legacy-visual');
    child.setAttribute('aria-hidden', 'true');
  }

  const marketHeader = document.querySelector('#market > .section-head .title');
  if (marketHeader) marketHeader.textContent = 'Mercado de veículos';
  const marketNote = document.querySelector('#market > p.tiny');
  if (marketNote) marketNote.textContent = 'O próximo bom negócio está aqui. Compare, vistorie e negocie.';
  const marketAnalysis = document.createElement('details');
  marketAnalysis.className = 'ae-management-extra ae-market-analysis';
  marketAnalysis.innerHTML = '<summary>Análise e tendências de mercado</summary>';
  for (const id of ['ae-intel', 'ae-economy-tip', 'ae-demand']) {
    const node = document.getElementById(id);
    if (node) marketAnalysis.append(node);
  }
  const kindFilter = document.getElementById('ae-kind');
  if (kindFilter) {
    const filterPanel = kindFilter.closest('.panel');
    filterPanel.classList.add('ae-market-category');
    // One sorting control; keep the existing category filter and its listener.
    document.getElementById('ae-sort').closest('.flex').hidden = true;
  }
  document.getElementById('ae-trade-market').before(marketAnalysis);

  // SVG icons are crisp at every scale; no platform-dependent emoji in primary nav.
  const icons = {
    garage: '<path d="m3 10 9-7 9 7v11H3zM8 21v-8h8v8"/>',
    market: '<path d="m5 8 2-4h10l2 4M3 9h18v10H3zM6 19v2m12-2v2M6 13h3m6 0h3"/>',
    reports: '<path d="M4 20h17M7 16v-5m5 5V5m5 11V8"/>',
    events: '<path d="M5 4h14v17H5zM9 2v4m6-4v4M8 11h8m-8 4h5"/>'
  };
  const labels = { garage: 'Garagem', market: 'Mercado', reports: 'Finanças', events: 'Eventos' };
  for (const button of document.querySelectorAll('.bottom [data-tab]')) {
    const key = button.dataset.tab;
    button.setAttribute('aria-label', labels[key]);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + icons[key] + '</svg><span>' + labels[key] + '</span>';
  }

  const onboard = document.querySelector('.ae-onboard-card');
  if (onboard) {
    const art = document.createElement('div');
    art.className = 'ae-onboard-art';
    art.innerHTML = sprite({ kind: 'Esportivo' }, true);
    onboard.prepend(art);
  }

  let lastScene = '';
  function refresh() {
    for (const button of document.querySelectorAll('.bottom [data-tab]')) {
      button.setAttribute('aria-current', button.classList.contains('active') ? 'page' : 'false');
    }
    const pause = document.getElementById('pause');
    pause.setAttribute('aria-label', paused ? 'Continuar simulação' : 'Pausar simulação');
    pause.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">' +
      (paused ? '<path d="m6 3 11 7-11 7z"/>' : '<path d="M5 3h4v14H5zM12 3h4v14h-4z"/>') + '</svg>';
    const count = document.getElementById('ae-inventory-count');
    if (count) count.textContent = String(s.stock.length);
    for (const id of ['ae-stock-filters', 'ae-trade-stock', 'ae-trade-stock-summary']) {
      document.getElementById(id).hidden = s.stock.length === 0;
    }
    const allKinds = document.querySelector('#ae-stock-kind option[value="all"]');
    if (allKinds) allKinds.textContent = 'Categorias';
    const stock = document.getElementById('stock');
    if (!s.stock.length && !stock.querySelector('.ae-empty-stock')) {
      stock.innerHTML = '<div class="ae-empty-stock"><div class="ae-empty-art">' + sprite({ kind: 'Hatch' }, true) + '</div>' +
        '<h3>Uma vaga. Muitas possibilidades.</h3><p>Seu primeiro veículo é o começo de tudo.<br>Encontre uma oportunidade no mercado.</p>' +
        '<button class="ghost" type="button">Encontrar meu primeiro carro ' + arrow + '</button></div>';
      stock.querySelector('button').addEventListener('click', () => show('market'));
    }
    const sceneSignature = JSON.stringify([s.slots, s.stock.length, s.stock.slice(0, 3).map(car => [car.id, car.name, car.kind])]);
    if (sceneSignature !== lastScene) {
      lastScene = sceneSignature;
      const cars = s.stock.length ? s.stock.slice(0, 3) : [{ kind: 'SUV' }, { kind: 'Esportivo' }];
      document.getElementById('ae-showroom-cars').innerHTML = cars.map((car, i) => '<div class="ae-showroom-car ae-showroom-car-' + i + '">' + sprite(car, true) + '</div>').join('');
      document.getElementById('ae-scene-caption').textContent = s.stock.length ? 'SUA FROTA · ' + s.stock.length + '/' + s.slots + ' VAGAS' : 'FROTA ILUSTRATIVA';
    }
    const commandSub = document.getElementById('ae-command-sub');
    if (commandSub) {
      const city = commandSub.textContent.split(' · ')[0];
      document.getElementById('ae-showroom-location').textContent = city + ' · Sede principal';
    }
  }
  const previousRender = render;
  render = function () { const result = previousRender.apply(this, arguments); refresh(); return result; };
  render();
})();
