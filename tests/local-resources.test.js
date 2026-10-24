/* Detect broken local resource links and compile inline game scripts. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const references = new Map();
let checks = 0;

function filesWithin(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesWithin(file, extension) : extension.test(entry.name) ? [file] : [];
  });
}
function add(source, value) {
  value = value.trim().replace(/&amp;/g, '&');
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return;
  // Dynamic JavaScript expressions are covered by browser tests; only literal
  // local resource URLs can be resolved statically without guessing their value.
  if (/[<>{}\s]|\$\{|['"`]/.test(value)) return;
  const relative = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  if (!relative) return;
  let target = relative.startsWith('/') ? path.join(root, relative) : path.resolve(path.dirname(source), relative);
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  references.set(source + '\0' + value, { source: path.relative(root, source), value, target });
}

const htmlFiles = [path.join(root, 'index.html'), ...filesWithin(path.join(root, 'preview'), /\.html$/)];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<(?:script|link|img|image|a)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(file, match[1]);
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
    new vm.Script(match[2], { filename: path.relative(root, file) + ':inline-' + ++checks });
  }
}
for (const file of filesWithin(path.join(root, 'preview'), /\.(?:css|js)$/)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*(?:document\.currentScript\.src|base|script\.src)/g)) add(file, match[1]);
  if (file.endsWith('.css')) for (const match of source.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) add(file, match[1]);
}
const worker = path.join(root, 'sw.js');
const assets = JSON.parse(fs.readFileSync(worker, 'utf8').match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);
for (const asset of assets) add(worker, asset);
const markdown = [path.join(root, 'README.md'), path.join(root, 'ROADMAP.md'), ...filesWithin(path.join(root, 'docs'), /\.md$/)];
for (const file of markdown) {
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) add(file, match[1]);
}
assert.ok(references.size > 100, 'The audit covers the application, offline shell and documentation');
checks++;
const broken = [...references.values()].filter(reference => !fs.existsSync(reference.target));
assert.deepEqual(broken.map(reference => reference.source + ' → ' + reference.value), [], 'Every literal local resource exists');
checks += references.size;
console.log('PASS: ' + checks + ' inline syntax and local resource checks');
