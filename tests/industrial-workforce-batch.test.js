/* Industrial staffing regression: the batch UI uses the actual workforce that
 * feeds the production engine. Explicit fixture contracts/capital support this
 * isolated integration check; no completed vehicles are fabricated.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let checks = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const nodes = new Map();
function node(id) {
  if (id && nodes.has(id)) return nodes.get(id);
  const element = { innerHTML: '', textContent: '', disabled: false, hidden: false, value: '', handlers: {},
    addEventListener(type, callback) { this.handlers[type] = callback; }, append() {}, after() {}, insertBefore() {},
    querySelector(selector) { return node(selector.replace(/^#/, '')); } };
  Object.defineProperty(element, 'id', { get() { return this._id; }, set(value) { this._id = value; nodes.set(value, this); } });
  if (id) element.id = id;
  return element;
}
const garage = node('garage'), network = node('ae-industrial-network'); network.parentNode = node();
node('ae-sub-target').value = '8'; node('ae-sub-scope').value = 'all';
const first = { id: 1, name: 'Unidade parada', level: 1, staff: 2, workforce: { staff: 0, shift: 1 } };
const second = { id: 2, name: 'Unidade com equipe maior', level: 1, staff: 4, workforce: { staff: 12, shift: 1 } };
const state = { day: 1, cash: 100000, profit: 0, slots: 10, stock: [], nextId: 1, ledger: [], logs: [],
  empire: { world: { active: 'saopaulo' }, economy: { inflation: 1, bankrupt: false,
    crisis: { id: 'stable', end: 0 }, factory: { opened: true, brand: 'Fixture Motors', level: 1,
      produced: 0, queue: [], industrialOrders: [{ id: 901, plantId: 1, remaining: 2, total: 2,
        delivered: 0, model: 'Contrato de teste', kind: 'Hatch', cost: 1000, value: 1400, cycleDays: 7, paint: 0 }] },
    plantNetwork: { plants: [first, second], lastPayrollDay: 0 } } } };
let accepted = false, confirms = [], saved;
const math = Object.create(Math); math.random = () => .99;
const context = vm.createContext({ s: state, window: {}, Math: math,
  document: { head: node(), createElement() { return node(); }, getElementById(id) { return nodes.get(id) || null; } },
  render() {}, tickDay() {}, seed() {}, fmt(value) { return value + ' CR'; },
  note(message) { state.logs.push(message); }, entry(name, amount) { state.ledger.push({ name, amount }); },
  save() { saved = JSON.stringify(state); }, toast() {}, confirm(message) { confirms.push(message); return accepted; },
  rand(a) { return a; }, paused: true });
const load = name => vm.runInContext(fs.readFileSync(path.join(root, 'preview/js', name + '.js'), 'utf8'), context, { filename: name + '.js' });
load('subsidiary-command-center');
check(node('ae-sub-hire').disabled, 'Batch staffing waits for the canonical workforce API');
load('factory-workforce');
const api = context.window.AEFactoryWorkforce;
check(api && Object.isFrozen(api), 'The shared workforce API is available and immutable');
const legacyUnmanaged = { level: 2, staff: 7 };
const untouchedLegacy = JSON.stringify(legacyUnmanaged);
equal(api.read(legacyUnmanaged).daily, 0, 'Reading an unmanaged legacy unit does not invent a new recurring charge');
equal(JSON.stringify(legacyUnmanaged), untouchedLegacy, 'Reading a legacy unit cannot migrate or activate managed payroll');
const initialRead = api.read(first);
equal(initialRead.staff, 0, 'The batch reads an actual stopped workforce instead of legacy support staff');
equal(initialRead.lines, 0, 'Zero industrial workers means zero production lines');
check(Object.isFrozen(initialRead), 'Reading workforce returns an immutable summary');
equal(api.quote(first, 6, 1).hiring, 2100, 'The canonical individual and batch quote both charge350 CR per added worker');
equal(api.quote(first, 6, 1).after.daily, 540, 'The quoted recurring cost matches six workers at90 CR per day');
equal(api.quote(first, 6, 1).after.lines, 2, 'The planned workers actually enable two lines');
equal(api.quote(first, -1, 1), null, 'Negative staffing is invalid');
equal(api.quote(first, 2.5, 1), null, 'Fractional workers are invalid');
equal(api.quote(first, 501, 1), null, 'Staffing over the individual UI limit is invalid');
equal(api.quote(first, 6, 3), null, 'Unsupported shifts are invalid');
check(!node('ae-sub-hire').disabled, 'Canonical API readiness refreshes the batch UI');
check(node('ae-sub-quote').textContent.includes('2.100 CR') && node('ae-sub-quote').textContent.includes('1.620 CR'), 'One visible quote includes hiring and the resulting total daily payroll');
const hire = node('ae-sub-hire').handlers.click;
const beforeCancel = JSON.stringify(state); hire();
equal(JSON.stringify(state), beforeCancel, 'Cancelling the batch leaves money, staff, queue and ledger intact');
check(confirms[0].includes('1.080 CR') && confirms[0].includes('1.620 CR'), 'Confirmation shows payroll before and after the policy');
const originalCash = state.cash; state.cash = 0; const withoutFunds = JSON.stringify(state); hire();
equal(JSON.stringify(state), withoutFunds, 'A forced insufficient-funds callback cannot apply workers');
state.cash = originalCash; accepted = true;
// Run the actual factory scheduling function before staffing: no private quote
// formula is substituted for production. The explicit fixture contract is held.
const globalSource = fs.readFileSync(path.join(root, 'preview/js/global-economy.js'), 'utf8');
const logicEnd = globalSource.indexOf('const style=document.createElement');
check(logicEnd > 0, 'The real factory scheduler source is available');
vm.runInContext(globalSource.slice(0, logicEnd) + '\nwindow.runFactoryDay=updateDay;})();', context, { filename: 'global-economy.js' });
state.day++; context.window.runFactoryDay();
equal(state.empire.economy.factory.queue.length, 0, 'The real engine cannot start the fixture contract with no workforce');
equal(state.empire.economy.factory.industrialOrders[0].remaining, 2, 'The stopped unit retains all contracted work');
const cashBefore = state.cash, ledgerBefore = state.ledger.length;
hire();
equal(state.cash, cashBefore - 2100, 'One batch charges the canonical hiring cost once');
equal(state.ledger.length, ledgerBefore + 1, 'One batch adds one hiring ledger entry');
equal(first.workforce.staff, 6, 'The batch updates the actual industrial workforce');
equal(first.workforce.shift, 1, 'The policy preserves existing shifts');
equal(second.workforce.staff, 12, 'The policy never dismisses workers already above its target');
equal([first.staff, second.staff], [2, 4], 'Legacy support staff and their monthly salary basis remain unchanged');
equal(state.empire.economy.plantNetwork.lastPayrollDay, 0, 'The batch does not charge or advance the legacy payroll');
equal(saved, JSON.stringify(state), 'The batch persists its complete resulting financial and workforce state');
const committed = JSON.stringify(state); hire();
equal(JSON.stringify(state), committed, 'A stale completed-policy callback cannot hire or charge again');
const beforeDay = state.cash; state.day++; context.window.runFactoryDay();
equal(state.empire.economy.factory.queue.length, 2, 'The actual next-day engine starts two jobs after staffing is applied');
equal(state.empire.economy.factory.industrialOrders[0].remaining, 0, 'Started work is consumed from the original contract');
equal(state.cash, beforeDay - 1620 - 360, 'The actual engine charges the quoted daily workforce plus separate two-line overhead');
equal(state.ledger.filter(item => item.name === 'Folha diária de funcionários industriais').at(-1).amount, -1620, 'The engine records the same workforce payroll shown before confirmation');
equal([first.staff, second.staff], [2, 4], 'Actual production does not rewrite the support team');
state.empire.economy.inflation = 1.5;
equal(api.quote({ level: 1, workforce: { staff: 0, shift: 1 } }, 6, 1).hiring, 2100, 'Batch quotes preserve the existing flat350 CR individual hiring rule during inflation');
equal(api.quote({ level: 1, workforce: { staff: 0, shift: 1 } }, 6, 1).after.daily, 810, 'Recurring payroll still applies the actual inflation rule');
state.empire.economy.bankrupt = true; first.workforce.staff = 0;
const ended = JSON.stringify(state); hire();
equal(JSON.stringify(state), ended, 'Ended campaigns cannot apply staffing through stale callbacks');
console.log('PASS: ' + checks + ' canonical workforce, batch confirmation, hiring and real production checks');
