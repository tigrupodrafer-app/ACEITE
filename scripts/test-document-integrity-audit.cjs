'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const Module = require('node:module');

const target = require.resolve('../netlify/functions/document-integrity-audit.cjs');
const backend = require.resolve('../netlify/functions/_lib/backend.cjs');
const draftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fileId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const pdf = Buffer.from('%PDF-1.4\n% Teste de integridade\n%%EOF\n');
const digest = createHash('sha256').update(pdf).digest('hex');
const document = {
  id: fileId, version: 1, file_sha256: digest,
  storage_path: 'reviews/' + draftId + '/v1-' + fileId + '.pdf',
};
function load(mock) {
  delete require.cache[target];
  const original = Module._load;
  Module._load = function(request, parent, isMain) {
    if (parent?.filename === target && request === './_lib/backend.cjs') return mock;
    return original.apply(this, arguments);
  };
  try { return require(target).handler; } finally { Module._load = original; }
}
function mockBackend({ docs = [document], admin = true } = {}) {
  return {
    respond: (statusCode, data) => ({ statusCode, body: JSON.stringify(data) }),
    onlyMethod: (event, method) => {
      if (event.httpMethod !== method) throw Object.assign(new Error('Method'), {statusCode:405});
    },
    requireStaff: async () => {
      if (!admin) throw Object.assign(new Error('Authentication required'), {statusCode:401});
      return {member:{role:'admin'}};
    },
    getSecretConfig: () => ({url:'https://example.invalid',key:'test-only'}),
    supabaseFetch: async (path) => path.includes('aceite_orders')
      ? [{id:draftId,origin:'SIC_SUPRASYS',details:{draftOnly:true}}]
      : docs,
    handleError: (error) => ({statusCode:error.statusCode||500,body:JSON.stringify({error:error.message})}),
  };
}
const event = {httpMethod:'GET',queryStringParameters:{draftId}};
test('hash confere com bytes do PDF armazenado', async () => {
  const oldFetch = global.fetch;
  global.fetch = async () => new Response(pdf, {status:200});
  try {
    const response = await load(mockBackend())(event);
    assert.equal(response.statusCode,200);
    assert.equal(JSON.parse(response.body).allIntegrityChecksPassed,true);
    assert.equal(JSON.parse(response.body).documents[0].status,'integro');
    assert.equal(JSON.parse(response.body).publicSigningEnabled,false);
  } finally {global.fetch = oldFetch;}
});
test('hash divergente bloqueia homologacao de integridade', async () => {
  const oldFetch = global.fetch;
  global.fetch = async () => new Response(Buffer.from('%PDF-1.4\nALTERADO'), {status:200});
  try {
    const response = await load(mockBackend())(event);
    assert.equal(JSON.parse(response.body).allIntegrityChecksPassed,false);
    assert.equal(JSON.parse(response.body).documents[0].status,'divergente');
  } finally {global.fetch = oldFetch;}
});
test('sem sessao administrativa retorna 401', async () => {
  const response = await load(mockBackend({admin:false}))(event);
  assert.equal(response.statusCode,401);
});
test('nao aceita metodo de escrita', async () => {
  const response = await load(mockBackend())({...event,httpMethod:'POST'});
  assert.equal(response.statusCode,405);
});
test('nao consulta storage com caminho invalido', async () => {
  const oldFetch = global.fetch;
  global.fetch = async () => {throw new Error('Storage nao deveria ser chamado');};
  try {
    const response = await load(mockBackend({docs:[{...document,storage_path:'../../segredo'}]}))(event);
    assert.equal(JSON.parse(response.body).documents[0].status,'metadados_invalidos');
  } finally {global.fetch = oldFetch;}
});
