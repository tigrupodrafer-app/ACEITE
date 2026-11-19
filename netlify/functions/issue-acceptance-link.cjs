'use strict';
// Issue a one-time customer link only after all gates have been approved.
// This endpoint never approves a legal version or marks an SIC draft as eligible.
const {randomBytes,createHash} = require('node:crypto');
const legal = require('../../src/lib/legalTermRevised.json');
const {respond,requireStaff,supabaseFetch,sha256,onlyMethod,handleError} = require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const legalHash=createHash('sha256').update(JSON.stringify(legal)).digest('hex');
const invalid=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
exports.handler=async(event)=>{
 try {
  onlyMethod(event,'POST');
  await requireStaff(event,{allowedRoles:['admin','vendedor']});
  if(typeof event.body!=='string'||event.body.length>512) throw invalid('Requisicao invalida',400);
  let body;try{body=JSON.parse(event.body)}catch{throw invalid('JSON invalido',400)}
  if(!UUID.test(body.orderId||''))throw invalid('Pedido invalido',400);
  const rows=await supabaseFetch('/rest/v1/aceite_orders?id=eq.'+body.orderId+
    '&select=id,origin,status,order_snapshot,details,sic_order_number,sic_company_id&limit=1');
  const o=rows?.[0],s=o?.order_snapshot,p=s?.pedidoCompleto;
  if(!o||o.origin!=='SIC_SUPRASYS'||o.status!=='aguardando_aceite_pedido'||
    o.details?.draftOnly===true||o.details?.legalDocumentApproved!==true||
    o.details?.eligibilityApproved!==true||o.details?.mirrorComplete!==true||
    s?.validacao?.valido!==true||String(p?.numero)!==String(o.sic_order_number)||
    Number(p?.empresa)!==Number(o.sic_company_id)||
    String(p?.liberado||'').toUpperCase()!=='S'||
    !Array.isArray(s.itens)||!s.itens.length) throw invalid('Pedido nao habilitado para link');
  const approved=await supabaseFetch('/rest/v1/aceite_legal_versions?version=eq.'+
    encodeURIComponent(legal.version)+'&content_sha256=eq.'+legalHash+
    '&status=eq.homologado&select=id&limit=1');
  if(approved?.length!==1)throw invalid('Versao juridica nao homologada');
  const existing=await supabaseFetch('/rest/v1/aceite_tokens?order_id=eq.'+o.id+
    '&level=eq.1&used_at=is.null&revoked_at=is.null&expires_at=gt.'+
    encodeURIComponent(new Date().toISOString())+'&select=id&limit=1');
  if(existing?.length)throw invalid('Ja existe link ativo; revogue antes de gerar outro');
  const raw=randomBytes(32).toString('hex');
  const expiresAt=new Date(Date.now()+48*60*60*1000).toISOString();
  await supabaseFetch('/rest/v1/aceite_tokens',{method:'POST',body:{
    order_id:o.id,level:1,token_hash:sha256(raw),expires_at:expiresAt
  }});
  return respond(201,{token:raw,expiresAt,relativeUrl:'/aceite?token='+raw,
    message:'Link pessoal: compartilhe somente com o cliente correto.'});
 }catch(error){return handleError(error)}
};
