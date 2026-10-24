/* Real mobile factory flow: technological funding -> research/homologation ->
 * emblem/foundation -> industrial contract -> real jobs -> showroom/yard delivery.
 * The explicit scenario grant supplies capital/storage only after testing the
 * natural starting limitations. No design, research unlock, job or delivery is faked.
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
    try { if ((await fetch(base + '/preview/', { method: 'HEAD' })).ok) return base; } catch (_) {}
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
    technology: JSON.parse(JSON.stringify(s.empire.economy.brandTechnology)),
    ledger: JSON.parse(JSON.stringify(s.ledger)), saved: JSON.parse(localStorage.getItem(KEY)),
    other: localStorage.getItem('autoempire_preview_v06'), paused
  }));
}
function reconcile(value, label) {
  check(value.ledger.length < 100, label + ': the complete test ledger remains available');
  equal(value.cash, 35000 + value.ledger.reduce((sum, item) => sum + item.amount, 0), label + ': cash reconciles against the real ledger and explicit fixture grant');
  equal(value.saved.cash, value.cash, label + ': current balance is saved');
  equal(value.saved.empire.economy.factory, value.factory, label + ': contracts, queue, yard and factory metadata are saved');
  equal(value.saved.empire.economy.brandTechnology, value.technology, label + ': technology funding and unlocks are saved');
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
async function advanceTo(page, target) {
  await page.evaluate(target => {
    if (!Number.isInteger(target) || target < s.day || target - s.day > 30) throw Error('Invalid factory test day target');
    while (s.day < target) {
      const before = s.day; tickDay();
      if (s.day !== before + 1) throw Error('The real factory turn was unexpectedly blocked');
    }
    save(); render();
  }, target);
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
    // New projects require actual style research; the gate never spends the
    // engineering points or creates a project merely because Homologar was tapped.
    const gated = actual;
    await tap(page.locator('[data-studio="save"]'), width + ' gated homologation');
    actual = await state(page);
    equal(actual.studio.designs, gated.studio.designs, width + ': technology gate prevents an unresearched new project');
    equal(actual.studio.research, gated.studio.research, width + ': technology gate preserves engineering points');
    equal(actual.cash, gated.cash, width + ': refused homologation has no cash charge');
    check(/Estúdio de estilo/.test(await page.locator('#ae-tech-preview').innerText()), width + ': the missing technology is explained beside the project');
    const open = page.locator('#ae-mgmt-view-factory [data-econ="open"]').first();
    check(await open.isVisible(), width + ': foundation is discoverable in the manufacturer area');
    const initial = await state(page);
    await tap(open, width + ' inspect unaffordable foundation');
    check(await page.locator('#ae-company-logo').isVisible(), width + ': opening manufacturer details reveals the real emblem editor');
    check(await page.locator('#ae-logo-confirm').isDisabled(), width + ': natural starting capital cannot pay for foundation');
    equal((await state(page)).cash, initial.cash, width + ': inspecting foundation never spends funds');
    check(!(await state(page)).factory.opened, width + ': unaffordable foundation cannot create a manufacturer');
    await tap(page.locator('#ae-logo-cancel'), width + ' cancel unaffordable editor');
    // Scenario setup only: grant capital and three shared showroom slots. The
    // real day settles existing capital/garage milestones before later baselines.
    await page.evaluate(() => { s.cash += 1465000; entry('Fixture: capital industrial', 1465000); s.slots = 3; tickDay(); save(); render(); });
    await factoryView(page);
    actual = await state(page);
    check(actual.ledger.some(item => item.name === 'Conquista · Reserva de caixa') && actual.ledger.some(item => item.name === 'Conquista · Primeira expansão'), width + ': real milestone income from the explicit fixture is recorded');
    reconcile(actual, width + ' fixture');
    const technologyButton = page.locator('[data-tech-research="sketch"]');
    const beforeTechnology = await state(page);
    dismissNext = true;
    await tap(technologyButton, width + ' cancel style funding');
    equal((await state(page)).cash, beforeTechnology.cash, width + ': cancelling a technology contribution preserves cash');
    equal((await state(page)).technology, beforeTechnology.technology, width + ': cancelling does not finance or unlock the style studio');
    for (let stage = 0; stage < 5; stage++) {
      const text = await technologyButton.locator('..').innerText();
      const match = text.match(/parcela:\s*([\d.]+)\s*CR/i);
      check(Boolean(match), width + ': style contribution has a readable actual quoted cost');
      const payment = Number(match[1].replace(/\./g, ''));
      const before = await state(page);
      await tap(technologyButton, width + ' actual style contribution ' + (stage + 1));
      actual = await state(page);
      equal(actual.cash, before.cash - payment, width + ': contribution ' + (stage + 1) + ' charges its displayed quote once');
      equal(actual.technology.spent, before.technology.spent + payment, width + ': technology investment tracks the actual paid contribution');
      equal(actual.ledger.filter(item => item.name === 'P&D tecnológico · Estúdio de estilo').length, stage + 1, width + ': one real ledger entry per contribution');
      check(!actual.technology.unlocked.includes('sketch'), width + ': financing alone cannot immediately unlock the technology');
      if (stage < 4) check(!actual.technology.active, width + ': partial funding cannot start the research clock');
    }
    check(actual.technology.active?.id === 'sketch' && actual.technology.active.due > actual.day, width + ': fully funded style research has an actual future due day');
    const technologyDue = actual.technology.active.due;
    await advanceTo(page, technologyDue - 1);
    check(!(await state(page)).technology.unlocked.includes('sketch'), width + ': style research is still unavailable before its due day');
    await advanceTo(page, technologyDue);
    actual = await state(page);
    check(actual.technology.unlocked.includes('sketch') && !actual.technology.active, width + ': real engine days complete the paid style research');
    reconcile(actual, width + ' style research');
    const beforeHomologation = actual;
    await tap(page.locator('[data-studio="save"]'), width + ' real homologation');
    await page.waitForFunction(() => s.empire.economy.studio.designs.length === 1 && Boolean(s.empire.economy.studio.designs[0].brandStyle));
    actual = await state(page);
    equal(actual.studio.designs.length, 1, width + ': researched homologation creates one actual saved design');
    const design = actual.studio.designs[0];
    equal(design.name, 'Aurora Compact', width + ': homologated name is retained');
    equal(actual.cash, beforeHomologation.cash, width + ': homologation spends engineering points without an invented cash charge');
    equal(actual.studio.research, beforeHomologation.studio.research - design.research, width + ': homologation consumes the quoted engineering points');
    equal(design.brandStyle, beforeHomologation.technology.designStyle, width + ': homologation retains the earned brand design style');
    check(!actual.factory.opened && !actual.factory.queue.length, width + ': homologation does not silently found a manufacturer');
    await tap(open, width + ' open emblem editor');
    await page.locator('#ae-logo-name').fill('Aurora Motors');
    await page.locator('#ae-logo-shape').selectOption('hex');
    await page.locator('#ae-logo-mark').selectOption('wing');
    await page.locator('#ae-logo-letters').fill('AM');
    await page.locator('#ae-logo-finish').selectOption('matte');
    const foundationText = await page.locator('#ae-logo-cost').innerText();
    const foundationMatch = foundationText.match(/Custo de fundação:\s*([\d.]+)\s*CR/i);
    check(Boolean(foundationMatch), width + ': emblem editor shows the actual foundation quote');
    const foundationCost = Number(foundationMatch[1].replace(/\./g, ''));
    const beforeOpen = await state(page);
    dismissNext = true;
    await tap(page.locator('#ae-logo-confirm'), width + ' cancel foundation confirmation');
    equal((await state(page)).cash, beforeOpen.cash, width + ': cancelled foundation preserves cash');
    check(!(await state(page)).factory.opened, width + ': cancelled foundation creates no manufacturer');
    await tap(page.locator('#ae-logo-confirm'), width + ' confirm manufacturer foundation');
    actual = await state(page);
    check(actual.factory.opened, width + ': real foundation creates the manufacturer');
    equal(actual.factory.brand, 'Aurora Motors', width + ': manufacturer retains the chosen brand');
    equal(actual.factory.logo.shape, 'hex', width + ': chosen emblem shape is saved');
    equal(actual.factory.logo.mark, 'wing', width + ': chosen emblem symbol is saved');
    equal(actual.factory.logo.letters, 'AM', width + ': chosen manufacturer initials are saved');
    equal(actual.factory.logo.finish, 'matte', width + ': chosen emblem finish is saved');
    equal(actual.cash, beforeOpen.cash - foundationCost, width + ': foundation charges the shown cost once');
    equal(actual.ledger.filter(item => item.name === 'Fundação da fabricante').length, 1, width + ': exactly one foundation is recorded');
    reconcile(actual, width + ' foundation');
    const founded = actual;
    await page.reload({ waitUntil: 'networkidle' });
    await factoryView(page);
    actual = await state(page);
    equal(actual.cash, founded.cash, width + ': reloading cannot charge foundation again');
    equal(actual.factory.logo, founded.factory.logo, width + ': custom emblem survives reload');
    check(actual.factory.opened && actual.studio.designs[0]?.id === design.id, width + ': factory and homologated project survive reload');
    const order = page.locator('[data-ae-order="' + design.id + '"]');
    await tap(order, width + ' homologated project order');
    check(await page.locator('#ae-production-dialog').isVisible(), width + ': homologated project opens its actual industrial order form');
    equal(await page.locator('#ae-order-paint option').count(), 6, width + ': mixed and all five actual paint choices are available');
    await page.locator('#ae-order-paint').selectOption('1');
    for (const bad of ['0', '1.5', '1001']) {
      await page.locator('#ae-order-quantity').fill(bad);
      check(await page.locator('#ae-order-confirm').isDisabled(), width + ': invalid quantity ' + bad + ' is blocked');
      check((await page.locator('#ae-order-error').innerText()).length > 0, width + ': invalid quantity has a visible reason');
    }
    await page.locator('#ae-order-quantity').fill('2');
    check(await page.locator('#ae-order-confirm').isEnabled(), width + ': valid compact industrial order can be financed');
    await layout(page, width + ' order form');
    const beforeBatch = await state(page);
    dismissNext = true;
    await tap(page.locator('#ae-order-confirm'), width + ' cancel industrial contract');
    actual = await state(page);
    equal(actual.cash, beforeBatch.cash, width + ': cancelling contract confirmation preserves funds');
    equal(actual.factory.industrialOrders, beforeBatch.factory.industrialOrders, width + ': cancellation cannot create a contract');
    equal(actual.factory.queue, beforeBatch.factory.queue, width + ': cancellation cannot start a production job');
    await tap(page.locator('#ae-order-confirm'), width + ' confirm industrial contract');
    actual = await state(page);
    equal(actual.factory.industrialOrders.length, 1, width + ': confirmation creates one compact industrial contract');
    equal(actual.factory.queue.length, 0, width + ': contract creation waits for the next actual turn before starting jobs');
    equal(actual.cash, beforeBatch.cash - 2 * design.cost, width + ': materials for both units are paid once up front');
    const contract = actual.factory.industrialOrders[0];
    equal([contract.total, contract.remaining, contract.delivered, contract.paint], [2, 2, 0, 1], width + ': contract records two undelivered blue units');
    reconcile(actual, width + ' contract');
    const committed = actual;
    await page.reload({ waitUntil: 'networkidle' });
    await factoryView(page);
    actual = await state(page);
    equal(actual.factory.industrialOrders, committed.factory.industrialOrders, width + ': prepaid contract survives reload without starting twice');
    equal(actual.cash, committed.cash, width + ': reload never repays material investment');
    await tap(order, width + ' active industrial contract blocker');
    check(await page.locator('#ae-order-confirm').isDisabled(), width + ': a second active contract on the same plant is blocked');
    check(/lote industrial/i.test(await page.locator('#ae-order-error').innerText()), width + ': active contract blocker is explained');
    await page.locator('#ae-order-cancel').tap();
    await advanceTo(page, actual.day + 1);
    actual = await state(page);
    equal(actual.factory.queue.length, 2, width + ': actual engine turn starts exactly two jobs from the prepaid contract');
    check(actual.factory.queue.every(job => job.designId === design.id && job.model === design.name && job.color === '#287ec5' && job.colorName === 'Azul Oceano'), width + ': started jobs retain the homologated design and selected blue paint');
    equal(actual.factory.industrialOrders[0].remaining, 0, width + ': started jobs are consumed from the compact contract only once');
    check(actual.factory.queue.every(job => job.due > actual.day && job.cost === design.cost), width + ': jobs keep their prepaid costs and future due dates');
    const due = Math.max(...actual.factory.queue.map(job => job.due));
    await advanceTo(page, due - 1);
    actual = await state(page);
    equal(actual.stock.length, 0, width + ': finished vehicles cannot arrive before the quoted engine due day');
    equal(actual.factory.queue.length, 2, width + ': real jobs remain queued before delivery');
    await advanceTo(page, due);
    actual = await state(page);
    equal(actual.stock.length, 2, width + ': actual days deliver both first-batch vehicles to the showroom');
    equal(actual.factory.queue.length, 0, width + ': delivered jobs leave the queue');
    equal(actual.factory.produced, 2, width + ': produced count advances exactly once per delivered unit');
    equal(actual.factory.industrialOrders.length, 0, width + ': fulfilled contract is archived after actual deliveries');
    check(actual.stock.every(car => car.manufactured && car.name === 'Aurora Motors Aurora Compact' && car.designId === design.id && car.bought === design.cost && car.color === '#287ec5' && car.colorName === 'Azul Oceano' && car.paintId === 'ocean'), width + ': showroom cars retain brand, design, paid cost, manufactured identity and artwork paint');
    reconcile(actual, width + ' first delivery');
    // Header and per-project controls reach the same order form. A second real
    // batch proves the new yard accepts deliveries when the shared showroom fills.
    await page.locator('[data-design-id="' + design.id + '"]').tap();
    await tap(page.locator('[data-studio="produce"]'), width + ' selected project header');
    check(await page.locator('#ae-production-dialog').isVisible(), width + ': project header opens the same five-paint industrial form');
    await page.locator('#ae-order-paint').selectOption('2');
    await page.locator('#ae-order-quantity').fill('2');
    check(await page.locator('#ae-order-confirm').isEnabled(), width + ': yard capacity permits a batch larger than remaining showroom space');
    const beforeYardBatch = await state(page);
    await tap(page.locator('#ae-order-confirm'), width + ' real yard batch');
    equal((await state(page)).cash, beforeYardBatch.cash - 2 * design.cost, width + ': second batch prepays exactly its material investment');
    await advanceTo(page, beforeYardBatch.day + 1);
    const yardDue = Math.max(...(await state(page)).factory.queue.map(job => job.due));
    await advanceTo(page, yardDue);
    actual = await state(page);
    equal(actual.stock.length, 3, width + ': real second batch fills the last showroom space');
    equal(actual.factory.warehouseCars.length, 1, width + ': remaining real delivery enters the manufacturer yard');
    equal(actual.factory.queue.length, 0, width + ': showroom and yard deliveries both release their actual jobs');
    equal(actual.factory.produced, 4, width + ': both batches produce exactly four vehicles');
    equal(actual.factory.warehouseCars[0].colorName, 'Vermelho Rubi', width + ': yard vehicle retains the second selected paint');
    equal(actual.factory.warehouseCars[0].designId, design.id, width + ': yard delivery retains the actual homologated project');
    reconcile(actual, width + ' yard delivery and daily industrial costs');
    const completedState = await page.evaluate(() => JSON.parse(JSON.stringify(s)));
    await factoryView(page);
    await tap(order, width + ' storage and finance blockers');
    for (const [condition, reason] of [['storage', /vagas de estoque/i], ['cash', /Caixa/], ['supply', /bloqueada/], ['bankrupt', /falida/]]) {
      // Display-only blocker fixtures do not invent production jobs or deliveries.
      await page.evaluate(({ game, condition }) => {
        s = JSON.parse(JSON.stringify(game));
        if (condition === 'storage') {
          const f = s.empire.economy.factory;
          f.warehouseCars = Array.from({ length: f.warehouseCapacity }, () => makeCar());
        }
        if (condition === 'cash') s.cash = 0;
        if (condition === 'supply') s.empire.economy.crisis = { id: 'supply', name: 'Ruptura de suprimentos', end: s.day + 10, region: null };
        if (condition === 'bankrupt') s.empire.economy.bankrupt = true;
      }, { game: completedState, condition });
      await page.locator('#ae-order-quantity').fill('1');
      check(await page.locator('#ae-order-confirm').isDisabled(), width + ': ' + condition + ' blocks confirmation before any debit');
      check(reason.test(await page.locator('#ae-order-error').innerText()), width + ': ' + condition + ' has a visible blocking reason');
      equal((await state(page)).factory.queue.length, 0, width + ': ' + condition + ' cannot enqueue a vehicle');
      equal((await state(page)).factory.industrialOrders.length, 0, width + ': ' + condition + ' cannot create a prepaid contract');
    }
    await page.evaluate(game => { s = JSON.parse(JSON.stringify(game)); save(); }, completedState);
    await page.locator('#ae-order-cancel').tap();
    await page.reload({ waitUntil: 'networkidle' });
    const restored = await state(page);
    // The legacy inspection migration adds neutral metadata on first reload of
    // newly produced stock. It must never alter identity, cost, paint or quantity.
    equal(restored.stock, actual.stock.map(car => ({ fault: null, faultFixed: false, faultRevealed: false, inspected: false, ...car })), width + ': finished showroom inventory and neutral inspection defaults survive reload');
    equal(restored.factory.warehouseCars, actual.factory.warehouseCars, width + ': real yard delivery persists without duplication');
    equal(restored.cash, actual.cash, width + ': finished production never charges again on reload');
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
    console.log('PASS: ' + checks + ' real technology funding, emblem, homologation, industrial contract, showroom/yard delivery, cash and persistence checks (' + engine + ')');
    console.log('Physical Safari/iPhone validation was not performed. Screenshots: ' + artifacts);
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
