'use strict';
// Seller confirms the trusted SIC snapshot. Legal approval is global, not per order.
const {createHash}=require('node:crypto');
const legal=require('../../src/lib/legalTermRevised.json');
const {respond,requireStaff,supabaseFetch,onlyMethod,handleError}=require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash=createHash('sha256').update(JSON.stringify(legal)).digest('hex');
const invalid=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
const numeric=v=>v===null||v===undefined||v===''?NaN:Number(v);
const cents=v=>Math.round(v*100);
function financialsMatch(p,validation){
 const subtotal=numeric(p?.valores?.subtotal);
 const discount=numeric(p?.valores?.desconto??0);
 const freight=numeric(p?.frete??0);
 const total=numeric(p?.valores?.total);
 const sum=numeric(validation?.somaItens);
 return [subtotal,discount,freight,total,sum].every(Number.isFinite)&&
  subtotal>=0&&discount>=0&&freight>=0&&discount<=subtotal&&total>0&&
  Math.abs(cents(subtotal)-cents(sum))<=2&&
  Math.abs(cents(total)-(cents(subtotal)-cents(discount)+cents(freight)))<=2;
}
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
  // Ausencia de confirmacao explicita nunca e compensada por texto de endereco.
  // A confirmacao autenticada e auditavel sera validada na RPC antes da liberacao.
  if(!o||o.origin!=='SIC_SUPRASYS'||o.status!=='rascunho'||o.details?.draftOnly!==true||
    !p||!Array.isArray(items)||!items.length||items.length>200||
    String(p.numero)!==String(o.sic_order_number)||
    Number(p.empresa)!==Number(o.sic_company_id)||
    String(p.liberado||'').trim().toUpperCase()!=='S'||
    s.validacao?.valido!==true||numeric(p.valores?.total)<=0||
    !Number.isFinite(numeric(s.validacao?.somaItens))||
    !financialsMatch(p,s.validacao)||
    typeof p.cliente?.nome!=='string'||p.cliente.nome.trim().length<2||
    !String(p.nomeEmpresa||p.razaoSocialEmpresa||'').trim()||
    !String(p.tipoVenda||p.tipoVendaDescricao||p.tipoVendaCodigo||'').trim()||
    !String(p.localEntrega||p.enderecoEntrega||'').trim()||
    items.some(i=>!i||typeof i.descricao!=='string'||!i.descricao.trim()||
      !Number.isFinite(numeric(i.valorTotal))||numeric(i.valorTotal)<0))
   throw invalid('Espelho SIC incompleto ou pedido nao elegivel para aceite');
  // Defesa adicional na borda. A RPC deve repetir a verificacao sob lock.
  const reviews=await supabaseFetch('/rest/v1/aceite_audit_events?order_id=eq.'+
   o.id+'&action=eq.sic_delivery_address_reviewed&select=actor_id,metadata&limit=100');
  const snapshotSha256=createHash('sha256').update(JSON.stringify(s)).digest('hex');
  const revision=String(o.details?.snapshotRevision??1);
  const sourceRequestId=String(s?.sourceRequestId??'');
  const delivery=String(p.localEntrega||p.enderecoEntrega||'').trim();
  const reviewed=Array.isArray(reviews)&&reviews.some(e=>
   e.actor_id===authUser.id&&e.metadata?.manualReview===true&&
   String(e.metadata?.sourceRequestId)===sourceRequestId&&
   e.metadata?.snapshotSha256===snapshotSha256&&
   String(e.metadata?.snapshotRevision)===revision&&
   String(e.metadata?.deliveryAddress)===delivery&&
   String(e.metadata?.companyId)===String(o.sic_company_id)&&
   String(e.metadata?.orderNumber)===String(o.sic_order_number));
  if(!reviewed)throw invalid('Conferencia auditavel da entrega nao encontrada para esta revisao');
  const approved=await supabaseFetch('/rest/v1/aceite_legal_versions?version=eq.'+
   encodeURIComponent(legal.version)+'&content_sha256=eq.'+hash+
   '&status=eq.homologado&select=id&limit=1');
  if(approved?.length!==1)throw invalid('Registre primeiro a homologacao juridica da versao revisada');
  const result=await supabaseFetch('/rest/v1/rpc/aceite_ativar_pedido_atomico',{
    method:'POST',body:{p_order_id:o.id,p_actor_id:authUser.id,
      p_legal_version:legal.version,p_legal_sha256:hash}});
  if(!result?.activated)throw invalid('Ativacao nao confirmada');
  return respond(200,{orderId:o.id,status:'aguardando_aceite_pedido',readyForLink:true});
 }catch(error){return handleError(error)}
};
