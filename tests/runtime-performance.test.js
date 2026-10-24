'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'preview/index.html'), 'utf8');
// Exercise the real manual-turn entry point. The engine stub isolates its
// one-turn/reentrancy/modal contract; browser campaigns cover the real economy.
const start = html.indexOf('function advanceDay(){');
const end = html.indexOf('function setSpeed(', start);
assert.ok(start >= 0 && end > start, 'the application exposes a manual day action');
assert.ok(!/function frame\(now\)|requestAnimationFrame\(frame\)/.test(html), 'elapsed real time does not schedule a simulation frame');
let fullRenders = 0, saves = 0, turns = 0;
const summaries = [], messages = [];
const overlay = { hidden: true };
const context = vm.createContext({
  s: { minute: 600, day: 1, cash: 35000, stock: [], sales: 0, ledger: [], logs: [] },
  paused: false,
  document: { getElementById: id => id === 'ae-turn-overlay' ? overlay : null,
    querySelector: () => context.otherModalOpen ? {} : null },
  $: () => ({ classList: { contains: () => !context.modalOpen } }),
  render: () => { fullRenders++; return 'rendered'; },
  save: () => saves++,
  toast: message => messages.push(message),
  tickDay: () => {
    turns++;
    // Even an accidental synchronous second request cannot process two turns.
    context.advanceDay();
    if (context.blockedTurn) return;
    context.s.day++; context.s.cash -= 100;
    context.s.ledger.unshift({ day: context.s.day, name: 'Daily fixture expense', amount: -100 });
    context.s.logs.unshift('Daily fixture event');
  },
  window: { aeAdvancingDay: false, AEDaySummary: { show: before => { summaries.push(before); overlay.hidden = false; } } },
  modalOpen: false, otherModalOpen: false, blockedTurn: false
});
vm.runInContext(html.slice(start, end), context);
const renderBefore = context.render;
vm.runInContext(fs.readFileSync(path.join(root, 'preview/js/runtime-performance.js'), 'utf8'), context);
assert.equal(context.render, renderBefore, 'the old frame optimizer leaves a manual-turn runtime unchanged');

context.advanceDay();
assert.equal(turns, 1, 'one action invokes the engine exactly once, including a nested request');
assert.equal(context.s.day, 2, 'one explicit action advances one simulated day');
assert.equal(context.s.cash, 34900, 'one engine turn has exactly one financial effect');
assert.equal(context.s.ledger.length, 1, 'one day produces one fixture ledger entry');
assert.equal(context.s.minute, 480, 'a manual day starts at the standard morning time');
assert.equal(context.paused, true, 'manual turns never enable real-time simulation');
assert.equal(fullRenders, 1); assert.equal(saves, 1);
assert.equal(summaries.length, 1, 'a successful day opens one summary');
assert.equal(summaries[0].day, 1); assert.equal(summaries[0].cash, 35000);
assert.equal(summaries[0].ledgerSnapshot.length, 0, 'summary baseline precedes the turn ledger mutation');
assert.equal(summaries[0].logsSnapshot.length, 0, 'summary baseline precedes the turn event mutation');
assert.equal(context.window.aeAdvancingDay, false, 'the reentrancy lock is released after a turn');

context.advanceDay();
assert.equal(turns, 1, 'an open day summary blocks an extra turn');
overlay.hidden = true;
context.modalOpen = true; context.advanceDay();
assert.equal(turns, 1, 'an open game dialog blocks the manual day');
context.modalOpen = false; context.otherModalOpen = true; context.advanceDay();
assert.equal(turns, 1, 'another modal blocks the manual day');
context.otherModalOpen = false; context.blockedTurn = true; context.advanceDay();
assert.equal(turns, 2, 'an unblocked action can consult the engine again');
assert.equal(context.s.day, 2, 'an engine-declined turn does not change the day');
assert.equal(context.s.cash, 34900, 'an engine-declined turn does not charge a daily expense');
assert.equal(summaries.length, 1, 'an engine-declined turn has no false success summary');
assert.ok(messages.some(message => message.includes('não avançou')), 'a declined turn explains that the day did not advance');
assert.equal(context.window.aeAdvancingDay, false, 'declined turns also release the lock');
console.log('PASS: manual-turn entry, no frame scheduling, single execution, modal guards, accounting baseline and declined-day checks');
