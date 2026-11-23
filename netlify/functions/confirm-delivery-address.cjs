'use strict';
// Registro de conferencia de entrega: nao ativa pedido, nao emite link.
// A ativacao so podera consumir esta evidencia apos validacao atomica na RPC.
const {createHash}=require('node:crypto');
const {respond,requireStaff,supabaseFetch,onlyMethod,handleError}=require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid=(message,statusCode=422)=>Object.assign(new Error(message),{statusCode});
const canonical=value=>JSON.stringify(value);
exports.handler=async event=>{
 try{
  onlyMethod(event,'POST');
  const {authUser}=await requireStaff(event,{allowedRoles:['admin','vendedor']});
  if(typeof event.body!=='string'||event.body.length>1024)throw invalid('Requisicao invalida',400);
  let input;try{input=JSON.parse(event.body)}catch{throw invalid('JSON invalido',400)}
  if(!UUID.test(input.orderId||'')||input.confirmed!==true)
   throw invalid('Identificador e confirmacao obrigatorios');
  const rows=await supabaseFetch('/rest/v1/aceite_orders?id=eq.'+input.orderId+
   '&select=id,status,origin,sic_order_number,sic_company_id,order_snapshot,details&limit=1');
  const o=rows?.[0];
  if(!o||o.status!=='rascunho'||o.origin!=='SIC_SUPRASYS'||o.details?.draftOnly!==true)
   throw invalid('Pedido nao elegivel para conferencia',409);
  const p=o.order_snapshot?.pedidoCompleto;
  if(!p||String(p.numero)!==String(o.sic_order_number)||
    Number(p.empresa)!==Number(o.sic_company_id))throw invalid('Espelho SIC inconsistente',409);
  const address=String(p.localEntrega||p.enderecoEntrega||'').trim();
  if(!address||address.length>1000)throw invalid('Local de entrega ausente no espelho SIC',409);
  const sourceRequestId=o.order_snapshot?.sourceRequestId;
  if(!UUID.test(sourceRequestId||''))throw invalid('Consulta SIC sem origem verificavel',409);
  const snapshotHash=createHash('sha256').update(canonical(o.order_snapshot)).digest('hex');
  const metadata={sourceRequestId,snapshotSha256:snapshotHash,
   snapshotRevision:o.details?.snapshotRevision??1,
   deliveryAddress:address,companyId:o.sic_company_id,orderNumber:o.sic_order_number,
   reviewedAt:new Date().toISOString(),manualReview:true,externalERPWrite:false};
  await supabaseFetch('/rest/v1/aceite_audit_events',{
   method:'POST',headers:{Prefer:'return=minimal'},
   body:{order_id:o.id,actor_type:'usuario',actor_id:authUser.id,
    action:'sic_delivery_address_reviewed',metadata}
  });
  return respond(200,{recorded:true,orderId:o.id,snapshotSha256:snapshotHash,
   message:'Conferencia registrada. A ativacao permanece bloqueada ate validacao atomica.'});
 }catch(error){return handleError(error)}
};
