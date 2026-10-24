/* Floating navigation regression (Chromium/WebKit, 440/320 CSS pixels).
 * Destinations use trusted touch and the existing game controls. No purchase,
 * production, research, loan or reward is fabricated to test navigation.
 * Run: node tests/quick-navigation.test.js; AE_BROWSER=webkit is supported.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const engine = process.env.AE_BROWSER || 'chromium';
const artifacts = process.env.AE_QUICK_NAV_REVIEW_DIR || '/tmp/auto-empire-quick-navigation';
const fabSelector = '#ae-quick-nav-button';
const dialogSelector = '#ae-quick-nav';
let browser, server, checks = 0;
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
  server.stdout.on('data', value => { output += value; });
  server.stderr.on('data', value => { output += value; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (failure) throw failure;
    if (server.exitCode !== null) throw Error('Quick navigation fixture server exited: ' + output);
    try { if ((await fetch(base + '/preview/', { method: 'HEAD' })).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Quick navigation fixture server did not become ready: ' + output);
}
async function campaign(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify({
    key: KEY, cash: s.cash, day: s.day, sales: s.sales, profit: s.profit,
    slots: s.slots, stock: s.stock, market: s.market,
    queue: s.empire.economy.factory.queue, studio: s.empire.economy.studio,
    ledger: s.ledger, paused,
    other: localStorage.getItem(KEY === 'autoempire_v02' ? 'autoempire_preview_v06' : 'autoempire_v02')
  })));
}
const finances = value => ({ cash: value.cash, day: value.day, sales: value.sales, profit: value.profit,
  slots: value.slots, stock: value.stock, market: value.market, queue: value.queue,
  studio: value.studio, ledger: value.ledger });
const transactions = value => ({ cash: value.cash, day: value.day, sales: value.sales, profit: value.profit,
  slots: value.slots, stock: value.stock, queue: value.queue, studio: value.studio, ledger: value.ledger });
async function tap(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  check(box && box.width >= 44 && box.height >= 44, label + ': target is at least 44 x 44 CSS pixels');
  await locator.tap();
}
async function assertFab(page, label) {
  await page.locator(fabSelector).waitFor({ state: 'visible' });
  const value = await page.evaluate(selector => {
    const button = document.querySelector(selector), box = button.getBoundingClientRect();
    const nav = document.querySelector('.bottom').getBoundingClientRect();
    const front = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom,
      navTop: nav.top, viewportWidth: innerWidth, viewportHeight: innerHeight,
      reachable: front === button || button.contains(front), label: button.innerText,
      controls: button.getAttribute('aria-controls'), expanded: button.getAttribute('aria-expanded') };
  }, fabSelector);
  check(value.width >= 44 && value.height >= 44, label + ': the floating shortcut has a full touch target');
  check(value.x >= 0 && value.y >= 0 && value.right <= value.viewportWidth && value.bottom <= value.viewportHeight,
    label + ': the floating shortcut stays entirely in the visible viewport');
  check(value.bottom <= value.navTop, label + ': the floating shortcut is above the persistent bottom navigation');
  check(value.reachable, label + ': another element does not intercept the shortcut touch target');
  check(/atalhos/i.test(value.label), label + ': the floating shortcut has an understandable visible name');
  equal(value.controls, 'ae-quick-nav', label + ': the shortcut identifies its accessible menu');
  equal(value.expanded, 'false', label + ': the closed menu has a collapsed state');
  return value;
}
async function openMenu(page, label) {
  await tap(page.locator(fabSelector), label + ' open shortcuts');
  await page.locator(dialogSelector).waitFor({ state: 'visible' });
  const actual = await page.evaluate(selector => {
    const dialog = document.querySelector(selector), box = dialog.getBoundingClientRect();
    const title = document.getElementById(dialog.getAttribute('aria-labelledby'));
    const description = document.getElementById(dialog.getAttribute('aria-describedby'));
    return { modal: dialog.matches(':modal'), title: title?.textContent?.trim(), description: description?.textContent?.trim(),
      focusInside: dialog.contains(document.activeElement), x: box.x, right: box.right,
      viewportWidth: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  }, dialogSelector);
  check(actual.modal, label + ': shortcuts use a modal accessible dialog');
  check(Boolean(actual.title) && Boolean(actual.description), label + ': the menu has an accessible title and explanation');
  check(actual.focusInside, label + ': opening the menu places keyboard focus inside it');
  check(actual.x >= -1 && actual.right <= actual.viewportWidth + 1 && !actual.overflow, label + ': the menu fits the phone width');
  for (const [action, words] of [['market', /mercado/i], ['garage', /estoque|garagem/i], ['factory', /fabricante|fábrica/i], ['projects', /projetos|p&d/i], ['network', /subsidiárias/i], ['menu', /menu/i], ['simulation', /avançar.*dia/i]]) {
    const control = page.locator('[data-quick-nav="' + action + '"]');
    equal(await control.count(), 1, label + ': one authoritative ' + action + ' shortcut exists');
    check(words.test(await control.innerText()), label + ': ' + action + ' shortcut has an understandable name');
    const box = await control.boundingBox();
    check(box && box.width >= 44 && box.height >= 44, label + ': ' + action + ' shortcut has a full touch target');
  }
}
async function assertClosedFocus(page, label) {
  await page.locator(dialogSelector).waitFor({ state: 'hidden' });
  await page.waitForFunction(selector => document.activeElement === document.querySelector(selector), fabSelector);
  check(await page.locator(fabSelector).isVisible(), label + ': closing restores the available shortcut');
  equal(await page.evaluate(() => paused), true, label + ': closing the menu preserves manual-turn mode');
}
async function destinationFocus(page, selector, label) {
  await page.waitForFunction(selector => {
    const target = document.querySelector(selector);
    return target && target.getClientRects().length && (target === document.activeElement || target.contains(document.activeElement));
  }, selector);
  const value = await page.evaluate(selector => {
    const target = document.querySelector(selector);
    return { present: Boolean(target && target.getClientRects().length),
      focused: Boolean(target && (target === document.activeElement || target.contains(document.activeElement))) };
  }, selector);
  check(value.present, label + ': the actual destination is visible');
  check(value.focused, label + ': keyboard focus follows the selected destination');
}
async function runProfile(base, width) {
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'], viewport: { width, height: 763 } });
  await context.addInitScript(() => {
    Math.random = () => .6;
    if (!localStorage.getItem('autoempire_company_profile_v1')) localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({
      company: 'Atalhos Motors', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo'
    }));
  });
  const page = await context.newPage(), errors = [], dialogs = [], label = engine + '-' + width;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.type()); return dialog.dismiss(); });
  try {
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    const opening = await campaign(page);
    check(opening.paused, label + ': shortcut navigation starts with an explicitly paused campaign');
    const firstFab = await assertFab(page, label + ' initial');
    await openMenu(page, label + ' initial');
    equal(finances(await campaign(page)), finances(opening), label + ': opening shortcuts performs no game transaction');
    equal((await campaign(page)).paused, true, label + ': opening shortcuts preserves a paused simulation');
    await page.screenshot({ path: path.join(artifacts, label + '-menu.png'), scale: 'css' });
    await tap(page.locator('#ae-quick-nav-close'), label + ' close shortcuts');
    await assertClosedFocus(page, label + ' close button');
    await openMenu(page, label + ' escape');
    await page.keyboard.press('Escape');
    await assertClosedFocus(page, label + ' escape');
    await openMenu(page, label + ' backdrop');
    const outside = await page.evaluate(selector => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return [[3, 3], [innerWidth - 3, 3], [3, innerHeight - 3], [innerWidth - 3, innerHeight - 3]]
        .find(([x, y]) => x < box.left || x > box.right || y < box.top || y > box.bottom);
    }, dialogSelector);
    check(Boolean(outside), label + ': the bottom sheet retains a reachable backdrop');
    await page.touchscreen.tap(outside[0], outside[1]);
    await assertClosedFocus(page, label + ' backdrop');

    for (const [action, destination, expandedFold] of [
      ['market', '#market', null], ['garage', '#stock', null],
      ['factory', '#fold-ae-economy', '#fold-ae-economy'], ['projects', '#fold-ae-studio', '#fold-ae-studio'],
      ['network', '#ae-world', '#fold-ae-world']
    ]) {
      const before = await campaign(page);
      await openMenu(page, label + ' ' + action);
      await tap(page.locator('[data-quick-nav="' + action + '"]'), label + ' visit ' + action);
      await page.locator(dialogSelector).waitFor({ state: 'hidden' });
      await destinationFocus(page, destination, label + ' ' + action);
      if (expandedFold) equal(await page.locator(expandedFold + ' > .ae-fold-head').getAttribute('aria-expanded'), 'true', label + ': ' + action + ' reveals the real controls');
      equal(finances(await campaign(page)), finances(before), label + ': ' + action + ' navigation does not buy, sell, research or produce');
      equal((await campaign(page)).paused, before.paused, label + ': ' + action + ' navigation does not change simulation controls');
      await assertFab(page, label + ' after ' + action);
    }
    const beforeGameMenu = await campaign(page);
    await openMenu(page, label + ' game menu');
    await tap(page.locator('[data-quick-nav="menu"]'), label + ' visit game menu');
    await page.locator('#ae-game-menu').waitFor({ state: 'visible' });
    check(await page.locator('#ae-game-menu').evaluate(node => node.matches(':modal')), label + ': the game menu opens as the active modal');
    equal(finances(await campaign(page)), finances(beforeGameMenu), label + ': visiting the game menu does not reset or charge the campaign');
    await page.keyboard.press('Escape');
    await page.locator('#ae-game-menu').waitFor({ state: 'hidden' });
    await assertFab(page, label + ' after game menu');
    equal(dialogs, [], label + ': all shortcuts remain navigational without spending confirmations');
    // Real profile editing provides an onboarding overlay and a focused input.
    await page.locator('#ae-company-edit').tap();
    await page.locator('#ae-company-screen.is-open').waitFor({ state: 'visible' });
    await page.locator(fabSelector).waitFor({ state: 'hidden' });
    check(await page.locator('#ae-company-name').isVisible(), label + ': onboarding input remains accessible without a floating overlay');
    await page.locator('#ae-company-cancel').tap();
    await assertFab(page, label + ' after profile overlay');
    // A real purchase dialog exercises the legacy modal guard without a purchase.
    await openMenu(page, label + ' before purchase overlay');
    await page.locator('[data-quick-nav="market"]').tap();
    const beforeDialog = await campaign(page);
    await page.locator('#listings button[onclick^="buyDialog("]').first().tap();
    await page.locator('#modal:not(.hide)').waitFor({ state: 'visible' });
    await page.locator(fabSelector).waitFor({ state: 'hidden' });
    check(await page.locator('#bid').isVisible(), label + ': the purchase input remains reachable while shortcuts are hidden');
    await page.locator('#modalbody .ae-dialog-close').tap();
    await assertFab(page, label + ' after purchase overlay');
    // Opening the existing negotiation may initialize its seller metadata. It
    // must not change money, owned vehicles, production or research.
    equal(transactions(await campaign(page)), transactions(beforeDialog), label + ': opening and closing the existing purchase dialog spends nothing');
    // Explicitly synthetic native overlay: tests only modal layering, not a game purchase.
    await page.evaluate(() => {
      const dialog = document.createElement('dialog'); dialog.id = 'quick-nav-layer-fixture'; dialog.textContent = 'Modal layering fixture';
      document.body.append(dialog); dialog.showModal();
    });
    await page.locator(fabSelector).waitFor({ state: 'hidden' });
    check(await page.locator('#quick-nav-layer-fixture').isVisible(), label + ': an independent native dialog takes precedence over the floating shortcut');
    await page.evaluate(() => { const dialog = document.getElementById('quick-nav-layer-fixture'); dialog.close(); dialog.remove(); });
    await assertFab(page, label + ' after native overlay');

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const scrolledFab = await assertFab(page, label + ' scrolled');
    equal([scrolledFab.x, scrolledFab.y], [firstFab.x, firstFab.y], label + ': scrolling keeps the shortcut at a stable reachable position');
    const beforeAdvance = await campaign(page);
    await openMenu(page, label + ' manual turn');
    check(/avançar.*dia/i.test(await page.locator('[data-quick-nav="simulation"]').innerText()), label + ': the control describes an explicit one-day advance');
    await page.waitForTimeout(2100);
    equal(finances(await campaign(page)), finances(beforeAdvance), label + ': leaving shortcuts open never advances time or charges the campaign');
    await tap(page.locator('[data-quick-nav="simulation"]'), label + ' advance one day');
    await page.locator(dialogSelector).waitFor({ state: 'hidden' });
    const afterAdvance = await campaign(page);
    equal(afterAdvance.day, beforeAdvance.day + 1, label + ': only the explicit day control advances exactly one day');
    equal(afterAdvance.paused, true, label + ': advancing a turn does not enable a real-time clock');
    const addedEntries = afterAdvance.ledger.length - beforeAdvance.ledger.length;
    check(addedEntries >= 0 && afterAdvance.ledger.length < 100, label + ': all day ledger movements remain available');
    equal(afterAdvance.cash, beforeAdvance.cash + afterAdvance.ledger.slice(0, addedEntries).reduce((sum, item) => sum + item.amount, 0), label + ': the explicit day balance reconciles with its actual ledger');
    equal(afterAdvance.stock, beforeAdvance.stock, label + ': advancing the empty campaign cannot manufacture an owned vehicle');
    await page.locator('#ae-turn-overlay').waitFor({ state: 'visible' });
    await page.locator(fabSelector).waitFor({ state: 'hidden' });
    check(await page.locator('#ae-turn-continue').isVisible(), label + ': the daily report takes precedence over floating shortcuts');
    await page.evaluate(() => advanceDay());
    equal((await campaign(page)).day, afterAdvance.day, label + ': an open daily report blocks a second turn');
    await tap(page.locator('#ae-turn-continue'), label + ' close day report');
    await assertFab(page, label + ' after day report');

    const mainStored = await page.evaluate(() => { save(); return localStorage.getItem(KEY); });
    await page.reload({ waitUntil: 'networkidle' });
    await assertFab(page, label + ' reload');
    equal(finances(await campaign(page)), finances(afterAdvance), label + ': shortcut reload preserves cash, vehicles, research and queue');
    equal((await campaign(page)).other, null, label + ': main shortcut navigation never creates the preview campaign');
    await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
    await assertFab(page, label + ' preview');
    const preview = await campaign(page);
    equal(preview.key, 'autoempire_preview_v06', label + ': preview uses its separate campaign key');
    await openMenu(page, label + ' preview projects');
    await page.locator('[data-quick-nav="projects"]').tap();
    await destinationFocus(page, '#fold-ae-studio', label + ' preview project navigation');
    equal(finances(await campaign(page)), finances(preview), label + ': preview shortcuts do not change campaign finances');
    equal(await page.evaluate(() => localStorage.getItem('autoempire_v02')), mainStored, label + ': preview shortcut navigation leaves the main save byte-for-byte intact');
    equal(errors, [], label + ': no JavaScript errors');
    console.log('PASS profile: ' + label + ' floating shortcuts');
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
    for (const width of [440, 320]) await runProfile(base, width);
    console.log('PASS: ' + checks + ' floating navigation, touch, focus, overlays, manual turns and campaign checks (' + engine + ')');
    console.log('Physical Safari/iPhone validation was not performed. Screenshots: ' + artifacts);
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
