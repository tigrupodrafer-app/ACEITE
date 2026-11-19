'use strict';
// Homologation ONLY. Synthetic order; not a legal acceptance or SIC manufacturing permission.
const {randomBytes,createHash}=require('node:crypto');
const {respond,requireStaff,supabaseFetch,handleError}=require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOC_TEXT=[
 'ACEITE DRAFER - SIMULACAO SEM VALIDADE JURIDICA',
 'Pedido FICTICIO: DEMO-001 | Empresa: DEMONSTRACAO',
 'Produto ficticio: Telha metalica demonstrativa - 10 pecas',
 'Valor ilustrativo: R$ 1.000,00',
 'Ao selecionar confirmar, registro apenas evento de teste no Supabase.',
 'Nao ha contrato, assinatura juridica, producao ou alteracao do SIC.',
].join('\n');
const HASH=createHash('sha256').update(DOC_TEXT).digest('hex');
const invalid=(text,statusCode=400)=>Object.assign(new Error(text),{statusCode});
const BASE='/rest/v1/aceite_demo_flows';
const fields='id,status,created_at,expires_at,accepted_at,release_at,signer_name,document_sha256';
exports.handler=async(event)=>{
 try{
  if(!['GET','POST'].includes(event.httpMethod))throw invalid('Método não permitido',405);
  const {authUser,member}=await requireStaff(event,{allowedRoles:['admin']});
  if(member.role!=='admin')throw invalid('Administração obrigatória',403);
  const userId=authUser.id;
  if(event.httpMethod==='GET'){
   const flowId=event.queryStringParameters?.flowId;
   if(!UUID.test(flowId||''))throw invalid('Identificador inválido');
   const rows=await supabaseFetch(BASE+'?id=eq.'+flowId+'&created_by=eq.'+userId+
     '&select='+fields+'&limit=1');
   if(!rows?.[0])throw invalid('Teste não encontrado',404);
   return respond(200,{flow:rows[0],mode:'DEMONSTRACAO',productionAuthorized:false});
  }
  if((event.body||'').length>400)throw invalid('Requisição muito grande');
  let input;try{input=JSON.parse(event.body||'{}');}catch{throw invalid('JSON inválido');}
  if(input.action==='create'){
   const count=await supabaseFetch(BASE+'?created_by=eq.'+userId+
     '&created_at=gte.'+encodeURIComponent(new Date(Date.now()-86400000).toISOString())+
     '&select=id&limit=20');
   if((count||[]).length>=20)throw invalid('Limite diário de demonstrações atingido',429);
   const token=randomBytes(32).toString('hex');
   const tokenHash=createHash('sha256').update(token).digest('hex');
   const expire=new Date(Date.now()+30*60*1000).toISOString();
   const rows=await supabaseFetch(BASE+'?select='+fields,{
    method:'POST',headers:{Prefer:'return=representation'},body:{
     created_by:userId,token_hash:tokenHash,document_sha256:HASH,expires_at:expire,
     status:'aguardando_aceite',
    },
   });
   if(!rows?.[0]?.id)throw new Error('Demo flow not created');
   return respond(201,{flow:rows[0],token,documentSha256:HASH,
     mode:'DEMONSTRACAO',productionAuthorized:false,
     message:'Link de teste criado. Não envie a clientes reais.'});
  }
  if(input.action==='release'){
   if(!UUID.test(input.flowId||''))throw invalid('Identificador inválido');
   const ownership=await supabaseFetch(BASE+'?id=eq.'+input.flowId+
     '&created_by=eq.'+userId+'&select=id,status&limit=1');
   if(!ownership?.length)throw invalid('Teste não encontrado',404);
   const result=await supabaseFetch('/rest/v1/rpc/aceite_demo_release_atomic',{
    method:'POST',body:{p_flow_id:input.flowId,p_actor_id:userId},
   });
   if(!result?.flowId)throw invalid('É necessário um aceite de teste concluído, sem liberação anterior.',409);
   return respond(200,{...result,
     message:'Etapa de fabricação SIMULADA. Nenhum pedido do SIC foi modificado.'});
  }
  throw invalid('Ação inválida');
 }catch(e){return handleError(e);}
};
