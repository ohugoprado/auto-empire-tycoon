/* Run: node tests/corporate-banking.test.js. Uses the real bank UI in Chromium. */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.AE_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://bank.test/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="garage"></div>' }));
    await page.goto('http://bank.test/');
    await page.evaluate(() => {
      window.s = { day: 1, cash: 35000, sales: 0, rep: 50, empire: { economy: { inflation: 1 } }, ledger: [], logs: [] };
      window.fmt = amount => Math.round(amount) + ' CR';
      window.esc = text => String(text);
      window.entry = (name, amount) => s.ledger.push({ name, amount });
      window.note = text => s.logs.push(text);
      window.toast = text => { window.lastToast = text; };
      window.save = () => localStorage.setItem('bank-test-save', JSON.stringify(s));
      window.render = () => {};
      window.tickDay = () => { s.day++; };
      window.seed = () => {};
    });
    await page.addScriptTag({ path: path.join(__dirname, '../preview/js/corporate-banking.js') });
    const panel = page.locator('#ae-bank');
    assert.ok((await panel.innerText()).includes('Juros mensais estimados'), 'The quote labels its actual monthly unit');
    assert.ok((await panel.innerText()).includes('1,18%'), 'The default credit score produces a finite monthly rate');
    assert.ok(!(await panel.innerText()).includes('NaN'), 'The bank summary contains no NaN');
    await page.locator('#ae-bank-toggle').click();
    assert.ok((await page.locator('#ae-bank-forecast').innerText()).includes('10118 CR'), 'A 10,000-credit loan has the correctly compounded monthly forecast');

    async function state() {
      return page.evaluate(() => ({ cash: s.cash, day: s.day, bank: JSON.parse(JSON.stringify(s.empire.bank)), saved: JSON.parse(localStorage.getItem('bank-test-save') || 'null') }));
    }
    async function borrow(amount, term = '30') {
      await page.locator('#ae-bank-amount').fill(String(amount));
      await page.locator('#ae-bank-term').selectOption(term);
      await page.locator('#ae-bank-borrow').click();
    }

    await borrow(10000);
    let actual = await state();
    assert.equal(actual.cash, 45000, 'Only the principal is credited to cash');
    assert.equal(actual.bank.loans.length, 1);
    assert.equal(actual.bank.loans[0].balance, 10118);
    assert.equal(actual.bank.loans[0].monthlyRate, .0118);
    assert.equal(actual.bank.loans[0].dailyPayment, 338);
    assert.equal(actual.saved.empire.bank.loans[0].balance, 10118, 'The finite debt is saved');

    await page.locator('[data-defer="1"]').click();
    actual = await state();
    assert.equal(actual.bank.score, 57, 'Grace decreases the score without producing NaN');
    assert.equal(actual.bank.loans[0].grace, 7);
    assert.equal(actual.bank.loans[0].balance, 10270, 'Grace adds its 1.5% fee');
    await page.evaluate(() => { for (let day = 0; day < 7; day++) tickDay(); });
    actual = await state();
    assert.equal(actual.cash, 45000, 'Grace suspends all seven daily payments');
    assert.equal(actual.bank.loans[0].grace, 0);
    await page.evaluate(() => tickDay());
    actual = await state();
    assert.equal(actual.cash, 44662, 'Daily payments resume after grace');
    assert.equal(actual.bank.loans[0].balance, 9932);
    assert.equal(actual.bank.loans[0].remaining, 29);

    await page.locator('[data-repay="1"]').click();
    actual = await state();
    assert.equal(actual.bank.loans.length, 0, 'Full amortization removes the settled contract');
    assert.equal(actual.cash, 34730);
    assert.equal(actual.bank.score, 60);
    assert.deepEqual(actual.saved.empire.bank, actual.bank, 'Amortization and score are persisted');

    await borrow(0);
    actual = await state();
    assert.equal(actual.bank.loans.length, 0, 'Invalid principal does not create a loan');
    assert.equal(actual.cash, 34730);
    assert.equal(await page.evaluate(() => lastToast), 'Valor fora do limite de crédito');

    await page.evaluate(() => { s.empire.bank.score = 99; render(); });
    await borrow(1000);
    actual = await state();
    assert.equal(actual.bank.loans[0].balance, 1007);
    await page.locator('[data-repay="2"]').click();
    actual = await state();
    assert.equal(actual.bank.score, 100, 'Amortization caps the credit score at 100');
    await borrow(1000);
    await page.evaluate(() => { for (let day = 0; day < 30; day++) tickDay(); });
    actual = await state();
    assert.equal(actual.bank.loans.length, 0, 'Normal daily payments settle the full contract');
    assert.equal(actual.bank.score, 100, 'Daily completion also caps score without NaN');

    await borrow(1000);
    const debtBeforeMiss = (await state()).bank.loans[0].balance;
    await page.evaluate(() => { s.cash = 0; s.empire.bank.score = 1; tickDay(); tickDay(); });
    actual = await state();
    assert.equal(actual.bank.score, 0, 'Missed payments clamp the score at zero');
    assert.equal(actual.bank.missed, 2);
    assert.equal(actual.bank.loans[0].late, 2);
    assert.ok(actual.bank.loans[0].balance > debtBeforeMiss, 'Missed installments add the documented penalty');
    assert.equal(actual.saved.empire.bank.score, 0);
    assert.ok(!(await panel.innerText()).includes('NaN'));
    assert.deepEqual(errors, []);
    console.log('PASS: banking monthly quotes, finite loans, grace, repayment, score bounds and persistence');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
