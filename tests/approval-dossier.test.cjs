'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/approval-dossier.cjs');
const orig=global.fetch;
const old=process.env.SUPABASE_SERVICE_ROLE_KEY;
const o='22222222-2222-4222-8222-222222222222';
const d='33333333-3333-4333-8333-333333333333';
const a='44444444-4444-4444-8444-444444444444';
const b='55555555-5555-4555-8555-555555555555';
const legal='66666666-6666-4666-8666-666666666666';
const commercial='77777777-7777-4777-8777-777777777777';
const hash='a'.repeat(64);
const event=(method='POST',auth=true)=>({
 httpMethod:method,headers:auth?{authorization:'Bearer test'}:{},
 body:JSON.stringify({draftId:o}),queryStringParameters:{draftId:o}
});
const response=(v,status=200)=>({ok:status>=200&&status<300,status,
 text:async()=>JSON.stringify(v)});
function setup({role='admin',two=false,same=false,assigned=true,existing=null}={}){
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-key';
 const state={upload:null,insert:null,tokens:0,ordersMutated:0,downloads:0};
 global.fetch=async(url,opt={})=>{
  const u=String(url);
  if(u.includes('/auth/v1/user'))return response({id:a});
  if(u.includes('/rest/v1/aceite_members'))return response([{active:true,role,user_id:a}]);
  if(u.includes('/rest/v1/aceite_orders')){
   if(opt.method&&opt.method!=='GET')state.ordersMutated++;
   return response([{id:o,sic_order_number:352488,sic_company_id:1,origin:'SIC_SUPRASYS',
     status:'rascunho',client_name:'Cliente Exemplo',
     details:{draftOnly:true,legalDocumentApproved:false}}]);
  }
  if(u.includes('/rest/v1/aceite_generated_documents'))return response([
    {id:d,version:5,file_sha256:hash}
  ]);
  if(u.includes('/rest/v1/aceite_formal_approvals'))return response(two?[
    {id:legal,order_id:o,document_id:d,document_version:5,document_sha256:hash,
     sic_company_id:1,scope:'juridico',decision:'aprovado',approver_id:a,
     created_at:'2026-11-17T15:00:00Z',justification:'Parecer favoravel juridico.'},
    {id:commercial,order_id:o,document_id:d,document_version:5,document_sha256:hash,
     sic_company_id:1,scope:'comercial',decision:'aprovado',approver_id:same?a:b,
     created_at:'2026-11-17T15:05:00Z',justification:'Parecer favoravel comercial.'},
  ]:[]);
  if(u.includes('/rest/v1/aceite_approval_authorizers'))return response(assigned?[{user_id:a}]:[]);
  if(u.includes('/rest/v1/aceite_approval_dossiers')){
   if(opt.method==='POST'){
    state.insert=JSON.parse(opt.body);
    return response([{id:'88888888-8888-4888-8888-888888888888',generated_at:'2026-11-17T15:10:00Z'}],201);
   }
   return response(existing?[existing]:[]);
  }
  if(u.includes('/rest/v1/aceite_audit_events'))return response(null,201);
  if(u.includes('/storage/v1/object/aceite-privado/')){
   if(opt.method==='POST'){state.upload=Buffer.from(opt.body);return {ok:true,status:200};}
   state.downloads++;const bytes=state.upload||Buffer.from('PDF');
   return {ok:true,status:200,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)};
  }
  if(u.includes('aceite_tokens')||u.includes('aceite_acceptances'))state.tokens++;
  throw Error('Unexpected url '+u);
 };
 return state;
}
test('unauthenticated cannot prepare dossier',async()=>{
 setup({two:true});assert.equal((await handler(event('POST',false))).statusCode,401);
});
test('only administrators prepare dossier',async()=>{
 const s=setup({role:'aprovador',two:true});
 assert.equal((await handler(event())).statusCode,403);
 assert.equal(s.upload,null);
});
test('dossier blocked until two formal approvals',async()=>{
 const s=setup();
 const res=await handler(event());
 assert.equal(res.statusCode,409,res.body);
 assert.equal(s.upload,null);
 assert.equal(s.insert,null);
});
test('single person cannot satisfy both scopes',async()=>{
 const s=setup({two:true,same:true});
 assert.equal((await handler(event())).statusCode,409);
 assert.equal(s.insert,null);
});
test('revoked designation blocks issuance',async()=>{
 const s=setup({two:true,assigned:false});
 assert.equal((await handler(event())).statusCode,409);
 assert.equal(s.insert,null);
});
test('two approvals generate only INTERNAL PDF with two approval IDs',async()=>{
 const s=setup({two:true});
 const res=await handler(event());
 assert.equal(res.statusCode,201,res.body);
 assert.ok(s.upload.subarray(0,4).equals(Buffer.from('%PDF')));
 assert.equal(s.insert.document_id,d);
 assert.equal(s.insert.document_sha256,hash);
 assert.equal(s.insert.legal_approval_id,legal);
 assert.equal(s.insert.commercial_approval_id,commercial);
 assert.equal(s.insert.dossier_sha256.length,64);
 assert.equal(s.tokens,0);
 assert.equal(s.ordersMutated,0);
 assert.equal(JSON.parse(res.body).signingEnabled,false);
 assert.equal(JSON.parse(res.body).finalDocumentIssued,false);
});
test('already archived dossier is returned unchanged',async()=>{
 const s=setup({existing:{id:'88888888-8888-4888-8888-888888888888',
  document_version:5,dossier_sha256:'0'.repeat(64),document_sha256:hash,
  storage_path:'dossiers/'+o+'/'+a+'.pdf',generated_at:'2026-11-17T15:10:00Z'}});
 const out=await handler(event());
 assert.equal(out.statusCode,200);
 assert.equal(s.insert,null);
 assert.equal(s.upload,null);
});
after(()=>{global.fetch=orig;
 if(old===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 else process.env.SUPABASE_SERVICE_ROLE_KEY=old;
});
