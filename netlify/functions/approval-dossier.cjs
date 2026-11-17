'use strict';
// Dossie probatorio INTERNO. Nunca constitui termo final, aceite do cliente ou liberacao de fabricacao.
const {createHash,randomUUID}=require('node:crypto');
const {jsPDF}=require('jspdf');
const {respond,requireStaff,supabaseFetch,getSecretConfig,handleError}=require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[0-9a-f]{64}$/;
const TABLE='/rest/v1/aceite_approval_dossiers';
const invalid=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
const sha=(bytes)=>createHash('sha256').update(bytes).digest('hex');

function pdfForDossier(order,doc,legal,commercial){
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
 const pageW=pdf.internal.pageSize.getWidth();
 const pageH=pdf.internal.pageSize.getHeight();
 let y=25;
 function header(){
   pdf.setTextColor(170,20,20);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
   pdf.text('DOSSIE INTERNO - NAO E TERMO FINAL / NAO ENVIAR AO CLIENTE',15,12);
   pdf.setDrawColor(170,20,20);pdf.line(15,16,pageW-15,16);pdf.setTextColor(20,20,20);
 }
 function line(t,bold=false,size=10){
   pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
   for(const row of pdf.splitTextToSize(String(t??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\r\n\t]/g,' ').slice(0,4000),pageW-30)){
     if(y>pageH-25){pdf.addPage();header();y=26;}
     pdf.text(row,15,y);y+=size>11?8:5.6;
   }
   y+=2;
 }
 header();
 line('ACEITE DRAFER - DOSSIE DE HOMOLOGACAO INTERNA',true,15);
 line('Este registro comprova decisoes sobre a MINUTA revisada. NAO aprova automaticamente clausulas legais, NAO autoriza fabricacao e NAO habilita assinaturas.',true);
 line('Pedido SIC: '+order.sic_order_number+' | Empresa: '+order.sic_company_id,true);
 line('Cliente: '+order.client_name);
 line('Minuta original: v'+doc.version+' | Documento: '+doc.id,true);
 line('SHA-256 da minuta: '+doc.file_sha256.trim());
 for(const [label,rec] of [['JURIDICO',legal],['COMERCIAL',commercial]]){
   y+=6;
   line('DECISAO '+label,true,12);
   line('Decisao: '+rec.decision,true);
   line('ID da decisao: '+rec.id);
   line('Responsavel (UUID): '+rec.approver_id);
   line('Data e hora (UTC): '+rec.created_at);
   line('Justificativa:');
   line(rec.justification);
 }
 y+=6;
 line('CONFERENCIA DE INTEGRIDADE',true,12);
 line('As duas decisoes se referem ao mesmo pedido, documento, versao e SHA-256 da minuta.');
 line('Para conferir o documento original, utilize o PDF arquivado em area privada e seu SHA-256.');
 line('PENDENTE: documento juridico definitivo, validacao de elegibilidade do SIC e fluxo de assinatura.',true);
 line('SEM AUTORIZACAO DE PRODUCAO OU ENVIO AO CLIENTE.',true);
 for(let i=1;i<=pdf.getNumberOfPages();i++){
   pdf.setPage(i);pdf.setTextColor(170,20,20);pdf.setFontSize(8);
   pdf.text('DOSSIER INTERNO - pagina '+i+'/'+pdf.getNumberOfPages(),15,pageH-8);
 }
 return Buffer.from(pdf.output('arraybuffer'));
}
async function latestDocument(orderId){
 const docs=await supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.'+orderId+
 '&document_type=eq.review_draft&select=id,version,file_sha256&order=version.desc&limit=1');
 const doc=docs?.[0];
 if(!doc||!UUID.test(doc.id||'')||!Number.isInteger(doc.version)||!HASH.test((doc.file_sha256||'').trim()))
   throw invalid('Nenhuma minuta versionada disponivel.');
 return doc;
}
async function readDossier(docId){
 const rows=await supabaseFetch(TABLE+'?document_id=eq.'+docId+
 '&select=id,document_id,document_version,document_sha256,dossier_sha256,storage_path,generated_at&limit=1');
 return rows?.[0]||null;
}
async function getApprovalState(order,doc){
 const records=await supabaseFetch('/rest/v1/aceite_formal_approvals?document_id=eq.'+doc.id+
 '&select=id,order_id,document_id,document_version,document_sha256,sic_company_id,scope,decision,approver_id,justification,created_at&limit=4');
 const valid=(records||[]).filter(a=>a.order_id===order.id&&a.document_id===doc.id&&
   a.document_version===doc.version&&a.document_sha256?.trim()===doc.file_sha256.trim()&&
   a.sic_company_id===order.sic_company_id&&a.decision==='aprovado'&&UUID.test(a.approver_id||''));
 const legal=valid.find(a=>a.scope==='juridico');
 const commercial=valid.find(a=>a.scope==='comercial');
 if(!legal||!commercial||legal.approver_id===commercial.approver_id)
   throw invalid('Aguardando duas decisoes favoraveis independentes sobre esta mesma versao.');
 // Nomeacoes devem continuar validas no momento da emissao.
 for(const a of [legal,commercial]){
   const assigned=await supabaseFetch('/rest/v1/aceite_approval_authorizers?user_id=eq.'+
     a.approver_id+'&sic_company_id=eq.'+order.sic_company_id+'&scope=eq.'+a.scope+
     '&active=eq.true&select=user_id&limit=1');
   if(!assigned?.length)throw invalid('Nomeacao do aprovador nao esta mais ativa.');
 }
 return {legal,commercial};
}
async function store(path,bytes){
 const {url,key}=getSecretConfig();
 const response=await fetch(url+'/storage/v1/object/aceite-privado/'+path,{
   method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,
     'Content-Type':'application/pdf','Cache-Control':'no-store','x-upsert':'false'},
   body:bytes,signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw Error('Storage write failed');
}
async function retrieve(path){
 if(!/^dossiers\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/i.test(path))throw invalid('Arquivo invalido',422);
 const {url,key}=getSecretConfig();
 const response=await fetch(url+'/storage/v1/object/aceite-privado/'+path,{
   headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000),
 });
 if(!response.ok)throw Error('Storage read failed');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>4*1024*1024)throw Error('File exceeds size limit');
 return bytes;
}
exports.handler=async(event)=>{
 try{
   if(!['GET','POST'].includes(event.httpMethod))throw invalid('Metodo nao permitido',405);
   const {authUser,member}=await requireStaff(event,{allowedRoles:['admin']});
   if(member.role!=='admin')throw invalid('Somente a administracao pode emitir dossies',403);
   let id;
   if(event.httpMethod==='POST'){
     if((event.body||'').length>250)throw invalid('Requisicao grande demais',400);
     let body;try{body=JSON.parse(event.body||'{}');}catch{throw invalid('JSON invalido',400);}
     id=body.draftId;
   }else id=event.queryStringParameters?.draftId;
   if(!UUID.test(id||''))throw invalid('Pedido invalido',400);
   const orders=await supabaseFetch('/rest/v1/aceite_orders?id=eq.'+id+
    '&select=id,origin,status,sic_company_id,sic_order_number,client_name,details&limit=1');
   const order=orders?.[0];
   if(!order||order.origin!=='SIC_SUPRASYS'||order.status!=='rascunho'||
      order.details?.draftOnly!==true||order.details?.legalDocumentApproved!==false)
     throw invalid('Pedido fora do fluxo de homologacao');
   const doc=await latestDocument(order.id);
   const current=await readDossier(doc.id);
   if(event.httpMethod==='GET'){
     if(!current)return respond(200,{available:false,signingEnabled:false,finalDocumentIssued:false});
     if(event.queryStringParameters?.download==='1'){
       const bytes=await retrieve(current.storage_path);
       if(sha(bytes)!==current.dossier_sha256.trim())throw Error('Dossier integrity failure');
       return {statusCode:200,isBase64Encoded:true,headers:{
         'Content-Type':'application/pdf','Cache-Control':'private,no-store',
         'Content-Disposition':'attachment; filename="dossie-interno-'+order.sic_order_number+
           '-v'+current.document_version+'.pdf"','X-Content-Type-Options':'nosniff'
       },body:bytes.toString('base64')};
     }
     return respond(200,{available:true,dossierId:current.id,version:current.document_version,
       sha256:current.dossier_sha256.trim(),sourceDocumentSha256:current.document_sha256.trim(),
       generatedAt:current.generated_at,signingEnabled:false,finalDocumentIssued:false});
   }
   if(current)return respond(200,{available:true,dossierId:current.id,version:current.document_version,
     sha256:current.dossier_sha256.trim(),created:false,signingEnabled:false,finalDocumentIssued:false});
   const {legal,commercial}=await getApprovalState(order,doc);
   const pdf=pdfForDossier(order,doc,legal,commercial);
   if(pdf.length>4*1024*1024)throw Error('Dossier too large');
   const hash=sha(pdf);
   const path='dossiers/'+order.id+'/'+randomUUID()+'.pdf';
   await store(path,pdf);
   let inserted;
   try{
     inserted=await supabaseFetch(TABLE+'?select=id,generated_at',{
       method:'POST',headers:{Prefer:'return=representation'},body:{
         order_id:order.id,document_id:doc.id,document_version:doc.version,
         document_sha256:doc.file_sha256.trim(),legal_approval_id:legal.id,
         commercial_approval_id:commercial.id,dossier_sha256:hash,storage_path:path,
         generated_by:authUser.id,
       }
     });
   }catch(e){
     const existing=await readDossier(doc.id);
     if(existing)return respond(200,{available:true,dossierId:existing.id,version:existing.document_version,
       sha256:existing.dossier_sha256.trim(),created:false,signingEnabled:false,finalDocumentIssued:false});
     throw e;
   }
   if(!inserted?.[0]?.id)throw Error('Dossier record missing');
   await supabaseFetch('/rest/v1/aceite_audit_events',{
     method:'POST',body:{order_id:order.id,actor_type:'usuario',actor_id:authUser.id,
       action:'internal_approval_dossier_generated',
       metadata:{dossierId:inserted[0].id,documentId:doc.id,version:doc.version,
         sourceSha256:doc.file_sha256.trim(),dossierSha256:hash,reviewOnly:true}}
   });
   return respond(201,{available:true,dossierId:inserted[0].id,version:doc.version,sha256:hash,
     created:true,signingEnabled:false,finalDocumentIssued:false,
     message:'Dossie interno arquivado. Termo final e assinatura permanecem bloqueados.'});
 }catch(err){return handleError(err);}
};
