'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/review-document.cjs');
const { createHash } = require('node:crypto');
const originalFetch = global.fetch;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const orderId = '22222222-2222-4222-8222-222222222222';
const userId = '11111111-1111-4111-8111-111111111111';
const order = {
  id: orderId, order_number: '352488', origin: 'SIC_SUPRASYS',
  sic_company_id: 1, sic_order_number: 352488, client_name: 'Cliente Teste',
  status: 'rascunho', details: { draftOnly: true, legalDocumentApproved: false },
  order_snapshot: {
    pedidoCompleto: { numero: 352488, empresa: 1, liberado: 'S',
      cliente: { codigo: 1177, nome: 'Cliente Teste' },
      valores: { subtotal: 240.05, desconto: 0, total: 240.05 } },
    itens: [{ item: 2, descricao: 'Corte galvanizado', codigoProdutoComercial: 2506,
      codigoProdutoInterno: 1379, referenciaFornecedor: 2506, unidade: 'MTD',
      quantidade: 16.555, pesoLiquidoKg: 16.555, quantidadePecas: 5.5,
      valorUnitario: 14.5, valorUnitarioPeca: 43.6454545, valorTotal: 240.05 }],
    validacao: { valido: true, somaItens: 240.05 },
  },
};
function json(data, status = 200) {
  return { ok: status >= 200 && status < 300, status,
    text: async () => JSON.stringify(data) };
}
function ev(method = 'POST', body = { draftId: orderId }, auth = true) {
  return { httpMethod: method, headers: auth ? { authorization: 'Bearer token-test' } : {},
    body: JSON.stringify(body), queryStringParameters: { draftId: orderId } };
}
function setup({ role = 'admin', status = 'rascunho', existing = [], tamper = false } = {}) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
  const state = { stored: null, inserted: null, audit: null, tokens: 0 };
  global.fetch = async (url, options = {}) => {
    url = String(url);
    if (url.includes('/auth/v1/user')) return json({ id: userId });
    if (url.includes('/rest/v1/aceite_members')) return json([{ user_id: userId, active: true, role }]);
    if (url.includes('/rest/v1/aceite_orders')) return json([{ ...order, status }]);
    if (url.includes('/rest/v1/aceite_generated_documents')) {
      if (options.method === 'POST') {
        state.inserted = JSON.parse(options.body);
        return json([{ id: '33333333-3333-4333-8333-333333333333',
          version: state.inserted.version, file_sha256: state.inserted.file_sha256,
          created_at: '2026-11-17T10:00:00Z' }], 201);
      }
      return json(existing);
    }
    if (url.includes('/rest/v1/aceite_audit_events')) {
      state.audit = JSON.parse(options.body); return json(null, 201);
    }
    if (url.includes('/storage/v1/object/')) {
      if (options.method === 'POST') {
        state.stored = Buffer.from(options.body);
        return { ok: true, status: 200 };
      }
      const b = tamper ? Buffer.from('not the real file') : (state.stored || Buffer.from('PDF'));
      return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
    }
    if (url.includes('aceite_tokens') || url.includes('aceite_acceptances')) state.tokens++;
    throw new Error('Unexpected mock fetch ' + url);
  };
  return state;
}
test('rejects unauthenticated users', async () => {
  setup();
  const result = await handler(ev('POST', { draftId: orderId }, false));
  assert.equal(result.statusCode, 401);
});
test('vendor cannot create review documents', async () => {
  setup({ role: 'vendedor' });
  const result = await handler(ev());
  assert.equal(result.statusCode, 403);
});
test('rejected if order is no longer draft', async () => {
  const s = setup({ status: 'em_fabricacao' });
  const result = await handler(ev());
  assert.equal(result.statusCode, 409);
  assert.equal(s.stored, null);
});
test('creates immutable draft PDF with hash and no signing tokens', async () => {
  const state = setup();
  const result = await handler(ev());
  assert.equal(result.statusCode, 201, result.body);
  assert.ok(state.stored?.subarray(0, 4).equals(Buffer.from('%PDF')));
  assert.equal(state.inserted.document_type, 'review_draft');
  assert.equal(state.inserted.version, 1);
  assert.equal(state.inserted.order_id, orderId);
  assert.equal(state.inserted.file_sha256.length, 64);
  assert.equal(state.audit.action, 'review_draft_document_generated');
  assert.equal(state.tokens, 0);
  assert.equal(JSON.parse(result.body).signingEnabled, false);
});
test('existing document is reused rather than overwritten', async () => {
  const state = setup({ existing: [{ id: '33333333-3333-4333-8333-333333333333',
    version: 1, file_sha256: 'a'.repeat(64), storage_path: 'reviews/' + orderId + '/v1-11111111-1111-4111-8111-111111111111.pdf',
    created_at: '2026-11-17T10:00:00Z' }] });
  const result = await handler(ev());
  assert.equal(result.statusCode, 200);
  assert.equal(state.stored, null);
  assert.equal(JSON.parse(result.body).created, false);
});

test('private download verifies SHA-256 before returning bytes', async () => {
  const digest = createHash('sha256').update('PDF').digest('hex');
  setup({ existing: [{
    id: '33333333-3333-4333-8333-333333333333', version: 1, file_sha256: digest,
    storage_path: 'reviews/' + orderId + '/v1-11111111-1111-4111-8111-111111111111.pdf',
    created_at: '2026-11-17T10:00:00Z',
  }] });
  const evt = ev('GET');
  evt.queryStringParameters.download = '1';
  const result = await handler(evt);
  assert.equal(result.statusCode, 200);
  assert.equal(result.headers['Content-Type'], 'application/pdf');
  assert.equal(Buffer.from(result.body, 'base64').toString(), 'PDF');
});
test('altered private PDF fails integrity verification', async () => {
  setup({ tamper: true, existing: [{
    id: '33333333-3333-4333-8333-333333333333', version: 1,
    file_sha256: '0'.repeat(64),
    storage_path: 'reviews/' + orderId + '/v1-11111111-1111-4111-8111-111111111111.pdf',
    created_at: '2026-11-17T10:00:00Z',
  }] });
  const evt = ev('GET');
  evt.queryStringParameters.download = '1';
  const result = await handler(evt);
  assert.equal(result.statusCode, 500);
  assert.equal(result.headers['Content-Type'], 'application/json; charset=utf-8');
});

after(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});
