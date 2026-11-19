'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const backend=path.resolve(__dirname,'../netlify/functions/_lib/backend.cjs');
const id='11111111-1111-4111-8111-111111111111';
function handler(name,db){
 const file=path.resolve(__dirname,'../netlify/functions/'+name+'.cjs');
 const original=require.cache[backend];
 require.cache[backend]={id:backend,filename:backend,loaded:true,exports:{
  respond:(statusCode,data)=>({statusCode,body:JSON.stringify(data)}),
  requireStaff:async()=>({authUser:{id},member:{role:'admin'}}),
  supabaseFetch:db,sha256:()=> 'f'.repeat(64),
  onlyMethod:(e,m)=>{if(e.httpMethod!==m)throw Object.assign(new Error('Method not allowed'),{statusCode:405})},
  handleError:e=>({statusCode:e.statusCode||500,body:JSON.stringify({error:e.message})})
 }};
 delete require.cache[file];
 try{return require(file).handler}finally{
  delete require.cache[file];
  if(original)require.cache[backend]=original;else delete require.cache[backend];
 }
}
const post=body=>({httpMethod:'POST',body:JSON.stringify(body),headers:{authorization:'Bearer mock'}});
test('ativacao rejeita espelho incompleto sem mutar banco',async()=>{
 let writes=0;
 const h=handler('activate-acceptance',async(url,opts)=>{
  if(opts?.method&&opts.method!=='GET')writes++;
  if(url.includes('aceite_orders'))return [{id,status:'rascunho',origin:'SIC_SUPRASYS',details:{draftOnly:true},sic_order_number:352488,sic_company_id:1,order_snapshot:{pedidoCompleto:{numero:352488,empresa:1,liberado:'S',cliente:{nome:'Teste'},valores:{total:100}},itens:[],validacao:{valido:true,somaItens:100}}}];
  throw Error('Unexpected '+url);
 });
 const r=await h(post({orderId:id,confirmed:true}));
 assert.equal(r.statusCode,409);assert.equal(writes,0);
});
test('ativacao usa RPC atomica e nao PATCH direto',async()=>{
 const urls=[];
 const order={id,status:'rascunho',origin:'SIC_SUPRASYS',details:{draftOnly:true},sic_order_number:352488,sic_company_id:1,order_snapshot:{pedidoCompleto:{numero:352488,empresa:1,liberado:'S',cliente:{nome:'Cliente Teste'},nomeEmpresa:'Drafer',tipoVenda:'Venda',localEntrega:'Endereco',valores:{total:100}},itens:[{descricao:'Produto',valorTotal:100}],validacao:{valido:true,somaItens:100}}};
 const h=handler('activate-acceptance',async(url,opts)=>{
  urls.push(url);
  if(url.includes('aceite_orders'))return [order];
  if(url.includes('aceite_legal_versions'))return [{id}];
  if(url.includes('rpc/aceite_ativar_pedido_atomico'))return {activated:true};
  throw Error('Unexpected '+url);
 });
 const r=await h(post({orderId:id,confirmed:true}));
 assert.equal(r.statusCode,200,r.body);
 assert.equal(urls.filter(x=>x.includes('/rpc/')).length,1);
 assert.equal(urls.some(x=>x.includes('aceite_audit_events')),false);
});
test('link nao e emitido sem homologacao juridica',async()=>{
 let writes=0;
 const order={id,origin:'SIC_SUPRASYS',status:'aguardando_aceite_pedido',
  details:{draftOnly:false,legalDocumentApproved:true,eligibilityApproved:true,mirrorComplete:true},
  sic_order_number:352488,sic_company_id:1,order_snapshot:{pedidoCompleto:{numero:352488,empresa:1,liberado:'S'},itens:[{descricao:'Produto'}],validacao:{valido:true}}};
 const h=handler('issue-acceptance-link',async(url,opts)=>{
  if(opts?.method==='POST')writes++;
  if(url.includes('aceite_orders'))return [order];
  if(url.includes('aceite_legal_versions'))return [];
  throw Error('Unexpected '+url);
 });
 const r=await h(post({orderId:id}));
 assert.equal(r.statusCode,409);assert.equal(writes,0);
});
test('link homologado usa RPC de emissao atomica',async()=>{
 const calls=[];
 const order={id,origin:'SIC_SUPRASYS',status:'aguardando_aceite_pedido',
  details:{draftOnly:false,legalDocumentApproved:true,eligibilityApproved:true,mirrorComplete:true},
  sic_order_number:352488,sic_company_id:1,order_snapshot:{pedidoCompleto:{numero:352488,empresa:1,liberado:'S'},itens:[{descricao:'Produto'}],validacao:{valido:true}}};
 const h=handler('issue-acceptance-link',async(url,opts)=>{
  calls.push(url);
  if(url.includes('aceite_orders'))return [order];
  if(url.includes('aceite_legal_versions'))return [{id}];
  if(url.includes('rpc/aceite_emitir_token_atomico'))return {issued:true};
  throw Error('Unexpected '+url);
 });
 const r=await h(post({orderId:id}));
 assert.equal(r.statusCode,201,r.body);
 assert.match(JSON.parse(r.body).relativeUrl,/^\/AssinarAceite\?token=[a-f0-9]{64}$/);
 assert.equal(calls.filter(x=>x.includes('/rpc/')).length,1);
});
test('encaminhamento sem documento assinado e bloqueado',async()=>{
 const h=handler('production-handoff',async(url)=>{
  if(url.includes('aceite_orders'))return [{id,origin:'SIC_SUPRASYS',status:'aguardando_aceite_pedido'}];
  return [];
 });
 const r=await h(post({orderId:id,confirmed:true}));
 assert.equal(r.statusCode,409);
});
test('encaminhamento exige confirmacao expressa',async()=>{
 const h=handler('production-handoff',async()=>{throw Error('DB should not be called')});
 const r=await h(post({orderId:id,confirmed:false}));
 assert.equal(r.statusCode,422);
});
