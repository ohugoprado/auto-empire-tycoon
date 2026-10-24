/* Auction purchase regression: one persistent vehicle per two-day lot.
 * Explicit capital/capacity and queue fixtures support isolated purchase checks;
 * purchases always use the real UI/handler, and renewal advances real tickDay.
 * Run: node tests/auction-purchase.test.js; AE_BROWSER=webkit is supported.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const artifacts = process.env.AE_AUCTION_REVIEW_DIR || '/tmp/auto-empire-auction';
const engine = process.env.AE_BROWSER || 'chromium';
let server, browser, checks = 0;
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
  server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
  const base = 'http://127.0.0.1:' + port;
  for (let n = 0; n < 60; n++) {
    if (server.exitCode !== null) throw Error('Auction fixture server exited: ' + output);
    try { if ((await fetch(base + '/preview/', { method: 'HEAD' })).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Auction fixture server did not start: ' + output);
}
async function state(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify({ key: KEY, cash: s.cash, day: s.day, nextId: s.nextId,
    slots: s.slots, stock: s.stock, market: s.market, ledger: s.ledger,
    lot: s.auctionLot, saved: JSON.parse(localStorage.getItem(KEY)), paused,
    other: localStorage.getItem(KEY === 'autoempire_v02' ? 'autoempire_preview_v06' : 'autoempire_v02') })));
}
const transactions = value => value.ledger.filter(item => item.name.startsWith('Arremate em leilão · '));
const finances = value => ({ cash: value.cash, nextId: value.nextId, stock: value.stock, ledger: value.ledger });
async function showAuction(page) {
  await page.locator('.bottom [data-tab="market"]').tap();
  const auction = page.locator('#ae-auction');
  await auction.scrollIntoViewIfNeeded();
  await auction.waitFor({ state: 'visible' });
}
async function forceAttempt(page) {
  // Deliberately dispatch past disabled presentation to verify the purchase guard.
  await page.evaluate(() => document.querySelector('#ae-auction [data-ae-bid]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}
async function unchangedAfterAttempt(page, label) {
  const before = await state(page);
  await forceAttempt(page);
  const after = await state(page);
  equal(finances(after), finances(before), label + ': blocked attempt has no financial or inventory effect');
  check(!after.lot.purchased, label + ': blocked attempt leaves the lot available');
  equal(after.lot.id, before.lot.id, label + ': blocked attempt does not replace the lot');
}
async function assertPurchase(before, after, label) {
  equal(after.stock.length, before.stock.length + 1, label + ': exactly one car is added');
  equal(after.cash, before.cash - before.lot.price, label + ': the displayed frozen quote is charged once');
  equal(transactions(after).length, transactions(before).length + 1, label + ': exactly one auction ledger entry is added');
  equal(transactions(after)[0].amount, -before.lot.price, label + ': the ledger records the actual paid price');
  const car = after.stock.find(item => item.id === after.lot.purchaseCarId);
  check(Boolean(car), label + ': the persistent lot identifies its acquired car');
  equal(car.name, before.lot.car.name, label + ': the acquired car is the advertised model');
  equal(car.kind, before.lot.car.kind, label + ': the acquired category is retained');
  equal(car.bought, before.lot.price, label + ': cost basis matches the actual charge');
  equal(car.offers, [], label + ': no seller offer is copied into the owned car');
  check(after.lot.purchased, label + ': the lot is persistently consumed');
  equal(after.saved.auctionLot, after.lot, label + ': consumed state is saved in the active campaign');
  equal(after.saved.cash, after.cash, label + ': the resulting balance is saved');
  check(new Set(after.stock.map(item => item.id)).size === after.stock.length, label + ': owned car IDs stay unique');
}
async function runProfile(base, width) {
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'], viewport: { width, height: 763 } });
  await context.addInitScript(() => {
    Math.random = () => .6;
    if (!localStorage.getItem('autoempire_company_profile_v1')) localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({ company: 'Leilão Teste', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo' }));
  });
  const page = await context.newPage(), errors = [], label = engine + '-' + width;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  try {
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    await showAuction(page);
    let actual = await state(page);
    check(actual.paused && actual.stock.length === 0, label + ': purchase scenario starts paused with an empty real campaign');
    check(actual.lot && actual.lot.price > 0 && !actual.lot.purchased, label + ': a legacy/fresh campaign gets one valid unconsumed lot');
    equal(actual.lot.window, Math.floor(actual.day / 2), label + ': lot belongs to the current two-day window');
    // Settle the capital/capacity fixture with the real engine before recording
    // a quote or purchase baseline. This legitimately awards existing milestones;
    // reload must not be misreported as duplicate income from the auction.
    await page.evaluate(() => { s.cash += 965000; entry('Fixture: capital para regressão do leilão', 965000); s.slots = 12; tickDay(); save(); render(); });
    const marketBefore = await state(page);
    const frozen = marketBefore.lot;
    check(marketBefore.day > actual.day, label + ': the fixture settles through a real simulated day before purchase');
    check(marketBefore.ledger.some(item => item.name === 'Conquista · Reserva de caixa') && marketBefore.ledger.some(item => item.name === 'Conquista · Primeira expansão'), label + ': the real engine accounts for fixture-earned capital and garage milestones');
    equal(marketBefore.cash, 35000 + marketBefore.ledger.reduce((sum, item) => sum + item.amount, 0), label + ': fixture capital and actual milestone income reconcile with the ledger');
    await page.evaluate(() => refreshPaid());
    actual = await state(page);
    equal(actual.cash, marketBefore.cash - 100, label + ': real market refresh charges its ordinary fee');
    equal(actual.lot, frozen, label + ': refreshing the market cannot reroll the frozen auction lot');
    await page.evaluate(() => { window.__auctionCash = s.cash; s.cash = 0; render(); });
    await unchangedAfterAttempt(page, label + ' insufficient money');
    await page.evaluate(() => { s.cash = window.__auctionCash; delete window.__auctionCash; s.slots = 1; s.stock = [makeCar()]; render(); });
    await unchangedAfterAttempt(page, label + ' occupied garage');
    await page.evaluate(() => {
      s.stock = []; s.empire.economy.factory.queue = [{ model: 'Fixture reservado', kind: 'Hatch', due: s.day + 20, cost: 1000, value: 1200 }]; render();
    });
    await unchangedAfterAttempt(page, label + ' reserved production slot');
    await page.evaluate(() => { s.empire.economy.factory.queue = []; s.empire.economy.bankrupt = true; render(); });
    await unchangedAfterAttempt(page, label + ' ended campaign');
    await page.evaluate(() => { s.empire.economy.bankrupt = false; s.slots = 12; save(); render(); });
    const button = page.locator('#ae-auction [data-ae-bid]');
    const box = await button.boundingBox();
    check(box && box.width >= 44 && box.height >= 44, label + ': purchase control has a minimum44x44 touch target');
    check((await button.innerText()).includes(frozen.price.toLocaleString('pt-BR')), label + ': button shows the frozen price that will be charged');
    const before = await state(page);
    await page.evaluate(() => { window.__oldAuctionButton = document.querySelector('#ae-auction [data-ae-bid]').cloneNode(true); });
    await button.tap();
    const soldBox = await button.boundingBox();
    check(Boolean(soldBox), label + ': the sold control remains visible for repeated real touch');
    for (let i = 0; i < 3; i++) await page.touchscreen.tap(soldBox.x + soldBox.width / 2, soldBox.y + soldBox.height / 2);
    // Repeat quickly against the newly rendered button, reproducing the reported
    // same-control exploit even though the renderer replaces the DOM element.
    await page.evaluate(() => {
      for (let i = 0; i < 8; i++) document.querySelector('#ae-auction [data-ae-bid]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const stale = window.__oldAuctionButton; document.querySelector('#ae-auction').append(stale); stale.click(); stale.remove();
    });
    const bought = await state(page);
    await assertPurchase(before, bought, label + ' rapid purchase');
    check(await page.locator('#ae-auction [data-ae-bid]').isDisabled(), label + ': sold lot has disabled purchase presentation');
    check(/arrematado/i.test(await page.locator('#ae-auction-status').innerText()), label + ': consumed state is explained visibly');
    const stable = finances(bought);
    await page.evaluate(() => render());
    await forceAttempt(page);
    equal(finances(await state(page)), stable, label + ': full render cannot reopen or charge the sold lot');
    await page.reload({ waitUntil: 'networkidle' });
    await showAuction(page);
    const reloaded = await state(page);
    equal(reloaded.lot, bought.lot, label + ': reload preserves purchased status and frozen vehicle');
    equal(reloaded.cash, bought.cash, label + ': reload preserves actual paid balance');
    equal(reloaded.stock.length, bought.stock.length, label + ': reload never creates a second vehicle');
    await forceAttempt(page);
    equal(finances(await state(page)), finances(reloaded), label + ': dispatched click after reload cannot repurchase');
    const originalWindow = reloaded.lot.window;
    await page.evaluate(windowId => { while (Math.floor(s.day / 2) === windowId) tickDay(); save(); render(); }, originalWindow);
    const next = await state(page);
    check(next.lot.id !== bought.lot.id && !next.lot.purchased, label + ': real day advancement opens a different unconsumed lot');
    equal(next.lot.window, Math.floor(next.day / 2), label + ': renewal follows simulated days');
    // Real tickDay may award milestones or charge expenses. Reconcile all of its
    // ledger changes rather than pretending that advancing time is free.
    check(next.ledger.length < 100, label + ': complete financial ledger remains available');
    equal(next.cash, 35000 + next.ledger.reduce((sum, item) => sum + item.amount, 0), label + ': actual clock expenses and milestones reconcile with fixture capital');
    await page.evaluate(() => { const stale = window.__oldAuctionButton = document.createElement('button'); stale.dataset.aeBid = s.auctionLot.id; });
    // A truly old lot ID must be rejected even while the next lot is purchasable.
    await page.evaluate(oldId => { const stale = window.__oldAuctionButton; stale.dataset.aeBid = oldId; document.querySelector('#ae-auction').append(stale); stale.click(); stale.remove(); }, bought.lot.id);
    equal(finances(await state(page)), finances(next), label + ': queued stale control cannot purchase a newer lot');
    await page.locator('#ae-auction [data-ae-bid]').tap();
    await assertPurchase(next, await state(page), label + ' next legitimate lot');
    const mainStored = await page.evaluate(() => { save(); return localStorage.getItem(KEY); });
    await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
    await showAuction(page);
    const previewBefore = await state(page);
    equal(previewBefore.key, 'autoempire_preview_v06', label + ': preview is a separate campaign');
    check(!previewBefore.lot.purchased, label + ': main consumption never consumes the preview lot');
    await page.evaluate(() => { s.cash += 965000; entry('Fixture: capital preview', 965000); s.slots = 12; tickDay(); save(); render(); });
    const previewFunded = await state(page);
    await page.locator('#ae-auction [data-ae-bid]').tap();
    await assertPurchase(previewFunded, await state(page), label + ' separate preview purchase');
    equal(await page.evaluate(() => localStorage.getItem('autoempire_v02')), mainStored, label + ': preview purchase leaves main campaign byte-for-byte unchanged');
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    await showAuction(page);
    const restored = await state(page);
    equal(restored.stock.length, 2, label + ': main campaign retains exactly its two legitimate lots');
    check(restored.lot.purchased, label + ': returning to main retains the consumed lot');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': auction has no horizontal page overflow');
    equal(errors, [], label + ': no JavaScript errors');
    await page.screenshot({ path: path.join(artifacts, label + '-sold.png'), scale: 'css' });
    console.log('PASS profile: ' + label + ' auction purchase');
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, label + '-failure.png'), scale: 'css' }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}
(async () => {
  try {
    check(['chromium', 'webkit'].includes(engine), 'Supported browser engine');
    await fs.mkdir(artifacts, { recursive: true });
    const base = await startServer();
    browser = await playwright[engine].launch(engine === 'chromium'
      ? { executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }
      : { headless: true, ...(process.env.AE_WEBKIT_PATH ? { executablePath: process.env.AE_WEBKIT_PATH } : {}) });
    for (const width of [440, 320]) await runProfile(base, width);
    console.log('PASS: ' + checks + ' auction exclusivity, burst/stale clicks, financial, capacity, renewal and campaign checks (' + engine + ')');
    console.log('Physical Safari/iPhone validation was not performed. Screenshots: ' + artifacts);
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
