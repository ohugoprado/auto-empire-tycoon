/* Run: node tests/publication-smoke.test.js. Uses Playwright and system Chromium. */
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
let browser;
let server;
let checks = 0;

function check(condition, description) {
  assert.ok(condition, description);
  checks++;
}

async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  let output = '';
  let startupError;
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe']
  });
  server.once('error', error => { startupError = error; });
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (startupError) throw startupError;
    if (server.exitCode !== null) throw Error('HTTP server exited: ' + output);
    try {
      const response = await fetch(base + '/preview/');
      if (response.ok) return base;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('HTTP server did not become ready: ' + output);
}

async function activeCampaign(page) {
  return page.evaluate(() => ({
    key: KEY,
    cash: s.cash,
    day: s.day,
    stock: s.stock.map(car => ({ id: car.id, name: car.name })),
    profile: JSON.parse(localStorage.getItem('autoempire_company_profile_v1')),
    main: JSON.parse(localStorage.getItem('autoempire_v02')),
    preview: JSON.parse(localStorage.getItem('autoempire_preview_v06'))
  }));
}

async function assertSprites(page) {
  check(await page.locator('body.ae-redesign').count() === 1, 'The public entry loads the redesigned application');
  check(await page.locator('#ae-showroom').isVisible(), 'The showroom is visible after opening the public entry');
  check(await page.locator('#stock svg.ae-sprite').count() === 1, 'The existing vehicle renders with its new sprite');
  const decoded = await page.evaluate(async () => {
    const node = document.querySelector('#stock svg.ae-sprite image');
    const source = node?.getAttribute('href') || node?.getAttribute('xlink:href');
    if (!source) return false;
    const image = new Image();
    image.src = source;
    try { await image.decode(); } catch (_) { return false; }
    return image.naturalWidth > 0 && image.naturalHeight > 0;
  });
  check(decoded, 'The published sprite asset decodes successfully');
}

async function assertOffline(context, page, expectedCar) {
  const worker = await page.evaluate(() => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Offline worker was not ready within 15 seconds')), 15000);
    navigator.serviceWorker.ready.then(registration => {
      async function inspect() {
        if (!navigator.serviceWorker.controller) return;
        try {
          const cache = await caches.open('auto-empire-motor-district-9001');
          const keys = await cache.keys();
          clearTimeout(timeout);
          resolve({
            state: registration.active?.state,
            script: navigator.serviceWorker.controller.scriptURL,
            assets: keys.map(request => new URL(request.url).pathname)
          });
        } catch (error) { clearTimeout(timeout); reject(error); }
      }
      if (navigator.serviceWorker.controller) inspect();
      else navigator.serviceWorker.addEventListener('controllerchange', inspect, { once: true });
    }, error => { clearTimeout(timeout); reject(error); });
  }));
  check(worker.state === 'activated' && /\/sw\.js$/.test(worker.script), 'The application is controlled by its active service worker');
  check(worker.assets.length > 30, 'The application shell precaches more than 30 resources');
  check(worker.assets.some(asset => asset.endsWith('/visual-redesign.css')) && [...'abcdefgh'].every(letter => worker.assets.some(asset => asset.endsWith('/fleet-models-' + letter + '.webp'))),
    'The offline shell contains the new stylesheet and sprite artwork');
  check(worker.assets.some(asset => /\/preview\/galeria\/$/.test(asset)), 'The offline shell includes the vehicle gallery');
  const loadedResources = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(node => new URL(node.src || node.href).pathname));
  check(loadedResources.every(resource => worker.assets.includes(resource)), 'Every loaded game extension and stylesheet is available in the offline cache');
  const onlineBackground = await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor);
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    const stylesheet = await page.evaluate(() => {
      const sheet = [...document.styleSheets].find(sheet => sheet.href?.includes('visual-redesign.css'));
      return { rules: sheet?.cssRules.length || 0, background: getComputedStyle(document.body).backgroundColor };
    });
    check(stylesheet.rules > 0 && stylesheet.background === onlineBackground,
      'Offline reload retains the new stylesheet and computed visual theme');
    const offlineCampaign = await activeCampaign(page);
    check(offlineCampaign.key === 'autoempire_v02' && offlineCampaign.cash === 54321 && offlineCampaign.stock[0]?.id === expectedCar,
      'Offline reload retains the public campaign, funds and vehicle');
    await assertSprites(page);
    await page.locator('a.ae-gallery-link').click();
    await page.waitForURL(url => /\/preview\/galeria\/$/.test(url.pathname));
    check(new URL(page.url()).searchParams.get('campaign') === 'main', 'Offline gallery navigation retains the public campaign');
    check(await page.locator('#collection svg.ae-sprite').count() === 32, 'All 32 model sprites are rendered offline');
    await page.locator('.car-button').first().click();
    check(await page.locator('#zoom').isVisible(), 'Vehicle detail opens while offline');
    await page.keyboard.press('Escape');
    await page.locator('a.back').click();
    await page.waitForURL(url => /\/preview\/$/.test(url.pathname));
    check(new URL(page.url()).searchParams.get('campaign') === 'main', 'Returning from the gallery works offline');
    const returned = await activeCampaign(page);
    check(returned.cash === 54321 && returned.stock[0]?.id === expectedCar,
      'Offline gallery return preserves the same campaign and inventory');
  } finally {
    await context.setOffline(false);
  }
}

async function run(base) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  const broken = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400 && /\.(?:js|css|webp|png|svg|webmanifest)(?:\?|$)/.test(response.url())) {
      broken.push(response.status() + ' ' + response.url());
    }
  });
  try {
    // Obtain a real campaign from the application, then represent an existing
    // public save and an independent preview save in the same browser origin.
    await context.addInitScript(() => {
      if (!localStorage.getItem('autoempire_company_profile_v1')) {
        localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({
          company: 'Patrimônio Motors', owner: 'Alex Silva', difficulty: 'normal', headquarters: 'saopaulo'
        }));
      }
    });
    await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
    const saves = await page.evaluate(() => {
      const main = JSON.parse(JSON.stringify(s));
      const car = { ...main.market.shift(), bought: 12000, spent: 500, listed: false, price: 0, offers: [] };
      main.cash = 123456;
      main.day = 7;
      main.stock = [car];
      main.slots = Math.max(3, main.slots);
      // This is an established saved campaign: the cash/garage milestones were
      // already rewarded before this navigation, rather than newly earned here.
      main.empire.achievements.capital = 7;
      main.empire.achievements.garage = 7;
      const preview = JSON.parse(JSON.stringify(s));
      preview.cash = 98765;
      preview.day = 11;
      preview.stock = [];
      // Navigation runs the game's pagehide autosave. Keep its in-memory state
      // aligned with this preview fixture, so that autosave preserves it too.
      s = preview;
      localStorage.setItem('autoempire_v02', JSON.stringify(main));
      localStorage.setItem('autoempire_preview_v06', JSON.stringify(preview));
      return { main, preview, car: { id: car.id, name: car.name } };
    });

    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForURL(url => /\/preview\/$/.test(url.pathname) && url.searchParams.get('campaign') === 'main');
    check(new URL(page.url()).searchParams.get('campaign') === 'main', 'The public root selects the existing main campaign');
    const main = await activeCampaign(page);
    check(main.key === 'autoempire_v02', 'The main entry uses the original public save key');
    check(main.cash === 123456 && main.day === 7, 'The existing public cash balance and day are preserved (cash=' + main.cash + ', day=' + main.day + ')');
    check(main.stock.length === 1 && main.stock[0].id === saves.car.id && main.stock[0].name === saves.car.name,
      'The existing public vehicle is preserved');
    check(main.profile.company === 'Patrimônio Motors', 'The company profile is preserved');
    check(main.preview.cash === 98765 && main.preview.day === 11 && main.preview.stock.length === 0,
      'Opening the public campaign leaves the independent preview campaign unchanged');
    await assertSprites(page);

    await page.locator('a.ae-gallery-link').click();
    await page.waitForURL(url => /\/preview\/galeria\/$/.test(url.pathname));
    check(new URL(page.url()).searchParams.get('campaign') === 'main', 'The gallery link retains the main campaign context');
    check(await page.locator('#collection svg.ae-sprite').count() === 32, 'The gallery contains all 32 model sprites');
    await page.locator('.car-button').first().click();
    check(await page.locator('#zoom').isVisible(), 'A gallery vehicle opens in the native detail dialog');
    await page.keyboard.press('Escape');
    check(!await page.locator('#zoom').isVisible(), 'Escape closes the gallery detail dialog');
    await page.locator('a.back').click();
    await page.waitForURL(url => /\/preview\/$/.test(url.pathname));
    check(new URL(page.url()).searchParams.get('campaign') === 'main', 'Returning from the gallery retains the main campaign context');
    const returned = await activeCampaign(page);
    check(returned.key === 'autoempire_v02' && returned.cash === 123456 && returned.stock[0]?.id === saves.car.id,
      'Gallery navigation returns to the same public campaign and vehicle');

    await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
    const preview = await activeCampaign(page);
    check(preview.key === 'autoempire_preview_v06', 'The preview route retains its separate save key');
    check(preview.cash === 98765 && preview.day === 11 && preview.stock.length === 0,
      'The preview campaign remains unchanged after public-route and gallery navigation');
    check(preview.main.cash === 123456 && preview.main.day === 7 && preview.main.stock[0]?.id === saves.car.id,
      'Opening the preview leaves the public campaign unchanged');

    // An Alpha 0.4 campaign has no industry, banking, profile or empire fields.
    // It must also load without being replaced by a fresh campaign.
    const legacy = Object.fromEntries([
      'version', 'cash', 'day', 'minute', 'rep', 'slots', 'stock', 'market', 'ledger', 'logs', 'nextId', 'sales', 'profit'
    ].map(key => [key, saves.main[key]]));
    legacy.cash = 54321;
    legacy.slots = 1;
    await page.evaluate(legacy => localStorage.setItem('autoempire_v02', JSON.stringify(legacy)), legacy);
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForURL(url => /\/preview\/$/.test(url.pathname) && url.searchParams.get('campaign') === 'main');
    const upgraded = await activeCampaign(page);
    check(upgraded.cash === 54321 && upgraded.day === 7 && upgraded.stock[0]?.id === saves.car.id,
      'A genuine legacy campaign without empire fields retains its funds, day and vehicle');
    check(upgraded.preview.cash === 98765 && upgraded.preview.day === 11,
      'Upgrading a legacy public campaign does not overwrite preview progress');
    await assertSprites(page);

    const manifestURL = base + '/manifest.webmanifest';
    const response = await context.request.get(manifestURL);
    check(response.ok(), 'The PWA manifest is published');
    const manifest = await response.json();
    check(manifest.icons.length >= 2, 'The PWA manifest declares the installation icons');
    for (const icon of manifest.icons) {
      const iconResponse = await context.request.get(new URL(icon.src, manifestURL).href);
      check(iconResponse.ok() && (await iconResponse.body()).length > 0, 'The PWA installation icon exists: ' + icon.src);
    }
    await assertOffline(context, page, saves.car.id);
    check(errors.length === 0, 'No browser JavaScript errors: ' + errors.join('; '));
    check(broken.length === 0, 'No missing published assets: ' + broken.join('; '));
    console.log('PASS: ' + checks + ' public routing, legacy-save preservation, gallery, asset and offline-PWA checks');
  } finally {
    await context.close();
  }
}

(async () => {
  try {
    const base = await startServer();
    browser = await chromium.launch({ executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    await run(base);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) {
      await new Promise(resolve => {
        server.once('exit', resolve);
        server.kill('SIGTERM');
      });
    }
  }
})();
