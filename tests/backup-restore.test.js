/* Run: node tests/backup-restore.test.js (AE_BROWSER=webkit also supported). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const PROFILE = 'autoempire_company_profile_v1';
const PROFILE_NAME = 'A < B Motors > 2';
let checks = 0, server, browser;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', failure;
  server.stdout.on('data', chunk => { output += chunk; }); server.stderr.on('data', chunk => { output += chunk; });
  server.on('error', error => { failure = error; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (failure) throw failure;
    if (server.exitCode !== null) throw Error('Server exited: ' + output);
    try { if ((await fetch(base + '/preview/', { method: 'HEAD' })).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Server did not become ready: ' + output);
}
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function storage(page) {
  return page.evaluate(() => ({
    active: localStorage.getItem(KEY), other: localStorage.getItem(KEY === 'autoempire_v02' ? 'autoempire_preview_v06' : 'autoempire_v02'),
    profile: localStorage.getItem('autoempire_company_profile_v1'), recovery: localStorage.getItem(KEY + ':before-import'),
    cash: s.cash, day: s.day
  }));
}
async function fixture(page, seed, cash = 61234) {
  return page.evaluate(({ seed, cash, company }) => {
    s = JSON.parse(JSON.stringify(seed)); s.cash = cash; s.day = 7; s.minute = 500; paused = true;
    const car = s.market.shift();
    s.stock = [{ ...car, bought: 12000, spent: 700, price: 0, days: 0, listed: false, offers: [] }];
    const profile = { company, owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo' };
    const other = JSON.parse(JSON.stringify(seed)); other.cash = 91234; other.day = 18;
    const otherKey = KEY === 'autoempire_v02' ? 'autoempire_preview_v06' : 'autoempire_v02';
    localStorage.setItem(otherKey, JSON.stringify(other)); localStorage.setItem('autoempire_company_profile_v1', JSON.stringify(profile));
    localStorage.removeItem(KEY + ':before-import'); render(); save();
    return JSON.parse(JSON.stringify(s));
  }, { seed, cash, company: PROFILE_NAME });
}
async function route(page, name) {
  if (name === 'events') { await page.locator('.bottom [data-tab="events"]').tap(); return; }
  await page.locator('.bottom [data-tab="garage"]').tap();
  await page.locator('[data-workspace="management"]').tap();
  const details = page.locator('details:has(#ae-tools)');
  if (!await details.getAttribute('open').then(value => value !== null)) await details.locator('summary').tap();
}
async function upload(page, name, payload, accept = true, expected = '') {
  await route(page, name);
  const dialogPromise = page.waitForEvent('dialog').then(async dialog => {
    check(dialog.message().includes(expected), 'Import confirmation identifies the active campaign');
    if (accept) await dialog.accept(); else await dialog.dismiss();
  });
  const navigation = accept ? page.waitForNavigation({ waitUntil: 'networkidle' }) : null;
  const file = { name: 'campanha.json', mimeType: 'application/json', buffer: Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)) };
  await page.locator(name === 'events' ? '#ae-backup-file' : '#ae-import-file').setInputFiles(file);
  await dialogPromise;
  if (accept) await navigation;
  else await settle(page);
}
async function download(page, name) {
  await route(page, name);
  const event = page.waitForEvent('download');
  await page.locator(name === 'events' ? '#ae-export' : '#ae-tools [data-action="export"]').tap();
  const file = await event;
  check(!await file.failure(), 'Backup download completes');
  const payload = JSON.parse(await fs.readFile(await file.path(), 'utf8'));
  check(payload.format === 'autoempire-backup' && payload.version === 1, 'Both export routes use the shared compatible format');
  return payload;
}
async function rejectedUpload(page, payload) {
  await route(page, 'events');
  let dialog = false;
  const handler = async item => { dialog = true; await item.dismiss(); };
  page.on('dialog', handler);
  const before = await storage(page);
  await page.locator('#ae-backup-file').setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)) });
  await page.waitForFunction(() => !document.getElementById('toast').classList.contains('hide') && document.getElementById('toast').textContent.startsWith('Backup inválido'));
  await settle(page); page.off('dialog', handler);
  assert.deepEqual(await storage(page), before, 'Invalid backup does not alter campaign, profile or recovery'); checks++;
  check(!dialog, 'Invalid data is rejected before a replacement confirmation');
}
async function testCampaign(base, main) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await context.addInitScript(() => {
    if (!localStorage.getItem('__backup_test_initialized')) {
      localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({ company: 'Empresa teste', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo' }));
      localStorage.setItem('__backup_test_initialized', '1');
    }
  });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/preview/' + (main ? '?campaign=main' : ''), { waitUntil: 'networkidle' });
  check(await page.evaluate(() => Boolean(window.AEBackups)), 'Shared backup module is loaded by the real application');
  const seed = await page.evaluate(() => JSON.parse(JSON.stringify(s)));
  const destination = main ? 'principal' : 'da prévia';
  for (const name of ['events', 'tools']) {
    for (const legacy of [false, true]) {
      const oldGame = await fixture(page, seed);
      const before = await storage(page);
      const game = JSON.parse(JSON.stringify(oldGame)); game.cash = legacy ? 28602 : 28601; game.day = legacy ? 10 : 9; game.minute = 510;
      const profile = { company: 'Empresa importada', owner: 'Bia Teste', difficulty: 'normal', headquarters: 'saopaulo' };
      const payload = legacy ? { app: 'Auto Empire Tycoon', schema: 1, game } : { format: 'autoempire-backup', version: 1, save: game, profile };
      await upload(page, name, payload, true, destination);
      const after = await storage(page);
      check(after.cash === game.cash && after.day === game.day, name + ': imported progress survives pagehide and reload');
      check(JSON.parse(after.active).cash === game.cash, name + ': imported progress is stored in the active slot');
      check(JSON.parse(after.active).stock[0].id === oldGame.stock[0].id && JSON.parse(after.active).stock[0].spent === 700,
        name + ': vehicle identity and recorded investment are preserved');
      check(after.other === before.other, name + ': the other campaign is unchanged');
      check(JSON.parse(after.recovery).save.cash === oldGame.cash && JSON.parse(after.recovery).save.day === oldGame.day, name + ': previous campaign has a recovery snapshot');
      check(legacy ? after.profile === before.profile : JSON.parse(after.profile).company === profile.company, name + ': profile is preserved or restored according to the format');
      if (name === 'events' && !legacy) {
        await page.locator('.bottom [data-tab="events"]').tap();
        const recoveryDownload = page.waitForEvent('download');
        await page.locator('#ae-backup-recovery button').filter({ hasText: 'Exportar versão anterior' }).tap();
        const savedFile = await recoveryDownload;
        const savedPayload = JSON.parse(await fs.readFile(await savedFile.path(), 'utf8'));
        check(savedPayload.save.cash === oldGame.cash && savedPayload.profile.company === PROFILE_NAME, 'Previous campaign with literal comparison signs can be exported through its visible recovery control');
      }
      await page.locator('.bottom [data-tab="events"]').tap();
      const restore = page.locator('#ae-backup-recovery button').filter({ hasText: 'Restaurar versão anterior' });
      check(await restore.isEnabled(), 'Recovery is available through a visible user control');
      const dialogPromise = page.waitForEvent('dialog').then(dialog => dialog.accept()), navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
      await restore.tap(); await dialogPromise; await navigation;
      const recovered = await storage(page);
      check(recovered.cash === oldGame.cash && recovered.day === oldGame.day, 'The recovery control restores the previous campaign');
      check(recovered.other === before.other && recovered.profile === before.profile, 'Recovery preserves the other campaign and restores the previous profile');
      check(JSON.parse(recovered.recovery).save.cash === game.cash, 'Recovery itself keeps the displaced campaign recoverable');
    }
    const oldGame = await fixture(page, seed);
    const exported = await download(page, name);
    check(exported.save.cash === oldGame.cash && exported.campaign === (main ? 'autoempire_v02' : 'autoempire_preview_v06'), 'Export identifies the active campaign and current funds');
    check(exported.profile.company === PROFILE_NAME, 'A company name accepted by the form retains literal comparison signs in its backup');
    await fixture(page, seed, 51234);
    await upload(page, name, exported, true, destination);
    check((await storage(page)).cash === oldGame.cash, name + ': exported backup round-trips through the real import route');
    check(JSON.parse((await storage(page)).profile).company === PROFILE_NAME, name + ': importing a valid backup retains the literal company name');
    await fixture(page, seed);
    const before = await storage(page);
    await upload(page, name, exported, false, destination);
    assert.deepEqual(await storage(page), before, 'Cancelling import leaves every relevant value unchanged'); checks++;
  }
  const oldGame = await fixture(page, seed);
  const canonical = { format: 'autoempire-backup', version: 1, save: oldGame, profile: { company: 'Outra empresa', owner: 'Bia Teste' } };
  await rejectedUpload(page, '{invalid json');
  await rejectedUpload(page, { ...canonical, save: { ...oldGame, cash: 'NaN' } });
  for (const name of ['<img src=x onerror="window.backupXss=1">', '<script', '</script>', '<!-- comment -->']) {
    const markup = JSON.parse(JSON.stringify(canonical)); markup.save.market[0].name = name;
    await rejectedUpload(page, markup);
  }
  const duplicate = JSON.parse(JSON.stringify(canonical)); duplicate.save.market[1].id = duplicate.save.market[0].id;
  await rejectedUpload(page, duplicate);
  const missingCost = JSON.parse(JSON.stringify(canonical)); delete missingCost.save.stock[0].bought;
  await rejectedUpload(page, missingCost);
  check(!await page.evaluate(() => window.backupXss), 'Imported markup never executes');
  for (const failure of ['recovery', 'profile', 'active']) {
    await fixture(page, seed);
    await page.evaluate(payload => localStorage.setItem(KEY + ':before-import', JSON.stringify(payload)), canonical);
    const before = await storage(page);
    await page.evaluate(failure => {
      const original = Storage.prototype.setItem;
      const target = failure === 'active' ? KEY : failure === 'profile' ? 'autoempire_company_profile_v1' : KEY + ':before-import';
      let blocked = false;
      Storage.prototype.setItem = function (key, value) {
        if (key === target && !blocked) { blocked = true; throw new DOMException('Storage quota exceeded', 'QuotaExceededError'); }
        return original.call(this, key, value);
      };
      window.restoreBackupStorage = () => { Storage.prototype.setItem = original; };
    }, failure);
    await route(page, 'tools');
    const dialogPromise = page.waitForEvent('dialog').then(dialog => dialog.accept());
    await page.locator('#ae-import-file').setInputFiles({ name: 'campanha.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(canonical)) });
    await dialogPromise;
    await page.waitForFunction(() => document.getElementById('toast').textContent.startsWith('Não foi possível restaurar.'));
    await settle(page); await page.evaluate(() => window.restoreBackupStorage());
    assert.deepEqual(await storage(page), before, failure + ': quota failure rolls back profile/recovery and preserves both campaigns'); checks++;
  }
  await fixture(page, seed);
  await page.evaluate(() => localStorage.removeItem('autoempire_company_profile_v1'));
  await upload(page, 'events', canonical, true, destination);
  await page.locator('.bottom [data-tab="events"]').tap();
  const recoveryNavigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  const recoveryDialog = page.waitForEvent('dialog').then(dialog => dialog.accept());
  await page.locator('#ae-backup-recovery button').filter({ hasText: 'Restaurar versão anterior' }).tap();
  await recoveryDialog; await recoveryNavigation;
  check((await storage(page)).profile === null, 'Recovery restores absence of a previous company identity instead of keeping the imported profile');
  check(errors.length === 0, 'Backup workflows produce no browser exceptions: ' + errors.join('; '));
  await context.close();
}
(async () => {
  try {
    const engine = process.env.AE_BROWSER || 'chromium';
    check(['chromium', 'webkit'].includes(engine), 'A supported browser engine is selected');
    const base = await startServer();
    browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] } : { headless: true, ...(process.env.AE_WEBKIT_PATH ? { executablePath: process.env.AE_WEBKIT_PATH } : {}) });
    for (const main of [true, false]) await testCampaign(base, main);
    console.log('PASS: ' + checks + ' backup import/export, active-slot, recovery, cancellation, validation and quota rollback checks (' + engine + ')');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})();
