'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {handler}=require('../netlify/functions/vendor-acceptance-status.cjs');
const {handler:term}=require('../netlify/functions/vendor-legal-preview.cjs');
const originalFetch=global.fetch;
const originalKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const id='11111111-1111-4111-8111-111111111111';
const response=data=>({ok:true,status:200,text:async()=>JSON.stringify(data)});
const ev=(endpoint='status',auth=true,role='vendedor')=>({
 httpMethod:'GET',headers:auth?{authorization:'Bearer test'}:{},
 queryStringParameters:{number:'352488'},
});
function mock({role='vendedor',orders=true,acceptances=[],tokens=[]}={}){
 process.env.SUPABASE_SERVICE_ROLE_KEY='mock-key';
 const reads=[];
 global.fetch=async(url,opts={})=>{
  const u=String(url);reads.push(u);
  if(opts.method&&opts.method!=='GET')throw Error('Unexpected write');
  if(u.includes('/auth/v1/user'))return response({id});
  if(u.includes('/rest/v1/aceite_members'))return response([{user_id:id,role,active:true}]);
  if(u.includes('/rest/v1/aceite_orders'))return response(orders?[{
    id,order_number:'352488',sic_company_id:1,status:'rascunho',details:{draftOnly:true},
  }]:[]);
  if(u.includes('/rest/v1/aceite_acceptances'))return response(acceptances);
  if(u.includes('/rest/v1/aceite_tokens'))return response(tokens);
  throw Error('Unexpected '+u);
 };
 return reads;
}
test('consultar aceite requer login',async()=>{
 mock();assert.equal((await handler(ev('status',false))).statusCode,401);
});
test('vendedor consulta status sem obter token nem informacoes completas de assinatura',async()=>{
 const reads=mock({acceptances:[{
  id,level:1,signer_name:'Cliente Exemplo',accepted_at:'2026-11-17T16:00:00Z',
  signature_sha256:'a'.repeat(64),legal_text_sha256:'b'.repeat(64),
 }]});
 const out=await handler(ev());
 assert.equal(out.statusCode,200,out.body);
 const data=JSON.parse(out.body);
 assert.equal(data.state,'assinado');
 assert.equal(data.acceptances[0].signerName,'Cliente Exemplo');
 assert.equal(data.signingEnabled,false);
 assert.equal(JSON.stringify(data).includes('token_hash'),false);
 assert.equal(reads.some(u=>u.includes('/rest/v1/aceite_tokens')),true);
});
test('vendedor nao registrado nao acessa termo',async()=>{
 mock({role:'aprovador'});
 assert.equal((await term(ev())).statusCode,403);
});
test('vendedor ve texto original com alerta de homologacao',async()=>{
 mock();
 const r=await term(ev());
 assert.equal(r.statusCode,200,r.body);
 const body=JSON.parse(r.body);
 assert.equal(body.sections.length,11);
 assert.equal(body.finalDocumentApproved,false);
});
test('interface do vendedor tem espelho, termo e acao de verificar',()=>{
 const c=fs.readFileSync(path.join(__dirname,'../src/components/VendorWorkflow.jsx'),'utf8');
 assert.match(c,/Espelho de impressão do pedido SIC/);
 assert.match(c,/Termo de aceite integral/);
 assert.match(c,/Verificar aceite/);
 assert.match(c,/Qtde. KG/);
 assert.match(c,/Qtde. PC/);
 assert.match(c,/WhatsApp/);
 assert.match(c,/código de impressão/);
 assert.doesNotMatch(c,/FormalApproval|ApprovalDossier|aceite_demo_flows/);
});
after(()=>{
 global.fetch=originalFetch;
 if(originalKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 else process.env.SUPABASE_SERVICE_ROLE_KEY=originalKey;
});
