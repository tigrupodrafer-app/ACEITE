'use strict';
// Issue a one-time customer link only after all gates have been approved.
// This endpoint never approves a legal version or marks an SIC draft as eligible.
const {randomBytes,createHash,createCipheriv} = require('node:crypto');
const legal = require('../../src/lib/legalTermRevised.json');
const {respond,requireStaff,supabaseFetch,sha256,onlyMethod,handleError} = require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const legalHash=createHash('sha256').update(JSON.stringify(legal)).digest('hex');
const invalid=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
exports.handler=async(event)=>{
 try {
  onlyMethod(event,'POST');
  const {authUser}=await requireStaff(event,{allowedRoles:['admin','vendedor']});
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
  const raw=randomBytes(32).toString('hex');
  const key=Buffer.from(process.env.ACCEPTANCE_LINK_ENCRYPTION_KEY||'','base64');
  if(key.length!==32)throw invalid('Criptografia de links não configurada',503);
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(o.id+':'+sha256(raw)));
  const encrypted=Buffer.concat([cipher.update(raw,'utf8'),cipher.final()]);
  const ciphertext=[iv,cipher.getAuthTag(),encrypted].map(b=>b.toString('base64')).join('.');
  const expiresAt=new Date(Date.now()+48*60*60*1000).toISOString();
  const issued=await supabaseFetch('/rest/v1/rpc/aceite_emitir_token_atomico',{
    method:'POST',body:{p_order_id:o.id,p_token_hash:sha256(raw),
      p_expires_at:expiresAt,p_legal_version:legal.version,p_legal_sha256:legalHash,p_ciphertext:ciphertext,p_owner:authUser.id}});
  if(!issued?.issued)throw invalid('Link nao registrado');
  return respond(201,{token:raw,expiresAt,relativeUrl:'/AssinarAceite?token='+raw,
    message:'Link pessoal: compartilhe somente com o cliente correto.'});
 }catch(error){return handleError(error)}
};
