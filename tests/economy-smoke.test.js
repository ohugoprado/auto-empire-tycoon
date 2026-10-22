/* Run: node tests/economy-smoke.test.js (Node 18+). */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const scripts=[
 'preview/js/trade-math.js','preview/js/text-management.js','preview/js/company-intro.js',
 'preview/js/save-backups.js','preview/js/staff-system.js',
 'preview/js/empire-systems.js','preview/js/quality-pack.js',
 'preview/js/world-expansion.js','preview/js/global-economy.js',
 'preview/js/operations-finance.js','preview/js/vehicle-design-studio.js',
 'preview/js/iphone-experience.js',
 'preview/js/vehicle-sprites.js','preview/js/visual-redesign.js','preview/js/runtime-performance.js'
];
let checks=0;
for(const file of scripts){new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});checks++}
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'preview/js/trade-math.js'),'utf8'),context);
const t=context.window.AETradeMath;
function test(label,condition){assert.ok(condition,label);checks++}
test('basis includes repairs',t.basis({bought:15000,spent:2300})===17300);
test('negative amounts are clamped',t.amount(-99)===0);
test('non-finite amounts are clamped',t.amount(Infinity)===0);
test('gross profit',t.analyze({bought:12000,spent:1000},17000).gross===4000);
test('break-even',t.analyze({bought:12000,spent:1000},17000).breakEven===13000);
test('loss recognized',t.analyze({bought:12000,spent:1000},11000).gross===-2000);
test('margin zero when sale is zero',t.analyze({bought:12000},0).margin===0);
test('roi computed',Math.abs(t.analyze({bought:10000},12000).roi-20)<1e-8);
test('empty inventory',t.summary([]).invested===0);
test('unlisted stock invested but not asking',t.summary([{listed:false,bought:1000,price:2000}]).invested===1000&&t.summary([{listed:false,bought:1000,price:2000}]).asking===0);
test('listed asking',t.summary([{listed:true,bought:1000,price:2000}]).gross===1000);
const html=fs.readFileSync(path.join(root,'preview/index.html'),'utf8');
for(const file of scripts){test('loaded script '+file,html.includes(file.replace('preview/','')))}
test('persistent save key',html.includes('autoempire_preview_v06'));
const finance=fs.readFileSync(path.join(root,'preview/js/operations-finance.js'),'utf8');
test('cash projection',finance.includes('cash+flow.income-flow.expenses-fixed'));
test('factory supplier integrated',fs.readFileSync(path.join(root,'preview/js/vehicle-design-studio.js'),'utf8').includes('supplier.factor'));
console.log('PASS: '+checks+' syntax and economy smoke checks');
