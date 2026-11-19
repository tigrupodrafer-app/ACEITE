'use strict';
// Seller tracking endpoint. Does not expose raw token, signatures or confidential snapshots.
const {respond,requireStaff,supabaseFetch,handleError,onlyMethod}=require('./_lib/backend.cjs');
const invalid=(message,statusCode=400)=>Object.assign(new Error(message),{statusCode});
exports.handler=async event=>{
 try{
  onlyMethod(event,'GET');
  await requireStaff(event,{allowedRoles:['admin','vendedor','aprovador']});
  const number=String(event.queryStringParameters?.number||'');
  if(!/^[1-9]\d{0,11}$/.test(number))throw invalid('Número do pedido inválido');
  const rows=await supabaseFetch('/rest/v1/aceite_orders?origin=eq.SIC_SUPRASYS&sic_order_number=eq.'+
    number+'&select=id,order_number,sic_company_id,status,details,created_at&limit=10');
  const orders=rows||[];
  if(orders.length>1)return respond(409,{error:'Pedido encontrado em mais de uma empresa. Consulte a empresa no SIC.'});
  const order=orders[0];
  if(!order)return respond(200,{found:false,state:'nao_registrado',signingEnabled:false});
  const accepted=await supabaseFetch('/rest/v1/aceite_acceptances?order_id=eq.'+order.id+
    '&select=id,level,signer_name,accepted_at,signature_sha256,legal_text_sha256&order=accepted_at.desc&limit=10');
  const tokens=await supabaseFetch('/rest/v1/aceite_tokens?order_id=eq.'+order.id+
    '&select=level,expires_at,used_at,revoked_at,created_at&order=created_at.desc&limit=10');
  const current=(tokens||[])[0];
  const state=(accepted||[]).length?'assinado':
    current&&!current.revoked_at&&!current.used_at&&Date.parse(current.expires_at)>Date.now()?
      'link_ativo':order.status==='rascunho'?'rascunho':'pendente';
  return respond(200,{
   found:true,orderId:order.id,company:order.sic_company_id,
   state,orderStatus:order.status,signingEnabled:false,
   latestLink:current?{createdAt:current.created_at,expiresAt:current.expires_at,
    expired:Date.parse(current.expires_at)<=Date.now(),revoked:!!current.revoked_at,used:!!current.used_at}:null,
   acceptances:(accepted||[]).map(a=>({
    id:a.id,level:a.level,signerName:a.signer_name,acceptedAt:a.accepted_at,
    signatureSha256:a.signature_sha256?.trim()||null,
    legalTextSha256:a.legal_text_sha256?.trim()||null,
   })),
  });
 }catch(e){return handleError(e)}
};
