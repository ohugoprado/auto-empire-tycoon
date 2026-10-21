'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'preview/index.html'), 'utf8');
// Exercise the repository's real simulation loop rather than a substitute.
const originalFrame = html.match(/function frame\(now\)\{[\s\S]*?\}try\{s=/)[0].replace(/try\{s=$/, '');
const clock = { textContent: '08:00 · São Paulo' };
let fullRenders = 0;
let scheduledFrames = 0;
const context = vm.createContext({
  s: { minute: 480, day: 1, cash: 35000, stock: [], market: [], empire: { staff: { seller: 0 } } },
  paused: false, speed: 1, lastTime: 0, acc: 0,
  document: { getElementById: id => id === 'time' ? clock : null },
  $: () => ({ classList: { contains: () => !context.modalOpen } }),
  requestAnimationFrame: () => scheduledFrames++,
  render: () => { fullRenders++; return 'rendered'; },
  tickDay: () => { context.s.day++; context.s.minute = 480; },
  modalOpen: false
});
vm.runInContext(originalFrame, context);
vm.runInContext(fs.readFileSync(path.join(root, 'preview/js/runtime-performance.js'), 'utf8'), context);

for (let now = 100; now <= 3000; now += 100) context.frame(now);
assert.equal(fullRenders, 0, 'clock-only frames preserve the existing cards');
assert.ok(Math.abs(context.s.minute - 552) < 1e-8, 'three real seconds advance 72 game minutes');
assert.equal(clock.textContent, '09:' + String(Math.floor(context.s.minute % 60)).padStart(2, '0') + ' · São Paulo', 'clock advances with its existing city suffix');
assert.equal(scheduledFrames, 30, 'each original frame still schedules its successor');
assert.equal(context.render(), 'rendered', 'explicit user-action renders are never skipped');
assert.equal(fullRenders, 1);

context.s.empire.staff.seller++;
context.frame(3150); context.frame(3300);
assert.equal(fullRenders, 2, 'nested campaign updates refresh the full UI');

context.s.minute = 1439;
context.frame(3450);
assert.equal(context.s.day, 2, 'day progression still uses the original loop');
context.frame(3600);
assert.equal(fullRenders, 3, 'day change refreshes the full UI');

context.paused = true;
const pausedMinute = context.s.minute;
context.frame(4000);
assert.equal(context.s.minute, pausedMinute, 'paused campaigns do not advance');
context.paused = false; context.modalOpen = true;
context.frame(4500);
assert.equal(context.s.minute, pausedMinute, 'open modals still stop simulation');
context.modalOpen = false; context.speed = 4;
context.frame(5000);
assert.ok(Math.abs(context.s.minute - pausedMinute - 14.4) < 1e-8, 'dt cap and 4× speed remain unchanged');
assert.equal(fullRenders, 3, 'resuming clock-only simulation does not rebuild cards');
console.log('PASS: runtime performance, clock progression, state invalidation and pause/speed regression checks');
