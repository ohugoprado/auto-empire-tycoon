/* Isolated auction engine regression. DOM stubs bind the real rendered button
 * callbacks; browser touch/layout remain covered by auction-purchase.test.js.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let checks = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const check = (actual, label) => { assert.ok(actual, label); checks++; };
const modules = ['vehicle-auctions', 'negotiation-rounds', 'buyer-negotiation-ai', 'brand-technology-tree',
  'subsidiary-command-center', 'company-logo-founder', 'brand-identity-network', 'brand-vehicle-showroom',
  'model-generations', 'model-market-intelligence', 'automotive-media', 'factory-workforce', 'factory-warehouse', 'day-turn-summary'];
for (const name of modules) {
  const source = fs.readFileSync(path.join(root, 'preview/js', name + '.js'), 'utf8');
  new vm.Script(source, { filename: name + '.js' }); checks++;
  const helper = source.match(/^const (esc|safe|escapeText|escText)=.*$/m);
  if (helper) equal(vm.runInNewContext(helper[0] + '\n' + helper[1] + '(\'A"B\\\'C<&>\')'),
    'A&quot;B&#39;C&lt;&amp;&gt;', name + ': all five HTML characters retain their correct escaping');
}
function fixture({ day = 10, bankrupt = false, advance = false } = {}) {
  const state = { day, cash: 10000, slots: 5, stock: [], ledger: [], logs: [], nextId: 10,
    empire: { economy: { bankrupt } }, vehicleAuctions: { nextDay: 20, history: [],
      lots: [0, 1, 2].map(index => ({ car: { id: index + 1, name: 'Lote ' + index, condition: 80, value: 1000, repair: 0 },
        high: 100, playerBid: 100, leader: 'Você', rival: 'Rival', rivalLimit: 1000, ends: 9, rounds: 1,
        defect: { name: 'Sem defeitos relevantes', cost: 0, conditionLoss: 0 } })) } };
  const node = () => ({ innerHTML: '', setAttribute() {}, append() {}, appendChild() {}, insertBefore() {},
    querySelectorAll(selector) {
      const attribute = selector.replace(/^\[|\]$/g, '');
      const matches = [...this.innerHTML.matchAll(/<button\b([^>]*)>/g)];
      return matches.flatMap(match => {
        const value = match[1].match(new RegExp(attribute + '="([^"]*)"'));
        if (!value) return [];
        const key = attribute.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        return [{ dataset: { [key]: value[1] }, disabled: /\bdisabled\b/.test(match[1]), onclick: null }];
      });
    }
  });
  const panel = node(), market = node(), listing = node();
  let saves = 0, saved;
  // Store bound controls as refresh replaces the panel, retaining old callbacks
  // explicitly when exercising stale-control guards.
  const lookup = panel.querySelectorAll.bind(panel);
  panel.controls = {};
  panel.querySelectorAll = selector => (panel.controls[selector] = lookup(selector));
  const math = Object.create(Math); math.random = () => .99;
  const context = vm.createContext({ s: state, Math: math,
    document: { head: node(), createElement: tag => tag === 'section' ? panel : node(),
      getElementById: id => id === 'market' ? market : id === 'listings' ? listing : null },
    tickDay() { if (advance && !state.empire.economy.bankrupt) state.day++; return 'engine-result'; },
    render() {}, seed() {}, note(message) { state.logs.push(message); },
    entry(name, amount) { state.ledger.push({ name, amount }); },
    save() { saves++; saved = JSON.stringify(state); },
    makeCar() { throw Error('Fixture must not manufacture an unexpected auction lot'); }, toast() {} });
  const source = fs.readFileSync(path.join(root, 'preview/js/vehicle-auctions.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'vehicle-auctions.js' });
  return { context, state, panel, get saves() { return saves; }, get saved() { return saved; } };
}
for (const bankrupt of [false, true]) {
  const test = fixture({ bankrupt }), before = JSON.stringify(test.state), saved = test.saves;
  equal(test.context.tickDay(), 'engine-result', 'Blocked turn retains the wrapped engine return value');
  equal(JSON.stringify(test.state), before, 'An unchanged day cannot settle or create auctions, even with expired lots');
  equal(test.saves, saved, 'An unchanged day cannot save an invented auction advance');
}
const ended = fixture({ bankrupt: true });
const endedBefore = JSON.stringify(ended.state);
ended.panel.controls['[data-auction-inspect]'][0].onclick();
ended.panel.controls['[data-auction-bid]'][0].onclick();
equal(JSON.stringify(ended.state), endedBefore, 'Forced bid and inspection callbacks cannot spend after bankruptcy');
check(ended.panel.controls['[data-auction-inspect]'].every(button => button.disabled), 'Inspection controls show the ended-campaign restriction');
const active = fixture({ day: 8, advance: true });
const inspect = active.panel.controls['[data-auction-inspect]'][0];
inspect.onclick(); inspect.onclick();
equal(active.state.cash, 9850, 'An optional inspection charges its real150 CR fee once');
equal(active.state.ledger.length, 1, 'A stale inspection callback cannot add another expense');
equal(active.context.tickDay(), 'engine-result', 'A valid turn retains the engine return value');
equal(active.state.day, 9, 'Auction processing consumes exactly the one real engine advance');
equal(active.state.stock.length, 0, 'Lots remain open through their advertised closing day');
active.context.tickDay();
equal(active.state.day, 10, 'The next actual day reaches settlement');
equal(active.state.stock.length, 3, 'Three winning lots deliver exactly three unique cars');
equal(new Set(active.state.stock.map(car => car.id)).size, 3, 'Settlement preserves unique vehicle IDs');
equal(active.state.cash, 9550, 'Settlement charges each winning100 CR bid once after the inspection fee');
equal(active.state.ledger.filter(item => item.name.startsWith('Arremate · ')).length, 3, 'Each settled lot has one financial entry');
equal(active.state.vehicleAuctions.lots.length, 0, 'All settled lots are consumed');
equal(active.state.vehicleAuctions.history.length, 3, 'History contains one result per settled lot');
equal(active.saved, JSON.stringify(active.state), 'Settlement persists the complete resulting auction and financial state');
const settledCash = active.state.cash, settledLedger = active.state.ledger.length;
active.context.tickDay();
equal(active.state.stock.length, 3, 'Later valid days cannot deliver a consumed lot again');
equal(active.state.cash, settledCash, 'Later days cannot charge settled bids again');
equal(active.state.ledger.length, settledLedger, 'Later days cannot duplicate settlement ledger entries');
console.log('PASS: ' + checks + ' remote-module syntax, escaping, blocked-turn and auction-settlement checks');
