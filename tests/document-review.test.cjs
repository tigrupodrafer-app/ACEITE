'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/document-review.cjs');
const oldFetch = global.fetch;
const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const id = '22222222-2222-4222-8222-222222222222';
const documentId = '33333333-3333-4333-8333-333333333333';
const reviewer = '11111111-1111-4111-8111-111111111111';
const payload = {
  draftId:id,documentId,assessment:'parecer_registrado',
  notes:'Conferência interna para revisão do termo original.',
  checklist:{texto_garantia:true,diagramas_tecnicos:false},
};
const response = (data,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)});
function event(body=payload,auth=true,method='POST') {
  return {httpMethod:method,headers:auth?{authorization:'Bearer mock-token'}:{},
    body:JSON.stringify(body),queryStringParameters:{draftId:id}};
}
function setup({role='admin',docId=documentId,status='rascunho'}={}) {
  process.env.SUPABASE_SERVICE_ROLE_KEY='mock-secret';
  const state={inserts:[],tokens:0,ordersMutated:0};
  global.fetch=async(url,options={})=>{
    const path=String(url);
    if(path.includes('/auth/v1/user'))return response({id:reviewer});
    if(path.includes('/rest/v1/aceite_members'))return response([{active:true,role,user_id:reviewer}]);
    if(path.includes('/rest/v1/aceite_orders')) {
      if(options.method!=='GET' && options.method) state.ordersMutated++;
      return response([{id,origin:'SIC_SUPRASYS',status,details:{draftOnly:true,legalDocumentApproved:false}}]);
    }
    if(path.includes('/rest/v1/aceite_generated_documents'))return response([
      {id:docId,order_id:id,version:1,file_sha256:'a'.repeat(64)},
    ]);
    if(path.includes('/rest/v1/aceite_document_reviews')) {
      if(options.method==='POST') {
        const data=JSON.parse(options.body);state.inserts.push(data);
        return response([{id:'44444444-4444-4444-8444-444444444444',
          assessment:data.assessment,created_at:'2026-11-17T12:00:00Z'}],201);
      }
      return response([]);
    }
    if(path.includes('aceite_tokens')||path.includes('aceite_acceptances'))state.tokens++;
    throw Error('Unexpected URL '+path);
  };
  return state;
}
test('requires authentication',async()=>{
  setup();
  const out=await handler(event(payload,false));
  assert.equal(out.statusCode,401);
});
test('requires admin role',async()=>{
  const state=setup({role:'vendedor'});
  const out=await handler(event());
  assert.equal(out.statusCode,403);
  assert.equal(state.inserts.length,0);
});
test('ties review to latest PDF and records append-only result without enabling signature',async()=>{
  const state=setup();
  const out=await handler(event());
  assert.equal(out.statusCode,201,out.body);
  assert.equal(state.inserts.length,1);
  assert.equal(state.inserts[0].document_id,documentId);
  assert.equal(state.inserts[0].document_sha256,'a'.repeat(64));
  assert.equal(state.inserts[0].document_version,1);
  assert.equal(state.inserts[0].checklist.diagramas_tecnicos,false);
  assert.equal(state.inserts[0].checklist.empresa_emitente,false);
  assert.equal(state.tokens,0);
  assert.equal(state.ordersMutated,0);
  assert.equal(JSON.parse(out.body).publicSigningEnabled,false);
  assert.equal(JSON.parse(out.body).legalApprovalEnabled,false);
});
test('stale PDF document cannot be reviewed',async()=>{
  const state=setup({docId:'55555555-5555-4555-8555-555555555555'});
  const out=await handler(event());
  assert.equal(out.statusCode,409);
  assert.equal(state.inserts.length,0);
});
test('rejects invalid checklist keys',async()=>{
  const state=setup();
  const out=await handler(event({...payload,checklist:{superuser:true}}));
  assert.equal(out.statusCode,422);
  assert.equal(state.inserts.length,0);
});
test('cannot review a production order',async()=>{
  const state=setup({status:'em_fabricacao'});
  const out=await handler(event());
  assert.equal(out.statusCode,409);
  assert.equal(state.inserts.length,0);
});
after(()=>{
  global.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;
});
