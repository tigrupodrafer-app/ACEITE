'use strict';
// Unauthenticated link is allowed ONLY for high-entropy sandbox token + fictitious data.
// No production data, document or order ID ever returned.
const {createHash}=require('node:crypto');
const {respond,supabaseFetch,handleError}=require('./_lib/backend.cjs');
const TOKEN=/^[a-f0-9]{64}$/i;
const HASH=/^[a-f0-9]{64}$/i;
const DOC_TEXT=[
 'ACEITE DRAFER - SIMULACAO SEM VALIDADE JURIDICA',
 'Pedido FICTICIO: DEMO-001 | Empresa: DEMONSTRACAO',
 'Produto ficticio: Telha metalica demonstrativa - 10 pecas',
 'Valor ilustrativo: R$ 1.000,00',
 'Ao selecionar confirmar, registro apenas evento de teste no Supabase.',
 'Nao ha contrato, assinatura juridica, producao ou alteracao do SIC.',
].join('\n');
const DOC_HASH=createHash('sha256').update(DOC_TEXT).digest('hex');
const deny=()=>respond(404,{error:'Link de demonstração inválido ou expirado.'});
exports.handler=async(event)=>{
 try{
  if(!['GET','POST'].includes(event.httpMethod))return respond(405,{error:'Método não permitido'});
  let input={};
  if(event.httpMethod==='POST'){
   if((event.body||'').length>650)return respond(400,{error:'Solicitação inválida'});
   try{input=JSON.parse(event.body||'{}');}catch{return respond(400,{error:'JSON inválido'});}
  }else input=event.queryStringParameters||{};
  const token=input.token;
  if(typeof token!=='string'||!TOKEN.test(token))return deny();
  const hash=createHash('sha256').update(token).digest('hex');
  const rows=await supabaseFetch('/rest/v1/aceite_demo_flows?token_hash=eq.'+hash+
    '&select=id,status,expires_at,document_sha256,accepted_at,release_at&limit=1');
  const flow=rows?.[0];
  if(!flow||Date.parse(flow.expires_at)<=Date.now()||
     !HASH.test((flow.document_sha256||'').trim())||
     flow.document_sha256.trim()!==DOC_HASH)return deny();
  if(event.httpMethod==='GET'){
   return respond(200,{
    demoOnly:true,productionAuthorized:false,publicLegalSigningEnabled:false,
    order:{number:'DEMO-001',company:'DEMONSTRAÇÃO',clientName:'CLIENTE FICTÍCIO',
      material:'Telha metálica demonstrativa',quantity:10,unit:'peças',
      value:'R$ 1.000,00'},
    document:{text:DOC_TEXT,sha256:DOC_HASH,version:'SIMULAÇÃO-1'},
    status:flow.status,acceptedAt:flow.accepted_at||null,
    releasedAt:flow.release_at||null,expiresAt:flow.expires_at,
   });
  }
  if(input.documentSha256!==DOC_HASH||input.consent!==true ||
     typeof input.signerName!=='string' ||
     input.signerName.trim().length<3||input.signerName.trim().length>100){
   return respond(422,{error:'Preencha nome fictício, declaração de ciência e documento de teste correto.'});
  }
  const signed=await supabaseFetch('/rest/v1/rpc/aceite_demo_accept_atomic',{
   method:'POST',body:{
    p_token_hash:hash,p_document_sha256:DOC_HASH,
    p_signer_name:input.signerName.trim(),p_consent:true,
   },
  });
  if(!signed?.eventId)return respond(409,{error:'Código já utilizado, expirado ou indisponível.'});
  return respond(200,{
    ...signed,mode:'DEMONSTRACAO',legalValidity:false,productionAuthorized:false,
    message:'Aceite de TESTE registrado. Nenhum contrato foi assinado juridicamente.',
  });
 }catch(error){return handleError(error);}
};
