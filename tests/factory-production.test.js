/* Real mobile factory flow: research -> homologation -> foundation -> batch -> delivery.
 * Fixture grants capital/storage only after proving the natural starting balance
 * cannot fund the factory; jobs, research, projects and deliveries use real actions.
 * Run: node tests/factory-production.test.js; AE_BROWSER=webkit also supported.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const artifacts = process.env.AE_FACTORY_REVIEW_DIR || '/tmp/auto-empire-factory';
const engine = process.env.AE_BROWSER || 'chromium';
let browser, server, checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw Error('Factory fixture server exited');
    try { if ((await fetch(base + '/preview/')).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Factory fixture server did not start');
}
async function state(page) {
  return page.evaluate(() => ({
    key: KEY, cash: s.cash, day: s.day, slots: s.slots, sales: s.sales,
    stock: JSON.parse(JSON.stringify(s.stock)),
    factory: JSON.parse(JSON.stringify(s.empire.economy.factory)),
    studio: JSON.parse(JSON.stringify(s.empire.economy.studio)),
    ledger: JSON.parse(JSON.stringify(s.ledger)), saved: JSON.parse(localStorage.getItem(KEY)),
    other: localStorage.getItem('autoempire_preview_v06'), paused
  }));
}
function reconcile(value, label) {
  check(value.ledger.length < 100, label + ': the complete test ledger remains available');
  equal(value.cash, 35000 + value.ledger.reduce((sum, item) => sum + item.amount, 0), label + ': cash reconciles against the real ledger and explicit fixture grant');
  equal(value.saved.cash, value.cash, label + ': current balance is saved');
  equal(value.saved.empire.economy.factory, value.factory, label + ': queue and factory metadata are saved');
}
async function tap(locator, label) {
  const box = await locator.boundingBox();
  check(box && box.width >= 44 && box.height >= 44, label + ': touch target is at least44x44');
  await locator.tap();
}
async function layout(page, label) {
  const actual = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth,
    nodes: [...document.querySelectorAll('#ae-mgmt-view-factory input,#ae-mgmt-view-factory select,#ae-production-dialog,#modalbody')]
      .filter(node => node.getClientRects().length).map(node => { const b = node.getBoundingClientRect(); return { id: node.id, left: b.left, right: b.right }; }) }));
  check(actual.document <= actual.width + 1, label + ': no page horizontal overflow');
  check(actual.nodes.every(node => node.left >= -1 && node.right <= actual.width + 1), label + ': factory fields stay in the viewport: ' + JSON.stringify(actual.nodes));
}
async function factoryView(page) {
  await page.locator('.bottom [data-tab="garage"]').tap();
  await page.locator('[data-workspace="management"]').tap();
  await page.locator('#ae-mgmt-tab-factory').tap();
  const studioFold = page.locator('#fold-ae-studio > .ae-fold-head');
  if (await studioFold.count() && await studioFold.getAttribute('aria-expanded') === 'false') await studioFold.tap();
}
async function runProfile(base, width) {
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'], viewport: { width, height: 763 } });
  await context.addInitScript(() => {
    Math.random = () => .6; // Stable ordinary supplier results, not fabricated jobs.
    if (!localStorage.getItem('autoempire_company_profile_v1')) localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({ company: 'Fábrica Teste', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo' }));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  let dismissNext = false;
  page.on('dialog', dialog => {
    if (dismissNext) { dismissNext = false; return dialog.dismiss(); }
    return dialog.type() === 'prompt' ? dialog.accept('Aurora Motors') : dialog.accept();
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    await factoryView(page);
    let actual = await state(page);
    check(actual.paused && !actual.factory.opened && actual.factory.queue.length === 0, width + ': fresh campaign cannot silently create a factory/job');
    check(await page.locator('#ae-mgmt-view-factory').isVisible(), width + ': manufacturer is a reachable management tab');
    await page.locator('#ae-design-name').fill('Aurora Compact');
    await page.locator('#ae-design-kind').selectOption('Compacto');
    await page.locator('#ae-design-engine').selectOption('economico');
    await page.locator('#ae-design-position').selectOption('budget');
    const researchBefore = actual.cash;
    await tap(page.locator('[data-studio="research"]'), width + ' real research');
    actual = await state(page);
    equal(actual.cash, researchBefore - 1800, width + ': research charges the current1x inflation cost once');
    equal(actual.studio.research, 5, width + ': research produces five real engineering points');
    const beforeHomologation = actual.cash;
    await tap(page.locator('[data-studio="save"]'), width + ' homologation');
    actual = await state(page);
    equal(actual.studio.designs.length, 1, width + ': homologation creates one actual saved design');
    const design = actual.studio.designs[0];
    equal(design.name, 'Aurora Compact', width + ': homologated name is retained');
    equal(actual.cash, beforeHomologation, width + ': homologation spends engineering points without an invented cash charge');
    equal(actual.studio.research, 5 - design.research, width + ': homologation consumes the quoted research points');
    check(!actual.factory.opened && actual.factory.queue.length === 0, width + ': homologation alone does not found a manufacturer or enqueue production');
    // The foundation control must be in Fabricante, rather than hidden in Expansão.
    const open = page.locator('#ae-mgmt-view-factory [data-econ="open"]').first();
    check(await open.isVisible(), width + ': foundation is discoverable beside the homologated models');
    const blockedBefore = await state(page);
    if (await open.isEnabled()) await tap(open, width + ' insufficient foundation');
    actual = await state(page);
    equal(actual.cash, blockedBefore.cash, width + ': insufficient capital does not debit the campaign');
    check(!actual.factory.opened && actual.factory.queue.length === 0, width + ': insufficient capital cannot create a manufacturer');
    // Explicit scenario setup only; no production state/design/delivery is fabricated.
    await page.evaluate(() => { s.cash += 365000; entry('Fixture: capital industrial', 365000); s.slots = 3; tickDay(); save(); render(); });
    await factoryView(page);
    const beforeOpen = await state(page);
    // The real day above settles capital/garage milestones earned by the fixture.
    check(beforeOpen.ledger.some(item => item.name === 'Conquista · Reserva de caixa') && beforeOpen.ledger.some(item => item.name === 'Conquista · Primeira expansão'), width + ': real milestone income is accounted for before foundation');
    dismissNext = true;
    await tap(open, width + ' cancel foundation');
    equal((await state(page)).cash, beforeOpen.cash, width + ': cancelled foundation leaves funds intact');
    check(!(await state(page)).factory.opened, width + ': cancelling the name prompt cannot open a factory');
    await tap(open, width + ' open manufacturer');
    actual = await state(page);
    check(actual.factory.opened, width + ': real foundation action opens the manufacturer');
    equal(actual.factory.brand, 'Aurora Motors', width + ': foundation keeps the chosen brand');
    equal(actual.cash, beforeOpen.cash - 110000, width + ': foundation charges110000 at the current1x inflation once');
    equal(actual.ledger.filter(item => item.name === 'Fundação da fabricante').length, 1, width + ': exactly one foundation is recorded');
    reconcile(actual, width + ' foundation');
    await page.reload({ waitUntil: 'networkidle' });
    await factoryView(page);
    actual = await state(page);
    equal(actual.cash, beforeOpen.cash - 110000, width + ': reloading cannot charge foundation again');
    check(actual.factory.opened && actual.studio.designs[0]?.id === design.id, width + ': founded factory and homologated project survive reload');
    const order = page.locator('[data-ae-order="' + design.id + '"]');
    await tap(order, width + ' homologated project order');
    check(await page.locator('#ae-production-dialog').isVisible(), width + ': homologated project opens its order form');
    equal(await page.locator('#ae-order-paint option').count(), 6, width + ': mixed and five actual painted choices are available');
    await page.locator('#ae-order-paint').selectOption('1');
    for (const bad of ['0', '1.5', '21']) {
      await page.locator('#ae-order-quantity').fill(bad);
      check(await page.locator('#ae-order-confirm').isDisabled(), width + ': invalid quantity ' + bad + ' is blocked');
      check((await page.locator('#ae-order-error').innerText()).length > 0, width + ': invalid quantity has a visible reason');
    }
    await page.locator('#ae-order-quantity').fill('2');
    check(await page.locator('#ae-order-confirm').isEnabled(), width + ': two cars fit the actual factory lines and reserved stock capacity');
    await layout(page, width + ' order form');
    const beforeBatch = await state(page);
    dismissNext = true;
    await tap(page.locator('#ae-order-confirm'), width + ' cancel batch');
    actual = await state(page);
    equal(actual.cash, beforeBatch.cash, width + ': cancelling batch confirmation preserves funds');
    equal(actual.factory.queue, beforeBatch.factory.queue, width + ': cancelling does not create jobs');
    await tap(page.locator('#ae-order-confirm'), width + ' confirm batch');
    actual = await state(page);
    equal(actual.factory.queue.length, 2, width + ': confirming creates exactly two production jobs');
    equal(actual.cash, beforeBatch.cash - 2 * design.cost, width + ': the batch charges the homologated per-unit cost twice');
    check(actual.factory.queue.every(job => job.designId === design.id && job.model === design.name && job.color === '#287ec5' && job.colorName === 'Azul Oceano'), width + ': queued jobs retain the actual homologated design and selected blue paint');
    check(actual.factory.queue.every(job => job.due > actual.day && Number.isFinite(job.cost) && job.cost > 0), width + ': jobs have finite costs and future delivery dates');
    reconcile(actual, width + ' production');
    const queued = actual.factory.queue;
    await page.reload({ waitUntil: 'networkidle' });
    await factoryView(page);
    actual = await state(page);
    equal(actual.factory.queue, queued, width + ': queued cars and paint survive reload');
    equal(actual.cash, beforeBatch.cash - 2 * design.cost, width + ': reload does not pay for queued cars twice');
    await tap(order, width + ' full line order');
    check(await page.locator('#ae-order-confirm').isDisabled(), width + ': another job is blocked while the two factory lines are occupied');
    check(/linha/i.test(await page.locator('#ae-order-error').innerText()), width + ': occupied lines have a clear reason');
    await page.locator('#ae-order-cancel').tap();
    const due = Math.max(...queued.map(job => job.due));
    await page.evaluate(due => { while (s.day < due - 1) tickDay(); save(); render(); }, due);
    actual = await state(page);
    equal(actual.stock.length, 0, width + ': completed vehicles do not appear before the due day');
    equal(actual.factory.queue.length, 2, width + ': both jobs remain reserved until delivery');
    await page.evaluate(() => { tickDay(); save(); render(); });
    actual = await state(page);
    equal(actual.stock.length, 2, width + ': real simulated days deliver both cars to inventory');
    equal(actual.factory.queue.length, 0, width + ': delivered jobs leave the queue');
    equal(actual.factory.produced, 2, width + ': produced count advances exactly twice');
    check(actual.stock.every(car => car.manufactured && car.name === 'Aurora Motors Aurora Compact' && car.designId === design.id && car.bought === design.cost && car.color === '#287ec5' && car.colorName === 'Azul Oceano' && car.paintId === 'ocean'), width + ': delivered vehicles keep brand, design, paid cost, manufacture identity and artwork paint');
    reconcile(actual, width + ' delivery');
    // Header and per-project controls must reach the same five-paint batch form.
    await page.locator('[data-design-id="' + design.id + '"]').tap();
    await tap(page.locator('[data-studio="produce"]'), width + ' unified produce header');
    check(await page.locator('#ae-production-dialog').isVisible(), width + ': selected project header opens the same order form');
    await page.locator('#ae-order-quantity').fill('2');
    check(await page.locator('#ae-order-confirm').isDisabled(), width + ': stock space also limits a batch when lines are free');
    check(/Estoque/.test(await page.locator('#ae-order-error').innerText()), width + ': lack of storage is explained');
    // Isolated blocker fixtures: no fabricated job, delivery or economic action.
    const completedState = await page.evaluate(() => JSON.parse(JSON.stringify(s)));
    for (const [condition, reason] of [['cash', /Caixa/], ['supply', /bloqueada/], ['bankrupt', /falida/]]) {
      await page.evaluate(({ game, condition }) => {
        s = JSON.parse(JSON.stringify(game));
        if (condition === 'cash') s.cash = 0;
        if (condition === 'supply') s.empire.economy.crisis = { id: 'supply', name: 'Ruptura de suprimentos', end: s.day + 10, region: null };
        if (condition === 'bankrupt') s.empire.economy.bankrupt = true;
      }, { game: completedState, condition });
      await page.locator('#ae-order-quantity').fill('1');
      check(await page.locator('#ae-order-confirm').isDisabled(), width + ': ' + condition + ' blocks confirmation before any debit');
      check(reason.test(await page.locator('#ae-order-error').innerText()), width + ': ' + condition + ' shows its blocking reason');
      equal((await state(page)).factory.queue.length, 0, width + ': ' + condition + ' cannot enqueue a car');
    }
    await page.evaluate(game => { s = JSON.parse(JSON.stringify(game)); save(); }, completedState);
    await page.locator('#ae-order-cancel').tap();

    await page.reload({ waitUntil: 'networkidle' });
    const restored = await state(page);
    // The legacy inspection migration adds these neutral defaults on first reload.
    equal(restored.stock, actual.stock.map(car => ({ fault: null, faultFixed: false, faultRevealed: false, inspected: false, ...car })), width + ': completed inventory and inspection defaults survive reload');
    equal(restored.cash, actual.cash, width + ': completed production never charges again on reload');
    check(restored.other === null && restored.key === 'autoempire_v02', width + ': production stays in the active campaign');
    check(errors.length === 0, width + ': no runtime errors: ' + errors.join('; '));
    await factoryView(page);
    await layout(page, width + ' completed manufacturer');
    await page.screenshot({ path: path.join(artifacts, engine + '-factory-' + width + '.png'), scale: 'css' });
    console.log('PASS profile: ' + engine + '-' + width + ' real factory production');
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, engine + '-failure-' + width + '.png'), scale: 'css' }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}
(async () => {
  try {
    check(['chromium', 'webkit'].includes(engine), 'A supported browser engine is selected');
    await fs.mkdir(artifacts, { recursive: true });
    const base = await startServer();
    browser = await playwright[engine].launch(engine === 'chromium'
      ? { executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }
      : { headless: true, ...(process.env.AE_WEBKIT_PATH ? { executablePath: process.env.AE_WEBKIT_PATH } : {}) });
    for (const width of [440, 320]) await runProfile(base, width);
    console.log('PASS: ' + checks + ' real research, homologation, foundation, batch, delivery, cash and persistence checks (' + engine + ')');
    console.log('Physical Safari/iPhone validation was not performed. Screenshots: ' + artifacts);
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
