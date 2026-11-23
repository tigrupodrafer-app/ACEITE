'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/sic-bridge.cjs');

const TOKEN = 't'.repeat(64);
const ID = '12345678-1234-1234-1234-123456789abc';
const LEASE = 'a'.repeat(64);
const originalFetch = global.fetch;
const originalToken = process.env.SIC_BRIDGE_TOKEN;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function response(data) {
  return { ok: true, text: async () => JSON.stringify(data) };
}
function event(method, body) {
  return { httpMethod: method, headers: { 'x-sic-bridge-token': TOKEN }, body: body === undefined ? '' : JSON.stringify(body) };
}
test.after(() => {
  global.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.SIC_BRIDGE_TOKEN;
  else process.env.SIC_BRIDGE_TOKEN = originalToken;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});
test.beforeEach(() => {
  process.env.SIC_BRIDGE_TOKEN = TOKEN;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-placeholder-not-a-real-secret';
});

test('GET rejects stale candidate when atomic PATCH cannot claim it', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    if (options.method === 'GET') return response([{ id: ID, order_number: 352488, status: 'processing', claim_count: 1 }]);
    if (options.method === 'PATCH') return response([]);
    throw new Error('Unexpected request');
  };
  const result = await handler(event('GET'));
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).requestId, null);
  const patch = calls.find(c => c.method === 'PATCH');
  assert.ok(patch.url.includes('expires_at=gt.'));
  assert.ok(patch.url.includes('claimed_at=lt.'));
});

test('GET pending claim includes expiry guard in atomic PATCH', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    if (options.method === 'GET') return response([{ id: ID, order_number: 352688, status: 'pending', claim_count: 0 }]);
    if (options.method === 'PATCH') return response([{ id: ID, order_number: 352688 }]);
    throw new Error('Unexpected request');
  };
  const result = await handler(event('GET'));
  assert.equal(result.statusCode, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.requestId, ID);
  assert.match(payload.lease, /^[0-9a-f]{64}$/);
  const patch = calls.find(c => c.method === 'PATCH');
  assert.ok(patch.url.includes('expires_at=gt.'));
  assert.ok(!patch.url.includes('claimed_at=lt.'));
});

test('POST final conditional update includes expiry guard', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    if (options.method === 'GET') return response([{ id: ID, order_number: 352488 }]);
    if (options.method === 'PATCH') return response([]);
    throw new Error('Unexpected request');
  };
  const result = await handler(event('POST', { requestId: ID, lease: LEASE, ok: false, errorCode: 'SIC_ERROR' }));
  assert.equal(result.statusCode, 409);
  const patch = calls.find(c => c.method === 'PATCH');
  assert.ok(patch.url.includes('expires_at=gt.'));
  assert.ok(patch.url.includes('lease_hash=eq.'));
});

test('missing bridge token is denied before database access', async () => {
  let called = false;
  global.fetch = async () => { called = true; throw new Error('Unexpected request'); };
  const result = await handler({ httpMethod: 'GET', headers: {} });
  assert.equal(result.statusCode, 403);
  assert.equal(called, false);
});
