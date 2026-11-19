'use strict';
// Seller confirms the trusted SIC snapshot. Legal approval is global, not per order.
const {createHash}=require('node:crypto');
const legal=require('../../src/lib/legalTermRevised.json');
const {respond,requireStaff,supabaseFetch,onlyMethod,handleError}=require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash=createHash('sha256').update(JSON.stringify(legal)).digest('hex');
const invalid=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
const numeric=v=>v===null||v===undefined||v===''?NaN:Number(v);
exports.handler=async event=>{
 try{
  onlyMethod(event,'POST');
  const {authUser}=await requireStaff(event,{allowedRoles:['admin','vendedor']});
  if(typeof event.body!=='string'||event.body.length>512)throw invalid('Requisicao invalida',400);
  let input;try{input=JSON.parse(event.body)}catch{throw invalid('JSON invalido',400)}
  if(!UUID.test(input.orderId||'')||input.confirmed!==true)
   throw invalid('Confirme a conferencia do espelho SIC',422);
  const rows=await supabaseFetch('/rest/v1/aceite_orders?id=eq.'+input.orderId+
   '&select=id,status,origin,sic_company_id,sic_order_number,order_snapshot,details&limit=1');
  const o=rows?.[0],s=o?.order_snapshot,p=s?.pedidoCompleto,items=s?.itens;
  if(!o||o.origin!=='SIC_SUPRASYS'||o.status!=='rascunho'||o.details?.draftOnly!==true||
    !p||!Array.isArray(items)||!items.length||items.length>200||
    String(p.numero)!==String(o.sic_order_number)||
    Number(p.empresa)!==Number(o.sic_company_id)||
    String(p.liberado||'').trim().toUpperCase()!=='S'||
    s.validacao?.valido!==true||numeric(p.valores?.total)<=0||
    !Number.isFinite(numeric(s.validacao?.somaItens))||
    Math.abs(numeric(p.valores.total)-numeric(s.validacao.somaItens))>0.02||
    typeof p.cliente?.nome!=='string'||p.cliente.nome.trim().length<2||
    !String(p.nomeEmpresa||p.razaoSocialEmpresa||'').trim()||
    !String(p.tipoVenda||p.tipoVendaDescricao||p.tipoVendaCodigo||'').trim()||
    !String(p.localEntrega||p.enderecoEntrega||'').trim()||
    items.some(i=>!i||typeof i.descricao!=='string'||!i.descricao.trim()||
      !Number.isFinite(numeric(i.valorTotal))||numeric(i.valorTotal)<0))
   throw invalid('Espelho SIC incompleto ou pedido nao elegivel para aceite');
  const approved=await supabaseFetch('/rest/v1/aceite_legal_versions?version=eq.'+
   encodeURIComponent(legal.version)+'&content_sha256=eq.'+hash+
   '&status=eq.homologado&select=id&limit=1');
  if(approved?.length!==1)throw invalid('Registre primeiro a homologacao juridica da versao revisada');
  const details={...o.details,draftOnly:false,eligibilityApproved:true,
    legalDocumentApproved:true,mirrorComplete:true,legalVersion:legal.version,
    legalSha256:hash,verifiedBy:authUser.id,verifiedAt:new Date().toISOString()};
  const updated=await supabaseFetch('/rest/v1/aceite_orders?id=eq.'+o.id+
   '&status=eq.rascunho&select=id,status',{
    method:'PATCH',headers:{Prefer:'return=representation'},
    body:{status:'aguardando_aceite_pedido',details}});
  if(!updated?.[0]?.id)throw invalid('Pedido ja foi atualizado; consulte o estado atual');
  await supabaseFetch('/rest/v1/aceite_audit_events',{method:'POST',body:{
    order_id:o.id,actor_type:'usuario',actor_id:authUser.id,
    action:'sic_mirror_verified_for_acceptance',metadata:{
      legalVersion:legal.version,legalSha256:hash,
      sourceRequestId:s.sourceRequestId,manualReview:true,externalERPWrite:false}}});
  return respond(200,{orderId:o.id,status:'aguardando_aceite_pedido',readyForLink:true});
 }catch(error){return handleError(error)}
};
