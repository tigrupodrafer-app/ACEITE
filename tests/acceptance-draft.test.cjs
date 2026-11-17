'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/acceptance-draft.cjs');
const original = global.fetch;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const reqId = '11111111-1111-4111-8111-111111111111';
function response(data, code = 200) {
  return { ok: code >= 200 && code < 300, status: code, text: async () => JSON.stringify(data) };
}
const payload = {
  id: reqId, order_number: 352488, finished_at: new Date().toISOString(),
  result: {
    pedidoCompleto: { numero: 352488, empresa: 1, cliente: { nome: 'Cliente Exemplo' },
      valores: { total: 240.05 } },
    itens: [{ item: 2, descricao: 'Corte galvanizado', codigoProdutoInterno: 1379,
      codigoProdutoComercial: 2506, valorTotal: 240.05, quantidade: 16.555 }],
    validacao: { valido: true, somaItens: 240.05 },
  },
};
function event(data, auth = true) {
  return { httpMethod: 'POST', headers: auth ? { authorization: 'Bearer safe-test-token' } : {},
    body: JSON.stringify(data) };
}
function mockFetch({ existing = [], record = payload } = {}) {
  let inserted = null;
  global.fetch = async (url, opts = {}) => {
    const path = String(url);
    if (path.includes('/auth/v1/user')) return response({ id: '11111111-1111-4111-8111-111111111111' });
    if (path.includes('/rest/v1/aceite_members')) return response([{
      user_id: '11111111-1111-4111-8111-111111111111', active: true, role: 'admin',
    }]);
    if (path.includes('/rest/v1/aceite_sic_requests')) return response([record]);
    if (path.includes('/rest/v1/aceite_orders') && opts.method === 'POST') {
      inserted = JSON.parse(opts.body);
      return response([{ id: '22222222-2222-4222-8222-222222222222' }], 201);
    }
    if (path.includes('/rest/v1/aceite_orders')) return response(existing);
    throw new Error('Unexpected endpoint: ' + path);
  };
  return () => inserted;
}
test('unauthenticated users cannot create a draft', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-test-service-key';
  mockFetch();
  const out = await handler(event({ requestId: reqId }, false));
  assert.equal(out.statusCode, 401);
});
test('completed SIC job creates only draft, never signing token', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-test-service-key';
  const inserted = mockFetch();
  const out = await handler(event({ requestId: reqId }));
  assert.equal(out.statusCode, 201);
  const draft = inserted();
  assert.equal(draft.status, 'rascunho');
  assert.equal(draft.details.eligibilityApproved, false);
  assert.equal(draft.sic_company_id, 1);
  assert.equal(draft.order_snapshot.itens[0].codigoProdutoComercial, 2506);
  assert.equal(Object.hasOwn(draft, 'token'), false);
});
test('duplicate draft remains idempotent', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-test-service-key';
  const inserted = mockFetch({ existing: [{ id: 'existing', status: 'rascunho' }] });
  const out = await handler(event({ requestId: reqId }));
  assert.equal(out.statusCode, 200);
  assert.equal(inserted(), null);
});
test('invalid financial validation never creates draft', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-test-service-key';
  const bad = structuredClone(payload);
  bad.result.validacao.valido = false;
  const inserted = mockFetch({ record: bad });
  const out = await handler(event({ requestId: reqId }));
  assert.equal(out.statusCode, 422);
  assert.equal(inserted(), null);
});
process.on('exit', () => { global.fetch = original; process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey; });
