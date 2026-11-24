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
  // O navegador envia apenas a referencia. As opcoes DEVEM vir do snapshot
  // confiavel produzido pela ponte SIC, nunca de dados fornecidos pelo cliente.
  const selected=input.selection;
  if(!selected||!['ARQCADEND','ARQCAD'].includes(selected.origem))
   throw invalid('Selecione explicitamente o endereco de entrega',422);
  const registered=Array.isArray(o.order_snapshot?.enderecosEntrega)
    ?o.order_snapshot.enderecosEntrega:[];
  const cadastral=o.order_snapshot?.enderecoCadastralEntrega;
  let trusted=null;
  if(selected.origem==='ARQCADEND'){
   const seq=Number(selected.sequencia);
   if(!Number.isSafeInteger(seq)||seq<=0)throw invalid('Sequencia de entrega invalida',422);
   trusted=registered.find(item=>item?.origem==='ARQCADEND'&&item.ativo===true&&
     Number(item.sequencia)===seq);
  }else if(registered.some(item=>item?.origem==='ARQCADEND'&&item.ativo===true)){
   throw invalid('Selecione um dos locais de entrega ativos',409);
  }else if(cadastral?.endereco&&cadastral?.cidade&&selected.sequencia==null){
   trusted=cadastral;
  }
  if(!trusted)throw invalid('Endereco nao validado no snapshot SIC. Atualize a ponte antes de prosseguir',409);
  // Conferencia exige endereco completo; a ativacao ainda exige revisao
  // atomica e associacao do endereco ao documento juridico.
  const normalized=[trusted.endereco,trusted.numero,trusted.bairro,trusted.cidade,
    trusted.uf,trusted.cep].map(v=>String(v??'').trim()).filter(Boolean).join(', ');
  if(!normalized||normalized.length>1000)throw invalid('Endereco de entrega incompleto',409);
  const address=String(p.localEntrega||p.enderecoEntrega||'').trim();
  if(address.length>1000)throw invalid('Local de entrega ausente no espelho SIC',409);
  const sourceRequestId=o.order_snapshot?.sourceRequestId;
  if(!UUID.test(sourceRequestId||''))throw invalid('Consulta SIC sem origem verificavel',409);
  const snapshotHash=createHash('sha256').update(canonical(o.order_snapshot)).digest('hex');
  const metadata={sourceRequestId,snapshotSha256:snapshotHash,
   deliverySelection:{origem:selected.origem,sequencia:selected.origem==='ARQCADEND'?Number(selected.sequencia):null},
   selectedAddress:normalized,
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
