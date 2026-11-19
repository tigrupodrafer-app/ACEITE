'use strict';
// Public acceptance: all business checks are repeated server-side.
// The transactional RPC is mandatory: no partial acceptance or token reuse.
const {createHash} = require('node:crypto');
const legal = require('../../src/lib/legalTermRevised.json');
const {validateConsents} = require('./_lib/acceptance-consent.cjs');
const {respond,supabaseFetch,sha256,getSecretConfig,handleError,onlyMethod} = require('./_lib/backend.cjs');
const legalHash = createHash('sha256').update(JSON.stringify(legal),'utf8').digest('hex');
const invalid=(message,statusCode=422)=>Object.assign(new Error(message),{statusCode});
const MAX_BODY=180000;
function parseSignature(input) {
  if(typeof input!=='string'||input.length<500||input.length>145000||
      !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(input)) throw invalid('Assinatura PNG invalida');
  const bytes=Buffer.from(input.slice(22),'base64');
  if(bytes.length<300||bytes.length>105000||
      !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw invalid('Imagem da assinatura invalida');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(width<100||width>1600||height<40||height>800) throw invalid('Dimensoes da assinatura invalidas');
  return bytes;
}
exports.handler=async(event)=>{
  try{
    onlyMethod(event,'POST');
    if(typeof event.body!=='string'||event.body.length>MAX_BODY) throw invalid('Requisicao invalida',400);
    let data;
    try{data=JSON.parse(event.body)}catch{throw invalid('JSON invalido',400)}
    if(typeof data.token!=='string'||!/^[a-fA-F0-9]{64}$/.test(data.token)) throw invalid('Link invalido',404);
    if(typeof data.signerName!=='string'||data.signerName.trim().length<5||
       data.signerName.trim().length>160) throw invalid('Nome completo obrigatorio');
    if(!validateConsents(data.consents).valid) throw invalid('As tres declaracoes sao obrigatorias');
    const bytes=parseSignature(data.signature);
    const tokenHash=sha256(data.token);
    const tokens=await supabaseFetch('/rest/v1/aceite_tokens?token_hash=eq.'+tokenHash+
      '&select=id,order_id,level,expires_at,used_at,revoked_at&limit=1');
    const token=tokens?.[0];
    if(!token||token.level!==1||token.used_at||token.revoked_at||
       Date.parse(token.expires_at)<=Date.now()) throw invalid('Link invalido ou expirado',404);
    const orders=await supabaseFetch('/rest/v1/aceite_orders?id=eq.'+token.order_id+
      '&select=id,status,origin,sic_order_number,sic_company_id,order_snapshot,details&limit=1');
    const order=orders?.[0];
    const snap=order?.order_snapshot,p=snap?.pedidoCompleto;
    if(!order||order.status!=='aguardando_aceite_pedido'||order.origin!=='SIC_SUPRASYS'||
       order.details?.legalDocumentApproved!==true||order.details?.eligibilityApproved!==true||
       order.details?.mirrorComplete!==true||snap?.validacao?.valido!==true||
       String(p?.numero)!==String(order.sic_order_number)||
       Number(p?.empresa)!==Number(order.sic_company_id)||
       !Array.isArray(snap.itens)||!snap.itens.length) throw invalid('Pedido nao homologado para assinatura',409);
    const approved=await supabaseFetch('/rest/v1/aceite_legal_versions?version=eq.'+
      encodeURIComponent(legal.version)+'&content_sha256=eq.'+legalHash+
      '&status=eq.homologado&select=id&limit=1');
    if(approved?.length!==1) throw invalid('Versao juridica nao homologada',409);
    // Signature is uploaded privately before transaction; any orphan is not an acceptance.
    // No user-controlled storage path is accepted.
    const {url,key}=getSecretConfig();
    const storagePath='signatures/'+token.order_id+'/'+token.id+'.png';
    const upload=await fetch(url+'/storage/v1/object/aceite-privado/'+storagePath,{
      method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,
        'Content-Type':'image/png','x-upsert':'false'},body:bytes,
      signal:AbortSignal.timeout(10000),
    });
    if(!upload.ok) throw invalid('Nao foi possivel arquivar a assinatura',503);
    const signatureHash=createHash('sha256').update(bytes).digest('hex');
    // The DB function must lock token+order, check every condition again, and atomically
    // mark token used, create acceptance and update order. No direct table writes here.
    const result=await supabaseFetch('/rest/v1/rpc/aceite_confirmar_assinatura',{
      method:'POST',body:{
        p_token_hash:tokenHash,p_signer_name:data.signerName.trim(),
        p_signature_path:storagePath,p_signature_sha256:signatureHash,
        p_legal_sha256:legalHash,p_legal_version:legal.version,
        p_checklist:data.consents,p_user_agent:String(event.headers?.['user-agent']||'').slice(0,500),
      },
    });
    if(!result?.acceptance_id) throw invalid('Assinatura nao confirmada',409);
    return respond(201,{accepted:true,acceptanceId:result.acceptance_id,
      orderNumber:String(order.sic_order_number),acceptedAt:result.accepted_at});
  }catch(error){return handleError(error)}
};
