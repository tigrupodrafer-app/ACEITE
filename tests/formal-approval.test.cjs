'use strict';
const { test, after }=require('node:test');
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/formal-approval.cjs');
const originalFetch=global.fetch;
const oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const orderId='22222222-2222-4222-8222-222222222222';
const docId='33333333-3333-4333-8333-333333333333';
const userId='11111111-1111-4111-8111-111111111111';
const hash='a'.repeat(64);
const data={draftId:orderId,documentId:docId,documentSha256:hash,
  scope:'juridico',decision:'aprovado',justification:'Analise formal da minuta com ressalvas de validade e garantia.',
  declarationAccepted:true};
const response=(payload,status=200)=>({ok:status>=200&&status<300,status,
  text:async()=>JSON.stringify(payload)});
const ev=(payload=data,auth=true,method='POST')=>({
  httpMethod:method,headers:auth?{authorization:'Bearer mock-token'}:{},
  body:JSON.stringify(payload),queryStringParameters:{draftId:orderId},
});
function setup({assigned=[],role='admin',status='rascunho',decisions=[],documentId=docId}={}){
  process.env.SUPABASE_SERVICE_ROLE_KEY='mock-service-key';
  const calls={approved:[],ordersChanged:0,tokens:0};
  global.fetch=async(url,options={})=>{
    url=String(url);
    if(url.includes('/auth/v1/user'))return response({id:userId});
    if(url.includes('/rest/v1/aceite_members'))return response([{role,active:true,user_id:userId}]);
    if(url.includes('/rest/v1/aceite_orders')){
      if(options.method&&options.method!=='GET')calls.ordersChanged++;
      return response([{id:orderId,origin:'SIC_SUPRASYS',status,sic_company_id:1,
        details:{draftOnly:true,legalDocumentApproved:false}}]);
    }
    if(url.includes('/rest/v1/aceite_generated_documents'))
      return response([{id:documentId,order_id:orderId,version:2,file_sha256:hash}]);
    if(url.includes('/rest/v1/aceite_approval_authorizers'))
      return response(assigned.map(scope=>({scope})));
    if(url.includes('/rest/v1/aceite_formal_approvals')){
      if(options.method==='POST'){
        const inserted=JSON.parse(options.body);
        calls.approved.push(inserted);
        return response([{id:'44444444-4444-4444-8444-444444444444',
          scope:inserted.scope,decision:inserted.decision,created_at:'2026-11-17T12:00:00Z'}],201);
      }
      return response(decisions);
    }
    if(url.includes('aceite_tokens')||url.includes('aceite_acceptances'))calls.tokens++;
    throw Error('unexpected '+url);
  };
  return calls;
}
test('requires staff authentication',async()=>{
  setup({assigned:['juridico']});
  assert.equal((await handler(ev(data,false))).statusCode,401);
});
test('denies non-admin and unappointed admins',async()=>{
  let state=setup({assigned:['juridico'],role:'vendedor'});
  assert.equal((await handler(ev())).statusCode,403);
  assert.equal(state.approved.length,0);
  state=setup();
  assert.equal((await handler(ev())).statusCode,403);
  assert.equal(state.approved.length,0);
});
test('appointed legal approver saves a decision bound to company, version and hash',async()=>{
  const state=setup({assigned:['juridico']});
  const result=await handler(ev());
  assert.equal(result.statusCode,201,result.body);
  assert.equal(state.approved[0].sic_company_id,1);
  assert.equal(state.approved[0].document_version,2);
  assert.equal(state.approved[0].document_sha256,hash);
  assert.equal(state.approved[0].scope,'juridico');
  assert.equal(state.approved[0].approver_id,userId);
  assert.equal(state.ordersChanged,0);
  assert.equal(state.tokens,0);
  assert.equal(JSON.parse(result.body).signingEnabled,false);
});
test('stale hash, wrong scope, or missing explicit declaration rejects',async()=>{
  let state=setup({assigned:['juridico']});
  assert.equal((await handler(ev({...data,documentSha256:'b'.repeat(64)}))).statusCode,409);
  state=setup({assigned:['juridico']});
  assert.equal((await handler(ev({...data,scope:'comercial'}))).statusCode,403);
  state=setup({assigned:['juridico']});
  assert.equal((await handler(ev({...data,declarationAccepted:false}))).statusCode,422);
  assert.equal(state.approved.length,0);
});
test('duplicate decisions are rejected without mutation',async()=>{
  const state=setup({assigned:['juridico'],decisions:[{document_id:docId,scope:'juridico',decision:'aprovado'}]});
  assert.equal((await handler(ev())).statusCode,409);
  assert.equal(state.approved.length,0);
});
test('GET shows pending stages and never enables public signing',async()=>{
  setup();
  const result=await handler(ev(data,true,'GET'));
  assert.equal(result.statusCode,200,result.body);
  const json=JSON.parse(result.body);
  assert.equal(json.status.legalDecision,'pendente');
  assert.equal(json.status.commercialDecision,'pendente');
  assert.equal(json.status.signingEnabled,false);
  assert.deepEqual(json.scopes,[]);
});
after(()=>{
  global.fetch=originalFetch;
  if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;
});
