'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const health = require('../netlify/functions/health.cjs');
const sicRequest = require('../netlify/functions/sic-request.cjs');
const sicBridge = require('../netlify/functions/sic-bridge.cjs');

function parse(result) { return JSON.parse(result.body); }

test('health does not disclose credentials and responds without backend key', async () => {
  const result = await health.handler({ httpMethod: 'GET' });
  assert.equal(result.statusCode, 200);
  assert.equal(parse(result).system, 'DRAFER ACEITE');
  assert.equal(JSON.stringify(parse(result)).includes('service_role'), false);
});

test('SIC lookup rejects unauthenticated requests before querying storage', async () => {
  const result = await sicRequest.handler({
    httpMethod: 'POST', headers: {}, body: JSON.stringify({ orderNumber: 344137 }),
  });
  assert.equal(result.statusCode, 401);
});

test('SIC lookup status rejects anonymous reads', async () => {
  const result = await sicRequest.handler({
    httpMethod: 'GET', headers: {}, queryStringParameters: { id: '00000000-0000-0000-0000-000000000000' },
  });
  assert.equal(result.statusCode, 401);
});

test('SIC worker interface rejects requests without configured machine secret', async () => {
  const previous = process.env.SIC_BRIDGE_TOKEN;
  delete process.env.SIC_BRIDGE_TOKEN;
  try {
    const result = await sicBridge.handler({ httpMethod: 'GET', headers: {} });
    assert.equal(result.statusCode, 503);
  } finally {
    if (previous === undefined) delete process.env.SIC_BRIDGE_TOKEN;
    else process.env.SIC_BRIDGE_TOKEN = previous;
  }
});
