/* Run: node tests/staff-system.test.js. Pure migration checks plus real app UI. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const scope = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'preview/js/staff-system.js'), 'utf8'), scope);
const staff = scope.window.AEStaff;
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
let checks = 0;
function equal(actual, expected, message) { assert.deepEqual(plain(actual), expected, message); checks++; }
function ok(condition, message) { assert.ok(condition, message); checks++; }

const legacy = { day: 7, cash: 35000, stock: [{ offers: [{ amount: 10000 }] }], staff: { mechanic: true, sales: true, marketing: true } };
equal(staff.ensure(legacy), { seller: 1, mechanic: 1, analyst: 1 }, 'Legacy hires are converted without new fees');
equal(legacy.cash, 35000, 'Migration does not change cash');
equal(legacy.staff, undefined, 'No second active legacy roster survives');
equal(legacy.empire.staffMigration.legacy, { mechanic: true, sales: true, marketing: true }, 'Original purchases remain recoverable in migration metadata');
equal(legacy.empire.achievements.team, 7, 'Migration records an existing hire without minting an achievement reward');
equal(staff.monthlyPayroll(legacy), 2100, 'The unified roster uses one monthly catalog');
equal(staff.benefits(legacy), { repairDiscount: .2, sellerRate: .08, researchDiscount: 12, saleReputation: 2 }, 'Purchased legacy perks remain available');
const offer = legacy.stock[0].offers[0];
ok(staff.prepareOffer(legacy, offer), 'The inherited seller bonus is quoted before sale');
equal(offer.amount, 10800, 'A legacy seller retains the 8% bonus');
ok(!staff.prepareOffer(legacy, offer), 'Reopening the same proposal does not add the bonus twice');
const serialized = JSON.stringify(legacy);
staff.ensure(legacy); staff.ensure(legacy);
equal(JSON.stringify(legacy), serialized, 'Migration is idempotent in memory');
const reloaded = JSON.parse(serialized);
staff.ensure(reloaded); staff.prepareOffer(reloaded, reloaded.stock[0].offers[0]);
equal(JSON.stringify(reloaded), serialized, 'Reloading a migrated save retains counts, cash and quoted amounts');

const mixed = { day: 29, cash: 100000, stock: [{ offers: [{ amount: 10900 }] }], staff: { mechanic: true, sales: true, marketing: true }, empire: { staff: { seller: 5, mechanic: 5, analyst: 5 } } };
equal(staff.ensure(mixed), { seller: 6, mechanic: 6, analyst: 6 }, 'Mixed saves keep paid employees above the new hiring limit');
equal(staff.benefits(mixed).repairDiscount, .3, 'A repair uses the larger benefit once rather than stacking 20% and 30%');
equal(staff.benefits(mixed).sellerRate, .09, 'Seller effects use a single cap/floor');
ok(staff.prepareOffer(mixed, mixed.stock[0].offers[0]), 'A mixed historical quote retains its one legacy seller bonus');
equal(mixed.stock[0].offers[0].amount, 11800, 'Grandfathered quotes preserve the historical amount plus the old 8% acceptance bonus');
ok(!staff.prepareOffer(mixed, mixed.stock[0].offers[0]), 'The historical bonus is never paid twice');
const newMixedOffer = { amount: 10000 };
staff.prepareOffer(mixed, newMixedOffer);
equal(newMixedOffer.amount, 10900, 'New mixed-roster proposals use one unified bonus rather than stacking old and new sellers');
equal(staff.monthlyPayroll(mixed), 12600, 'Every retained employee appears in the single monthly payroll');
equal(staff.chargePayroll(mixed), 0, 'There is no weekly or off-cycle payroll');
mixed.day = 30;
equal(staff.chargePayroll(mixed), 12600, 'Payroll is charged on the 30-day boundary');
equal(mixed.cash, 87400, 'Only one payroll is deducted');
equal(staff.chargePayroll(mixed), 0, 'Repeated refreshes cannot charge the same monthly payroll');
const paidReload = plain(mixed);
equal(staff.chargePayroll(paidReload), 0, 'The payroll guard survives save/reload');
equal(paidReload.empire.totalWages, 12600, 'Cumulative wages contain the one actual payment');
paidReload.day = 60;
equal(staff.chargePayroll(paidReload), 12600, 'The next simulated month is billed normally');

const modern = { day: 1, cash: 10000, stock: [], empire: { staff: { seller: 2, mechanic: 1, analyst: 0 } } };
equal(staff.ensure(modern), { seller: 2, mechanic: 1, analyst: 0 }, 'Modern-only rosters retain their counts');
equal(staff.benefits(modern), { repairDiscount: .06, sellerRate: .036, researchDiscount: 0, saleReputation: 0 }, 'Modern-only rosters receive no invented legacy perks');
const quote = { amount: 10000 };
staff.prepareOffer(modern, quote);
equal(quote.amount, 10400, 'Current sellers apply one quote bonus');
staff.prepareOffer(modern, quote);
equal(quote.amount, 10400, 'Current sellers do not compound their bonus on repeated dialogs');
ok(!staff.prepareOffer(modern, { amount: NaN }) && !staff.prepareOffer(modern, { amount: -100 }), 'Invalid proposals are never converted into sale revenue');

let server, browser;
async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
  let output = ''; server.stderr.on('data', data => { output += data; });
  const base = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw Error(output);
    try { if ((await fetch(base + '/preview/')).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Test server did not start');
}
async function snapshot(page) {
  return page.evaluate(() => ({ cash: s.cash, day: s.day, rep: s.rep, staff: s.empire.staff, legacy: s.staff, wages: s.empire.totalWages, ledger: s.ledger, stock: s.stock, saved: JSON.parse(localStorage.getItem(KEY)) }));
}
(async () => {
  try {
    const base = await startServer();
    browser = await chromium.launch({ executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(base + '/preview/');
    await page.evaluate(() => {
      localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({ company: 'Equipe Motors', owner: 'Equipe', difficulty: 'normal', headquarters: 'saopaulo' }));
      const car = makeCar();
      Object.assign(car, { bought: 7000, spent: 0, condition: 50, repair: 2000, value: 15000, listed: true, price: 15000, fault: null, offers: [{ amount: 10000, name: 'Cliente', preference: 'Conservação', budget: 20000 }] });
      Object.assign(s, { cash: 50000, day: 6, minute: 480, rep: 50, sales: 0, slots: 2, stock: [car], ledger: [], logs: [], staff: { mechanic: true, sales: true, marketing: true } });
      s.empire.staff = { seller: 1, mechanic: 1, analyst: 1 };
      delete s.empire.staffSchema; delete s.empire.staffMigration;
      s.empire.achievements = Object.fromEntries(['first', 'five', 'ten', 'reputation', 'capital', 'garage', 'team', 'network'].map(key => [key, 1]));
      save();
    });
    await page.reload({ waitUntil: 'networkidle' });
    let actual = await snapshot(page);
    equal(actual.staff, { seller: 2, mechanic: 2, analyst: 2 }, 'Real app migrates mixed employee purchases');
    equal(actual.cash, 50000, 'Real app migration never recharges hires');
    equal(actual.legacy, undefined, 'The real app has one active roster');
    equal(actual.saved.empire.staff, actual.staff, 'Migration is persisted immediately');
    equal(await page.locator('#ae-staff').count(), 0, 'The legacy hiring panel is retired');
    await page.reload({ waitUntil: 'networkidle' });
    equal((await snapshot(page)).staff, { seller: 2, mechanic: 2, analyst: 2 }, 'Repeated browser reload does not add employees');
    await page.evaluate(() => { tickDay(); render(); });
    actual = await snapshot(page);
    equal(actual.day, 7, 'The real simulation advances normally');
    ok(!actual.ledger.some(entry => /Folha/.test(entry.name)), 'The old seven-day payroll does not run');
    const carId = actual.stock[0].id;
    const cashBeforeRepair = actual.cash;
    await page.evaluate(id => repair(id), carId);
    actual = await snapshot(page);
    equal(actual.cash, cashBeforeRepair - 1120, 'One 20% repair benefit costs 1120, without stacking the new 12% perk');
    equal(actual.stock[0].spent, 1120, 'The repair basis records the actual one-time expense');
    await page.evaluate(id => offersDialog(id), carId);
    actual = await snapshot(page);
    equal(actual.stock[0].offers[0].amount, 10800, 'A mixed saved proposal retains the old 8% seller bonus on its historical quote');
    await page.evaluate(id => { closeModal(); offersDialog(id); }, carId);
    equal((await snapshot(page)).stock[0].offers[0].amount, 10800, 'Reopening the real dialog does not compound bonuses');
    await page.evaluate(() => acceptOffer(0));
    actual = await snapshot(page);
    equal(actual.stock.length, 0, 'The normal sale still removes the vehicle');
    ok(actual.rep >= 52, 'Legacy marketing reputation remains part of the successful sale');
    equal(actual.saved.empire.staff, actual.staff, 'A sale saves the unified roster');
    const soldCash = actual.cash, soldReputation = actual.rep;
    await page.evaluate(() => acceptOffer(0));
    equal((await snapshot(page)).cash, soldCash, 'Repeating the old acceptance action cannot pay the sale again');
    equal((await snapshot(page)).rep, soldReputation, 'Marketing reputation is added only to a successful new sale');

    await page.evaluate(() => { closeModal(); show('garage'); document.querySelector('[data-workspace="management"]').click(); });
    const growth = page.locator('.ae-management-extra').filter({ hasText: 'Equipe e crescimento' });
    await growth.locator('summary').click();
    await page.locator('[data-empire-tab="staff"]').click();
    const beforeHire = await snapshot(page);
    await page.locator('[data-hire="analyst"]').click();
    actual = await snapshot(page);
    equal(actual.staff.analyst, 3, 'The one canonical panel hires another employee');
    equal(actual.cash, beforeHire.cash - 1500, 'Hiring deducts the listed fee once');
    equal(actual.saved.empire.staff.analyst, 3, 'The new hire is saved in the same roster');
    ok((await page.locator('#ae-empire-content').innerText()).includes('Folha mensal'), 'The UI communicates the single monthly payroll');
    await page.evaluate(() => { s.day = 29; tickDay(); render(); });
    actual = await snapshot(page);
    equal(actual.ledger.filter(entry => entry.name === 'Folha de pagamento').length, 1, 'Only one staff payroll entry is produced on day 30');
    equal(actual.ledger.find(entry => entry.name === 'Folha de pagamento').amount, -4750, 'The one monthly expense includes all current staff');
    equal(actual.wages, 4750, 'The cumulative staff cost agrees with the ledger');
    const cashBeforeExcess = actual.cash;
    await page.evaluate(() => { s.empire.staff.seller = 5; s.staff = { sales: true }; delete s.empire.staffSchema; delete s.empire.staffMigration; save(); });
    await page.reload({ waitUntil: 'networkidle' });
    actual = await snapshot(page);
    equal(actual.staff.seller, 6, 'The browser also preserves mixed hires exceeding the new limit');
    equal(actual.cash, cashBeforeExcess, 'An over-limit migration still adds no fee or refund');
    await page.locator('.ae-management-extra').filter({ hasText: 'Equipe e crescimento' }).locator('summary').click();
    await page.locator('[data-empire-tab="staff"]').click();
    ok(await page.locator('[data-hire="seller"]').isDisabled(), 'An inherited excess blocks further hiring without deleting paid employees');
    equal(errors, [], 'Migration and employee workflows have no JavaScript errors');
    console.log('PASS: ' + checks + ' staff migration, preserved perks, single payroll and hiring checks');
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
