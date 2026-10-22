/* Run with Playwright WebKit installed. This emulates iPhones; it is not a physical iOS test. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { webkit, devices } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifacts = process.env.AE_WEBKIT_REVIEW_DIR || '/tmp/auto-empire-webkit';
const targetModel = 'iPhone 17 Pro Max';
const targetDevice = devices[targetModel] ? targetModel : (devices['iPhone 16 Pro Max'] ? 'iPhone 16 Pro Max' : 'iPhone 14 Pro Max');
const profiles = [
  {
    name: 'iphone17-pro-max-440', device: targetDevice, target: true,
    officialDeviceDescriptor: Boolean(devices[targetModel]),
    viewport: devices[targetModel] ? { ...devices[targetModel].viewport } : { width: 440, height: 956 }
  },
  { name: 'compact-320', device: 'iPhone SE', viewport: { width: 320, height: 568 } },
  { name: 'se-375', device: 'iPhone SE (3rd gen)', viewport: { width: 375, height: 667 } },
  { name: 'iphone-390', device: 'iPhone 13', viewport: { width: 390, height: 844 } },
  { name: 'pro-max-430', device: 'iPhone 14 Pro Max', viewport: { width: 430, height: 932 } }
];
let server;
let browser;
let checks = 0;
const skips = [];
const completed = [];
let offlineNavigation;

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

async function assertLayout(page, label) {
  const layout = await page.evaluate(() => {
    const visible = element => element.getClientRects().length > 0;
    const bounds = element => {
      const box = element.getBoundingClientRect();
      return { name: element.id || element.className, left: box.left, right: box.right, width: box.width, height: box.height };
    };
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      boxes: [...document.querySelectorAll('#ae-showroom,.bottom,.navinner,#stock>.panel,#listings>.panel,#modalbody,#ae-company-screen .ae-onboard-card')]
        .filter(visible).map(bounds),
      nav: [...document.querySelectorAll('.bottom [data-tab]')].filter(visible).map(bounds),
      fields: [...document.querySelectorAll('input:not([type="file"]):not([type="hidden"]),select,textarea')]
        .filter(visible).map(element => ({ name: element.id, font: parseFloat(getComputedStyle(element).fontSize) }))
    };
  });
  check(layout.scrollWidth <= layout.width + 1, label + ': no horizontal page overflow');
  for (const box of layout.boxes) {
    check(box.left >= -1 && box.right <= layout.width + 1,
      label + ': ' + box.name + ' fits the viewport (' + JSON.stringify(box) + ')');
  }
  check(layout.nav.length === 4, label + ': all four primary navigation buttons remain present');
  for (const box of layout.nav) {
    check(box.width >= 44 && box.height >= 44, label + ': primary touch target is at least 44 × 44 CSS pixels');
  }
  for (const field of layout.fields) {
    check(field.font >= 16, label + ': ' + field.name + ' uses at least 16px text');
  }
}

async function assertTouchTarget(locator, label) {
  const box = await locator.boundingBox();
  check(box && box.width >= 44 && box.height >= 44, label + ': touch target is at least 44 × 44 CSS pixels');
}

async function assertTouchHit(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const hit = await locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const actual = document.elementFromPoint(x, y);
    return { correct: actual === element || element.contains(actual), x, y, actual: actual?.outerHTML.slice(0, 180) };
  });
  check(hit.correct, label + ': the visible action receives touch at its center (' + JSON.stringify(hit) + ')');
}

async function assertDialogFocus(page, carId, label) {
  const focus = await page.evaluate(async carId => {
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const body = document.getElementById('modalbody');

    buyDialog(carId);
    await nextFrame();
    const natural = document.activeElement === document.getElementById('bid');
    closeModal();

    // Focus the real field in the same task that opens the modal, before its
    // scheduled autofocus. This deterministically reproduces the fill race.
    buyDialog(carId);
    const enteredField = document.getElementById('bid');
    enteredField.focus({ preventScroll: true });
    await nextFrame();
    const preserved = enteredField.isConnected && document.activeElement === enteredField;
    closeModal();

    buyDialog(carId);
    closeModal();
    // Observe between the obsolete opening's frame and the new opening's
    // frame: a closed dialog must not autofocus the newly created content.
    const betweenOpenings = new Promise(resolve => requestAnimationFrame(() => {
      resolve(!body.contains(document.activeElement));
    }));
    buyDialog(carId);
    const obsoleteFrameIgnored = await betweenOpenings;
    await nextFrame();
    const reopened = document.activeElement === document.getElementById('bid');
    closeModal();
    return { natural, preserved, obsoleteFrameIgnored, reopened };
  }, carId);
  check(focus.natural, label + ': natural dialog autofocus selects the offer field');
  check(focus.preserved, label + ': scheduled autofocus preserves a field focused in the opening task');
  check(focus.obsoleteFrameIgnored, label + ': a closed opening cannot autofocus a newer dialog');
  check(focus.reopened, label + ': the current opening still focuses its own offer field');
}

async function assertSprites(page, selector, expected, label) {
  check(await page.locator(selector + ' svg.ae-sprite > image').count() === expected,
    label + ': the expected sprites are present');
  const decoded = await page.evaluate(async selector => {
    const sources = [...new Set([...document.querySelectorAll(selector + ' svg.ae-sprite > image')]
      .map(element => element.getAttribute('href') || element.getAttribute('xlink:href')))];
    if (!sources.length || sources.some(source => !source)) return false;
    for (const source of sources) {
      const image = new Image();
      image.src = source;
      try { await image.decode(); } catch (_) { return false; }
      if (!image.naturalWidth || !image.naturalHeight) return false;
    }
    return true;
  }, selector);
  check(decoded, label + ': the WebP atlas decodes in WebKit');
}

// WebKit's Linux port may expose service workers while its offline navigation
// emulation fails internally. Isolate that host capability from application bugs.
async function probeOfflineNavigation() {
  const fixture = http.createServer((request, response) => {
    response.setHeader('Connection', 'close');
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/sw.js') {
      response.setHeader('Content-Type', 'application/javascript');
      response.end("self.addEventListener('install',e=>e.waitUntil(caches.open('webkit-offline-probe').then(c=>c.addAll(['/','/probe.txt'])).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));");
    } else if (request.url === '/probe.txt') {
      response.setHeader('Content-Type', 'text/plain');
      response.end('cached probe');
    } else {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><h1 id="probe">Offline reference page</h1><script>navigator.serviceWorker.register("/sw.js")</script>');
    }
  });
  await new Promise((resolve, reject) => {
    fixture.once('error', reject);
    fixture.listen(0, '127.0.0.1', resolve);
  });
  const context = await browser.newContext({ ...devices[targetDevice], viewport: profiles[0].viewport });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:' + fixture.address().port + '/');
    const exposed = await page.evaluate(() => 'serviceWorker' in navigator && 'caches' in window);
    if (!exposed) return { supported: false, reason: 'This WebKit host does not expose service workers and CacheStorage.' };
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', null, { timeout: 15000 });
    const cached = await page.evaluate(async () => (await (await caches.open('webkit-offline-probe')).keys()).length);
    assert.equal(cached, 2, 'The independent offline reference page must be fully cached before probing the host');
    await context.setOffline(true);
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
      assert.equal(await page.locator('#probe').innerText(), 'Offline reference page');
      return { supported: true };
    } catch (error) {
      if (!error.message.includes('WebKit encountered an internal error')) throw error;
      return { supported: false, reason: 'The independent, activated and cached service-worker reference page also fails offline reload with "WebKit encountered an internal error" on this WebKit host.' };
    }
  } finally {
    await context.setOffline(false);
    await context.close();
    await new Promise(resolve => fixture.close(resolve));
  }
}

async function assertOffline(context, page, expected, profileName) {
  const capability = await page.evaluate(() => ({
    serviceWorkers: 'serviceWorker' in navigator,
    secure: window.isSecureContext,
    caches: 'caches' in window
  }));
  if (!capability.serviceWorkers || !capability.secure || !capability.caches) {
    skips.push('WebKit offline: this engine/context does not expose secure service workers and CacheStorage (' + JSON.stringify(capability) + ').');
    return;
  }
  const worker = await page.evaluate(() => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('WebKit service worker did not become ready in 15 seconds')), 15000);
    navigator.serviceWorker.ready.then(registration => {
      const inspect = async () => {
        if (!navigator.serviceWorker.controller) return;
        try {
          const cacheNames = (await caches.keys()).filter(name => name.startsWith('auto-empire-motor-district-'));
          const assets = [];
          for (const name of cacheNames) {
            const cache = await caches.open(name);
            assets.push(...(await cache.keys()).map(request => new URL(request.url).pathname));
          }
          clearTimeout(timer);
          resolve({ active: registration.active?.state, assets });
        } catch (error) { clearTimeout(timer); reject(error); }
      };
      if (navigator.serviceWorker.controller) inspect();
      else navigator.serviceWorker.addEventListener('controllerchange', inspect, { once: true });
    }, error => { clearTimeout(timer); reject(error); });
  }));
  check(worker.active === 'activated', 'WebKit offline: an active worker controls the page');
  check(worker.assets.some(asset => asset.endsWith('/fleet-models-a.webp')) && worker.assets.some(asset => asset.endsWith('/fleet-models-b.webp')) && worker.assets.some(asset => asset.endsWith('/visual-redesign.css')),
    'WebKit offline: artwork and stylesheet are cached');
  if (!offlineNavigation.supported) {
    skips.push('WebKit offline navigation: ' + offlineNavigation.reason + ' The game worker/cache were checked; game offline reload remains unverified in this engine.');
    return;
  }
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    const restored = await page.evaluate(() => ({ key: KEY, cash: s.cash, car: s.stock[0]?.id, listed: s.stock[0]?.listed }));
    check(restored.key === 'autoempire_v02' && restored.cash === expected.cash && restored.car === expected.id && restored.listed,
      'WebKit offline: reloading retains the main campaign and listed vehicle');
    await assertSprites(page, '#stock', 1, 'WebKit offline inventory');
    await assertLayout(page, 'WebKit offline');
    await page.screenshot({ path: path.join(artifacts, 'offline-' + profileName + '.png'), fullPage: true });
  } finally {
    await context.setOffline(false);
  }
}

async function testProfile(base, profile) {
  const context = await browser.newContext({
    ...devices[profile.device], viewport: profile.viewport, locale: 'pt-BR',
    timezoneId: 'America/Campo_Grande', reducedMotion: 'reduce'
  });
  await context.addInitScript(() => {
    window.__AEWebKitTouches = { starts: 0, ends: 0, trustedStarts: 0 };
    window.__AEWebKitCommerceTrace = [];
    const describe = element => element && {
      tag: element.tagName, id: element.id, text: element.textContent?.trim().slice(0, 90),
      onclick: element.getAttribute?.('onclick')
    };
    for (const type of ['beforeinput', 'input', 'change', 'focusin', 'focusout', 'touchstart', 'touchend', 'click', 'scroll']) {
      document.addEventListener(type, event => {
        if (!event.target.closest?.('#modalbody')) return;
        const point = event.touches?.[0] || event.changedTouches?.[0];
        window.__AEWebKitCommerceTrace.push({
          type, time: performance.now(), trusted: event.isTrusted, target: describe(event.target),
          bid: document.getElementById('bid')?.value, active: describe(document.activeElement),
          inputType: event.inputType, data: event.data,
          scrollTop: document.getElementById('modalbody')?.scrollTop,
          ...(point ? { x: point.clientX, y: point.clientY, hit: describe(document.elementFromPoint(point.clientX, point.clientY)) } : {})
        });
      }, { capture: true, passive: true });
    }
    document.addEventListener('touchstart', event => {
      window.__AEWebKitTouches.starts++;
      if (event.isTrusted && event.touches.length) window.__AEWebKitTouches.trustedStarts++;
    }, { capture: true, passive: true });
    document.addEventListener('touchend', () => window.__AEWebKitTouches.ends++, { capture: true, passive: true });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  const missing = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400 && /\.(?:js|css|webp|png|svg|webmanifest)(?:\?|$)/.test(response.url())) {
      missing.push(response.status() + ' ' + response.url());
    }
  });
  const label = profile.name;
  try {
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForURL(url => /\/preview\/$/.test(url.pathname) && url.searchParams.get('campaign') === 'main');
    const environment = await page.evaluate(() => ({
      width: innerWidth, height: innerHeight, touch: navigator.maxTouchPoints,
      coarse: matchMedia('(pointer: coarse)').matches, touchEvents: 'ontouchstart' in window,
      ua: navigator.userAgent, key: KEY
    }));
    check(environment.width === profile.viewport.width, label + ': viewport uses the requested portrait width');
    check(environment.touchEvents && environment.coarse, label + ': mobile touch input is emulated');
    check(environment.ua.includes('iPhone') && environment.key === 'autoempire_v02',
      label + ': iPhone profile reaches the original public campaign');
    await page.locator('#ae-company-screen').waitFor({ state: 'visible' });
    await assertLayout(page, label + ' onboarding');
    await page.locator('#ae-company-name').tap();
    await page.locator('#ae-company-name').fill('Aurora iPhone');
    await page.locator('#ae-owner-name').tap();
    await page.locator('#ae-owner-name').fill('Alex Silva');
    await assertTouchTarget(page.locator('#ae-company-submit'), label + ' create company');
    await page.locator('#ae-company-submit').tap();
    await page.locator('#ae-company-screen').waitFor({ state: 'hidden' });
    const touches = await page.evaluate(() => window.__AEWebKitTouches);
    check(touches.starts >= 3 && touches.ends >= 3 && touches.trustedStarts >= 3,
      label + ': onboarding receives trusted touchstart/touchend events');
    check((await page.locator('#ae-company-identity').innerText()).includes('Aurora iPhone'), label + ': company creation succeeds by touch');
    await page.locator('#toast').waitFor({ state: 'hidden' });
    await assertLayout(page, label + ' showroom');
    check(await page.locator('#ae-showroom svg.ae-sprite > image').count() > 0, label + ': showroom artwork is present');
    await page.screenshot({ path: path.join(artifacts, 'garage-' + label + '.png'), fullPage: true });

    await page.locator('.bottom [data-tab="market"]').tap();
    await assertLayout(page, label + ' market');
    await assertSprites(page, '#listings', 6, label + ' market');
    const filter = await page.evaluate(() => ({
      kind: s.market[0].kind,
      ids: s.market.filter(car => car.kind === s.market[0].kind).map(car => String(car.id)).sort()
    }));
    await page.locator('#ae-kind').selectOption(filter.kind);
    const visibleIds = await page.locator('#listings > .panel:visible .vehicle').evaluateAll(vehicles => vehicles.map(vehicle => vehicle.dataset.carId).sort());
    check(JSON.stringify(visibleIds) === JSON.stringify(filter.ids), label + ': market filter retains vehicle identities');
    await page.locator('#ae-kind').selectOption('all');
    await page.screenshot({ path: path.join(artifacts, 'market-' + label + '.png'), fullPage: true });

    const target = await page.evaluate(() => {
      const car = [...s.market].sort((a, b) => a.ask - b.ask)[0];
      return { id: car.id, ask: car.ask, cash: s.cash };
    });
    check(target.ask < target.cash, label + ': a starting campaign can afford a market vehicle');
    const buy = page.locator('#listings button[onclick="buyDialog(' + target.id + ')"]');
    await assertTouchTarget(buy, label + ' negotiate');
    await assertDialogFocus(page, target.id, label);
    await buy.tap();
    const modal = page.locator('#modalbody');
    await modal.waitFor({ state: 'visible' });
    check(await modal.getAttribute('role') === 'dialog' && Boolean(await modal.getAttribute('aria-labelledby')),
      label + ': negotiation has a labelled dialog role');
    const layers = await page.evaluate(() => ({
      dialog: Number(getComputedStyle(document.getElementById('modal')).zIndex),
      navigation: Number(getComputedStyle(document.querySelector('.bottom')).zIndex)
    }));
    check(layers.dialog > layers.navigation, label + ': the modal stays above fixed navigation');
    await assertLayout(page, label + ' negotiation');
    await page.locator('#bid').tap();
    await page.locator('#bid').fill(String(target.ask));
    check(await page.locator('#bid').inputValue() === String(target.ask), label + ': the offer field retains the entered asking price');
    check(await page.locator('#bid').evaluate(element => document.activeElement === element),
      label + ': negotiation field accepts focus and input (system keyboard is not emulated)');
    const close = modal.getByRole('button', { name: 'Fechar janela' });
    await assertTouchTarget(close, label + ' dialog close');
    await close.tap();
    check(await page.locator('#modal').evaluate(element => element.classList.contains('hide')),
      label + ': negotiation closes with its touch control');
    await buy.tap();
    await page.locator('#bid').fill(String(target.ask));
    check(await page.locator('#bid').inputValue() === String(target.ask), label + ': the reopened offer field retains the entered asking price');
    const submit = modal.locator('button[onclick="submitBid()"]');
    await assertTouchTarget(submit, label + ' submit offer');
    await assertTouchHit(submit, label + ' scrolled submit offer');
    await submit.tap();
    const submissions = await page.evaluate(() => window.__AEWebKitCommerceTrace.filter(event =>
      event.type === 'click' && event.target?.onclick === 'submitBid()'));
    check(submissions.length === 1 && submissions[0].trusted && submissions[0].bid === String(target.ask),
      label + ': one trusted submit click receives exactly the entered asking price (' + JSON.stringify(submissions) + ')');
    await page.waitForFunction(id => s.stock.some(car => car.id === id), target.id);
    const purchased = await page.evaluate(id => ({
      cash: s.cash,
      exists: s.stock.some(car => car.id === id),
      paid: s.stock.find(car => car.id === id)?.bought,
      savedPaid: JSON.parse(localStorage.getItem(KEY)).stock.find(car => car.id === id)?.bought,
      savedCash: JSON.parse(localStorage.getItem(KEY)).cash
    }), target.id);
    check(purchased.exists && purchased.paid === target.ask && purchased.savedPaid === target.ask &&
      purchased.cash === target.cash - target.ask && purchased.savedCash === purchased.cash,
      label + ': a purchase by touch pays exactly the entered price and persists vehicle/cash (' + JSON.stringify(purchased) + ')');
    await page.reload({ waitUntil: 'networkidle' });
    await assertSprites(page, '#stock', 1, label + ' inventory');
    check(await page.evaluate(cash => s.cash === cash, purchased.cash), label + ': reload preserves the purchase balance');
    await page.locator('#stock button[onclick="listDialog(' + target.id + ')"]').tap();
    const asking = await page.evaluate(id => {
      const car = s.stock.find(item => item.id === id);
      return Math.ceil((Number(car.bought) + Number(car.spent || 0) + 1000) / 100) * 100;
    }, target.id);
    await page.locator('#asking').tap();
    await page.locator('#asking').fill(String(asking));
    await assertLayout(page, label + ' listing');
    await page.locator('#modalbody button[onclick="publish()"]').tap();
    check(await page.evaluate(({ id, asking }) => {
      const car = JSON.parse(localStorage.getItem(KEY)).stock.find(item => item.id === id);
      return car?.listed && car.price === asking;
    }, { id: target.id, asking }), label + ': listing by touch persists the selected price');
    await page.reload({ waitUntil: 'networkidle' });
    check(await page.evaluate(({ id, asking }) => s.stock.some(car => car.id === id && car.listed && car.price === asking), { id: target.id, asking }),
      label + ': listed inventory survives another reload');

    await page.locator('a.ae-gallery-link').tap();
    await page.waitForURL(url => /\/preview\/galeria\/$/.test(url.pathname));
    check(new URL(page.url()).searchParams.get('campaign') === 'main', label + ': gallery retains the main campaign context');
    await assertSprites(page, '#collection', 8, label + ' gallery');
    const galleryWidth = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    check(galleryWidth.scroll <= galleryWidth.width + 1, label + ': gallery has no horizontal overflow');
    await page.locator('.car-button').first().tap();
    check(await page.locator('#zoom').isVisible(), label + ': gallery zoom opens with touch');
    await assertTouchTarget(page.locator('#close'), label + ' gallery close');
    await page.locator('#close').tap();
    check(!await page.locator('#zoom').isVisible(), label + ': native gallery dialog closes with touch');
    await page.screenshot({ path: path.join(artifacts, 'gallery-' + label + '.png'), fullPage: true });
    await page.locator('a.back').tap();
    await page.waitForURL(url => /\/preview\/$/.test(url.pathname));
    check(new URL(page.url()).searchParams.get('campaign') === 'main', label + ': gallery returns to the same public campaign');
    const main = await page.evaluate(() => ({ cash: s.cash, day: s.day, ids: s.stock.map(car => car.id) }));
    check(main.cash === purchased.cash && main.ids.includes(target.id), label + ': gallery navigation preserves inventory and money');
    await assertLayout(page, label + ' returned inventory');

    if (profile.target || profile.viewport.width === 390) {
      await page.goto(base + '/preview/', { waitUntil: 'networkidle' });
      const preview = await page.evaluate(() => ({ key: KEY, stock: s.stock.length, main: JSON.parse(localStorage.getItem('autoempire_v02')) }));
      check(preview.key === 'autoempire_preview_v06' && preview.stock === 0,
        'WebKit: the preview route keeps an independent campaign');
      check(preview.main.cash === main.cash && preview.main.stock.some(car => car.id === target.id && car.listed),
        'WebKit: opening the preview does not replace main campaign progress');
      await page.goto(base + '/', { waitUntil: 'networkidle' });
      await page.waitForURL(url => url.searchParams.get('campaign') === 'main');
      if (profile.target) await assertOffline(context, page, { id: target.id, cash: purchased.cash }, profile.name);
    }
    check(errors.length === 0, label + ': no WebKit JavaScript errors: ' + errors.join('; '));
    check(missing.length === 0, label + ': no missing assets: ' + missing.join('; '));
    completed.push({
      name: profile.name, device: profile.device, viewport: profile.viewport, touch: true,
      ...(profile.target ? { requestedModel: targetModel, officialDeviceDescriptor: profile.officialDeviceDescriptor } : {}),
      reportedMaxTouchPoints: environment.touch
    });
    console.log('PASS profile: ' + label + ' (' + profile.viewport.width + 'px, emulated iPhone touch)');
  } catch (error) {
    await page.evaluate(() => window.__AEWebKitCommerceTrace).then(trace =>
      fs.writeFile(path.join(artifacts, 'events-' + label + '.json'), JSON.stringify(trace, null, 2) + '\n')).catch(() => {});
    await page.screenshot({ path: path.join(artifacts, 'failure-' + label + '.png'), fullPage: true }).catch(() => {});
    if (errors.length) console.error('WebKit page errors:', errors.join('; '));
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  try {
    await fs.mkdir(artifacts, { recursive: true });
    const base = await startServer();
    try {
      browser = await webkit.launch({ headless: true, ...(process.env.AE_WEBKIT_PATH ? { executablePath: process.env.AE_WEBKIT_PATH } : {}) });
    } catch (error) {
      throw Error('WebKit is required; no tests were executed. Install the Playwright WebKit browser and its verified system dependencies (playwright install --with-deps webkit). Preserve PLAYWRIGHT_BROWSERS_PATH when using a custom browser cache.\n' + error.message);
    }
    offlineNavigation = await probeOfflineNavigation();
    for (const profile of profiles) await testProfile(base, profile);
    const report = {
      engine: 'WebKit', version: browser.version(), mode: 'iPhone device emulation on the test host',
      profiles: completed, passedChecks: checks, skipped: skips, offlineNavigationCapability: offlineNavigation,
      physicalDeviceValidation: 'Not performed: physical Safari/iOS, system keyboard, real safe-area insets, file sharing, installation and OS lifecycle require an iPhone.'
    };
    await fs.writeFile(path.join(artifacts, 'results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS: ' + checks + ' WebKit iPhone-emulation touch, layout, commerce, persistence and gallery checks');
    for (const skipped of skips) console.log('SKIP: ' + skipped);
    console.log('Physical Safari/iPhone validation was not performed. Screenshots/report: ' + artifacts);
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
