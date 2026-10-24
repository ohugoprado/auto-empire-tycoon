/* Central subsidiary management: actual acquisition/switch/HQ controls and costs.
 * Capital and one existing offer are explicit fixtures. No sale is fabricated.
 * Run: node tests/subsidiary-management.test.js; AE_BROWSER=webkit also supported.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const artifacts = process.env.AE_SUBSIDIARY_REVIEW_DIR || '/tmp/auto-empire-subsidiaries';
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
  let output = '';
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', value => { output += value; }); server.stderr.on('data', value => { output += value; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw Error('Subsidiary server exited: ' + output);
    try { if ((await fetch(base + '/preview/', { method: 'HEAD' })).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Subsidiary server did not start: ' + output);
}
async function state(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify({ key: KEY, cash: s.cash, day: s.day, slots: s.slots,
    stock: s.stock, market: s.market, sales: s.sales, profit: s.profit, ledger: s.ledger,
    world: s.empire.world, staff: s.empire.staff, queue: s.empire.economy.factory.queue,
    saved: JSON.parse(localStorage.getItem(KEY)),
    other: localStorage.getItem(KEY === 'autoempire_v02' ? 'autoempire_preview_v06' : 'autoempire_v02') })));
}
const financial = value => ({ cash: value.cash, day: value.day, slots: value.slots, stock: value.stock,
  market: value.market, sales: value.sales, profit: value.profit, ledger: value.ledger, staff: value.staff, queue: value.queue });
function reconcile(actual, label) {
  check(actual.ledger.length < 100, label + ': full ledger is available');
  equal(actual.cash, 35000 + actual.ledger.reduce((sum, entry) => sum + entry.amount, 0), label + ': all acquisition, income and simulated-day expenses reconcile');
  equal(actual.saved.cash, actual.cash, label + ': balance is saved');
}
async function openNetwork(page) {
  await page.locator('.bottom [data-tab="garage"]').tap();
  await page.locator('[data-workspace="management"]').tap();
  await page.locator('#ae-mgmt-tab-network').tap();
  const fold = page.locator('#fold-ae-world > .ae-fold-head');
  if (await fold.getAttribute('aria-expanded') === 'false') await fold.tap();
  await page.locator('#ae-world').waitFor({ state: 'visible' });
}
async function touch(locator, label) {
  const box = await locator.boundingBox();
  check(box && box.width >= 44 && box.height >= 44, label + ': touch target is at least44x44');
  await locator.tap();
}
async function layout(page, label) {
  const actual = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    boxes: [...document.querySelectorAll('#ae-world,#ae-world input,#ae-world select,#ae-world button,#ae-world summary')]
      .filter(node => node.getClientRects().length).map(node => { const b = node.getBoundingClientRect(); return { id: node.id || node.tagName, left: b.left, right: b.right }; }) }));
  check(actual.scrollWidth <= actual.width + 1, label + ': no horizontal document overflow');
  check(actual.boxes.every(box => box.left >= -1 && box.right <= actual.width + 1), label + ': all subsidiary controls fit the viewport: ' + JSON.stringify(actual.boxes));
}
async function runProfile(base, width) {
  const label = engine + '-' + width;
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'], viewport: { width, height: 763 } });
  await context.addInitScript(() => {
    Math.random = () => .6;
    if (!localStorage.getItem('autoempire_company_profile_v1')) localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({ company: 'Rede Teste', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo' }));
  });
  const page = await context.newPage(), errors = [], confirmations = [];
  page.setDefaultTimeout(15000);
  let dismissNext = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { confirmations.push(dialog.message()); if (dismissNext) { dismissNext = false; return dialog.dismiss(); } return dialog.accept(); });
  try {
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    await openNetwork(page);
    let actual = await state(page);
    equal(actual.world.owned, ['saopaulo'], label + ': a new campaign has only its free founding unit');
    equal(await page.locator('#ae-world-owned .ae-world-owned-city').count(), 1, label + ': the working list contains only the owned unit');
    check(!(await page.locator('#ae-world-expansion').evaluate(node => node.open)), label + ': unowned destinations start folded away');
    check(!(await page.locator('#ae-world-cities').isVisible()), label + ': fifteen future purchases do not fill the default working view');
    check((await page.locator('.ae-world-shared').innerText()).includes('compartilhada'), label + ': shared operation is explained');
    check((await page.locator('#ae-world-summary').innerText()).includes('585'), label + ': initial summary uses the existing10% upkeep discount');
    await layout(page, label + ' compact view');
    await page.evaluate(() => { s.cash += 465000; entry('Fixture: capital para subsidiárias', 465000); tickDay(); save(); render(); });
    reconcile(await state(page), label + ' fixture settled by actual tickDay');
    await touch(page.locator('#ae-world-expansion > summary'), label + ' expansion');
    equal(await page.locator('.ae-world-city').count(), 15, label + ': expansion offers the fifteen unowned cities');
    await page.locator('#ae-world-search').fill('York');
    equal(await page.locator('.ae-world-city').count(), 1, label + ': search narrows expansion to one actual destination');
    const acquisition = page.locator('#ae-world-cities [data-world-city="newyork"]');
    check((await page.locator('[data-world-destination="newyork"]').innerText()).includes('78.000'), label + ': acquisition cost is visible before confirmation');
    check((await page.locator('[data-world-destination="newyork"]').innerText()).includes('1.800'), label + ': base thirty-day upkeep is visible');
    await page.evaluate(() => { window.__worldFixtureCash = s.cash; s.cash = 0; save(); render(); });
    const insufficient = await state(page), dialogCount = confirmations.length;
    await touch(acquisition, label + ' insufficient funds');
    equal(financial(await state(page)), financial(insufficient), label + ': insufficient funds cannot debit or add capacity');
    equal((await state(page)).world, insufficient.world, label + ': insufficient funds cannot acquire or consume a destination');
    equal(confirmations.length, dialogCount, label + ': insufficient funds do not ask to confirm a purchase');
    await page.evaluate(() => { s.cash = window.__worldFixtureCash; delete window.__worldFixtureCash; save(); render(); });
    const before = await state(page);
    dismissNext = true;
    await touch(acquisition, label + ' cancelled acquisition');
    equal(financial(await state(page)), financial(before), label + ': cancelling acquisition preserves all financial state');
    equal((await state(page)).world, before.world, label + ': cancelling acquisition preserves all branch state');
    await page.evaluate(() => { window.__worldOldButton = document.querySelector('#ae-world-cities [data-world-city="newyork"]').cloneNode(true); });
    await touch(acquisition, label + ' actual acquisition');
    actual = await state(page);
    equal(actual.cash, before.cash - 78000, label + ': one real acquisition charges the quoted78000');
    equal(actual.slots, before.slots + 3, label + ': New York adds three global garage spaces');
    equal(actual.world.owned, ['saopaulo', 'newyork'], label + ': New York is owned once');
    equal(actual.world.active, 'newyork', label + ': a new branch becomes the active market');
    equal(actual.world.acquisitions, before.world.acquisitions + 1, label + ': acquisition counter advances once');
    equal(actual.ledger.filter(entry => entry.name === 'Subsidiária · Nova York').length, 1, label + ': purchase has one ledger entry');
    equal(actual.saved.empire.world, actual.world, label + ': the acquired network is saved');
    equal(await page.locator('.ae-world-owned-city').count(), 2, label + ': both owned units remain together in the working list');
    await page.evaluate(() => { const stale = window.__worldOldButton; document.querySelector('#ae-world-cities').append(stale); for (let i = 0; i < 5; i++) stale.click(); stale.remove(); });
    equal(financial(await state(page)), financial(actual), label + ': repeated stale acquisition controls cannot charge or add capacity twice');
    equal((await state(page)).world, actual.world, label + ': repeated stale controls do not duplicate acquisitions');
    // Explicit pre-existing offer fixture: switching markets must not re-price it.
    await page.evaluate(() => { const car = makeCar(); car.bought = 10000; car.listed = true; car.price = 15000; car.offers = [{ name: 'Fixture: comprador existente', amount: 14000, type: 'cash' }]; s.stock = [car]; save(); render(); });
    const beforeSwitch = await state(page);
    await touch(page.locator('#ae-world-owned [data-world-city="saopaulo"]'), label + ' one-touch market switch');
    actual = await state(page);
    equal(actual.world.active, 'saopaulo', label + ': owned unit becomes active in one touch');
    equal(financial(actual), financial(beforeSwitch), label + ': one-touch switch preserves offers, car identity, money, queue and global roster');
    equal(await page.locator('#ae-world-owned [data-world-city="saopaulo"]').getAttribute('aria-pressed'), 'true', label + ': current unit is exposed as selected');
    await touch(page.locator('#ae-world-settings > summary'), label + ' headquarters controls');
    const beforeHQ = await state(page);
    dismissNext = true;
    await page.locator('#ae-world-hq').selectOption('newyork');
    equal(await page.locator('#ae-world-hq').inputValue(), 'saopaulo', label + ': cancelled HQ transfer immediately restores the visible selector');
    equal((await state(page)).world.hq, 'saopaulo', label + ': cancelled HQ transfer preserves real headquarters');
    equal(financial(await state(page)), financial(beforeHQ), label + ': cancelled HQ transfer has no transaction');
    await page.locator('#ae-world-hq').selectOption('newyork');
    equal((await state(page)).world.hq, 'newyork', label + ': accepted HQ transfer selects an owned city');
    equal(financial(await state(page)), financial(beforeHQ), label + ': existing HQ transfer rule remains free');
    await page.locator('#ae-world-active').selectOption('newyork');
    equal((await state(page)).world.active, 'newyork', label + ': settings dropdown keeps the same active-market behavior');
    equal(financial(await state(page)), financial(beforeHQ), label + ': settings switch also preserves the existing offer');
    await page.evaluate(() => { s.stock = []; tickDay(); save(); render(); });
    // Settle any garage milestone legitimately earned by the real acquisition.
    const stored = await state(page);
    reconcile(stored, label + ' post-acquisition day');
    await page.reload({ waitUntil: 'networkidle' });
    await openNetwork(page);
    actual = await state(page);
    equal(actual.world, stored.world, label + ': owned cities, HQ and active market survive reload');
    equal(actual.cash, stored.cash, label + ': reload cannot re-charge acquisition or duplicate milestone income');
    await page.evaluate(() => { while (s.day < 30) tickDay(); save(); render(); });
    const month = await state(page), charges = month.ledger.filter(entry => entry.name === 'Custos internacionais');
    equal(charges.length, 1, label + ': actual day advancement charges international upkeep once at day30');
    equal(charges[0].amount, -2205, label + ': two real units cost round((650+1800)*.9) per thirty days');
    equal(month.world.totalUpkeep, stored.world.totalUpkeep + 2205, label + ': accumulated international expense tracks the actual payment');
    reconcile(month, label + ' actual month-end');
    await page.evaluate(() => { render(); render(); save(); });
    equal((await state(page)).ledger, month.ledger, label + ': rendering does not charge upkeep again');
    await page.reload({ waitUntil: 'networkidle' });
    await openNetwork(page);
    equal((await state(page)).cash, month.cash, label + ': reload on day30 cannot charge upkeep a second time');
    const mainStored = await page.evaluate(() => { save(); return localStorage.getItem(KEY); });
    await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
    await openNetwork(page);
    const preview = await state(page);
    equal(preview.key, 'autoempire_preview_v06', label + ': preview remains an independent campaign');
    equal(preview.world.owned, ['saopaulo'], label + ': main subsidiaries are not copied to preview');
    equal(await page.evaluate(() => localStorage.getItem('autoempire_v02')), mainStored, label + ': viewing preview leaves main campaign byte-for-byte intact');
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    await openNetwork(page);
    equal((await state(page)).world.owned, ['saopaulo', 'newyork'], label + ': returning restores the main owned network');
    await layout(page, label + ' restored network');
    await page.locator('#ae-world').screenshot({ path: path.join(artifacts, label + '-network.png'), scale: 'css' });
    equal(errors, [], label + ': no JavaScript errors');
    console.log('PASS profile: ' + label + ' subsidiary management');
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, label + '-failure.png'), scale: 'css' }).catch(() => {});
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
    console.log('PASS: ' + checks + ' subsidiary centralization, acquisition, HQ cancel, global resources, upkeep and persistence checks (' + engine + ')');
    console.log('Physical Safari/iPhone validation was not performed. Screenshots: ' + artifacts);
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
