'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/acceptance-presentation.cjs');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const oldFetch=global.fetch;
const oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const id='22222222-2222-4222-8222-222222222222';
const doc='33333333-3333-4333-8333-333333333333';
const response=v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
const event=(auth=true,method='GET')=>({
 httpMethod:method,headers:auth?{authorization:'Bearer session-test'}:{},
 queryStringParameters:{draftId:id},
});
function mock({role='admin',valid=true}={}){
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
 const state={reads:[],writes:0,storage:0};
 global.fetch=async(url,options={})=>{
  const u=String(url);state.reads.push(u);
  if(options.method && options.method!=='GET')state.writes++;
  if(u.includes('/storage/'))state.storage++;
  if(u.includes('/auth/v1/user'))return response({id:'11111111-1111-4111-8111-111111111111'});
  if(u.includes('/rest/v1/aceite_members'))return response([{role,active:true}]);
  if(u.includes('/rest/v1/aceite_orders'))return response([{
   id,order_number:'352488',sic_order_number:352488,sic_company_id:1,
   origin:'SIC_SUPRASYS',status:'rascunho',client_name:'Cliente Teste',
   details:{draftOnly:true,legalDocumentApproved:false},
   order_snapshot:{
    pedidoCompleto:{numero:352488,empresa:1,cliente:{codigo:55},
     valores:{total:240.05,subtotal:240.05,desconto:0}},
    itens:[{descricao:'Corte Galvanizado',codigoProdutoComercial:2506,
      codigoProdutoInterno:1379,referenciaFornecedor:2506,quantidade:16.555,
      quantidadePecas:5.5,pesoLiquidoKg:16.555,valorTotal:240.05}],
    validacao:{valido:valid},
   },
  }]);
  if(u.includes('/rest/v1/aceite_generated_documents'))return response([
   {id:doc,version:6,file_sha256:'a'.repeat(64)}]);
  if(u.includes('/rest/v1/aceite_formal_approvals'))return response([]);
  throw Error('Unexpected URL '+u);
 };
 return state;
}
test('read-only presentation requires a Supabase session',async()=>{
 mock();assert.equal((await handler(event(false))).statusCode,401);
});
test('only admin may access client-preview data',async()=>{
 const state=mock({role:'aprovador'});
 const res=await handler(event());
 assert.equal(res.statusCode,403);
 assert.equal(state.reads.some(x=>x.includes('/rest/v1/aceite_orders')),false);
});
test('rejects incomplete/invalid SIC validation',async()=>{
 const state=mock({valid:false});
 assert.equal((await handler(event())).statusCode,422);
 assert.equal(state.writes,0);
});
test('renders complete 11-section term and SIC product without making mutations',async()=>{
 const state=mock();
 const res=await handler(event());
 assert.equal(res.statusCode,200,res.body);
 const data=JSON.parse(res.body);
 assert.equal(data.mode,'DEMONSTRACAO');
 assert.equal(data.order.number,'352488');
 assert.equal(data.order.items[0].commercialCode,2506);
 assert.equal(data.order.items[0].internalCode,1379);
 assert.equal(data.term.sections.length,11);
 assert.equal(data.term.diagrams.length,3);
 assert.equal(data.decisions.juridico,'pendente');
 assert.equal(data.publicSigningEnabled,false);
 assert.equal(data.productionAuthorized,false);
 assert.equal(state.writes,0);
 assert.equal(state.storage,0);
});
test('presentation UI has no signing API or token issuance',()=>{
 const source=readFileSync(join(__dirname,'../src/pages/AcceptancePresentation.jsx'),'utf8');
 assert.match(source,/DEMONSTRAÇÃO — SEM VALIDADE JURÍDICA/);
 assert.match(source,/Simular aceite — sem registro jurídico/);
 assert.match(source,/Gerar PDF demonstrativo/);
 assert.doesNotMatch(source,/apiPost|signOrder|signing-token|aceite_tokens|localStorage\.setItem/);
});
after(()=>{
 global.fetch=oldFetch;
 if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;
});
