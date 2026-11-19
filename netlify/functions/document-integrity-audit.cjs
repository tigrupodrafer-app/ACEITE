'use strict';
// Auditoria somente leitura de PDFs preliminares de um rascunho SIC.
// Nao gera PDFs, nao aprova termos, nao cria tokens e nao habilita assinaturas.
const { createHash } = require('node:crypto');
const { respond, requireStaff, supabaseFetch, getSecretConfig, handleError, onlyMethod } = require('./_lib/backend.cjs');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/i;
const MAX_BYTES = 4 * 1024 * 1024;
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

async function checkStoredPdf(doc) {
  if (!HASH.test(doc.file_sha256 || '') ||
      !/^reviews\/[0-9a-f-]{36}\/v[0-9]{1,2}-[0-9a-f-]{36}\.pdf$/i.test(doc.storage_path || '')) {
    return { version: doc.version, status: 'metadados_invalidos' };
  }
  const { url, key } = getSecretConfig();
  const response = await fetch(url + '/storage/v1/object/aceite-privado/' + doc.storage_path, {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return { version: doc.version, status: 'arquivo_indisponivel' };
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BYTES) {
    await response.body?.cancel();
    return { version: doc.version, status: 'arquivo_excede_limite' };
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > MAX_BYTES) {
      await response.body?.cancel().catch(() => {});
      return { version: doc.version, status: 'arquivo_excede_limite' };
    }
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks, total);
  const pdfHeader = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  return {
    version: doc.version,
    status: pdfHeader && actualHash === doc.file_sha256.toLowerCase()
      ? 'integro' : 'divergente',
  };
}

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    const { member } = await requireStaff(event, { allowedRoles: ['admin'] });
    if (member.role !== 'admin') throw fail('Acesso restrito', 403);
    const draftId = event.queryStringParameters?.draftId;
    if (!UUID.test(draftId || '')) throw fail('Rascunho invalido');
    const orders = await supabaseFetch('/rest/v1/aceite_orders?id=eq.' + draftId +
      '&select=id,origin,details&limit=1');
    if (orders?.[0]?.origin !== 'SIC_SUPRASYS' || orders[0].details?.draftOnly !== true) {
      throw fail('Rascunho SIC indisponivel', 404);
    }
    const docs = await supabaseFetch('/rest/v1/aceite_generated_documents?order_id=eq.' + draftId +
      '&document_type=eq.review_draft&select=id,version,file_sha256,storage_path&order=version.asc&limit=21');
    if (!Array.isArray(docs) || docs.length === 0) throw fail('Nenhum PDF preliminar encontrado', 404);
    if (docs.length > 20) throw fail('Quantidade de documentos excede limite de auditoria', 409);
    const results = [];
    for (const doc of docs) {
      try {
        results.push(await checkStoredPdf(doc));
      } catch {
        results.push({ version: doc.version, status: 'falha_verificacao' });
      }
    }
    return respond(200, {
      draftId,
      documentCount: results.length,
      allIntegrityChecksPassed: results.every(r => r.status === 'integro'),
      documents: results,
      auditScope: 'bytes_pdf_armazenados_vs_sha256_registrado',
      legalApproved: false,
      publicSigningEnabled: false,
    });
  } catch (error) { return handleError(error); }
};
