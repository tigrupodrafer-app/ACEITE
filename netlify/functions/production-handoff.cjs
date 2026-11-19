'use strict';
// Explicit seller handoff only. Does NOT write to SIC or start production.
const {createHash}=require('node:crypto');
const {respond,requireStaff,supabaseFetch,getSecretConfig,handleError,onlyMethod}=require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
exports.handler=async event=>{
 try{
  onlyMethod(event,'POST');
  const {authUser}=await requireStaff(event,{allowedRoles:['admin','vendedor']});
  if(typeof event.body!=='string'||event.body.length>512)throw invalid('Requisicao invalida',400);
  let data;try{data=JSON.parse(event.body)}catch{throw invalid('JSON invalido',400)}
  if(!UUID.test(data.orderId||'')||data.confirmed!==true)
   throw invalid('Confirme expressamente o encaminhamento do aceite assinado',422);
  const id=data.orderId;
  const [orders,acceptances,docs]=await Promise.all([
   supabaseFetch('/rest/v1/aceite_orders?id=eq.'+id+
    '&select=id,origin,status,details,order_snapshot,sic_order_number,sic_company_id&limit=1'),
   supabaseFetch('/rest/v1/aceite_acceptances?order_id=eq.'+id+
    '&level=eq.1&select=id,signature_storage_path,signature_sha256,legal_text_sha256,checklist&limit=1'),
   supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.'+id+
    '&document_type=eq.level1_acceptance&select=id,acceptance_id,storage_path,file_sha256&limit=1')
  ]);
  const o=orders?.[0],a=acceptances?.[0],d=docs?.[0],p=o?.order_snapshot?.pedidoCompleto;
  if(!o||o.origin!=='SIC_SUPRASYS'||o.status!=='aguardando_aceite_pedido'||
     o.details?.legalDocumentApproved!==true||o.details?.eligibilityApproved!==true||
     o.details?.mirrorComplete!==true||o.order_snapshot?.validacao?.valido!==true||
     String(p?.numero)!==String(o.sic_order_number)||
     Number(p?.empresa)!==Number(o.sic_company_id)||
     !a||!d||d.acceptance_id!==a.id||
     !['conferenciaPedido','condicoesFornecimentoGarantia','concordanciaAutorizacao']
       .every(k=>a.checklist?.[k]===true))
   throw invalid('Pedido, assinatura ou documento nao homologado');
  if(!/^signed\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/i.test(d.storage_path)||
     !/^signatures\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/i.test(a.signature_storage_path)||
     !d.storage_path.startsWith('signed/'+id+'/'+a.id+'.pdf')||
     !a.signature_storage_path.startsWith('signatures/'+id+'/'))
   throw invalid('Caminhos das evidencias invalidos');
  const {url,key}=getSecretConfig();
  async function check(path,expected,max){
   const res=await fetch(url+'/storage/v1/object/aceite-privado/'+path,{
    headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw invalid('Evidencia privada indisponivel',503);
   const bytes=Buffer.from(await res.arrayBuffer());
   if(bytes.length<300||bytes.length>max||
     createHash('sha256').update(bytes).digest('hex')!==expected.trim())
    throw invalid('Falha na integridade da evidencia');
  }
  await check(a.signature_storage_path,a.signature_sha256,105000);
  await check(d.storage_path,d.file_sha256,4*1024*1024);
  const result=await supabaseFetch('/rest/v1/rpc/aceite_registrar_encaminhamento',{
   method:'POST',body:{p_order_id:id,p_acceptance_id:a.id,p_document_id:d.id,p_actor_id:authUser.id}});
  if(!result?.registered)throw invalid('Encaminhamento nao registrado');
  return respond(201,{...result,message:'Encaminhamento registrado para a equipe de producao. Nenhuma ordem foi enviada ao SIC.'});
 }catch(error){return handleError(error)}
};
