/* Mobile operations map regression (Chromium + WebKit, 440/320 CSS px).
 * Map navigation is exercised through trusted touch. Explicit scenario fixtures
 * below supply factory/queue/stock combinations only to verify read-only status;
 * they do not claim that the player earned, purchased or manufactured that state.
 * Manufacturing delay/delivery assertions advance the real tickDay engine.
 * The turn UI, rather than an idle clock, performs an explicit day advance.
 * Run: node tests/operations-map.test.js; AE_BROWSER=webkit is also supported.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const artifacts = process.env.AE_MAP_REVIEW_DIR || '/tmp/auto-empire-operations-map';
const engine = process.env.AE_BROWSER || 'chromium';
const profiles = [440, 320];
let server, browser, checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const panelSelector = '#ae-operations-map';
const nodeSelector = key => panelSelector + ' [data-map-node="' + key + '"]';

async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  let output = '', failure;
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  server.once('error', error => { failure = error; });
  server.stdout.on('data', value => { output += value; }); server.stderr.on('data', value => { output += value; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (failure) throw failure;
    if (server.exitCode !== null) throw Error('Map fixture server exited: ' + output);
    try { if ((await fetch(base + '/preview/', { method: 'HEAD' })).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Map fixture server did not become ready: ' + output);
}
async function campaign(page) {
  return page.evaluate(() => ({
    key: KEY, cash: s.cash, day: s.day, sales: s.sales, profit: s.profit, slots: s.slots,
    stock: JSON.parse(JSON.stringify(s.stock)), market: JSON.parse(JSON.stringify(s.market)),
    queue: JSON.parse(JSON.stringify(s.empire.economy.factory.queue)),
    warehouse: JSON.parse(JSON.stringify(s.empire.economy.factory.warehouseCars || [])),
    ledger: JSON.parse(JSON.stringify(s.ledger)), paused,
    other: localStorage.getItem(KEY === 'autoempire_v02' ? 'autoempire_preview_v06' : 'autoempire_v02')
  }));
}
const financial = value => ({
  cash: value.cash, day: value.day, sales: value.sales, profit: value.profit, slots: value.slots,
  stock: value.stock, market: value.market, queue: value.queue, warehouse: value.warehouse, ledger: value.ledger
});
async function tap(locator, label) {
  const box = await locator.boundingBox();
  check(box && box.width >= 44 && box.height >= 44, label + ': touch target is at least 44 x 44 CSS pixels');
  await locator.tap();
}
async function assertLayout(page, label) {
  const actual = await page.evaluate(selector => ({
    width: innerWidth, document: document.documentElement.scrollWidth,
    boxes: [...document.querySelectorAll(selector + ', ' + selector + ' button, ' + selector + ' [data-map-node]')]
      .filter(node => node.getClientRects().length).map(node => {
        const box = node.getBoundingClientRect();
        return { id: node.id || node.dataset.mapNode || node.className, left: box.left, right: box.right };
      })
  }), panelSelector);
  check(actual.document <= actual.width + 1, label + ': document has no horizontal overflow');
  check(actual.boxes.every(box => box.left >= -1 && box.right <= actual.width + 1), label + ': map and controls stay within the viewport: ' + JSON.stringify(actual.boxes));
}
async function assertReadability(page, label) {
  const values = await page.evaluate(() => {
    return ['#ae-map-title', '.ae-map-heading p', '#ae-map-simulation'].map(selector => {
      const element = document.querySelector(selector);
      if (!element) return { selector, contrast: 0, color: 'missing' };
      const color = getComputedStyle(element).color;
      const channels = color.match(/[\d.]+/g)?.map(Number) || [];
      if (channels.length < 3) return { selector, contrast: 0, color };
      const alpha = channels[3] ?? 1;
      const linear = channels.slice(0, 3).map(channel => {
        const value = (channel * alpha + 255 * (1 - alpha)) / 255;
        return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
      });
      const luminance = .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
      return { selector, color, contrast: 1.05 / (luminance + .05) };
    });
  });
  for (const value of values) check(value.contrast >= 4.5,
    label + ': ' + value.selector + ' has at least 4.5:1 contrast against white (' + value.color + ', ' + value.contrast.toFixed(2) + ':1)');
}
async function assertIdleAndExplicitTurn(page, label) {
  const before = await page.evaluate(async selector => {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const root = document.querySelector(selector);
    if (!root) throw Error('Map root missing during idle sample');
    const measurement = { minute: s.minute, day: s.day, cash: s.cash,
      clock: document.querySelector('.day').textContent,
      mutations: 0, nodes: [...root.querySelectorAll('[data-map-node]')] };
    measurement.observer = new MutationObserver(records => { measurement.mutations += records.length; });
    measurement.observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    window.__aeMapIdleMeasurement = measurement;
    return { minute: measurement.minute, day: measurement.day, cash: measurement.cash, clock: measurement.clock };
  }, panelSelector);
  await page.waitForTimeout(2100);
  const after = await page.evaluate(selector => {
    const measurement = window.__aeMapIdleMeasurement;
    measurement.mutations += measurement.observer.takeRecords().length; measurement.observer.disconnect();
    const current = [...document.querySelector(selector).querySelectorAll('[data-map-node]')];
    const result = { minute: s.minute, day: s.day, cash: s.cash, clock: document.querySelector('.day').textContent,
      mutations: measurement.mutations, retained: current.length === measurement.nodes.length && current.every((node, index) => node === measurement.nodes[index]) };
    delete window.__aeMapIdleMeasurement;
    return result;
  }, panelSelector);
  equal(after.minute, before.minute, label + ': idle time does not run a hidden simulation clock');
  equal(after.clock, before.clock, label + ': idle time leaves the displayed turn time unchanged');
  equal(after.day, before.day, label + ': remaining on the map cannot advance a simulated day');
  equal(after.cash, before.cash, label + ': an idle map performs no financial transaction');
  equal(after.mutations, 0, label + ': an idle map has no background DOM rebuild');
  check(after.retained, label + ': idle map preserves its building touch targets');
  const turnBefore = await campaign(page);
  await tap(page.locator('#ae-end-day'), label + ' explicit day advance');
  const turnAfter = await campaign(page);
  equal(turnAfter.day, turnBefore.day + 1, label + ': one real turn-button tap advances exactly one simulated day');
  equal((await snapshot(page)).day, turnAfter.day, label + ': map refreshes from the actual advanced day');
  check(turnAfter.ledger.length < 100, label + ': full fixture ledger remains available for turn accounting');
  const ledgerTotal = value => value.ledger.reduce((sum, item) => sum + item.amount, 0);
  equal(turnAfter.cash - turnBefore.cash, ledgerTotal(turnAfter) - ledgerTotal(turnBefore), label + ': explicit turn cash movement matches real ledger entries');
  check(await page.locator('#ae-turn-overlay').isVisible(), label + ': explicit turn opens its real daily summary');
  await page.locator('#ae-turn-continue').tap();
}

async function showMap(page) {
  await page.locator('.bottom [data-tab="garage"]').tap();
  const overview = page.locator('[data-workspace="overview"]');
  if (await overview.getAttribute('aria-pressed') !== 'true') await overview.tap();
  await page.locator(panelSelector).waitFor({ state: 'visible' });
}
async function snapshot(page) {
  return page.evaluate(() => AEOperationsMap.snapshot());
}
async function assertMapState(page, expected, label) {
  const actual = await snapshot(page);
  for (const [section, values] of Object.entries(expected)) {
    if (values && typeof values === 'object') {
      for (const [key, value] of Object.entries(values)) equal(actual[section][key], value, label + ': ' + section + '.' + key);
    } else equal(actual[section], values, label + ': ' + section);
  }
  for (const name of ['garage', 'factory', 'projects']) {
    const node = page.locator(nodeSelector(name));
    equal(await node.getAttribute('data-state'), actual[name].status, label + ': ' + name + ' exposes the current state');
    const status = page.locator('#ae-map-status-' + name), detail = page.locator('#ae-map-detail-' + name);
    check(await status.isVisible() && (await status.innerText()).trim().length > 0, label + ': ' + name + ' state has a readable external label');
    check(await detail.isVisible() && (await detail.innerText()).trim().length > 0, label + ': ' + name + ' detail is visible outside its transparent touch area');
    equal((await node.getAttribute('aria-describedby')).split(/\s+/).sort(), ['ae-map-detail-' + name, 'ae-map-status-' + name], label + ': ' + name + ' exposes the external live details accessibly');
  }
  return actual;
}
async function assertArtwork(page, label) {
  const result = await page.evaluate(async selector => {
    const art = AEOperationsMap.art, scene = document.querySelector(selector + ' img.ae-campus-scene');
    if (!scene) throw Error('Continuous campus scene is missing');
    await scene.decode();
    const board = scene.parentElement.getBoundingClientRect();
    const zones = {};
    for (const key of ['garage', 'factory', 'projects']) {
      const zone = art.zones[key], [x, y, width, height] = zone;
      const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 40;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(scene, x * scene.naturalWidth, y * scene.naturalHeight, width * scene.naturalWidth, height * scene.naturalHeight, 0, 0, 40, 40);
      const rgba = ctx.getImageData(0, 0, 40, 40).data;
      const colors = new Set(); let fingerprint = 2166136261;
      for (let offset = 0; offset < rgba.length; offset += 4) {
        colors.add([rgba[offset] >> 4, rgba[offset + 1] >> 4, rgba[offset + 2] >> 4].join(','));
        for (let channel = 0; channel < 3; channel++) fingerprint = Math.imul(fingerprint ^ rgba[offset + channel], 16777619) >>> 0;
      }
      const button = document.querySelector(selector + ' [data-map-node="' + key + '"]');
      const rect = button.getBoundingClientRect(), style = getComputedStyle(button);
      const normalized = [(rect.left - board.left) / board.width, (rect.top - board.top) / board.height, rect.width / board.width, rect.height / board.height];
      const channels = style.backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
      zones[key] = { zone, normalized, colors: colors.size, fingerprint,
        transparent: channels.length === 4 && channels[3] === 0,
        borderless: ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'].every(key => Number.parseFloat(style[key]) === 0),
        shadowless: style.boxShadow === 'none', individualImages: button.querySelectorAll('img,image').length };
    }
    const rect = scene.getBoundingClientRect();
    return { width: scene.naturalWidth, height: scene.naturalHeight, url: scene.currentSrc, expected: art.url, zones,
      imageCount: document.querySelectorAll(selector + ' img.ae-campus-scene').length,
      scale: rect.width / rect.height, contained: getComputedStyle(scene).objectFit === 'contain' };
  }, panelSelector);
  equal([result.width, result.height], [1024, 1536], label + ': the continuous campus image decodes at its intended resolution');
  equal(result.imageCount, 1, label + ': one shared scene integrates all three buildings');
  equal(result.url, result.expected, label + ': the rendered scene is the actual configured local artwork');
  check(Math.abs(result.scale - 2 / 3) < .005 && result.contained, label + ': the whole campus scales proportionally without cover-cropping');
  for (const [name, value] of Object.entries(result.zones)) {
    const [x, y, width, height] = value.zone;
    check(value.zone.length === 4 && value.zone.every(Number.isFinite) && x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1,
      label + ': ' + name + ' touch region lies within the shared scene');
    check(value.normalized.every((valueAt, index) => Math.abs(valueAt - value.zone[index]) < .004), label + ': ' + name + ' touch region follows the building while the map scales');
    check(value.colors > 80, label + ': ' + name + ' region contains varied real scene artwork rather than an empty placeholder');
    check(value.transparent && value.borderless && value.shadowless, label + ': ' + name + ' remains an integrated transparent touch region without a separate card');
    equal(value.individualImages, 0, label + ': ' + name + ' uses the shared scenery rather than an isolated image-button');
  }
  equal(new Set(Object.values(result.zones).map(value => value.fingerprint)).size, 3, label + ': the three destinations correspond to visually different regions');
}

async function fixture(page) {
  // Explicit display fixture: two owned cars, two homologated projects and three
  // queued jobs, one belonging to an extra plant. No purchase/foundation is claimed.
  await page.evaluate(() => {
    paused = true; s.day = 9; s.minute = 600; s.slots = 8;
    s.stock = [makeCar(), makeCar()];
    for (const car of s.stock) { car.offers = []; car.listed = false; }
    const e = s.empire.economy, f = e.factory;
    e.inflation = 1.25; e.bankrupt = false;
    e.crisis = { id: 'stable', name: 'Estabilidade', end: 0, region: null };
    Object.assign(f, { opened: true, brand: 'Distrito Motors', level: 2, produced: 0,
      workforce: { staff: 12, shift: 1 }, warehouseCapacity: 20, warehouseCars: [], autoDistribution: false,
      queue: [
        { model: 'Fixture Compact', kind: 'Compacto', due: 15, cost: 1000, value: 1400, designId: 9001, quality: 70, supplier: 'standard' },
        { model: 'Fixture Hatch', kind: 'Hatch', due: 17, cost: 1200, value: 1600, designId: 9002, quality: 70, supplier: 'standard' },
        { plantId: 701, model: 'Fixture Plant', kind: 'SUV', due: 11, cost: 2000, value: 2600, designId: 9003, quality: 70, supplier: 'standard' }
      ] });
    e.plantNetwork = { ...(e.plantNetwork || {}), nextId: 702,
      plants: [{ id: 701, name: 'Unidade do cenário', level: 3, staff: 0, specialty: 'Geral' }] };
    e.studio.research = 7;
    e.studio.designs = [
      { id: 9001, name: 'Fixture Compact', kind: 'Compacto', engine: 'economico', position: 'standard', safety: 3, reliability: 3, tech: 3, comfort: 3, cost: 1000, value: 1400, quality: 70, research: 3, days: 5 },
      { id: 9002, name: 'Fixture Hatch', kind: 'Hatch', engine: 'equilibrado', position: 'standard', safety: 3, reliability: 3, tech: 3, comfort: 3, cost: 1200, value: 1600, quality: 70, research: 3, days: 7 }
    ];
    // Settle genuine garage milestones using the real engine before recording the
    // read-only navigation baseline. The resulting balance/ledger are not faked.
    tickDay(); save(); render();
  });
}
async function runProfile(base, width) {
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'], viewport: { width, height: 763 } });
  await context.addInitScript(() => {
    Math.random = () => .6;
    localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({ company: 'Distrito Teste', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo' }));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], missing = [], dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base + '/')) missing.push(response.status() + ' ' + response.url()); });
  page.on('dialog', dialog => { dialogs.push(dialog.type() + ': ' + dialog.message()); return dialog.dismiss(); });
  const label = engine + '-' + width;
  try {
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    await showMap(page);
    check(await page.evaluate(() => typeof window.AEOperationsMap?.snapshot === 'function'), label + ': real HTML loads the operations map API');
    equal(await page.locator(panelSelector + ' [data-map-node]').count(), 3, label + ': exactly three operational destinations exist');
    equal(await page.locator(panelSelector + ' button button').count(), 0, label + ': interactive buildings do not contain nested buttons');
    for (const [name, word] of [['garage', /garagem/i], ['factory', /fabricante|fábrica/i], ['projects', /projetos|P&D/i]]) {
      const node = page.locator(nodeSelector(name));
      check(await node.evaluate(element => element.tagName === 'BUTTON'), label + ': ' + name + ' uses a semantic button');
      check(word.test(await node.innerText()), label + ': ' + name + ' has a human-readable name');
      check(await node.isEnabled(), label + ': ' + name + ' can be touched even before foundation');
    }
    await assertMapState(page, { paused: true, garage: { stock: 0, capacity: 1, offers: 0, reserved: 0, free: 1, status: 'ready' },
      factory: { opened: false, mainJobs: 0, totalJobs: 0, capacity: 2, etaDays: null, dueDay: null, status: 'unbuilt', cost: 110000, missing: 75000 },
      projects: { count: 0, research: 0, status: 'empty' } }, label + ' fresh map');
    check(/turno|avan[cç]e.*dia/i.test(await page.locator('#ae-map-simulation').innerText()), label + ': explicit simulated-day advancement is explained on the map');
    await assertLayout(page, label + ' initial map');
    await assertReadability(page, label + ' initial map');
    if (width === 440) await assertArtwork(page, label);
    await page.locator(panelSelector).screenshot({ path: path.join(artifacts, label + '-empty-map.png'), scale: 'css', style: 'nav.bottom,#ae-quick-nav-button,#ae-end-day{visibility:hidden!important}' });
    const readOnly = await page.evaluate(() => {
      const before = JSON.stringify(s), factoryFrozen = Object.isFrozen(s.empire.economy.factory), queueFrozen = Object.isFrozen(s.empire.economy.factory.queue);
      const value = AEOperationsMap.snapshot();
      return { unchanged: JSON.stringify(s) === before, frozen: Object.isFrozen(value) && ['garage', 'factory', 'projects', 'crisis'].every(key => Object.isFrozen(value[key])),
        originalUnchanged: Object.isFrozen(s.empire.economy.factory) === factoryFrozen && Object.isFrozen(s.empire.economy.factory.queue) === queueFrozen };
    });
    check(readOnly.unchanged && readOnly.originalUnchanged, label + ': snapshot reads without mutating or freezing campaign objects');
    check(readOnly.frozen, label + ': map snapshots and nested public summaries are immutable');
    const beforeNavigation = financial(await campaign(page));
    await tap(page.locator(nodeSelector('factory')), label + ' closed manufacturer node');
    check(await page.locator('#ae-mgmt-view-factory').isVisible(), label + ': factory node selects the actual management area');
    equal(await page.locator('#fold-ae-economy > .ae-fold-head').getAttribute('aria-expanded'), 'true', label + ': factory node reveals foundation controls');
    check(await page.locator('#ae-economy [data-econ="open"]').isVisible(), label + ': closed factory leads to the real opening action');
    equal(financial(await campaign(page)), beforeNavigation, label + ': opening foundation details spends nothing and creates no job');
    await showMap(page);
    await tap(page.locator(nodeSelector('projects')), label + ' projects node');
    check(await page.locator('#ae-studio').isVisible(), label + ': projects node opens the real development studio');
    equal(await page.locator('#fold-ae-studio > .ae-fold-head').getAttribute('aria-expanded'), 'true', label + ': development controls are expanded');
    equal(financial(await campaign(page)), beforeNavigation, label + ': visiting projects does not buy research or homologate');
    await showMap(page);
    await tap(page.locator(nodeSelector('garage')), label + ' garage node');
    check(await page.locator('#stock').isVisible(), label + ': garage node reveals actual inventory');
    equal(await page.locator('[data-workspace="overview"]').getAttribute('aria-pressed'), 'true', label + ': garage stays in the inventory workspace');
    equal(financial(await campaign(page)), beforeNavigation, label + ': garage navigation has no economic side effect');
    equal(dialogs.length, 0, label + ': map navigation never opens spending prompts or confirmation dialogs');
    await showMap(page);
    await page.evaluate(() => { s.empire.economy.inflation = 1.25; render(); });
    await assertMapState(page, { factory: { cost: 137500, missing: 102500, status: 'unbuilt' } }, label + ' indexed foundation');
    check((await page.locator('#ae-map-detail-factory').innerText()).includes('137.500'), label + ': displayed opening cost follows actual inflation');
    await fixture(page);
    await showMap(page);
    await assertMapState(page, { day: 10, paused: true, garage: { stock: 2, capacity: 8, offers: 0, reserved: 3, free: 6 },
      factory: { opened: true, mainJobs: 2, totalJobs: 3, capacity: 4, dueDay: 15, etaDays: 5, status: 'working', missing: 0, brand: 'Distrito Motors', warehouseStock: 0, warehouseCapacity: 20, industrialFree: 23 },
      projects: { count: 2, research: 7, status: 'ready' } }, label + ' real queue summary');
    await page.evaluate(() => { s.slots = s.stock.length; render(); });
    await assertMapState(page, { factory: { status: 'working', etaDays: 5, warehouseStock: 0, warehouseCapacity: 20, industrialFree: 17 } }, label + ' full showroom with free industrial yard');
    const warning = await page.locator('#ae-map-detail-factory').innerText();
    check(warning.includes('5 dias') && !warning.includes('aguarda vaga'), label + ': a full showroom does not claim production is blocked when the industrial yard has room');
    await page.evaluate(() => { s.slots = 8; render(); });
    const queueBeforeNavigation = financial(await campaign(page));
    await tap(page.locator(nodeSelector('factory')), label + ' active factory node');
    check(await page.locator('#ae-factory-planning').isVisible(), label + ': active factory leads to the real production planning panel');
    equal(financial(await campaign(page)), queueBeforeNavigation, label + ': inspecting running production never pays or queues again');
    await showMap(page);
    await page.evaluate(() => { s.empire.economy.factory.queue = s.empire.economy.factory.queue.filter(job => job.plantId); render(); });
    await assertMapState(page, { factory: { mainJobs: 0, totalJobs: 1, capacity: 4, dueDay: null, etaDays: null } }, label + ' extra plant only');
    await page.evaluate(() => {
      const f = s.empire.economy.factory;
      f.queue = [{ model: 'Fixture Compact', kind: 'Compacto', due: s.day, cost: 1000, value: 1400, designId: 9001, quality: 70, supplier: 'standard' }];
      s.slots = s.stock.length; render();
    });
    await assertMapState(page, { garage: { stock: 2, capacity: 2, free: 0, status: 'full' },
      factory: { mainJobs: 1, totalJobs: 1, dueDay: 10, etaDays: 0, status: 'working', warehouseStock: 0 } }, label + ' due order with a free industrial yard');
    await page.evaluate(() => { tickDay(); save(); render(); });
    let actualCampaign = await campaign(page);
    equal(actualCampaign.stock.length, 2, label + ': a full showroom does not receive an extra car');
    equal(actualCampaign.warehouse.length, 1, label + ': the real engine delivers the completed fixture job into the industrial yard');
    equal(actualCampaign.queue.length, 0, label + ': a real yard delivery consumes its queue entry');
    await assertMapState(page, { day: 11, factory: { mainJobs: 0, totalJobs: 0, warehouseStock: 1, warehouseCapacity: 20, industrialFree: 19, status: 'ready' } }, label + ' real yard delivery');
    await page.evaluate(() => {
      const f = s.empire.economy.factory;
      // Explicit storage-pressure fixture only; these nineteen cars are not
      // claimed as manufactured or purchased by the campaign's actual actions.
      while (f.warehouseCars.length < f.warehouseCapacity) {
        const car = makeCar(); car.offers = []; car.listed = false; f.warehouseCars.push(car);
      }
      f.queue = [{ model: 'Fixture Compact', kind: 'Compacto', due: s.day, cost: 1000, value: 1400, designId: 9001, quality: 70, supplier: 'standard' }];
      save(); render();
    });
    await assertMapState(page, { factory: { mainJobs: 1, totalJobs: 1, dueDay: 11, etaDays: 0, status: 'storage-full', warehouseStock: 20, industrialFree: 0 } }, label + ' both stores full');
    await page.evaluate(() => { tickDay(); save(); render(); });
    actualCampaign = await campaign(page);
    equal(actualCampaign.stock.length, 2, label + ': blocked delivery leaves the showroom unchanged');
    equal(actualCampaign.warehouse.length, 20, label + ': blocked delivery cannot overflow the industrial yard');
    equal(actualCampaign.queue.length, 1, label + ': the actual engine retains the order when both stores are full');
    await assertMapState(page, { day: 12, factory: { dueDay: 13, etaDays: 1, status: 'storage-full', warehouseStock: 20 } }, label + ' postponed delivery');
    await page.evaluate(() => {
      s.slots = 3; s.empire.economy.crisis = { id: 'supply', name: 'Ruptura de suprimentos', end: s.day + 10, region: null }; render();
    });
    await assertMapState(page, { factory: { status: 'crisis' }, crisis: { id: 'supply' } }, label + ' supply interruption');
    await page.evaluate(() => { s.empire.economy.crisis = { id: 'war', name: 'Conflito armado regional', end: s.day + 10, region: 'Japão' }; render(); });
    await assertMapState(page, { factory: { status: 'working' }, crisis: { id: 'stable' } }, label + ' unrelated regional crisis');
    await page.evaluate(() => { s.empire.economy.crisis = { id: 'war', name: 'Conflito armado regional', end: s.day + 10, region: 'Brasil' }; render(); });
    await assertMapState(page, { factory: { status: 'crisis' }, crisis: { id: 'war' } }, label + ' local regional crisis');
    await page.evaluate(() => { s.empire.economy.bankrupt = true; render(); });
    await assertMapState(page, { bankrupt: true, factory: { status: 'bankrupt' } }, label + ' ended campaign');
    await page.evaluate(() => { s.empire.economy.bankrupt = false; s.empire.economy.crisis = { id: 'stable', name: 'Estabilidade', end: 0, region: null }; tickDay(); save(); render(); });
    const delivered = await campaign(page);
    equal(delivered.stock.length, 3, label + ': the real engine delivers the queued display-fixture job when a slot becomes free');
    equal(delivered.queue.length, 0, label + ': delivered job no longer appears in the queue');
    equal(delivered.warehouse.length, 20, label + ': freeing the showroom allows delivery without overflowing the still-full yard');
    await assertMapState(page, { day: 13, garage: { stock: 3, capacity: 3, reserved: 0, free: 0, status: 'full' },
      factory: { mainJobs: 0, totalJobs: 0, dueDay: null, etaDays: null, warehouseStock: 20, status: 'ready' } }, label + ' completed order');
    await page.evaluate(() => {
      s.stock[0].offers = [{ amount: 10000, type: 'cash' }, { amount: 11000, type: 'cash' }]; render();
    });
    await assertMapState(page, { garage: { offers: 2, status: 'offers' } }, label + ' display-fixture offers count');
    await page.evaluate(() => { for (const car of s.stock) car.offers = []; save(); render(); });
    const persisted = await snapshot(page), savedBeforeReload = await campaign(page);
    await page.reload({ waitUntil: 'networkidle' });
    await showMap(page);
    equal(await snapshot(page), persisted, label + ': map reads the same saved operational state after reload');
    equal((await campaign(page)).cash, savedBeforeReload.cash, label + ': map reload cannot create income or a second production expense');
    check((await campaign(page)).other === null, label + ': main navigation never creates a preview campaign');
    if (width === 440) await assertIdleAndExplicitTurn(page, label);
    const mainStored = await page.evaluate(() => { save(); return localStorage.getItem(KEY); });
    await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
    await showMap(page);
    equal((await campaign(page)).key, 'autoempire_preview_v06', label + ': preview uses its own campaign key');
    await assertMapState(page, { garage: { stock: 0, capacity: 1, offers: 0 }, factory: { opened: false, mainJobs: 0 }, projects: { count: 0 } }, label + ' separate preview');
    equal(await page.evaluate(() => localStorage.getItem('autoempire_v02')), mainStored, label + ': preview map leaves main campaign byte-for-byte unchanged');
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    await showMap(page);
    equal((await snapshot(page)).garage.stock, 3, label + ': returning from preview restores the original operational inventory');
    await assertLayout(page, label + ' restored map');
    await assertReadability(page, label + ' restored map');
    await page.locator(panelSelector).screenshot({ path: path.join(artifacts, label + '-map.png'), scale: 'css', style: 'nav.bottom,#ae-quick-nav-button,#ae-end-day{visibility:hidden!important}' });
    equal(errors, [], label + ': no JavaScript errors');
    equal(missing, [], label + ': no missing map assets');
    equal(dialogs, [], label + ': all map actions remain navigational');
    console.log('PASS profile: ' + label + ' operations map');
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, label + '-failure.png'), scale: 'css' }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}
(async () => {
  try {
    check(['chromium', 'webkit'].includes(engine), 'Supported browser engine selected');
    await fs.mkdir(artifacts, { recursive: true });
    const base = await startServer();
    browser = await playwright[engine].launch(engine === 'chromium'
      ? { executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }
      : { headless: true, ...(process.env.AE_WEBKIT_PATH ? { executablePath: process.env.AE_WEBKIT_PATH } : {}) });
    for (const width of profiles) await runProfile(base, width);
    console.log('PASS: ' + checks + ' read-only map, main-line queue, state, touch, navigation, artwork, persistence, yard routing and explicit-turn checks (' + engine + ')');
    console.log('Physical Safari/iPhone validation was not performed. Screenshots: ' + artifacts);
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
