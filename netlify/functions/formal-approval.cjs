'use strict';
// Formal dual-scope decisions over review PDFs. DOES NOT enable public signatures.
const { respond, requireStaff, supabaseFetch, handleError } = require('./_lib/backend.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid=(msg,code=400)=>Object.assign(new Error(msg),{statusCode:code});
const BASE='/rest/v1/aceite_formal_approvals';
async function getOrder(id) {
  const rows=await supabaseFetch('/rest/v1/aceite_orders?id=eq.'+id+
    '&select=id,origin,status,sic_company_id,details&limit=1');
  const o=rows?.[0];
  if(!o||o.origin!=='SIC_SUPRASYS'||o.status!=='rascunho'||
    o.details?.draftOnly!==true||o.details?.legalDocumentApproved!==false||
    !Number.isInteger(o.sic_company_id)||o.sic_company_id<=0)
    throw invalid('Pedido nao disponivel para aprovacao',409);
  return o;
}
async function latestDoc(id) {
  const rows=await supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.'+id+
    '&document_type=eq.review_draft&select=id,order_id,version,file_sha256&order=version.desc&limit=1');
  const d=rows?.[0];
  if(!d||!UUID.test(d.id||'')||!/^[0-9a-f]{64}$/.test((d.file_sha256||'').trim()))
    throw invalid('Gere e revise o PDF integral antes da aprovacao',409);
  return d;
}
async function decisions(id) {
  const data=await supabaseFetch(BASE+'?order_id=eq.'+id+
    '&select=id,document_id,document_version,document_sha256,scope,decision,created_at&order=created_at.desc&limit=40');
  return data||[];
}
async function authority(userId,company) {
  const data=await supabaseFetch('/rest/v1/aceite_approval_authorizers?user_id=eq.'+userId+
    '&sic_company_id=eq.'+company+'&active=eq.true&select=scope&limit=2');
  return (data||[]).map(x=>x.scope).filter(x=>['juridico','comercial'].includes(x));
}
function summarize(doc,rows) {
  const active=rows.filter(x=>x.document_id===doc.id);
  const legal=active.find(x=>x.scope==='juridico');
  const commercial=active.find(x=>x.scope==='comercial');
  return {
    legalDecision:legal?.decision||'pendente',
    commercialDecision:commercial?.decision||'pendente',
    bothApproved:legal?.decision==='aprovado'&&commercial?.decision==='aprovado',
    signingEnabled:false,finalDocumentIssued:false,
  };
}
exports.handler=async(event)=>{
  try{
    if(!['GET','POST'].includes(event.httpMethod))throw invalid('Metodo nao permitido',405);
    const {authUser,member}=await requireStaff(event, { allowedRoles: ['admin', 'aprovador'] });
    if(!['admin','aprovador'].includes(member.role))throw invalid('Acesso restrito a aprovadores',403);
    let input={};
    if(event.httpMethod==='POST') {
      if((event.body||'').length>4200)throw invalid('Formulario muito grande',400);
      try{input=JSON.parse(event.body||'{}');}catch{throw invalid('Formulario invalido',400);}
    }else input=event.queryStringParameters||{};
    if(!UUID.test(input.draftId||''))throw invalid('Pedido invalido',400);
    const o=await getOrder(input.draftId);
    const d=await latestDoc(o.id);
    const [current, scopes]=await Promise.all([decisions(o.id),authority(authUser.id,o.sic_company_id)]);
    if(event.httpMethod==='GET'){
      return respond(200,{
        document:{id:d.id,version:d.version,sha256:d.file_sha256.trim()},
        scopes,decisions:current.map(x=>({
          id:x.id,documentId:x.document_id,documentVersion:x.document_version,
          scope:x.scope,decision:x.decision,createdAt:x.created_at,
          isCurrentDocument:x.document_id===d.id,
        })),
        status:summarize(d,current),
      });
    }
    if(input.documentId!==d.id||input.documentSha256!==d.file_sha256.trim())
      throw invalid('Versao/hash desatualizados: reabra o documento',409);
    if(!['juridico','comercial'].includes(input.scope)||!scopes.includes(input.scope))
      throw invalid('Responsavel nao nomeado para esta empresa e etapa',403);
    if(!['aprovado','reprovado'].includes(input.decision))
      throw invalid('Decisao invalida',422);
    const note=typeof input.justification==='string'?input.justification.trim():'';
    if(note.length<30||note.length>3000||input.declarationAccepted!==true)
      throw invalid('Informe justificativa de 30 a 3000 caracteres e confirme a declaracao',422);
    if(current.some(x=>x.document_id===d.id&&x.scope===input.scope))
      throw invalid('Esta etapa ja tem decisao formal para esta versao; gere uma nova versao se necessario',409);
    // The DB enforces one decision per scope and one scope per approver for this document.
    // An appointed authority is required. Nothing here writes to orders/tokens/acceptances.
    const saved=await supabaseFetch(BASE+'?select=id,scope,decision,created_at',{
      method:'POST',headers:{Prefer:'return=representation'},
      body:{
        order_id:o.id,document_id:d.id,document_version:d.version,
        document_sha256:d.file_sha256.trim(),sic_company_id:o.sic_company_id,
        scope:input.scope,decision:input.decision,approver_id:authUser.id,
        justification:note,declaration_accepted:true,
      },
    });
    if(!saved?.[0]?.id)throw new Error('Formal decision not recorded');
    return respond(201,{
      approvalId:saved[0].id,scope:saved[0].scope,decision:saved[0].decision,
      createdAt:saved[0].created_at,documentId:d.id,documentVersion:d.version,
      signingEnabled:false,finalDocumentIssued:false,
      message:'Decisao formal registrada na versao revisada. Assinatura publica continua bloqueada.',
    });
  }catch(error){return handleError(error);}
};
