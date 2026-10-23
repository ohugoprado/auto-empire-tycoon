/* Real resale campaign, ledger reconciliation and monthly obligations.
 * Run: node tests/commerce-campaign.test.js; AE_BROWSER=webkit is also supported.
 * The test controls randomness, never manufactures a buyer proposal or sale.
 */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
let browser, server, activePage, checks = 0;
const loadErrors = [], failedRequests = [];
let serverOutput = '';
const check = (condition, description) => { assert.ok(condition, description); checks++; };
const equal = (actual, expected, description) => { assert.deepEqual(actual, expected, description); checks++; };

async function startServer() {
  if (process.env.AE_TEST_BASE_URL) return process.env.AE_TEST_BASE_URL.replace(/\/$/, '');
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  let output = '', failure;
  server = spawn('python3', ['-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe']
  });
  server.once('error', error => { failure = error; });
  server.stdout.on('data', data => { output += data; serverOutput += data; });
  server.stderr.on('data', data => { output += data; serverOutput += data; });
  const base = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (failure) throw failure;
    if (server.exitCode !== null) throw Error('HTTP server exited: ' + output);
    try { if ((await fetch(base + '/preview/')).ok) return base; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('HTTP server did not become ready: ' + output);
}
async function snapshot(page) {
  return page.evaluate(() => ({
    cash: s.cash, day: s.day, minute: s.minute, sales: s.sales, profit: s.profit,
    stock: JSON.parse(JSON.stringify(s.stock)), ledger: JSON.parse(JSON.stringify(s.ledger)),
    bank: JSON.parse(JSON.stringify(s.empire.bank)), staff: JSON.parse(JSON.stringify(s.empire.staff)),
    wages: s.empire.totalWages, upkeep: s.empire.world.totalUpkeep,
    buyers: JSON.parse(JSON.stringify(s.empire.buyers)),
    saved: JSON.parse(localStorage.getItem(KEY)), paused
  }));
}
function reconcile(state, openingCash, label) {
  check(Number.isFinite(state.cash) && Number.isFinite(state.profit), label + ': cash and realized result stay finite');
  check(state.ledger.length < 100, label + ': the full fixture ledger is retained for reconciliation');
  check(state.ledger.every(record => Number.isFinite(record.amount)), label + ': every real ledger amount is finite');
  equal(state.cash, openingCash + state.ledger.reduce((sum, record) => sum + record.amount, 0),
    label + ': cash equals opening balance plus actual ledger movements');
  equal(state.saved.cash, state.cash, label + ': saved balance agrees with current cash');
}
async function garage(page, management = false) {
  await page.locator('.bottom [data-tab="garage"]').tap();
  await page.locator('[data-workspace="' + (management ? 'management' : 'overview') + '"]').tap();
}
async function bankView(page) {
  await garage(page, true);
  await page.locator('#ae-mgmt-tab-finance').tap();
  if (await page.locator('#ae-bank-toggle').getAttribute('aria-expanded') === 'false') {
    await page.locator('#ae-bank-toggle').tap();
  }
}
async function reloadCampaign(page, expected, label) {
  await page.reload({ waitUntil: 'networkidle' });
  const actual = await snapshot(page);
  for (const key of ['cash', 'day', 'sales', 'profit', 'stock', 'ledger', 'bank', 'staff', 'wages', 'upkeep']) {
    equal(actual[key], expected[key], label + ': ' + key + ' survives reload without a second transaction');
  }
  return actual;
}

(async () => {
  try {
    const engine = process.env.AE_BROWSER || 'chromium';
    check(['chromium', 'webkit'].includes(engine), 'A supported real browser engine is selected');
    const base = await startServer();
    browser = await playwright[engine].launch(engine === 'chromium'
      ? { executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }
      : { headless: true, ...(process.env.AE_WEBKIT_PATH ? { executablePath: process.env.AE_WEBKIT_PATH } : {}) });
    const device = playwright.devices['iPhone 17 Pro Max'] || playwright.devices['iPhone 14 Pro Max'];
    const context = await browser.newContext({ ...device, viewport: { width: 440, height: 763 } });
    await context.addInitScript(() => {
      // A deterministic market and simulation; the app still generates every car,
      // inspection result and offer through its ordinary production functions.
      Math.random = () => .12;
      if (!localStorage.getItem('autoempire_company_profile_v1')) {
        localStorage.setItem('autoempire_company_profile_v1', JSON.stringify({
          company: 'Campanha Motors', owner: 'Ana Teste', difficulty: 'normal', headquarters: 'saopaulo'
        }));
      }
    });
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); loadErrors.push(error.stack || error.message); });
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), type: request.resourceType(), error: request.failure()?.errorText }));
    const acceptDialog = dialog => dialog.accept();
    page.on('dialog', acceptDialog);
    await page.goto(base + '/preview/?campaign=main', { waitUntil: 'networkidle' });
    let actual = await snapshot(page);
    const openingCash = actual.cash - actual.ledger.reduce((sum, record) => sum + record.amount, 0);
    check(actual.paused && actual.sales === 0 && actual.stock.length === 0, 'A normal new campaign starts paused without a sale or stock');
    reconcile(actual, openingCash, 'Opening campaign');

    await bankView(page);
    const profitBeforeLoan = actual.profit;
    await page.locator('#ae-bank-amount').fill('10000');
    await page.locator('#ae-bank-term').selectOption('60');
    await page.locator('#ae-bank-borrow').tap();
    actual = await snapshot(page);
    equal(actual.bank.loans.length, 1, 'The real bank creates one 60-day contract');
    const contract = actual.bank.loans[0];
    equal(contract.principal, 10000, 'The bank records the requested principal');
    check(contract.balance > contract.principal && contract.dailyPayment > 0, 'The quoted obligation includes finite interest');
    equal(actual.profit, profitBeforeLoan, 'Borrowing credits cash without inventing trading profit');
    reconcile(actual, openingCash, 'Borrowing');

    const growth = page.locator('.ae-management-extra').filter({ hasText: 'Equipe e crescimento' });
    if (await growth.getAttribute('open') === null) await growth.locator('summary').tap();
    await page.locator('[data-empire-tab="staff"]').tap();
    await page.locator('[data-hire="mechanic"]').tap();
    actual = await snapshot(page);
    equal(actual.staff.mechanic, 1, 'One mechanic is hired through the canonical roster UI');
    await page.locator('[data-hire="seller"]').tap();
    actual = await snapshot(page);
    equal(actual.staff.seller, 1, 'One seller is hired to exercise the existing benefit together with market demand');
    reconcile(actual, openingCash, 'Hiring');

    await page.locator('.bottom [data-tab="market"]').tap();
    const candidate = await page.evaluate(() => {
      const car = s.market.find(item => item.id === 2) || s.market[0];
      return { id: car.id, ask: car.ask, name: car.name };
    });
    check(candidate.ask > 0 && candidate.ask < actual.cash, 'The generated market has an affordable firm seller');
    await page.locator('#listings button[onclick="buyDialog(' + candidate.id + ')"]').tap();
    equal(await page.locator('#modalbody .ae-trade-presets').count(), 1, 'Purchase has one authoritative group of quick prices');
    equal(await page.locator('#modalbody .ae-trade-presets button').count(), 3, 'The purchase presets retain the three supported quick prices');
    equal(await page.locator('#modalbody .ae-neg-quick,#modalbody .ae-bid-presets').count(), 0, 'Duplicate legacy preset controls are consolidated');
    check(await page.locator('#ae-bid-advisor').count() === 1 && await page.locator('#ae-neg-analysis').count() === 1,
      'Consolidating presets preserves both existing financial advisors');
    await page.locator('#bid').fill('0');
    const invalidBefore = await snapshot(page);
    await page.locator('#modalbody button[onclick="submitBid()"]').tap();
    actual = await snapshot(page);
    equal([actual.cash, actual.stock.length, actual.ledger.length],
      [invalidBefore.cash, invalidBefore.stock.length, invalidBefore.ledger.length], 'An invalid bid creates no financial transaction');
    await page.locator('#modalbody button[onclick="inspectCar(' + candidate.id + ',\'market\')"]').tap();
    actual = await snapshot(page);
    equal(actual.ledger.filter(record => record.name === 'Vistoria · ' + candidate.name).length, 1, 'Pre-purchase inspection has one ledger charge');
    const marketInspection = actual.ledger.find(record => record.name === 'Vistoria · ' + candidate.name).amount;
    check(marketInspection < 0, 'Market inspection is an actual company cash expense');
    await page.locator('#bid').fill(String(candidate.ask));
    await page.locator('#modalbody button[onclick="submitBid()"]').tap();
    await page.waitForFunction(id => s.stock.some(car => car.id === id), candidate.id);
    actual = await snapshot(page);
    equal(actual.stock.map(car => car.id), [candidate.id], 'The purchased identity is the selected market vehicle');
    equal(actual.stock[0].bought, candidate.ask, 'The accepted purchase pays exactly the entered offer');
    equal(actual.stock[0].spent, 0, 'Pre-purchase inspection remains separate from vehicle-recorded costs');
    reconcile(actual, openingCash, 'Purchase and market inspection');

    await garage(page);
    await page.locator('#stock [data-ae-inspect]').tap();
    await page.locator('#modalbody button[onclick="inspectCar(' + candidate.id + ',\'stock\')"]').tap();
    await page.locator('#modalbody .ae-dialog-close').tap();
    actual = await snapshot(page);
    const beforeRepair = actual.stock[0];
    check(beforeRepair.spent > 0, 'Stock inspection contributes to recorded vehicle investment');
    await page.locator('#stock button[onclick="repair(' + candidate.id + ')"]').tap();
    actual = await snapshot(page);
    const repaired = actual.stock[0];
    check(repaired.condition > beforeRepair.condition && repaired.spent > beforeRepair.spent, 'A real repair improves condition and records its expense');
    const repairRecord = actual.ledger.find(record => record.name === 'Reparos · ' + candidate.name);
    equal(repaired.spent - beforeRepair.spent, -repairRecord.amount, 'The mechanic-discounted repair basis equals its actual ledger expense');
    reconcile(actual, openingCash, 'Stock preparation');
    actual = await reloadCampaign(page, actual, 'Prepared inventory');

    await garage(page);
    await page.locator('#stock button[onclick="listDialog(' + candidate.id + ')"]').tap();
    equal(await page.locator('#modalbody .ae-trade-summary').count(), 1, 'The listing uses one canonical vehicle investment summary');
    equal(await page.locator('#modalbody .ae-trade-quick-summary').count(), 0, 'The quick-price module does not duplicate an existing listing summary');
    equal(await page.locator('#modalbody .ae-trade-presets').count(), 1, 'The listing has one group of presets');
    // Intentionally advertise below investment to exercise refusal of a real
    // loss confirmation after a demand premium, without inventing a proposal.
    const asking = '5000';
    const listingBefore = await snapshot(page);
    await page.locator('#asking').fill('');
    await page.locator('#modalbody button[onclick="publish()"]').tap();
    actual = await snapshot(page);
    equal([actual.cash, actual.stock[0].listed, actual.ledger.length],
      [listingBefore.cash, false, listingBefore.ledger.length], 'An empty listing price creates no advertisement or charge');
    await page.locator('#asking').fill(asking);
    await page.locator('#modalbody button[onclick="publish()"]').tap();
    actual = await snapshot(page);
    check(actual.stock[0].listed && actual.stock[0].offers.length === 0, 'Publishing stores the price without inventing a buyer offer');
    equal(actual.stock[0].price, Number(asking), 'The advertised price is the value entered in the real dialog');

    await page.evaluate(() => {
      const kinds = ['SUV', 'Compacto', 'Hatch', 'Picape', 'Sedã', 'Esportivo'];
      s.marketDynamics.focus = kinds.indexOf(s.stock[0].kind);
      s.marketDynamics.expires = 100;
      save(); render();
    });
    check(actual.stock[0].kind === 'Hatch' && actual.stock[0].condition >= 65,
      'The deterministic repaired car meets the explicitly selected demand segment');

    const dayBefore = actual.day;
    await page.evaluate(() => { tickDay(); render(); });
    actual = await snapshot(page);
    equal(actual.day, dayBefore + 1, 'The real simulation advances exactly one day');
    check(actual.stock[0].offers.length > 0, 'A buyer proposal is generated by the real simulation, not injected by the fixture');
    check(actual.stock[0].offers.every(offer => offer.aeBuyer && offer.preference && offer.amount > 0), 'The generated proposal passes the actual buyer-enrichment pipeline');
    equal(actual.ledger.filter(record => record.name === 'Parcela do financiamento').length, 1, 'One simulated day charges one bank installment');
    equal(actual.bank.loans[0].balance, contract.balance - contract.dailyPayment, 'The ledger installment reduces the actual contractual liability');
    reconcile(actual, openingCash, 'Offer generation');

    await page.locator('#stock button[onclick="offersDialog(' + candidate.id + ')"]').tap();
    let beforeSale = await snapshot(page);
    const firstQuote = beforeSale.stock[0].offers[0];
    check(firstQuote.marketDemandQuote?.version === 1 && firstQuote.marketDemandQuote.bonus > 0,
      'A genuine matching proposal includes its demand premium before the player sees it');
    check(firstQuote.staffSellerRate > 0, 'The existing seller benefit is included in the prepared customer quote');
    equal(firstQuote.amount, firstQuote.marketDemandQuote.base + firstQuote.marketDemandQuote.bonus,
      'The frozen demand quote adds one premium to the already prepared seller baseline');
    equal(await page.locator('#modalbody .ae-trade-summary').count(), 1, 'The proposal dialog has one canonical financial comparison');
    equal(await page.locator('#modalbody .ae-trade-quick-summary').count(), 0, 'The quick-price module does not duplicate the proposal comparison');
    const quotedOnce = firstQuote.amount;
    await page.locator('#modalbody .ae-dialog-close').tap();
    await page.evaluate(() => { s.marketDynamics.focus = 0; save(); render(); });
    await page.locator('#stock button[onclick="offersDialog(' + candidate.id + ')"]').tap();
    equal((await snapshot(page)).stock[0].offers[0].amount, quotedOnce, 'Reopening after a trend change keeps the previously shown quote');
    await page.locator('#modalbody .ae-dialog-close').tap();
    await reloadCampaign(page, await snapshot(page), 'Prepared demand quote');
    await garage(page);
    await page.locator('#stock button[onclick="offersDialog(' + candidate.id + ')"]').tap();
    equal((await snapshot(page)).stock[0].offers[0].amount, quotedOnce, 'The demand premium is not reapplied after saving and reloading the quote');
    const dismissed = [];
    const dismissDialog = async dialog => { dismissed.push(dialog.message()); await dialog.dismiss(); };
    page.off('dialog', acceptDialog); page.on('dialog', dismissDialog);
    const beforeCancel = await snapshot(page);
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.locator('#modalbody button[onclick="acceptOffer(0)"]').tap();
      const cancelled = await snapshot(page);
      equal([cancelled.cash, cancelled.sales, cancelled.profit, cancelled.ledger, cancelled.stock[0].offers[0].amount],
        [beforeCancel.cash, beforeCancel.sales, beforeCancel.profit, beforeCancel.ledger, quotedOnce],
        'Declining a loss confirmation preserves the displayed demand quote and every financial value');
    }
    check(dismissed.length === 2 && dismissed.every(text => /prejuízo/i.test(text)), 'Both cancelled attempts exercise the real loss confirmation');
    page.off('dialog', dismissDialog); page.on('dialog', acceptDialog);
    beforeSale = await snapshot(page);
    const quoted = beforeSale.stock[0].offers[0].amount;
    const invested = beforeSale.stock[0].bought + beforeSale.stock[0].spent;
    await page.locator('#modalbody button[onclick="acceptOffer(0)"]').tap();
    actual = await snapshot(page);
    equal(actual.stock.length, 0, 'The actual sale removes the vehicle from inventory');
    equal(actual.sales, beforeSale.sales + 1, 'One accepted proposal records one completed sale');
    const saleRecords = actual.ledger.filter(record => record.name === 'Venda · ' + candidate.name);
    equal(saleRecords.length, 1, 'A single sale receipt is recorded');
    equal(saleRecords[0].amount, quoted, 'Sale income matches the displayed, accepted proposal');
    const taxRecords = actual.ledger.filter(record => record.name === 'Tributo comercial · Brasil');
    equal(taxRecords.length, 1, 'The real sale charges one regional commercial tax');
    check(taxRecords[0].amount < 0, 'The tax is a debit separate from gross trading income');
    equal(actual.profit - beforeSale.profit, quoted - invested + taxRecords[0].amount,
      'The realized accumulator includes the trading basis and tax, excluding borrowing and operating cash');
    equal(actual.buyers.sales[0].price, quoted, 'The persistent customer history matches the accepted receipt');
    equal(actual.buyers.sales[0].profit, quoted - invested, 'Buyer history keeps its gross basis, distinct from post-tax realized result');
    const loyal = await page.evaluate(name => s.customerLoyalty.clients.find(client => client.name === name), beforeSale.stock[0].offers[0].name);
    check(loyal && loyal.purchases === 1 && loyal.spent === quoted, 'Customer loyalty records the exact displayed and paid quote, including the premium');
    reconcile(actual, openingCash, 'Sale and taxation');
    await page.evaluate(() => acceptOffer(0));
    const repeated = await snapshot(page);
    equal([repeated.cash, repeated.sales, repeated.profit, repeated.ledger, repeated.buyers],
      [actual.cash, actual.sales, actual.profit, actual.ledger, actual.buyers], 'Repeating a stale acceptance cannot pay, tax or record the sale twice');
    actual = await reloadCampaign(page, actual, 'Completed sale');

    await page.evaluate(() => { while (s.day < 30) tickDay(); render(); });
    actual = await snapshot(page);
    equal(actual.day, 30, 'The same resale campaign reaches its first monthly boundary');
    equal(actual.ledger.filter(record => record.name === 'Folha de pagamento').length, 1, 'There is one monthly staff payroll');
    equal(actual.ledger.filter(record => record.name === 'Aluguel mensal').length, 1, 'There is one monthly rental charge');
    equal(actual.ledger.filter(record => record.name === 'Custos internacionais').length, 1, 'There is one monthly network upkeep charge');
    equal(actual.ledger.filter(record => record.name === 'Parcela do financiamento').length, 29, 'Each of the 29 real day transitions charges exactly one contractual installment');
    equal(actual.wages, -actual.ledger.find(record => record.name === 'Folha de pagamento').amount, 'Cumulative payroll agrees with the ledger');
    equal(actual.upkeep, -actual.ledger.find(record => record.name === 'Custos internacionais').amount, 'Cumulative network cost agrees with its cash movement');
    const installmentTotal = -actual.ledger.filter(record => record.name === 'Parcela do financiamento').reduce((sum, record) => sum + record.amount, 0);
    equal(actual.bank.loans[0].balance, contract.balance - installmentTotal, 'Remaining liability reconciles with all daily cash payments');
    reconcile(actual, openingCash, 'Month-end obligations');
    await page.evaluate(() => { render(); render(); save(); });
    equal((await snapshot(page)).ledger, actual.ledger, 'UI refreshes do not duplicate monthly or daily charges');
    actual = await reloadCampaign(page, actual, 'Month-end continuation');

    await bankView(page);
    await page.locator('[data-repay="' + contract.id + '"]').tap();
    const amortized = await snapshot(page);
    equal(amortized.bank.loans.length, 0, 'Cash amortization settles the remaining real loan');
    equal(amortized.ledger.filter(record => record.name === 'Amortização de empréstimo').length, 1, 'Amortization records one cash debit');
    equal(amortized.profit, actual.profit, 'Debt settlement changes cash and liabilities without changing trading profit');
    reconcile(amortized, openingCash, 'Loan settlement');
    await reloadCampaign(page, amortized, 'Settled financing');
    equal(errors, [], 'The full integrated commerce campaign has no JavaScript errors');
    await context.close();
    console.log('PASS: ' + checks + ' integrated resale, generated offers, ledger, taxes, payroll, debt and reload checks (' + engine + ')');
  } catch (error) {
    const documentState = await activePage?.evaluate(() => ({
      url: location.href, readyState: document.readyState,
      statePresent: typeof s !== 'undefined', empirePresent: typeof s !== 'undefined' && Boolean(s.empire),
      staffLoaded: Boolean(window.AEStaff), mapLoaded: Boolean(window.AEOperationsMap),
      scripts: [...document.scripts].filter(script => script.src).map(script => script.src)
    })).catch(() => null);
    console.error('Commerce failure diagnostics:', JSON.stringify({ documentState, loadErrors, failedRequests, serverTail: serverOutput.split('\n').slice(-25) }, null, 2));
    throw error;
  } finally {
    if (browser) await browser.close();
    if (server?.pid && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
