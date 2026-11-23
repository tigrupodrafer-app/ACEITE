'use strict';
// Registra pareceres internos sobre MINUTAS (sem homologacao juridica ou assinatura).
const { respond, requireStaff, supabaseFetch, handleError } = require('./_lib/backend.cjs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const ITEMS = [
  'texto_garantia','direitos_consumidor','responsabilidades','regras_sic',
  'empresa_emitente','diagramas_tecnicos','dados_pedido','assinatura_evidencias',
];
async function orderById(id) {
  const rows = await supabaseFetch('/rest/v1/aceite_orders?id=eq.' + id +
    '&select=id,status,origin,details&limit=1');
  const order = rows?.[0];
  if (!order || order.status !== 'rascunho' || order.origin !== 'SIC_SUPRASYS' ||
      order.details?.draftOnly !== true || order.details?.legalDocumentApproved !== false) {
    throw invalid('Pedido nao disponivel para revisao interna', 409);
  }
  return order;
}
async function latestDocument(id) {
  const rows = await supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.' + id +
    '&document_type=eq.review_draft&select=id,order_id,version,file_sha256&order=version.desc&limit=1');
  const doc = rows?.[0];
  if (!doc || !UUID.test(doc.id || '') || !Number.isInteger(doc.version) ||
      !/^[0-9a-f]{64}$/.test((doc.file_sha256 || '').trim())) {
    throw invalid('Gere uma minuta PDF versionada antes de registrar parecer', 409);
  }
  return doc;
}
exports.handler = async (event) => {
  try {
    if (!['GET','POST'].includes(event.httpMethod)) throw invalid('Metodo nao permitido',405);
    const { authUser, member } = await requireStaff(event);
    if (member.role !== 'admin') throw invalid('Somente administradores podem registrar pareceres',403);
    let input = {};
    if (event.httpMethod === 'POST') {
      if ((event.body || '').length > 4600) throw invalid('Formulario grande demais',400);
      try { input = JSON.parse(event.body || '{}'); } catch { throw invalid('Formulario invalido',400); }
    } else input = event.queryStringParameters || {};
    const id = input.draftId;
    if (!UUID.test(id || '')) throw invalid('Rascunho invalido',400);
    await orderById(id);
    const doc = await latestDocument(id);
    const BASE = '/rest/v1/aceite_document_reviews';
    if (event.httpMethod === 'GET') {
      const rows = await supabaseFetch(BASE + '?order_id=eq.' + id +
        '&select=id,document_id,document_version,document_sha256,assessment,notes,checklist,created_at' +
        '&order=created_at.desc&limit=30');
      return respond(200, {
        latestDocument: { id: doc.id, version: doc.version, sha256: doc.file_sha256.trim() },
        reviews: (rows || []).map(r => ({
          id:r.id, documentId:r.document_id, documentVersion:r.document_version,
          assessment:r.assessment, notes:r.notes, checklist:r.checklist, createdAt:r.created_at,
          isCurrentDocument:r.document_id===doc.id,
        })),
        legalApprovalEnabled:false, publicSigningEnabled:false,
      });
    }
    if (input.documentId !== doc.id) throw invalid('Documento desatualizado. Revise a ultima versao.',409);
    const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
    if (notes.length < 15 || notes.length > 2000) throw invalid('Registre observacoes entre 15 e 2000 caracteres',422);
    if (!['ajustes_solicitados','parecer_registrado'].includes(input.assessment)) {
      throw invalid('Resultado de revisao invalido',422);
    }
    if (!input.checklist || typeof input.checklist !== 'object' || Array.isArray(input.checklist) ||
        Object.keys(input.checklist).some(k => !ITEMS.includes(k)) ||
        Object.values(input.checklist).some(v=>typeof v !== 'boolean')) {
      throw invalid('Checklist invalido',422);
    }
    const checklist={};
    for (const key of ITEMS) checklist[key]=input.checklist[key]===true;
    const rows = await supabaseFetch(BASE+'?select=id,created_at,assessment,document_version',{
      method:'POST',headers:{Prefer:'return=representation'},
      body:{
        order_id:id,document_id:doc.id,document_version:doc.version,
        document_sha256:doc.file_sha256.trim(),reviewer_id:authUser.id,
        assessment:input.assessment,notes,checklist,
      },
    });
    if (!rows?.[0]?.id) throw new Error('Review was not recorded');
    // Parecer, inclusive favoravel, NUNCA altera status de ordem, libera documento ou cria token.
    return respond(201,{
      reviewId:rows[0].id,documentId:doc.id,documentVersion:doc.version,
      assessment:rows[0].assessment,createdAt:rows[0].created_at,
      legalApprovalEnabled:false, publicSigningEnabled:false,
      message:'Parecer interno registrado. A homologacao juridica formal e a assinatura seguem bloqueadas.',
    });
  } catch (error) {return handleError(error);}
};
