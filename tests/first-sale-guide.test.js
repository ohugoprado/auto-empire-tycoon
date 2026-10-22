/* Real guided resale in mobile Chromium/WebKit; no fabricated buyer proposals.
 * Run: node tests/first-sale-guide.test.js; AE_BROWSER=webkit is also supported.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const artifacts = process.env.AE_FIRST_SALE_REVIEW_DIR || '/tmp/auto-empire-first-sale';
const engine = process.env.AE_BROWSER || 'chromium';
const profiles = [
  { name: 'iphone17-pro-max-440', device: 'iPhone 17 Pro Max', viewport: { width: 440, height: 763 } },
  { name: 'compact-320', device: 'iPhone SE', viewport: { width: 320, height: 568 } }
];
let server, browser, checks = 0;
const completed = [];
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  let output = '', failure;
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  server.once('error', error => { failure = error; });
  server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (failure) throw failure;
    if (server.exitCode !== null) throw Error('HTTP server exited: ' + output);
    try { if ((await fetch(base + '/preview/')).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('HTTP server did not become ready: ' + output);
}
async function newContext(profile) {
  const descriptor = playwright.devices[profile.device] || playwright.devices['iPhone 14 Pro Max'];
  const context = await browser.newContext({ ...descriptor, viewport: profile.viewport });
  await context.addInitScript(() => {
    // Reproducible market/inspection/simulation through the real game functions.
    // No car, proposal, cash balance or sale is manufactured by this fixture.
    Math.random = () => .12;
    if (!localStorage.getItem('autoempire_company_profile_v1')) localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({
      company: 'Guia Motors', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo'
    }));
  });
  return context;
}
async function state(page) {
  return page.evaluate(() => ({
    key: KEY, cash: s.cash, day: s.day, sales: s.sales, profit: s.profit, paused,
    stock: JSON.parse(JSON.stringify(s.stock)), ledger: JSON.parse(JSON.stringify(s.ledger)),
    guide: AEFirstSaleGuide.snapshot(), saved: JSON.parse(localStorage.getItem(KEY)),
    other: localStorage.getItem(KEY === 'autoempire_v02' ? 'autoempire_preview_v06' : 'autoempire_v02')
  }));
}
const finance = value => ({ cash: value.cash, day: value.day, sales: value.sales, stock: value.stock, ledger: value.ledger });
async function tap(locator, label) {
  const box = await locator.boundingBox();
  check(box && box.width >= 44 && box.height >= 44, label + ': usable touch target');
  await locator.tap();
}
async function layout(page, label) {
  const actual = await page.evaluate(() => ({
    width: innerWidth, document: document.documentElement.scrollWidth,
    boxes: [...document.querySelectorAll('#ae-first-sale-guide,#ae-first-sale-guide-events,#modalbody,.ae-trade-summary')]
      .filter(element => element.getClientRects().length).map(element => {
        const box = element.getBoundingClientRect(); return { name: element.id || element.className, left: box.left, right: box.right };
      })
  }));
  check(actual.document <= actual.width + 1, label + ': no horizontal page overflow');
  for (const box of actual.boxes) check(box.left >= -1 && box.right <= actual.width + 1, label + ': ' + box.name + ' fits viewport');
}
async function stockSummary(page, car, expectedPrice, label) {
  const expected = { purchase: car.bought, expenses: car.spent, invested: car.bought + car.spent,
    price: expectedPrice, gross: expectedPrice === null ? null : expectedPrice - car.bought - car.spent };
  equal(await page.evaluate(({ id, price }) => AETradeSummary.snapshot(s.stock.find(car => car.id === id), price), { id: car.id, price: expectedPrice }), expected,
    label + ': accounting basis is purchase plus actual vehicle expenses');
  const block = page.locator('#stock > .panel .ae-trade-summary[data-car-id="' + car.id + '"]');
  equal(await block.count(), 1, label + ': one summary is attached to the stable vehicle ID');
  const visible = await block.evaluate(element => Object.fromEntries([...element.querySelectorAll('[data-trade-field]')].map(value => [value.dataset.tradeField, value.textContent])));
  const formatted = await page.evaluate(expected => Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, value === null ? (key === 'price' ? 'Sem preço válido' : '—') : fmt(value)])), expected);
  equal(visible, formatted, label + ': displayed costs and gross estimate agree with independent recorded costs');
  check((await block.innerText()).includes('Antes de tributos e despesas da empresa'), label + ': gross estimate identifies excluded business costs');
}
async function clockPerformance(page, label) {
  const before = await page.evaluate(async () => {
    paused = true; speed = 1; s.minute = 600; render(); toggle();
    await new Promise(resolve => requestAnimationFrame(resolve));
    const measurement = { minute: s.minute, clock: document.getElementById('time').textContent,
      cash: s.cash, day: s.day, regions: [] };
    for (const [name, id] of [['stock', 'stock'], ['guide', 'ae-first-sale-guide'], ['progression', 'ae-progression-board']]) {
      const root = document.getElementById(id);
      if (!root) throw Error('Missing clock-performance region: ' + id);
      const region = { name, mutations: 0 };
      region.observer = new MutationObserver(records => { region.mutations += records.length; });
      region.observer.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
      measurement.regions.push(region);
    }
    window.__aeClockMeasurement = measurement;
    return { minute: measurement.minute, clock: measurement.clock, cash: measurement.cash, day: measurement.day };
  });
  await page.waitForFunction(minute => s.minute >= minute + 48, before.minute, { timeout: 15000 });
  const after = await page.evaluate(() => {
    const measurement = window.__aeClockMeasurement;
    const mutations = Object.fromEntries(measurement.regions.map(region => {
      region.mutations += region.observer.takeRecords().length; region.observer.disconnect();
      return [region.name, region.mutations];
    }));
    const result = { minute: s.minute, clock: document.getElementById('time').textContent, cash: s.cash, day: s.day, mutations };
    delete window.__aeClockMeasurement;
    toggle();
    return result;
  });
  check(after.minute >= before.minute + 48, label + ': the real frame loop advances at least 48 simulated minutes');
  check(after.clock !== before.clock, label + ': the visible clock advances during real simulation');
  equal(after.day, before.day, label + ': the clock-only sample stays within the same simulated day');
  equal(after.cash, before.cash, label + ': clock-only simulation makes no financial transaction');
  for (const name of ['stock', 'guide', 'progression']) equal(after.mutations[name], 0, label + ': clock-only frames preserve ' + name + ' DOM');
}

async function testProfile(base, profile) {
  const context = await newContext(profile);
  let page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], missing = [];
  const observe = current => {
    current.on('pageerror', error => errors.push(error.message));
    current.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base + '/')) missing.push(response.status() + ' ' + response.url()); });
    current.on('dialog', dialog => dialog.accept());
  };
  observe(page);
  const label = engine + '-' + profile.name;
  try {
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    check(await page.evaluate(() => Boolean(window.AEFirstSaleGuide && window.AETradeSummary)), label + ': the real HTML loads the guide and accounting modules');
    let actual = await state(page);
    equal(actual.guide.status, 'invited', label + ': a new campaign gets an optional invitation');
    check(!actual.saved.firstSaleGuide && actual.sales === 0 && actual.stock.length === 0, label + ': rendering the invitation does not start or transact');
    const opening = finance(actual);
    await layout(page, label + ' invitation');
    await page.screenshot({ path: path.join(artifacts, label + '-invitation.png'), fullPage: true });
    await tap(page.locator('#ae-first-sale-guide [data-guide-action="dismiss"]'), label + ' dismiss invitation');
    equal(finance(await state(page)), opening, label + ': dismissing has no economic side effects');
    equal((await state(page)).guide.status, 'dismissed', label + ': invitation can be dismissed');
    await page.reload({ waitUntil: 'networkidle' });
    equal((await state(page)).guide.status, 'dismissed', label + ': dismissal survives reload');

    await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
    equal((await state(page)).guide.status, 'invited', label + ': preview has an independent guide state');
    await tap(page.locator('#ae-first-sale-guide [data-guide-action="start"]'), label + ' start preview guide');
    const preview = await page.evaluate(() => localStorage.getItem(KEY));
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    equal((await state(page)).guide.status, 'dismissed', label + ': preview start cannot resume the main guide');
    await page.locator('.bottom [data-tab="events"]').tap();
    await tap(page.locator('#ae-first-sale-guide-events [data-guide-action="resume"]'), label + ' resume from events');
    actual = await state(page);
    equal(actual.guide.stage, 'choose', label + ': resume reveals the correct next step');
    equal(finance(actual), opening, label + ': starting or resuming never buys, repairs, advances or pays');
    equal(actual.other, preview, label + ': the preview campaign remains byte-for-byte unchanged');
    if (profile.viewport.width === 440) await clockPerformance(page, label);
    await tap(page.locator('#ae-first-sale-guide [data-guide-action="market"]'), label + ' compare market');
    const candidate = await page.evaluate(() => [...s.market].sort((a, b) => a.ask - b.ask)[0]);
    check(candidate.ask > 0 && candidate.ask < actual.cash, label + ': the deterministic real market has an affordable vehicle');
    await tap(page.locator('#listings button[onclick="buyDialog(' + candidate.id + ')"]'), label + ' negotiate');
    const beforeBuy = finance(await state(page));
    for (const invalid of ['', '0']) {
      await page.locator('#bid').fill(invalid);
      await page.locator('#modalbody button[onclick="submitBid()"]').tap();
      equal(finance(await state(page)), beforeBuy, label + ': invalid purchase input ' + JSON.stringify(invalid) + ' changes no cash or inventory');
    }
    await page.locator('#bid').fill(String(candidate.ask));
    await page.locator('#modalbody button[onclick="submitBid()"]').tap();
    await page.waitForFunction(id => s.stock.some(car => car.id === id), candidate.id);
    actual = await state(page);
    equal(actual.stock[0].bought, candidate.ask, label + ': touch submits exactly the entered acquisition price');
    equal(actual.cash, beforeBuy.cash - candidate.ask, label + ': the real purchase deducts one price');
    equal(actual.guide.stage, 'prepare', label + ': buying progresses to optional preparation');
    equal(actual.guide.targetCarId, candidate.id, label + ': guide retains stable vehicle identity');
    await stockSummary(page, actual.stock[0], null, label + ' unlisted stock');
    const beforePreparation = finance(actual);
    await tap(page.locator('#ae-first-sale-guide [data-guide-action="prepare"]'), label + ' preparation information');
    await layout(page, label + ' preparation dialog');
    await tap(page.locator('#ae-first-sale-dialog [data-guide-action="prepared"]'), label + ' continue without repairs');
    actual = await state(page);
    equal(finance(actual), beforePreparation, label + ': preparation review never spends or performs a repair');
    equal(actual.guide.stage, 'list', label + ': repairing is optional');
    await page.reload({ waitUntil: 'networkidle' });
    actual = await state(page);
    equal(actual.guide.stage, 'list', label + ': the reviewed preparation stage survives reload');
    equal(actual.guide.targetCarId, candidate.id, label + ': reload retains the guide vehicle');
    equal(actual.other, preview, label + ': progress in the main route preserves preview');
    await tap(page.locator('#ae-first-sale-guide [data-guide-action="list"]'), label + ' list vehicle');
    const summary = page.locator('#modalbody .ae-trade-dialog-summary');
    for (const invalid of ['', '-100']) {
      const before = finance(await state(page));
      await page.locator('#asking').fill(invalid);
      equal(await summary.locator('[data-trade-field="gross"]').innerText(), '—', label + ': invalid price has no invented gross estimate');
      await page.locator('#modalbody button[onclick="publish()"]').tap();
      equal(finance(await state(page)), before, label + ': invalid listing input ' + JSON.stringify(invalid) + ' creates no advertisement or expense');
    }
    const asking = candidate.ask + 2000;
    await page.locator('#asking').fill(String(asking));
    equal(await summary.locator('[data-trade-field="gross"]').innerText(), await page.evaluate(() => fmt(2000)), label + ': valid listing price updates gross estimate live');
    check(await page.locator('#asking').evaluate(element => parseFloat(getComputedStyle(element).fontSize) >= 16), label + ': price input uses readable text without forced zoom');
    await page.locator('#toast').waitFor({ state: 'hidden' });
    await layout(page, label + ' listing summary');
    await page.screenshot({ path: path.join(artifacts, label + '-listing.png'), fullPage: true });
    await page.locator('#modalbody button[onclick="publish()"]').tap();
    actual = await state(page);
    equal(actual.guide.stage, 'wait', label + ': a real advertisement moves to waiting for buyers');
    check(actual.stock[0].listed && actual.stock[0].offers.length === 0, label + ': listing never fabricates an offer');
    await stockSummary(page, actual.stock[0], asking, label + ' advertised stock');

    // Repair is now a separate, deliberate player action after the no-spend path.
    const beforeRepair = actual;
    await tap(page.locator('#stock button[onclick="repair(' + candidate.id + ')"]'), label + ' voluntary repair');
    actual = await state(page);
    const expense = beforeRepair.cash - actual.cash;
    check(expense > 0, label + ': the explicit repair has an actual expense');
    equal(actual.stock[0].spent - beforeRepair.stock[0].spent, expense, label + ': the vehicle basis records the actual chosen repair');
    await stockSummary(page, actual.stock[0], asking, label + ' repaired investment');
    await page.locator('#ae-stock-search').fill(candidate.name);
    await page.locator('#ae-trade-select-stock').selectOption('name');
    equal(await page.locator('#stock > .panel:visible .ae-trade-summary').getAttribute('data-car-id'), String(candidate.id), label + ': filtering and sorting retain accounting identity');

    const dayBefore = actual.day;
    await page.locator('#pause').tap();
    check(await page.locator('#ae-first-sale-guide [data-guide-action="advance"]').isDisabled(), label + ': running simulation disables one-day advancement');
    await page.locator('#pause').tap();
    equal((await state(page)).day, dayBefore, label + ': pausing controls never skip a simulated day');
    const guarded = await page.evaluate(() => {
      // Exercise the actual click guard while a real modal blocks normal touch.
      const before = { day: s.day, cash: s.cash };
      open('<h2>Verificação de janela aberta</h2><p>O avanço deve aguardar o fechamento.</p>');
      document.querySelector('#ae-first-sale-guide [data-guide-action="advance"]').click();
      const after = { day: s.day, cash: s.cash };
      closeModal();
      return { before, after };
    });
    equal(guarded.after, guarded.before, label + ': an open modal prevents even a dispatched guide advancement');
    for (let attempt = 0; attempt < 5 && (await state(page)).guide.stage === 'wait'; attempt++) {
      const before = await state(page);
      await tap(page.locator('#ae-first-sale-guide [data-guide-action="advance"]'), label + ' explicit next day');
      equal((await state(page)).day, before.day + 1, label + ': one touch advances exactly one day');
    }
    actual = await state(page);
    check(actual.stock[0].offers.length > 0, label + ': real tickDay generates a buyer proposal under controlled randomness');
    check(actual.stock[0].offers.every(offer => offer.aeBuyer && offer.amount > 0), label + ': actual buyer enrichment ran');
    equal(actual.guide.stage, 'offers', label + ': the guide reacts to an actual proposal');
    const settledDay = actual.day;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    equal((await state(page)).day, settledDay, label + ': a paused guide never advances itself');
    await tap(page.locator('#ae-first-sale-guide [data-guide-action="offers"]'), label + ' review buyer proposal');
    const beforeSale = await state(page);
    const offer = beforeSale.stock[0].offers[0];
    const investment = beforeSale.stock[0].bought + beforeSale.stock[0].spent;
    const best = Math.max(...beforeSale.stock[0].offers.map(offer => offer.amount));
    equal(await page.locator('#modalbody .ae-trade-dialog-summary [data-trade-field="gross"]').innerText(), await page.evaluate(value => fmt(value), best - investment), label + ': proposal summary shows gross before company costs');
    await layout(page, label + ' buyer proposal');
    await page.screenshot({ path: path.join(artifacts, label + '-proposal.png'), fullPage: true });
    await tap(page.locator('#modalbody button[onclick="acceptOffer(0)"]'), label + ' accept real proposal');
    await page.waitForFunction(() => s.stock.length === 0);
    actual = await state(page);
    equal(actual.sales, beforeSale.sales + 1, label + ': one actual acceptance records one sale');
    equal(actual.ledger.filter(record => record.name === 'Venda · ' + candidate.name).length, 1, label + ': only one receipt is recorded');
    equal(actual.ledger.find(record => record.name === 'Venda · ' + candidate.name).amount, offer.amount, label + ': the receipt matches the accepted price');
    equal(actual.guide.status, 'completed', label + ': a real sale completes the guide');
    equal(actual.saved.firstSaleGuide.status, 'completed', label + ': completion is persisted');
    const completedFinancials = finance(actual);
    await tap(page.locator('#ae-first-sale-guide [data-guide-action="finish"]'), label + ' finish guide');
    equal(finance(await state(page)), completedFinancials, label + ': acknowledging completion awards no extra money or transaction');
    check(await page.locator('#ae-first-sale-guide').isHidden(), label + ': a completed guide can be closed');
    await page.close(); page = await context.newPage(); observe(page); page.setDefaultTimeout(15000);
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    actual = await state(page);
    equal(finance(actual), completedFinancials, label + ': returning to the campaign preserves sale, cash and inventory');
    equal(actual.guide.status, 'completed', label + ': completion survives page closure and return');
    check(await page.locator('#ae-first-sale-guide').isHidden(), label + ': acknowledged completion stays closed after return');
    equal(actual.other, preview, label + ': the entire sale leaves the preview campaign untouched');

    // A genuine completed save with only the new guide metadata removed is the
    // fixture for a campaign from before the optional-guide feature existed.
    const legacySave = JSON.parse(JSON.stringify(actual.saved)); delete legacySave.firstSaleGuide;
    const legacyContext = await newContext(profile);
    try {
      await legacyContext.addInitScript(save => {
        if (!localStorage.getItem('__guide_legacy_fixture')) {
          localStorage.setItem('autoempire_v02', JSON.stringify(save)); localStorage.setItem('__guide_legacy_fixture', '1');
        }
      }, legacySave);
      const legacy = await legacyContext.newPage(); observe(legacy);
      await legacy.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
      check(await legacy.locator('#ae-first-sale-guide').isHidden(), label + ': a legacy campaign with sales gets no automatic invitation');
      equal((await state(legacy)).sales, legacySave.sales, label + ': legacy sales are preserved');
      await legacy.locator('.bottom [data-tab="events"]').tap();
      const before = finance(await state(legacy));
      await tap(legacy.locator('#ae-first-sale-guide-events [data-guide-action="start"]'), label + ' opt in on legacy campaign');
      equal((await state(legacy)).guide.status, 'enabled', label + ': a legacy player can opt into another guided sale');
      equal(finance(await state(legacy)), before, label + ': legacy opt-in never rewrites campaign economics');
      await legacy.locator('.bottom [data-tab="events"]').tap();
      await legacy.locator('#events button[onclick="newGame()"]').tap();
      await legacy.locator('#ae-company-screen').waitFor({ state: 'visible' });
      equal(finance(await state(legacy)), before, label + ': opening new-campaign setup does not erase the existing save');
      await legacy.locator('#ae-company-name').fill('Nova Guia Motors');
      await legacy.locator('#ae-owner-name').fill('Ana Teste');
      await tap(legacy.locator('#ae-company-submit'), label + ' confirm new campaign');
      await legacy.locator('#ae-company-screen').waitFor({ state: 'hidden' });
      const fresh = await state(legacy);
      check(fresh.sales === 0 && fresh.stock.length === 0 && !fresh.saved.firstSaleGuide, label + ': starting a new campaign clears old tutorial progress (' + JSON.stringify({ sales: fresh.sales, stock: fresh.stock.length, guide: fresh.guide, savedGuide: fresh.saved.firstSaleGuide }) + ')');
      equal(fresh.guide.status, 'invited', label + ': a new campaign gets a fresh optional guide');
    } finally { await legacyContext.close(); }
    check(errors.length === 0, label + ': no JavaScript errors: ' + errors.join('; '));
    check(missing.length === 0, label + ': no missing resources: ' + missing.join('; '));
    completed.push({ name: profile.name, viewport: profile.viewport, campaign: 'main and preview', physicalDevice: false });
    console.log('PASS profile: ' + label);
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, label + '-failure.png'), fullPage: true }).catch(() => {});
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
    for (const profile of profiles) await testProfile(base, profile);
    await fs.writeFile(path.join(artifacts, engine + '-results.json'), JSON.stringify({
      engine, version: browser.version(), passedChecks: checks, profiles: completed,
      physicalDeviceValidation: 'Not performed: these are device-emulation tests, not physical Safari/iOS validation.'
    }, null, 2) + '\n');
    console.log('PASS: ' + checks + ' optional-guide, real resale, campaign isolation and gross-accounting checks (' + engine + ')');
    console.log('Physical Safari/iPhone validation was not performed. Screenshots/report: ' + artifacts);
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})();
