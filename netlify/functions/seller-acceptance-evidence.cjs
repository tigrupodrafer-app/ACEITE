'use strict';
// Seller reads signed evidence; no production transition is performed here.
const {createHash}=require('node:crypto');
const {respond,requireStaff,supabaseFetch,getSecretConfig,onlyMethod,handleError}=require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
exports.handler=async(event)=>{
 try {
  onlyMethod(event,'GET');
  await requireStaff(event,{allowedRoles:['admin','vendedor','aprovador']});
  const id=event.queryStringParameters?.orderId;
  if(!UUID.test(id||''))return respond(400,{error:'Pedido invalido'});
  const [orders,acceptances]=await Promise.all([
    supabaseFetch('/rest/v1/aceite_orders?id=eq.'+id+'&select=id,order_number,status,origin&limit=1'),
    supabaseFetch('/rest/v1/aceite_acceptances?order_id=eq.'+id+
      '&level=eq.1&select=id,signer_name,signature_storage_path,signature_sha256,legal_text_sha256,accepted_at,checklist&limit=1')
  ]);
  const o=orders?.[0],a=acceptances?.[0];
  if(!o||o.origin!=='SIC_SUPRASYS')return respond(404,{error:'Pedido nao encontrado'});
  if(!a)return respond(200,{orderNumber:o.order_number,signed:false,canSendToProduction:false});
  const path='signatures/'+id+'/';
  if(typeof a.signature_storage_path!=='string'||!a.signature_storage_path.startsWith(path)||
    !/^signatures\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/i.test(a.signature_storage_path)) {
    return respond(409,{error:'Evidencia com caminho invalido',signed:false});
  }
  const {url,key}=getSecretConfig();
  const response=await fetch(url+'/storage/v1/object/aceite-privado/'+a.signature_storage_path,{
    headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)return respond(503,{error:'Evidencia indisponivel'});
  const bytes=Buffer.from(await response.arrayBuffer());
  const hash=createHash('sha256').update(bytes).digest('hex');
  const integrity=bytes.length>300&&bytes.length<=105000&&hash===a.signature_sha256.trim();
  return respond(200,{orderNumber:o.order_number,signed:true,acceptanceId:a.id,
    signerName:a.signer_name,acceptedAt:a.accepted_at,
    legalSha256:a.legal_text_sha256.trim(),signatureSha256:a.signature_sha256.trim(),
    consents:a.checklist,signatureIntegrity:integrity,
    canSendToProduction:false,requiresSellerVerification:true});
 }catch(error){return handleError(error)}
};
