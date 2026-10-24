'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../preview/js/pwa-updates.js'), 'utf8');
for (const installed of [false, true]) {
  const events = {}, first = { scriptURL: 'https://game.test/sw.js' };
  let saves = 0, reloads = 0;
  const serviceWorker = { controller: installed ? first : null, addEventListener: (name, callback) => { events[name] = callback; } };
  const context = vm.createContext({ URL, navigator: { serviceWorker }, window: { isSecureContext: true, addEventListener() {} },
    document: { currentScript: { src: 'https://game.test/preview/js/pwa-updates.js' } },
    save: () => saves++, location: { reload: () => reloads++ } });
  vm.runInContext(source, context);
  serviceWorker.controller = first;
  events.controllerchange();
  assert.equal(reloads, 0, 'first claim or queued same-controller event preserves the current document');
  assert.equal(saves, 0, 'first installation does not rewrite a partly initialized campaign');
  serviceWorker.controller = { scriptURL: first.scriptURL };
  events.controllerchange();
  assert.equal(reloads, installed ? 1 : 0, 'an actual replacement reloads an already controlled app only');
  assert.equal(saves, reloads, 'a replacement saves once before reload');
  events.controllerchange();
  assert.equal(reloads, installed ? 1 : 0, 'repeat controller notifications cannot reload twice');
}
console.log('PASS: first-install, queued controller, actual update and single-reload PWA checks');
