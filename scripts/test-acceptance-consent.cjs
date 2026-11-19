'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {consentDefinition,validateConsents} = require('../netlify/functions/_lib/acceptance-consent.cjs');
const keys = ['conferenciaPedido','condicoesFornecimentoGarantia','concordanciaAutorizacao'];
test('as tres declaracoes juridicas aparecem integralmente', () => {
  const defs=consentDefinition();
  assert.equal(defs.length,3);
  assert.deepEqual(defs.map(x=>x.key),keys);
  assert.ok(defs.every(x=>x.required && x.text.length>40));
});
test('nenhuma, uma ou duas confirmacoes nao bastam', () => {
  assert.equal(validateConsents(null).valid,false);
  assert.equal(validateConsents({}).valid,false);
  assert.equal(validateConsents({conferenciaPedido:true}).valid,false);
  assert.equal(validateConsents({conferenciaPedido:true,condicoesFornecimentoGarantia:true}).valid,false);
});
test('apenas boolean true em todas as tres confirma', () => {
  assert.equal(validateConsents(Object.fromEntries(keys.map(k=>[k,true]))).valid,true);
  assert.equal(validateConsents(Object.fromEntries(keys.map(k=>[k,'true']))).valid,false);
  assert.equal(validateConsents(Object.fromEntries(keys.map(k=>[k,1]))).valid,false);
});
