/* Real browser checks for the 32-model / 5-paint collection and saved appearance. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const artifacts = process.env.AE_VEHICLE_REVIEW_DIR || '/tmp/auto-empire-vehicle-collection';
let browser, server, checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const base = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw Error('HTTP server exited');
    try { if ((await fetch(base + '/preview/galeria/')).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('HTTP server did not start');
}
async function gallery(base, width) {
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'], viewport: { width, height: 763 } });
  const page = await context.newPage();
  const errors = [], missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
  try {
    await page.goto(base + '/preview/galeria/?campaign=main', { waitUntil: 'networkidle' });
    const registry = await page.evaluate(() => ({
      models: AESprites.models.map(model => ({ id: model.id, name: model.name, kind: model.kind, defaultPaint: model.defaultPaint })),
      paints: AESprites.paints.map(paint => ({ id: paint.id, name: paint.name })),
      variants: AESprites.models.flatMap(model => AESprites.variants(model.id)).map(item => ({ id: item.id, box: item.box, url: item.url, artworkReady: item.artworkReady }))
    }));
    check(registry.models.length === 32 && new Set(registry.models.map(model => model.id)).size === 32, 'All thirty-two named catalog model identities exist');
    check(registry.paints.length === 5, 'Every model has five named paints');
    check(registry.variants.length === 160 && new Set(registry.variants.map(item => item.id)).size === 160, '160 independent model/paint identities exist');
    check(registry.variants.every(item => item.artworkReady), 'Every catalog model has finished artwork instead of an in-review placeholder');
    check(new Set(registry.variants.map(item => item.url + '|' + item.box)).size === 160, 'Every variant selects its own actual artwork crop');
    check(await page.evaluate(() => AESprites.models.every(model => AESprites.modelFor({ name: model.name, modelId: 'velox-city' }).id === model.id)),
      'Every exact model name takes precedence over stale appearance metadata');
    check(await page.evaluate(() => ['Hatch', 'SUV', 'Sedã', 'Picape', 'Compacto', 'Esportivo'].every(kind => {
      const reference = AESprites.modelFor({ name: 'Marca própria · Projeto', kind });
      return AESprites.paints.every(paint => {
        const spec = AESprites.variant({ name: 'Marca própria · Projeto', kind, modelId: kind === 'Hatch' ? 'altis-sport' : 'velox-city', paintId: paint.id });
        return spec.model.category === reference.category && spec.paintId === paint.id && spec.reference;
      });
    })), 'Custom manufactured names retain all five paints on a clearly labeled reference of the correct vehicle category');
    check(await page.locator('#collection > article').count() === 32, width + ': all model cards render');
    check(await page.locator('#collection .vc-paint').count() === 160, width + ': all 160 accessible paint choices render');
    check(await page.locator('button button').count() === 0, 'Paint controls are not nested inside other buttons');
    if (width === 440) {
      const pixels = await page.evaluate(async () => {
        const images = new Map();
        for (const atlas of Object.values(AESprites.atlases)) {
          const image = new Image(); image.src = atlas.url; await image.decode();
          images.set(atlas.url, image);
        }
        const output = [];
        for (const model of AESprites.models) for (const spec of AESprites.variants(model.id)) {
          const [x, y, width, height] = spec.box.split(' ').map(Number);
          const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(images.get(spec.url), x, y, width, height, 0, 0, width, height);
          const data = ctx.getImageData(0, 0, width, height).data;
          const counts = { polar: 0, ocean: 0, ruby: 0, graphite: 0, solar: 0 };
          let opaque = 0, edge = 0, fingerprint = 2166136261;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 200) continue;
            fingerprint = Math.imul(fingerprint ^ data[i], 16777619);
            fingerprint = Math.imul(fingerprint ^ data[i + 1], 16777619);
            fingerprint = Math.imul(fingerprint ^ data[i + 2], 16777619);
            opaque++;
            const pixel = i / 4, px = pixel % width, py = Math.floor(pixel / width);
            if (px === 0 || py === 0 || px === width - 1 || py === height - 1) edge++;
            const r = data[i], g = data[i + 1], b = data[i + 2], range = Math.max(r, g, b) - Math.min(r, g, b);
            if (Math.min(r, g, b) > 120 && range < 50) counts.polar++;
            if (b > r * 1.35 && b > g * 1.1 && b > 70) counts.ocean++;
            if (r > g * 1.35 && r > b * 1.25 && r > 90) counts.ruby++;
            if (Math.max(r, g, b) < 150 && range < 50) counts.graphite++;
            if (r > 140 && g > 80 && b < Math.min(r, g) * .85) counts.solar++;
          }
          output.push({ id: spec.id, paint: spec.paintId, opaque, edge, counts, fingerprint: fingerprint >>> 0,
            decoded: images.get(spec.url).naturalWidth === spec.width && images.get(spec.url).naturalHeight === spec.height });
        }
        return output;
      });
      for (const sample of pixels) {
        check(sample.decoded && sample.opaque > 10000, sample.id + ': a substantial decoded vehicle is visible');
        check(sample.edge === 0, sample.id + ': opaque vehicle body is not clipped at the crop border');
        check(sample.counts[sample.paint] > 800, sample.id + ': the actual painted pixels match the named color');
        if (['ocean', 'ruby', 'solar'].includes(sample.paint)) {
          check(['ocean', 'ruby', 'solar'].filter(paint => paint !== sample.paint).every(paint => sample.counts[sample.paint] > sample.counts[paint]),
            sample.id + ': the named paint dominates the other chromatic paints');
        }
      }
      for (const model of registry.models) {
        const white = pixels.find(sample => sample.id === model.id + ':polar');
        const dark = pixels.find(sample => sample.id === model.id + ':graphite');
        check(white.counts.polar / white.opaque > dark.counts.polar / dark.opaque,
          model.id + ': white paint has more bright neutral body pixels than graphite');
        check(dark.counts.graphite / dark.opaque > white.counts.graphite / white.opaque,
          model.id + ': graphite paint has more dark neutral body pixels than white');
      }
      check(new Set(pixels.map(sample => sample.fingerprint)).size === 160, 'All 160 images have different visible pixel fingerprints');
    }
    for (const model of registry.models) {
      const card = page.locator('article[data-model="' + model.id + '"]');
      for (const paint of registry.paints) {
        if (width === 320 && model !== registry.models[0]) continue;
        const button = card.locator('.vc-paint[data-paint="' + paint.id + '"]');
        const bounds = await button.boundingBox();
        check(bounds.width >= 44 && bounds.height >= 44, width + ': paint touch target is at least 44px');
        await button.tap();
        check(await button.getAttribute('aria-pressed') === 'true', model.id + ': selected paint is announced');
        check(await card.locator('svg.ae-sprite').getAttribute('data-paint') === paint.id, model.id + ': selecting a paint changes the artwork');
        check(await card.locator('.vc-paint-label').innerText() === paint.name, model.id + ': paint name is visible');
        check(await card.locator('svg.ae-sprite').getAttribute('data-model') === model.id, 'Changing paint preserves the model silhouette identity');
        check(await card.locator('svg.ae-sprite').evaluate(svg => {
          const box = svg.viewBox.baseVal, matrix = svg.getScreenCTM(), frame = svg.closest('.vc-art').getBoundingClientRect();
          return [[box.x, box.y], [box.x + box.width, box.y + box.height]].every(([x, y]) => {
            const point = new DOMPoint(x, y).matrixTransform(matrix);
            return point.x >= frame.left - 1 && point.x <= frame.right + 1 && point.y >= frame.top - 1 && point.y <= frame.bottom + 1;
          });
        }), model.id + ': the complete painted crop fits inside the displayed artwork frame');
      }
      await card.locator('.vc-paint[data-paint="' + model.defaultPaint + '"]').tap();
    }
    await page.locator('#vc-model-search').fill('Pulse GT-R');
    check(await page.locator('#collection > article:visible').count() === 1, 'Searching a 32-model catalog isolates the exact requested model');
    check(await page.locator('#collection > article:visible').getAttribute('data-model') === 'pulse-gt-r', 'Search results retain the correct model identity');
    await page.locator('#vc-model-search').fill('');
    await page.locator('#vc-model-kind').selectOption('SUV');
    check(await page.locator('#collection > article:visible').count() === registry.models.filter(model => model.kind === 'SUV').length, 'Category filter displays precisely the catalog SUVs');
    await page.locator('#vc-model-kind').selectOption('all');
    const first = registry.models[0], card = page.locator('article[data-model="' + first.id + '"]');
    await card.locator('.car-button').tap();
    check(await page.locator('#zoom').isVisible(), width + ': the model opens in a native dialog');
    for (const paint of registry.paints) {
      await page.locator('#zoom-paints [data-paint="' + paint.id + '"]').tap();
      check(await page.locator('#zoom-art svg').getAttribute('data-paint') === paint.id, 'Zoom uses the selected actual painted image');
      check((await page.locator('#zoom-model').innerText()).includes(paint.name), 'Zoom names the selected paint');
      check(await card.locator('svg').getAttribute('data-paint') === paint.id, 'Zoom and collection agree on the same selected paint');
    }
    await page.locator('#close').tap();
    check(!await page.locator('#zoom').isVisible(), 'The native dialog closes by touch');
    const layout = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
    check(layout.content <= layout.width + 1, width + ': collection has no horizontal overflow');
    check(await page.locator('a.back').getAttribute('href') === '../?campaign=main', 'Back navigation preserves the main campaign');
    await page.screenshot({ path: path.join(artifacts, 'collection-' + width + '.png') });
    check(errors.length === 0, 'No gallery JavaScript errors: ' + errors.join('; '));
    check(missing.length === 0, 'No missing gallery resources: ' + missing.join('; '));
  } finally { await context.close(); }
}
async function appearance(base) {
  const context = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'] });
  await context.addInitScript(() => {
    localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({ company: 'Coleção Motors', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo' }));
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  let legacy;
  try {
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    const initial = await page.evaluate(() => ({
      colors: s.market.map(car => car.paintId),
      valid: s.market.every(car => AESprites.paintFor(car).hex === car.color),
      cars: s.market.map(car => ({ id: car.id, name: car.name, paintId: car.paintId, color: car.color, modelId: car.modelId })),
      game: JSON.parse(JSON.stringify(s))
    }));
    check(await page.evaluate(() => catalog.length === 32 && catalog.every(entry => AESprites.models.some(model => model.name === entry[0]))),
      'Every fixed model in the actual game catalog has its own artwork family');
    check(new Set(initial.colors).size === 5 && initial.valid, 'The first market of a genuinely fresh campaign already contains all five paints');
    await page.reload({ waitUntil: 'networkidle' });
    check(await page.evaluate(cars => JSON.stringify(s.market.map(car => ({ id: car.id, name: car.name, paintId: car.paintId, color: car.color, modelId: car.modelId }))) === JSON.stringify(cars), initial.cars),
      'Reload preserves every model and paint identity');
    legacy = initial.game;
    for (const car of legacy.market) { delete car.paintId; delete car.modelId; }
    legacy.market[0].color = '#9c5588';
    delete legacy.market[0].colorName;
    legacy.market[0].name = 'Velox City GT'; legacy.market[0].kind = 'Hatch'; legacy.market[0].modelId = 'velox-city';
    const rotated = await page.evaluate(() => {
      populate(); render(); save();
      return s.market.map(car => ({ name: car.name, model: AESprites.modelFor(car).name,
        paint: car.paintId, color: car.color, colorName: car.colorName, actualPaint: AESprites.paintFor(car) }));
    });
    check(rotated.every(car => car.model === car.name), 'Real market rotation resolves the renamed model rather than its former modelId');
    check(rotated.every(car => car.color === car.actualPaint.hex && car.colorName === car.actualPaint.name),
      'Generated cars retain coherent five-paint artwork, stored color and displayed color name after rotation');
    check(new Set(rotated.map(car => car.paint)).size === 5, 'A new rotated six-car lot also presents all five actual painted variants');
    await page.locator('.bottom [data-tab="market"]').tap();
    await page.locator('#ae-trade-select-market').selectOption('name');
    const identity = await page.evaluate(() => [...document.querySelectorAll('#listings > .panel')].every(card => {
      const row = card.querySelector('.vehicle'), car = s.market.find(item => String(item.id) === row?.dataset.carId), image = row?.querySelector('svg');
      return car && image?.dataset.model === car.modelId && image?.dataset.paint === car.paintId;
    }));
    check(identity, 'Sorting market cards keeps each vehicle tied to its own painted model');
    const target = await page.evaluate(() => {
      const car = [...s.market].sort((a, b) => a.ask - b.ask)[0];
      return { id: car.id, ask: car.ask, paint: car.paintId, model: car.modelId, color: car.color, cash: s.cash };
    });
    await page.locator('#listings button[onclick="buyDialog(' + target.id + ')"]').tap();
    await page.locator('#bid').fill(String(target.ask));
    check(await page.locator('#modalbody svg.ae-sprite').getAttribute('data-paint') === target.paint, 'Negotiation retains the actual vehicle paint');
    await page.locator('#modalbody button[onclick="submitBid()"]').tap();
    await page.waitForFunction(id => s.stock.some(car => car.id === id), target.id);
    check(await page.evaluate(target => {
      const car = s.stock.find(item => item.id === target.id);
      return car?.paintId === target.paint && car.modelId === target.model && car.color === target.color && car.bought === target.ask && s.cash === target.cash - target.ask;
    }, target), 'A real purchase preserves paint/model and charges the entered price');
    await page.reload({ waitUntil: 'networkidle' });
    const stock = page.locator('#stock svg.ae-sprite');
    check(await stock.getAttribute('data-paint') === target.paint && await stock.getAttribute('data-model') === target.model,
      'Purchased appearance survives reload in inventory');
    check(errors.length === 0, 'Appearance flows have no JavaScript errors: ' + errors.join('; '));
  } finally { await context.close(); }
  const old = await browser.newContext({ ...playwright.devices['iPhone 17 Pro Max'] });
  await old.addInitScript(game => {
    localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({ company: 'Coleção antiga', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo' }));
    localStorage.setItem('autoempire_v02', JSON.stringify(game));
  }, legacy);
  try {
    const page = await old.newPage();
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    check(await page.evaluate(original => s.market.every((car, index) => car.color === original.market[index].color), legacy),
      'Canonical legacy saves keep their original stored paint values during metadata migration');
    check(await page.evaluate(() => s.market[0].modelId === 'velox-city-gt'),
      'Legacy metadata for a renamed model is corrected without repainting the saved vehicle');
  } finally { await old.close(); }
}
(async () => {
  try {
    await fs.mkdir(artifacts, { recursive: true });
    const engine = process.env.AE_BROWSER || 'chromium';
    check(['chromium', 'webkit'].includes(engine), 'Supported browser engine selected');
    browser = await playwright[engine].launch(engine === 'chromium' ?
      { executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] } :
      { headless: true, ...(process.env.AE_WEBKIT_PATH ? { executablePath: process.env.AE_WEBKIT_PATH } : {}) });
    const base = await startServer();
    for (const width of [440, 320]) await gallery(base, width);
    await appearance(base);
    console.log('PASS: ' + checks + ' model-specific imagery, five paints, unclipped artwork, gallery touch and saved identity checks (' + engine + ')');
    console.log('Screenshots: ' + artifacts + '. Physical iPhone validation was not performed.');
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
