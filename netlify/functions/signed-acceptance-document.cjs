'use strict';
// Staff-only signed PDF: generated from the frozen SIC snapshot and archived signature.
// GET downloads only a stored PDF whose SHA256 matches the database record.
const {createHash}=require('node:crypto');
const {jsPDF}=require('jspdf');
const legal=require('../../src/lib/legalTermRevised.json');
const {respond,requireStaff,supabaseFetch,getSecretConfig,handleError}=require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const legalHash=sha(Buffer.from(JSON.stringify(legal)));
const invalid=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
const BUCKET='aceite-privado';
async function storage(path,method='GET',bytes){
 const {url,key}=getSecretConfig();
 const res=await fetch(url+'/storage/v1/object/'+BUCKET+'/'+path,{
  method,headers:{apikey:key,Authorization:'Bearer '+key,...(method==='POST'?{
    'Content-Type':'application/pdf','x-upsert':'false'}:{})},
  ...(bytes?{body:bytes}:{}),signal:AbortSignal.timeout(10000)});
 if(!res.ok){
  if(method==='POST' && (res.status===409||res.status===400))throw invalid('Documento em geracao simultanea; consulte novamente em instantes',409);
  throw invalid('Arquivo privado indisponivel',503);
 }
 return method==='GET'?Buffer.from(await res.arrayBuffer()):null;
}
function buildPdf(order,a,signature){
 const p=order.order_snapshot?.pedidoCompleto,items=order.order_snapshot?.itens;
 if(!p||!Array.isArray(items)||!items.length||items.length>200||
    order.order_snapshot?.validacao?.valido!==true||
    String(p.numero)!==String(order.sic_order_number)||
    Number(p.empresa)!==Number(order.sic_company_id))throw invalid('Espelho SIC invalido');
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
 const width=pdf.internal.pageSize.getWidth(),height=pdf.internal.pageSize.getHeight();
 let y=20;const margin=16;
 const clean=v=>String(v??'Não informado').normalize('NFC')
  .replace(/[\x00-\x1f]/g,' ').slice(0,800);
 const add=(value,bold=false)=>{
  pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(bold?11:9);
  for(const line of pdf.splitTextToSize(clean(value),width-2*margin)){
   if(y>height-22){pdf.addPage();y=20;}
   pdf.text(line,margin,y);y+=bold?6:5;
  }y+=2;
 };
 add('DRAFER - COMPROVANTE DE ACEITE ELETRÔNICO',true);
 add('Pedido SIC: '+order.order_number+' | Empresa: '+(p.nomeEmpresa||p.razaoSocialEmpresa||order.sic_company_id),true);
 add('Cliente: '+order.client_name);
 add('Documento do cliente: '+(p.cliente?.cnpj||p.cliente?.cpf||p.cliente?.cnpjCpf));
 add('Emissão: '+p.dataPedido+' | Entrega prevista: '+p.dataEntrega);
 add('Vendedor: '+(p.vendedor||p.codigoVendedor));
 add('Condição de pagamento: '+(p.condicaoPagamento||p.condicoesPagamento||p.codigoCondicaoPagamentoCadastral));
 add('Local de entrega: '+(p.localEntrega||p.enderecoEntrega));
 add('Itens do pedido',true);
 for(const [i,item] of items.entries()){
  add((i+1)+'. '+item.descricao);
  add('Código: '+(item.codigoProdutoImpressao??item.codigoImpressao??item.codigoProdutoComercial)+
   ' | Unidade: '+item.unidade+' | Quantidade: '+item.quantidade+
   ' | Peças: '+item.quantidadePecas+' | Peso KG: '+(item.pesoLiquidoKg??item.pesoBrutoKg)+
   ' | Unitário: '+item.valorUnitario+' | Total: '+item.valorTotal);
 }
 add('Subtotal: '+p.valores?.subtotal+' | Desconto: '+p.valores?.desconto+
  ' | Frete: '+(p.valores?.frete??p.frete)+' | Total: '+p.valores?.total,true);
 add('Observações: '+(p.observacoes||p.obs));
 add(legal.title+' - versão '+legal.version,true);
 for(const [i,section] of legal.sections.entries()){
  add((i+1)+'. '+section[0],true);
  for(const paragraph of section[1])add(paragraph);
 }
 add('DECLARAÇÕES CONFIRMADAS PELO CLIENTE',true);
 for(const [i,text] of legal.consent.entries())add((i+1)+'. [X] '+text);
 if(y>height-95){pdf.addPage();y=20;}
 add('Assinante: '+a.signer_name,true);
 add('Data e hora do aceite (UTC): '+a.accepted_at);
 add('Protocolo: '+a.id);
 add('SHA-256 do termo jurídico: '+a.legal_text_sha256.trim());
 add('SHA-256 da assinatura: '+a.signature_sha256.trim());
 const base64=signature.toString('base64');
 pdf.addImage('data:image/png;base64,'+base64,'PNG',margin,y,85,27);
 y+=33;
 add('Assinatura eletronicamente capturada. Integridade verificável pelo protocolo e hashes.');
 const count=pdf.getNumberOfPages();
 for(let i=1;i<=count;i++){pdf.setPage(i);pdf.setFontSize(8);
  pdf.text('ACEITE DRAFER | '+order.order_number+' | Página '+i+'/'+count,margin,height-9);}
 return Buffer.from(pdf.output('arraybuffer'));
}
exports.handler=async event=>{
 try{
  if(!['POST','GET'].includes(event.httpMethod))throw invalid('Metodo nao permitido',405);
  await requireStaff(event,{allowedRoles:['admin','vendedor','aprovador']});
  let id;
  if(event.httpMethod==='POST'){
   if((event.body||'').length>256)throw invalid('Requisicao invalida',400);
   let data;try{data=JSON.parse(event.body||'{}')}catch{throw invalid('JSON invalido',400)}
   id=data.orderId;
  }else{id=event.queryStringParameters?.orderId;}
  if(!UUID.test(id||''))throw invalid('Pedido invalido',400);
  const [orders,acceptances,docs]=await Promise.all([
   supabaseFetch('/rest/v1/aceite_orders?id=eq.'+id+
    '&select=id,order_number,origin,sic_order_number,sic_company_id,client_name,order_snapshot,details,status&limit=1'),
   supabaseFetch('/rest/v1/aceite_acceptances?order_id=eq.'+id+
    '&level=eq.1&select=id,signer_name,signature_storage_path,signature_sha256,legal_text_sha256,accepted_at,checklist&limit=1'),
   supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.'+id+
    '&document_type=eq.level1_acceptance&select=id,acceptance_id,storage_path,file_sha256,version&limit=1')
  ]);
  const order=orders?.[0],a=acceptances?.[0],existing=docs?.[0];
  if(!order||order.origin!=='SIC_SUPRASYS'||!a)throw invalid('Aceite assinado nao encontrado',404);
  if(event.httpMethod==='GET'){
   if(!existing||existing.acceptance_id!==a.id)throw invalid('PDF assinado nao encontrado',404);
   if(!/^signed\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/i.test(existing.storage_path))
    throw invalid('Caminho do PDF invalido');
   const bytes=await storage(existing.storage_path);
   if(bytes.length>4*1024*1024||sha(bytes)!==existing.file_sha256.trim())
    throw invalid('Integridade do PDF nao confirmada');
   return {statusCode:200,isBase64Encoded:true,headers:{
    'Content-Type':'application/pdf','Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff',
    'Content-Disposition':'attachment; filename="aceite-assinado-'+order.order_number+'.pdf"'
   },body:bytes.toString('base64')};
  }
  if(existing){
   if(existing.acceptance_id!==a.id||!/^signed\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/i.test(existing.storage_path))
    throw invalid('Registro de documento inconsistente');
   const archived=await storage(existing.storage_path);
   if(archived.length>4*1024*1024||sha(archived)!==existing.file_sha256.trim())
    throw invalid('Integridade do documento arquivado invalida');
   return respond(200,{documentId:existing.id,sha256:existing.file_sha256.trim(),created:false});
  }
  if(order.details?.legalDocumentApproved!==true||
     order.details?.eligibilityApproved!==true||
     order.details?.mirrorComplete!==true||
     a.legal_text_sha256.trim()!==legalHash||
     !['conferenciaPedido','condicoesFornecimentoGarantia','concordanciaAutorizacao']
      .every(k=>a.checklist?.[k]===true))throw invalid('Evidencias ou homologacao incompletas');
  const approved=await supabaseFetch('/rest/v1/aceite_legal_versions?version=eq.'+
   encodeURIComponent(legal.version)+'&content_sha256=eq.'+legalHash+
   '&status=eq.homologado&select=id&limit=1');
  if(approved?.length!==1)throw invalid('Versao juridica nao homologada');
  if(a.signature_storage_path!=='signatures/'+id+'/'+a.signature_storage_path.split('/').at(-1)||
     !/^signatures\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/i.test(a.signature_storage_path))
   throw invalid('Caminho da assinatura invalido');
  const signature=await storage(a.signature_storage_path);
  if(signature.length>105000||signature.length<300||
     sha(signature)!==a.signature_sha256.trim())throw invalid('Integridade da assinatura invalida');
  const pdf=buildPdf(order,a,signature);
  if(pdf.length>4*1024*1024)throw invalid('PDF excede o tamanho permitido');
  const path='signed/'+id+'/'+a.id+'.pdf';
  await storage(path,'POST',pdf);
  let rows;
  try{rows=await supabaseFetch('/rest/v1/aceite_generated_documents?select=id',{
   method:'POST',headers:{Prefer:'return=representation'},body:{
    order_id:id,acceptance_id:a.id,document_type:'level1_acceptance',
    version:1,storage_path:path,file_sha256:sha(pdf)
   }});}catch(error){
    // Another request may have committed the unique (order,type,version) record first.
    const winner=await supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.'+id+
      '&document_type=eq.level1_acceptance&version=eq.1&select=id,acceptance_id,storage_path,file_sha256&limit=1');
    const record=winner?.[0];
    if(record?.acceptance_id===a.id&&record.storage_path===path){
      const archived=await storage(path);
      if(sha(archived)===record.file_sha256?.trim())
       return respond(200,{documentId:record.id,sha256:record.file_sha256.trim(),created:false});
    }
    throw error;
   }
  if(!rows?.[0]?.id)throw invalid('Registro do documento nao confirmado',503);
  return respond(201,{documentId:rows[0].id,sha256:sha(pdf),created:true});
 }catch(error){return handleError(error)}
};
