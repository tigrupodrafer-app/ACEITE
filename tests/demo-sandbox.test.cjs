'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {handler:admin}=require('../netlify/functions/demo-flow.cjs');
const {handler:publicHandler}=require('../netlify/functions/demo-public.cjs');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const oldFetch=global.fetch;
const oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const uid='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const token='a'.repeat(64);
const hash=createHash('sha256').update(token).digest('hex');
const DOC=[
 'ACEITE DRAFER - SIMULACAO SEM VALIDADE JURIDICA',
 'Pedido FICTICIO: DEMO-001 | Empresa: DEMONSTRACAO',
 'Produto ficticio: Telha metalica demonstrativa - 10 pecas',
 'Valor ilustrativo: R$ 1.000,00',
 'Ao selecionar confirmar, registro apenas evento de teste no Supabase.',
 'Nao ha contrato, assinatura juridica, producao ou alteracao do SIC.',
].join('\n');
const docHash=createHash('sha256').update(DOC).digest('hex');
const response=(data,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)});
function mock({role='admin',state='aguardando_aceite',expired=false}={}){
 process.env.SUPABASE_SERVICE_ROLE_KEY='mock-key';
 const tracker={writes:[],read:[],status:state};
 global.fetch=async(url,options={})=>{
  const u=String(url);tracker.read.push(u);
  if(u.includes('/auth/v1/user'))return response({id:uid});
  if(u.includes('/rest/v1/aceite_members'))return response([{active:true,role,user_id:uid}]);
  if(u.includes('/rest/v1/aceite_demo_flows')){
   if(options.method==='POST'){
    const b=JSON.parse(options.body);
    tracker.writes.push({target:'demo',body:b});
    return response([{id,status:'aguardando_aceite',expires_at:new Date(Date.now()+1800000).toISOString(),document_sha256:b.document_sha256}]);
   }
   if(u.includes('created_at=gte.'))return response([]);
   return response([{id,created_by:uid,status:tracker.status,document_sha256:docHash,
    expires_at:new Date(Date.now()+(expired?-1000:1800000)).toISOString(),
    accepted_at:tracker.status==='aguardando_aceite'?null:new Date().toISOString(),
    release_at:tracker.status==='fabricacao_simulada'?new Date().toISOString():null}]);
  }
  if(u.includes('/rpc/aceite_demo_accept_atomic')){
   const b=JSON.parse(options.body);tracker.writes.push({target:'acceptRPC',body:b});
   if(tracker.status!=='aguardando_aceite')return response(null);
   tracker.status='aceite_simulado';
   return response({eventId:id,status:tracker.status,acceptedAt:new Date().toISOString(),demoOnly:true,productionAuthorized:false});
  }
  if(u.includes('/rpc/aceite_demo_release_atomic')){
   tracker.writes.push({target:'releaseRPC'});
   if(tracker.status!=='aceite_simulado')return response(null);
   tracker.status='fabricacao_simulada';
   return response({flowId:id,status:tracker.status,releaseAt:new Date().toISOString(),demoOnly:true,productionAuthorized:false});
  }
  if(u.includes('/rest/v1/aceite_orders')||u.includes('/rest/v1/aceite_tokens')||
     u.includes('/rest/v1/aceite_acceptances'))throw Error('Production system accessed: '+u);
  throw Error('unexpected '+u);
 };
 return tracker;
}
const adminEvent=(action,role='POST',data={})=>({
 httpMethod:role,headers:{authorization:'Bearer demo-admin'},
 body:JSON.stringify({action,...data}),queryStringParameters:{flowId:id}
});
const publicEvent=(type='GET',payload={})=>({
 httpMethod:type,
 queryStringParameters:{token},body:JSON.stringify({token,...payload})
});
test('admin can generate isolated high-entropy link and no production rows',async()=>{
 const tracker=mock();
 const res=await admin(adminEvent('create'));
 assert.equal(res.statusCode,201,res.body);
 const out=JSON.parse(res.body);
 assert.match(out.token,/^[a-f0-9]{64}$/);
 assert.equal(out.flow.status,'aguardando_aceite');
 assert.equal(tracker.writes.length,1);
 assert.equal(tracker.writes[0].target,'demo');
 assert.equal(tracker.writes[0].body.status,'aguardando_aceite');
 assert.equal(out.productionAuthorized,false);
});
test('non-admin cannot generate a link',async()=>{
 const tracker=mock({role:'aprovador'});
 const res=await admin(adminEvent('create'));
 assert.equal(res.statusCode,403);
 assert.equal(tracker.writes.length,0);
});
test('public test link reveals only synthetic order data',async()=>{
 const tracker=mock();
 const res=await publicHandler(publicEvent());
 assert.equal(res.statusCode,200,res.body);
 const data=JSON.parse(res.body);
 assert.equal(data.order.number,'DEMO-001');
 assert.equal(data.order.clientName,'CLIENTE FICTÍCIO');
 assert.equal(data.document.sha256,docHash);
 assert.equal(data.productionAuthorized,false);
 assert.equal(tracker.writes.length,0);
});
test('unknown or expired token never exposes demo order',async()=>{
 mock({expired:true});
 assert.equal((await publicHandler(publicEvent())).statusCode,404);
 const wrong=publicEvent('GET');wrong.queryStringParameters.token='bad-token';
 assert.equal((await publicHandler(wrong)).statusCode,404);
});
test('only explicit consent and matching document hash reach atomic acceptance',async()=>{
 const tracker=mock();
 let res=await publicHandler(publicEvent('POST',{signerName:'Cliente Fictício',consent:false,documentSha256:docHash}));
 assert.equal(res.statusCode,422);
 res=await publicHandler(publicEvent('POST',{signerName:'Cliente Fictício',consent:true,documentSha256:'b'.repeat(64)}));
 assert.equal(res.statusCode,422);
 assert.equal(tracker.writes.length,0);
 res=await publicHandler(publicEvent('POST',{signerName:'Cliente Fictício',consent:true,documentSha256:docHash}));
 assert.equal(res.statusCode,200,res.body);
 assert.equal(tracker.writes.length,1);
 assert.equal(tracker.writes[0].target,'acceptRPC');
 assert.equal(tracker.writes[0].body.p_token_hash,hash);
 assert.equal(JSON.parse(res.body).legalValidity,false);
 res=await publicHandler(publicEvent('POST',{signerName:'Cliente Fictício',consent:true,documentSha256:docHash}));
 assert.equal(res.statusCode,409);
});
test('demo manufacturing release requires test acceptance and cannot repeat',async()=>{
 const tracker=mock();
 const event=adminEvent('release','POST',{flowId:id});
 assert.equal((await admin(event)).statusCode,409);
 assert.equal(tracker.status,'aguardando_aceite');
 tracker.status='aceite_simulado';
 let res=await admin(event);
 assert.equal(res.statusCode,200,res.body);
 assert.equal(tracker.status,'fabricacao_simulada');
 assert.equal(JSON.parse(res.body).productionAuthorized,false);
 res=await admin(event);
 assert.equal(res.statusCode,409);
});
test('frontends are clearly marked as demonstration, not production',()=>{
 for(const file of ['src/pages/DemoSign.jsx','src/pages/DemoLab.jsx']){
  const content=readFileSync(join(__dirname,'..',file),'utf8');
  assert.match(content,/SEM VALIDADE JURÍDICA|HOMOLOGAÇÃO COM DADOS FICTÍCIOS/);
  assert.doesNotMatch(content,/aceite_tokens|aceite_acceptances|sic-request/);
 }
});
after(()=>{
 global.fetch=oldFetch;
 if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;
});
