'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/approval-queue.cjs');
const saved=global.fetch;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId='11111111-1111-4111-8111-111111111111';
const draftId='22222222-2222-4222-8222-222222222222';
const documentId='33333333-3333-4333-8333-333333333333';
const resp=(data,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)});
const ev=(auth=true)=>({httpMethod:'GET',headers:auth?{authorization:'Bearer test'}:{}});
function mock({role='aprovador',grants=[{sic_company_id:1,scope:'comercial'}]}={}){
  process.env.SUPABASE_SERVICE_ROLE_KEY='mock-service-key';
  const urls=[];
  global.fetch=async(url)=>{
    url=String(url);urls.push(url);
    if(url.includes('/auth/v1/user'))return resp({id:userId});
    if(url.includes('/rest/v1/aceite_members'))return resp([{user_id:userId,active:true,role}]);
    if(url.includes('/rest/v1/aceite_approval_authorizers'))return resp(grants);
    if(url.includes('/rest/v1/aceite_orders'))return resp([
      {id:draftId,sic_company_id:1,sic_order_number:352488,client_name:'Cliente de Teste',status:'rascunho'},
    ]);
    if(url.includes('/rest/v1/aceite_generated_documents'))return resp([
      {id:documentId,order_id:draftId,version:5,file_sha256:'a'.repeat(64),created_at:'2026-11-17T15:00:00Z'},
    ]);
    throw Error('Unexpected URL '+url);
  };
  return urls;
}
test('only appointed approver sees the assigned company',async()=>{
  const urls=mock();
  const out=await handler(ev());
  assert.equal(out.statusCode,200,out.body);
  const data=JSON.parse(out.body);
  assert.equal(data.orders.length,1);
  assert.equal(data.orders[0].number,'352488');
  assert.equal(data.orders[0].document.version,5);
  assert.deepEqual(data.orders[0].scope,['comercial']);
  assert.equal(data.signingEnabled,false);
  assert.ok(urls.some(u=>u.includes('sic_company_id=eq.1')));
  assert.ok(!urls.some(u=>u.includes('sic_company_id=eq.2')));
});
test('unappointed approvers receive empty queue without reading orders',async()=>{
  const urls=mock({grants:[]});
  const out=await handler(ev());
  assert.equal(out.statusCode,200);
  assert.deepEqual(JSON.parse(out.body).orders,[]);
  assert.equal(urls.some(u=>u.includes('/rest/v1/aceite_orders')),false);
});
test('admins are not given approver queue by default',async()=>{
  const urls=mock({role:'admin'});
  const out=await handler(ev());
  assert.equal(out.statusCode,403);
  assert.equal(urls.some(u=>u.includes('/rest/v1/aceite_orders')),false);
});
test('unauthenticated users cannot list queue',async()=>{
  mock();
  assert.equal((await handler(ev(false))).statusCode,401);
});
after(()=>{global.fetch=saved;if(key===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=key;});
