/* Real campaign menu / first-profile / cancellation regression.
 * Run: node tests/game-menu.test.js; AE_BROWSER=webkit is supported.
 * Scenarios use the real identity form. No capital, vehicle or sale is fabricated.
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
const artifacts = process.env.AE_MENU_REVIEW_DIR || '/tmp/auto-empire-game-menu';
let browser, server, checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const action = name => '#ae-game-menu [data-menu-action="' + name + '"]';
async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  let output = '';
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw Error('Menu server exited: ' + output);
    try { if ((await fetch(base + '/preview/', { method: 'HEAD' })).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Menu server did not start: ' + output);
}
async function snapshot(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify({ key: KEY, cash: s.cash, day: s.day,
    sales: s.sales, profit: s.profit, stock: s.stock, slots: s.slots, ledger: s.ledger,
    world: s.empire.world, queue: s.empire.economy.factory.queue, difficulty: s.difficulty,
    paused: typeof paused === 'undefined' || paused,
    saved: JSON.parse(localStorage.getItem(KEY)), profile: JSON.parse(localStorage.getItem('autoempire_company_profile_v1')) })));
}
const financial = value => ({ cash: value.cash, day: value.day, sales: value.sales, profit: value.profit,
  stock: value.stock, slots: value.slots, ledger: value.ledger, world: value.world, queue: value.queue });
async function tap(locator, label) {
  await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox();
  check(box && box.width >= 44 && box.height >= 44, label + ': control has a44x44 touch target');
  await locator.tap();
}
async function layout(page, label) {
  const value = await page.evaluate(() => {
    const dialog = document.getElementById('ae-game-menu'), box = dialog.getBoundingClientRect();
    const controls = [...dialog.querySelectorAll('button,label')].filter(node => node.getClientRects().length).map(node => {
      const r = node.getBoundingClientRect(); return { left: r.left, right: r.right };
    });
    return { left: box.left, right: box.right, width: innerWidth, document: document.documentElement.scrollWidth,
      content: dialog.scrollWidth, viewport: dialog.clientWidth, controls, focus: dialog.contains(document.activeElement), modal: dialog.matches(':modal') };
  });
  check(value.left >= -1 && value.right <= value.width + 1 && value.document <= value.width + 1 && value.content <= value.viewport + 1,
    label + ': menu fits the phone without horizontal scrolling');
  check(value.controls.every(box => box.left >= -1 && box.right <= value.width + 1), label + ': visible controls stay in the phone width');
  check(value.focus && value.modal, label + ': native modal owns keyboard focus');
}
async function companyForm(page, name) {
  await page.locator('#ae-company-screen.is-open').waitFor({ state: 'visible' });
  await page.locator('#ae-company-name').fill(name);
  await page.locator('#ae-owner-name').fill('Ana Teste');
}
async function openMenu(page) {
  await page.evaluate(() => AEGameMenu.open());
  await page.locator('#ae-game-menu').waitFor({ state: 'visible' });
}
async function newSelection(page, mode, label) {
  await tap(page.locator(action('new')), label + ' new campaign');
  equal(await page.locator('#ae-game-menu-difficulties input').count(), 3, label + ': all three real difficulties are offered');
  await tap(page.locator('.ae-game-menu-difficulty').filter({ has: page.locator('input[value="' + mode + '"]') }), label + ' difficulty');
  equal(await page.locator('#ae-game-menu-difficulties input:checked').inputValue(), mode, label + ': selected difficulty is explicit');
}
async function menuScenario(base, width, mode, expectedCash) {
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'], viewport: { width, height: 763 } });
  const page = await context.newPage(), errors = [], dialogs = []; let accept = false;
  const label = engine + '-' + width;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.type()); return accept ? dialog.accept() : dialog.dismiss(); });
  try {
    await page.goto(base + '/preview/?campaign=main&menu=1', { waitUntil: 'networkidle' });
    await page.locator('#ae-game-menu').waitFor({ state: 'visible' });
    await layout(page, label + ' home');
    const initial = await snapshot(page);
    equal(new URL(page.url()).searchParams.get('menu'), null, label + ': entry query does not reopen menu on reload');
    check(initial.paused && initial.profile === null, label + ': fresh player starts without silently creating an identity');
    check(await page.locator(action('continue')).isHidden(), label + ': continue requires an existing identity');
    check(/AUTO.*EMPIRE.*TYCOON/s.test(await page.locator('#ae-game-menu-title').innerText()), label + ': full game name is visible');
    const art = await page.locator('.ae-game-menu-hero>img').evaluate(async image => { await image.decode(); return [image.naturalWidth, image.naturalHeight]; });
    equal(art, [1024, 1536], label + ': the real hero artwork decodes');
    await newSelection(page, mode, label);
    await layout(page, label + ' difficulty');
    const creationBaseline = financial(await snapshot(page));
    await tap(page.locator(action('create')), label + ' configure');
    equal(await page.locator('#ae-difficulty').inputValue(), mode, label + ': configuration receives menu selection');
    equal(financial(await snapshot(page)), creationBaseline, label + ': opening configuration does not reset money, stock or progress');
    await tap(page.locator('#ae-company-cancel'), label + ' cancel first configuration');
    equal(financial(await snapshot(page)), creationBaseline, label + ': cancelling a configuration leaves the campaign intact');
    equal((await snapshot(page)).profile, null, label + ': cancelled form creates no identity');
    await openMenu(page); await newSelection(page, mode, label + ' chosen again');
    await tap(page.locator(action('create')), label + ' configure again');
    await companyForm(page, 'Menu Motors');
    await page.locator('#ae-founding-hq').selectOption('tokyo');
    await tap(page.locator('#ae-company-submit'), label + ' create company');
    const created = await snapshot(page);
    equal(created.cash, expectedCash, label + ': confirmed campaign receives the actual selected starting capital');
    equal(created.difficulty, mode, label + ': actual campaign uses selected difficulty');
    equal(created.saved.cash, expectedCash, label + ': starting capital is saved');
    equal(created.world.hq, 'tokyo', label + ': selected initial headquarters is used');
    equal(created.ledger, [], label + ': creation does not fabricate income transactions');
    check(created.paused, label + ': creation never resumes time automatically');
    equal(dialogs, [], label + ': a genuinely fresh campaign needs no destructive replacement prompt');
    // Adding a branding field represents metadata maintained by another module;
    // editing identity must not erase that module's data.
    await page.evaluate(() => { const key = 'autoempire_company_profile_v1', profile = JSON.parse(localStorage.getItem(key)); profile.menuTestMetadata = { retained: true }; localStorage.setItem(key, JSON.stringify(profile)); });
    const stable = financial(await snapshot(page));
    await openMenu(page);
    check(await page.locator(action('continue')).isVisible(), label + ': existing campaign exposes Continue');
    await tap(page.locator(action('continue')), label + ' continue');
    equal(financial(await snapshot(page)), stable, label + ': Continue preserves the saved campaign');
    await openMenu(page); await page.keyboard.press('Escape');
    equal(financial(await snapshot(page)), stable, label + ': Escape preserves the saved campaign');
    await openMenu(page); await tap(page.locator(action('options')), label + ' options');
    await layout(page, label + ' options');
    await tap(page.locator(action('identity')), label + ' identity');
    check(await page.locator('#ae-difficulty').isDisabled() && await page.locator('#ae-founding-hq').isDisabled(), label + ': identity editing cannot misleadingly reconfigure campaign rules');
    await page.locator('#ae-company-name').fill('Menu Motors Editada');
    await tap(page.locator('#ae-company-submit'), label + ' save identity');
    equal(financial(await snapshot(page)), stable, label + ': editing names preserves campaign finances');
    equal((await snapshot(page)).profile.menuTestMetadata, { retained: true }, label + ': identity editing preserves unrelated profile metadata');
    await openMenu(page); await newSelection(page, 'normal', label + ' existing');
    await tap(page.locator(action('create')), label + ' reject replacement');
    equal(dialogs, ['confirm'], label + ': replacement asks before configuration');
    check(await page.locator('#ae-game-menu').isVisible(), label + ': rejected replacement stays in the menu');
    equal(financial(await snapshot(page)), stable, label + ': rejected replacement preserves all finances');
    accept = true;
    await tap(page.locator(action('create')), label + ' accept configuration');
    await tap(page.locator('#ae-company-cancel'), label + ' cancel after replacement prompt');
    equal(financial(await snapshot(page)), stable, label + ': accepting the prompt alone still cannot erase progress');
    await openMenu(page); await tap(page.locator(action('help')), label + ' help');
    await layout(page, label + ' help');
    check((await page.locator('[data-menu-view="help"]').innerText()).includes('Os dias avançam apenas quando você toca em Avançar dia'), label + ': help explains simulation and persistence');
    await page.screenshot({ path: path.join(artifacts, label + '-help.png'), scale: 'css' });
    await tap(page.locator(action('home')).filter({ visible: true }), label + ' help return');
    await page.screenshot({ path: path.join(artifacts, label + '-home.png'), scale: 'css' });
    await tap(page.locator(action('continue')), label + ' return');
    await page.reload({ waitUntil: 'networkidle' });
    check(await page.locator('#ae-game-menu').isHidden(), label + ': ordinary reload returns to the game');
    equal(financial(await snapshot(page)), stable, label + ': reload keeps the same finances');
    // A saved campaign without a global profile remains a saved campaign. Choosing
    // identity defaults must not grant the capital of another difficulty.
    await page.evaluate(() => localStorage.removeItem('autoempire_company_profile_v1'));
    await page.reload({ waitUntil: 'networkidle' });
    await companyForm(page, 'Perfil Recuperado');
    await page.locator('#ae-difficulty').selectOption(mode === 'hard' ? 'casual' : 'hard');
    await page.locator('#ae-founding-hq').selectOption('paris');
    await tap(page.locator('#ae-company-submit'), label + ' restore identity');
    equal(financial(await snapshot(page)), stable, label + ': a loaded campaign never gets reset by first-profile completion');
    equal((await snapshot(page)).difficulty, mode, label + ': recovered identity preserves actual campaign difficulty');
    equal(errors, [], label + ': no JavaScript errors');
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, label + '-failure.png'), scale: 'css' }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}
async function firstProfileScenario(base, mode, cash) {
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'] });
  const page = await context.newPage();
  try {
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    check(await page.locator('#ae-game-menu').isHidden(), mode + ': direct entry keeps normal onboarding');
    await companyForm(page, 'Primeiro Perfil'); await page.locator('#ae-difficulty').selectOption(mode);
    await tap(page.locator('#ae-company-submit'), mode + ' first identity');
    const state = await snapshot(page);
    equal(state.cash, cash, mode + ': direct first-profile choice receives its actual starting capital');
    equal(state.difficulty, mode, mode + ': direct first-profile difficulty is saved');
    equal(state.saved.cash, cash, mode + ': actual capital persists');
  } finally { await context.close(); }
}
(async () => {
  try {
    check(['chromium', 'webkit'].includes(engine), 'Supported browser engine');
    await fs.mkdir(artifacts, { recursive: true }); const base = await startServer();
    browser = await playwright[engine].launch(engine === 'chromium'
      ? { executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }
      : { headless: true, ...(process.env.AE_WEBKIT_PATH ? { executablePath: process.env.AE_WEBKIT_PATH } : {}) });
    await menuScenario(base, 440, 'casual', 55000); await menuScenario(base, 320, 'hard', 22000);
    for (const [mode, cash] of [['casual', 55000], ['normal', 35000], ['hard', 22000]]) await firstProfileScenario(base, mode, cash);
    console.log('PASS: ' + checks + ' menu, real difficulty, profile preservation, cancellation, touch and reload checks (' + engine + ')');
    console.log('Physical Safari/iPhone validation was not performed. Screenshots: ' + artifacts);
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
