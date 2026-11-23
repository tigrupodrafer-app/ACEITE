'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const target = path.resolve(__dirname,'../netlify/functions/public-order.cjs');
const backendPath = path.resolve(__dirname,'../netlify/functions/_lib/backend.cjs');
const token = 'a'.repeat(64);
const orderId = '11111111-1111-4111-8111-111111111111';

function loadWithMock(supabaseFetch) {
  const original = require.cache[backendPath];
  require.cache[backendPath] = {
    id: backendPath, filename: backendPath, loaded: true,
    exports: {
      respond:(statusCode,body)=>({statusCode,body:JSON.stringify(body)}),
      onlyMethod:(event,method)=>{if(event.httpMethod!==method)throw Object.assign(new Error('Method not allowed'),{statusCode:405});},
      sha256:()=> 'b'.repeat(64),
      supabaseFetch,
      handleError:(e)=>({statusCode:e.statusCode||500,body:JSON.stringify({error:e.message})}),
    }
  };
  delete require.cache[target];
  try {return require(target).handler;}
  finally {
    delete require.cache[target];
    if(original) require.cache[backendPath]=original;
    else delete require.cache[backendPath];
  }
}
const event=(value=token)=>({httpMethod:'GET',queryStringParameters:{token:value}});
const activeToken={order_id:orderId,level:1,expires_at:'2099-01-01T00:00:00Z',used_at:null,revoked_at:null};
const baseOrder={
  id:orderId,order_number:'352488',client_name:'Cliente',
  status:'aguardando_aceite_pedido',origin:'SIC_SUPRASYS',
  sic_company_id:1,sic_order_number:352488,
  details:{legalDocumentApproved:true,eligibilityApproved:true},
  order_snapshot:{
    pedidoCompleto:{numero:352488,empresa:1,liberado:'S',valores:{total:100},cliente:{nome:'Cliente'}},
    itens:[{descricao:'Produto',valorTotal:100}],
    validacao:{valido:true,somaItens:100}
  }
};
function db(order=baseOrder, tokenRow=activeToken){
  return async path=>path.includes('aceite_tokens')?[tokenRow]:[order];
}
test('token invalido rejeitado antes do banco',async()=>{
  const handler=loadWithMock(async()=>{throw new Error('DB should not be called')});
  assert.equal((await handler(event('short'))).statusCode,404);
});
test('token expirado rejeitado',async()=>{
  const handler=loadWithMock(db(baseOrder,{...activeToken,expires_at:'2000-01-01T00:00:00Z'}));
  assert.equal((await handler(event())).statusCode,404);
});
test('espelho ausente nao e entregue ao cliente',async()=>{
  const handler=loadWithMock(db({...baseOrder,order_snapshot:null}));
  assert.equal((await handler(event())).statusCode,404);
});
test('pedido sem homologacao juridica nao e entregue',async()=>{
  const handler=loadWithMock(db({...baseOrder,details:{legalDocumentApproved:false,eligibilityApproved:true}}));
  assert.equal((await handler(event())).statusCode,404);
});
test('pedido com snapshot validado ainda e marcado como nao homologado integralmente',async()=>{
  const handler=loadWithMock(db());
  const response=await handler(event());
  assert.equal(response.statusCode,200);
  const body=JSON.parse(response.body);
  assert.equal(body.order.mirrorComplete,false);
  assert.equal(body.order.mirror.order.number,'352488');
  assert.equal(body.order.order_snapshot,undefined);
});
test('nao permite metodo de escrita',async()=>{
  const handler=loadWithMock(db());
  assert.equal((await handler({...event(),httpMethod:'POST'})).statusCode,405);
});
