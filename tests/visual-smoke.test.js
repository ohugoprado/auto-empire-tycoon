/* Run: node tests/visual-smoke.test.js. Requires Playwright and system Chromium. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifacts = process.env.AE_REVIEW_DIR || '/tmp/auto-empire-review';
const classes = ['Hatch', 'SUV', 'Sedã', 'Picape', 'Compacto', 'Esportivo'];
let checks = 0;
let server;
let browser;

function check(condition, description) {
  assert.ok(condition, description);
  checks++;
}

async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const port = await freePort();
  let output = '';
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  let spawnError;
  server.once('error', error => { spawnError = error; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null) throw Error('HTTP server exited: ' + output);
    try {
      const response = await fetch(base + '/preview/');
      if (response.ok) return base;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('HTTP server did not become ready: ' + output);
}

async function createCompany(page) {
  const screen = page.locator('#ae-company-screen');
  await screen.waitFor({ state: 'visible' });
  await page.locator('#ae-company-name').fill('Aurora Motors');
  await page.locator('#ae-owner-name').fill('Alex Silva');
  await page.locator('#ae-company-submit').click();
  await screen.waitFor({ state: 'hidden' });
  check(await page.locator('#ae-company-identity').innerText().then(text => text.includes('Aurora Motors')),
    'Company identity is created through the interface');
}

async function assertLayout(page, label) {
  const layout = await page.evaluate(() => {
    const visible = element => element.getClientRects().length > 0;
    const bounds = element => {
      const rect = element.getBoundingClientRect();
      return { selector: element.id || element.className, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    };
    return {
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      containers: [...document.querySelectorAll('#ae-showroom,.bottom,.navinner,#stock>.panel,#listings>.panel,#modalbody,#ae-business-section,.ae-management-view,.ae-management-extra')]
        .filter(visible).map(bounds),
      nav: [...document.querySelectorAll('.bottom [data-tab]')].map(bounds)
    };
  });
  check(layout.documentWidth <= layout.width + 1, label + ': document has no horizontal scrolling');
  for (const box of layout.containers) {
    check(box.left >= -1 && box.right <= layout.width + 1,
      label + ': ' + box.selector + ' fits inside viewport (' + JSON.stringify(box) + ')');
  }
  check(layout.nav.length === 4, label + ': four navigation buttons remain available');
  for (const box of layout.nav) {
    check(box.width >= 44 && box.height >= 44, label + ': navigation touch target is at least 44 × 44');
    check(box.left >= -1 && box.right <= layout.width + 1, label + ': navigation button fits viewport');
  }
}

async function assertSprites(page) {
  const atlas = await page.evaluate(async classes => {
    const sprites = classes.map(kind => {
      const box = document.createElement('div');
      box.innerHTML = carSvg({ kind, name: kind, color: '#ab5b4c' });
      const sprite = box.querySelector('svg.ae-sprite');
      const image = sprite?.querySelector('image');
      return { kind, crop: sprite?.getAttribute('viewBox'), source: image?.getAttribute('href') || image?.getAttribute('xlink:href') };
    });
    const source = sprites[0]?.source;
    if (!source) return { sprites, decoded: false };
    const image = new Image();
    image.src = source;
    try { await image.decode(); } catch (_) { return { sprites, decoded: false }; }
    return { sprites, decoded: image.naturalWidth > 0 && image.naturalHeight > 0 };
  }, classes);
  check(atlas.decoded, 'Sprite atlas decodes successfully in Chromium');
  for (const sprite of atlas.sprites) {
    check(/fleet-models-[a-h]\.webp/.test(sprite.source || ''), sprite.kind + ': uses the new sprite atlas');
    check(sprite.crop && sprite.crop.split(/[ ,]+/).map(Number).every(Number.isFinite), sprite.kind + ': has a valid crop');
  }
  check(new Set(atlas.sprites.map(sprite => sprite.source + ':' + sprite.crop)).size === classes.length,
    'All six vehicle categories have different sprite crops');
}

async function assertMarketFilter(page) {
  const expected = await page.evaluate(() => {
    const kind = s.market[0].kind;
    return { kind, ids: s.market.filter(car => car.kind === kind).map(car => String(car.id)).sort() };
  });
  await page.locator('#ae-kind').selectOption(expected.kind);
  const ids = await page.locator('#listings > .panel:visible .vehicle').evaluateAll(vehicles =>
    vehicles.map(vehicle => vehicle.dataset.carId).sort());
  check(JSON.stringify(ids) === JSON.stringify(expected.ids),
    'Market category filter displays the matching vehicle identities');
  await page.locator('#ae-kind').selectOption('all');
  check(await page.locator('#listings > .panel:visible').count() === 6,
    'Clearing market category filter restores all opportunities');
}

async function assertStockFilters(page, carId) {
  const car = await page.evaluate(id => {
    const car = s.stock.find(item => item.id === id);
    return { name: car.name, kind: car.kind };
  }, carId);
  const search = page.locator('#ae-stock-search');
  await search.fill('veiculo inexistente xyz');
  check(await page.locator('#stock > .panel:visible').count() === 0,
    'Stock search excludes nonmatching vehicles');
  await search.fill(car.name);
  check(await page.locator('#stock > .panel:visible .vehicle').getAttribute('data-car-id') === String(carId),
    'Stock search finds the purchased vehicle');
  await search.fill('');
  await page.locator('#ae-stock-kind').selectOption(car.kind);
  check(await page.locator('#stock > .panel:visible').count() === 1,
    'Stock category filter keeps the matching purchased vehicle');
  await page.locator('#ae-stock-kind').selectOption('all');
  check(await page.locator('#stock > .panel:visible').count() === 1,
    'Clearing stock filters restores the purchased vehicle');
}

async function assertManagement(page, width) {
  await page.locator('.bottom [data-tab="garage"]').click();
  await page.locator('[data-workspace="management"]').click();
  for (const area of ['finance', 'clients', 'network', 'factory']) {
    const tab = page.locator('#ae-mgmt-tab-' + area);
    await tab.click();
    check(await tab.getAttribute('aria-selected') === 'true', width + ': ' + area + ' management tab activates');
    const view = page.locator('#ae-mgmt-view-' + area);
    await view.waitFor({ state: 'visible' });
    const folds = view.locator('.ae-fold-head[aria-expanded="false"]');
    for (const button of await folds.elementHandles()) await button.click();
    await assertLayout(page, width + ' management ' + area);
    if (width === 320 || width === 1440) {
      await page.screenshot({ path: path.join(artifacts, 'management-' + area + '-' + width + '.png'), fullPage: true });
    }
  }
  await page.locator('[data-workspace="overview"]').click();
}

async function testViewport(base, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const brokenResources = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400 && /\/preview\/.*\.(?:png|webp|svg|js|css)(?:\?|$)/.test(response.url())) {
      brokenResources.push(response.status() + ' ' + response.url());
    }
  });
  try {
    await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
    check(await page.locator('body').evaluate(body => body.classList.contains('ae-redesign')),
      width + ': visual redesign is loaded');
    await createCompany(page);
    await page.locator('#ae-showroom').waitFor({ state: 'visible' });
    check(await page.locator('#ae-showroom svg.ae-district-art > image').count() === 3,
      width + ': district contains all three building illustrations');
    await assertLayout(page, width + ' garage');
    await page.screenshot({ path: path.join(artifacts, 'garage-' + width + '.png'), fullPage: true });

    await page.locator('.bottom [data-tab="market"]').click();
    await page.locator('#listings > .panel').first().waitFor({ state: 'visible' });
    check(await page.locator('#listings > .panel').count() === 6, width + ': six marketplace opportunities render');
    check(await page.locator('#listings > .panel svg.ae-sprite > image').count() === 6,
      width + ': each marketplace vehicle has a sprite');
    await assertLayout(page, width + ' market');
    await assertMarketFilter(page);
    await page.screenshot({ path: path.join(artifacts, 'market-' + width + '.png'), fullPage: true });

    if (width === 390) {
      await assertSprites(page);
      // Use the real purchase UI and ask price. The seller always accepts their own asking price.
      const target = await page.evaluate(() => {
        const car = [...s.market].sort((a, b) => a.ask - b.ask)[0];
        return { id: car.id, ask: car.ask, cash: s.cash };
      });
      check(target.ask < target.cash, 'A fresh campaign can afford the cheapest market vehicle');
      const buyButton = page.locator('#listings button[onclick="buyDialog(' + target.id + ')"]');
      await buyButton.click();
      const modal = page.locator('#modalbody');
      await modal.waitFor({ state: 'visible' });
      check(await modal.getAttribute('role') === 'dialog', 'Negotiation exposes an accessible dialog role');
      check(await modal.getAttribute('aria-labelledby'), 'Negotiation dialog has an accessible title');
      const close = modal.getByRole('button', { name: 'Fechar janela' });
      await close.waitFor({ state: 'visible' });
      await close.click();
      check(await page.locator('#modal').evaluate(element => element.classList.contains('hide')),
        'Accessible close control dismisses the dialog');
      await buyButton.click();
      await page.keyboard.press('Escape');
      check(await page.locator('#modal').evaluate(element => element.classList.contains('hide')),
        'Escape dismisses the dialog');
      await buyButton.click();
      await page.locator('#bid').fill(String(target.ask));
      await assertLayout(page, '390 negotiation');
      await page.screenshot({ path: path.join(artifacts, 'negotiation-390.png'), fullPage: true });
      await modal.locator('button[onclick="submitBid()"]').click();
      await page.waitForFunction(id => s.stock.some(car => car.id === id), target.id);
      const purchased = await page.evaluate(id => ({
        stock: s.stock.map(car => car.id), cash: s.cash,
        persisted: JSON.parse(localStorage.getItem('autoempire_preview_v06')).stock.some(car => car.id === id)
      }), target.id);
      check(purchased.stock.includes(target.id), 'Accepted negotiation adds the vehicle to inventory');
      check(purchased.cash < target.cash, 'Purchase deducts funds');
      check(purchased.persisted, 'Purchase is persisted to the existing save key');
      await page.reload({ waitUntil: 'networkidle' });
      const restored = await page.evaluate(id => ({
        hasCar: s.stock.some(car => car.id === id), cash: s.cash,
        company: JSON.parse(localStorage.getItem('autoempire_company_profile_v1')).company
      }), target.id);
      check(restored.hasCar && restored.cash === purchased.cash, 'Reload preserves the purchased vehicle and cash');
      check(restored.company === 'Aurora Motors', 'Reload preserves company identity');
      check(await page.locator('#stock svg.ae-sprite > image').count() === 1,
        'Purchased vehicle retains its sprite after reload');
      await assertStockFilters(page, target.id);
      await page.locator('#stock button[onclick="listDialog(' + target.id + ')"]').click();
      const listingPrice = await page.evaluate(id => {
        const car = s.stock.find(item => item.id === id);
        return Math.ceil((Number(car.bought) + Number(car.spent || 0) + 1000) / 100) * 100;
      }, target.id);
      await page.locator('#asking').fill(String(listingPrice));
      await assertLayout(page, '390 sale listing dialog');
      await page.screenshot({ path: path.join(artifacts, 'listing-390.png'), fullPage: true });
      await page.locator('#modalbody button[onclick="publish()"]').click();
      const listed = await page.evaluate(id => {
        const car = s.stock.find(item => item.id === id);
        const saved = JSON.parse(localStorage.getItem('autoempire_preview_v06')).stock.find(item => item.id === id);
        return { listed: car.listed, price: car.price, savedListed: saved.listed, savedPrice: saved.price };
      }, target.id);
      check(listed.listed && listed.price === listingPrice, 'Sale listing UI publishes the requested vehicle price');
      check(listed.savedListed && listed.savedPrice === listingPrice, 'Sale listing is persisted to the existing save');
      check(await page.locator('#modal').evaluate(element => element.classList.contains('hide')),
        'Publishing a sale listing dismisses the dialog');
      await assertLayout(page, '390 inventory');
      await page.screenshot({ path: path.join(artifacts, 'inventory-390.png'), fullPage: true });
    }
    await assertManagement(page, width);
    check(errors.length === 0, width + ': no browser JavaScript errors: ' + errors.join('; '));
    check(brokenResources.length === 0, width + ': no broken visual resources: ' + brokenResources.join('; '));
  } catch (error) {
    if (errors.length) console.error('Browser errors at ' + width + ': ' + errors.join('; '));
    await page.screenshot({ path: path.join(artifacts, 'failure-' + width + '.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  try {
    await fs.mkdir(artifacts, { recursive: true });
    const base = await startServer();
    browser = await chromium.launch({ executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    for (const [width, height] of [[320, 760], [390, 844], [430, 932], [1440, 1000]]) {
      await testViewport(base, width, height);
    }
    console.log('PASS: ' + checks + ' visual, sprite, navigation and purchase persistence checks');
    console.log('Screenshots: ' + artifacts);
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
