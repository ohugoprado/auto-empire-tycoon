/* Run: node tests/trading-identity.test.js. Requires Playwright and system Chromium. */
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
    await page.setContent(`
      <div id="garage"><div id="stock">
        <div class="panel" id="stock-102" data-ae-car-id="102" hidden><div class="vehicle" data-car-id="102">Beta</div><button onclick="listDialog(102)">Anunciar</button></div>
        <div class="panel" id="stock-101" data-ae-car-id="101"><div class="vehicle" data-car-id="101">Alpha</div><button onclick="listDialog(101)">Anunciar</button></div>
      </div></div>
      <div id="market"><div id="listings">
        <div class="panel" id="market-202"><div class="vehicle">Delta</div><button onclick="buyDialog(202)">Negociar</button></div>
        <div class="panel" id="market-201"><div class="vehicle">Gamma</div><button onclick="buyDialog(201)">Negociar</button></div>
      </div></div>`);
    await page.evaluate(() => {
      window.s = {
        stock: [
          { id: 101, name: 'Alpha', value: 14000, bought: 10000, spent: 1000, offers: [{ amount: 16000 }] },
          { id: 102, name: 'Beta', value: 24000, bought: 20000, spent: 5000, offers: [] }
        ],
        market: [
          { id: 201, name: 'Gamma', value: 15000, ask: 14000 },
          { id: 202, name: 'Delta', value: 23000, ask: 18000 }
        ]
      };
      window.fmt = amount => amount + ' CR';
      window.render = () => {};
    });
    await page.addScriptTag({ path: path.join(__dirname, '../preview/js/iphone-trading.js') });
    async function summary() {
      return page.evaluate(() => ({
        stockOrder: [...document.getElementById('stock').children].map(node => node.id),
        chips: Object.fromEntries([...document.querySelectorAll('.panel')].map(card => [card.id, card.querySelector('.ae-trade-chip').textContent])),
        hidden: document.getElementById('stock-102').hidden
      }));
    }
    let actual = await summary();
    assert.deepEqual(actual.stockOrder, ['stock-101', 'stock-102']);
    assert.equal(actual.chips['stock-101'], 'Propostas: 1 · Lucro da melhor proposta: 5000 CR');
    assert.equal(actual.chips['stock-102'], 'Margem potencial: -1000 CR');
    assert.equal(actual.chips['market-201'], 'Diferença para avaliação: +1000 CR');
    assert.equal(actual.chips['market-202'], 'Diferença para avaliação: +5000 CR');
    assert.equal(actual.hidden, true, 'sorting preserves the category/search filter');

    const mutations = await page.evaluate(async () => {
      let changes = 0;
      const observer = new MutationObserver(records => { changes += records.length; });
      observer.observe(document.getElementById('stock'), { childList: true, subtree: true, characterData: true });
      observer.observe(document.getElementById('listings'), { childList: true, subtree: true, characterData: true });
      for (const refresh of window.aeUiRefreshers) { refresh(); refresh(); }
      await Promise.resolve();
      observer.disconnect();
      return changes;
    });
    assert.equal(mutations, 0, 'unchanged refreshes do not detach cards or rewrite chips');

    await page.selectOption('#ae-trade-select-stock', 'price');
    actual = await summary();
    assert.deepEqual(actual.stockOrder, ['stock-102', 'stock-101']);
    assert.equal(actual.chips['stock-101'], 'Propostas: 1 · Lucro da melhor proposta: 5000 CR');
    assert.equal(actual.chips['stock-102'], 'Margem potencial: -1000 CR');
    assert.equal(actual.hidden, true);
    assert.deepEqual(errors, []);
    console.log('PASS: trading card identity, legacy action IDs, repeated sort, filter preservation and mutation regression checks');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
