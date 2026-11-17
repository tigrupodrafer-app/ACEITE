'use strict';
// Private versioned PRELIMINARY document. It is NOT a signed or approved legal term.
// The service key is used on the backend only; all routes require verified staff.
const { createHash, randomUUID } = require('node:crypto');
const { jsPDF } = require('jspdf');
const { sections, diagrams, legalWarnings, consent, reviewFlags } = require('./_lib/legal-term-original.cjs');
const { respond, requireStaff, supabaseFetch, getSecretConfig, handleError } = require('./_lib/backend.cjs');

const ORDER = '/rest/v1/aceite_orders';
const DOCS = '/rest/v1/aceite_generated_documents';
const BUCKET = 'aceite-privado';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const invalid = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

function formatBRL(v) {
  const n = Number(v);
  return v != null && Number.isFinite(n) ? n.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  }) : 'Nao informado';
}
function clean(value) {
  return String(value ?? 'Nao informado')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\r\n\t\u0000-\u001f]/g, ' ').slice(0, 400);
}
function dateBR(value) {
  if (!value) return 'Nao informada';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? clean(value) :
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(d);
}
function pdfForReview(order, version) {
  const snapshot = order.order_snapshot;
  const pedido = snapshot.pedidoCompleto;
  const items = snapshot.itens;
  const validacao = snapshot.validacao;
  if (!pedido || !Array.isArray(items) || !items.length || items.length > 200 ||
      validacao?.valido !== true || String(pedido.numero) !== String(order.sic_order_number) ||
      Number(pedido.empresa) !== Number(order.sic_company_id)) {
    throw invalid('O rascunho SIC esta incompleto ou inconsistente', 422);
  }
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const margin = 17;
  let y = 26;
  function header() {
    pdf.setTextColor(160, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('MINUTA INTERNA - NAO ASSINAR / NAO ENVIAR AO CLIENTE', margin, 12);
    pdf.setDrawColor(160, 0, 0);
    pdf.line(margin, 15, w - margin, 15);
    pdf.setTextColor(20, 20, 20);
  }
  function p(str, opts = {}) {
    const size = opts.size || 10;
    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(clean(str), w - margin * 2);
    for (const line of lines) {
      if (y > h - 25) { pdf.addPage(); header(); y = 26; }
      pdf.text(line, margin, y);
      y += size >= 12 ? 7.3 : 5.6;
    }
    y += opts.after ?? 2.5;
  }
  header();
  p('DRAFER ACEITE - DOCUMENTO DE REVISAO DO PEDIDO', { size: 14, bold: true });
  p('Versao documental: ' + version + ' | Documento nao aprovado juridicamente.', { bold: true });
  p('Esta copia e exclusivamente para conferencia administrativa. Nao e aceite, contrato assinado nem autorizacao de fabricacao.');
  p('Pedido: ' + order.order_number + ' | Empresa SIC: ' + order.sic_company_id, { bold: true });
  p('Cliente: ' + order.client_name);
  p('Codigo do cliente: ' + clean(pedido.cliente?.codigo));
  p('Data do pedido: ' + dateBR(pedido.dataPedido));
  p('Previsao de entrega: ' + dateBR(pedido.dataEntrega));
  p('Situacao SIC: ' + clean(pedido.situacao) + ' | Liberado: ' + clean(pedido.liberado));
  p('1. ITENS CONSULTADOS NO SIC', { size: 12, bold: true });
  for (const [index, item] of items.entries()) {
    p((index + 1) + '. ' + clean(item.descricao), { bold: true });
    p('Codigo comercial: ' + clean(item.codigoProdutoComercial) +
      ' | Sequencia interna: ' + clean(item.codigoProdutoInterno ?? item.codigoProduto) +
      ' | Referencia fornecedor: ' + clean(item.referenciaFornecedor));
    p('Quantidade base: ' + clean(item.quantidade) + ' ' + clean(item.unidade) +
      ' | Peso liquido: ' + clean(item.pesoLiquidoKg) + ' kg | Pecas: ' + clean(item.quantidadePecas));
    p('Valor unitario base: ' + formatBRL(item.valorUnitario) +
      ' | Por peca: ' + formatBRL(item.valorUnitarioPeca) +
      ' | Total item: ' + formatBRL(item.valorTotal));
  }
  p('Subtotal: ' + formatBRL(pedido.valores?.subtotal) +
    ' | Desconto: ' + formatBRL(pedido.valores?.desconto) +
    ' | Total: ' + formatBRL(pedido.valores?.total), { bold: true });
  p('Conferencia aritmetica: ' + (validacao.valido === true ? 'APROVADA' : 'PENDENTE'));

  p('TERMO DE GARANTIA, ARMAZENAGEM, MANUSEIO E INSTALACAO DE TELHAS', { size: 13, bold: true });
  p('GRUPO DRAFER', { bold: true });
  p('Este termo estabelece as condicoes de garantia, responsabilidade, armazenamento, manuseio, transporte e instalacao das telhas fornecidas pelo GRUPO DRAFER. Aplica-se a: Telhas Galvalume, Telhas de Aco Natural, Telhas Pre-Pintadas e Telhas Termoacusticas.');
  p('NOTA: Texto da versao original preservado exclusivamente para revisao. As clausulas nao estao juridicamente aprovadas e podem nao se aplicar a todos os materiais do pedido.', { bold: true });

  for (const section of sections) {
    if (y > h - 40) { pdf.addPage(); header(); y = 26; }
    p(section.heading, { size: 12, bold: true, after: 4 });
    for (const t of section.paragraphs || []) p(t);
    for (const list of section.lists || []) {
      if (list.intro) p(list.intro, { bold: true });
      for (const item of list.items) p('- ' + item, { after: 0.8 });
      y += 3;
    }
    for (const t of section.after || []) p(t, { bold: true });
    for (const sub of section.subsections || []) {
      p(sub.title, { bold: true, after: 1.5 });
      if (sub.text) p(sub.text);
      for (const t of sub.bullets || []) p('- ' + t, { after: 0.8 });
    }
    y += 3;
  }

  p('DIAGRAMAS TECNICOS DE INSTALACAO - ILUSTRACOES ORIGINAIS', { size: 12, bold: true });
  p('Os esquemas abaixo sao ilustrativos; necessitam validacao por responsavel tecnico, conforme o perfil e o produto.', { bold: true });
  for (const diagram of diagrams) {
    if (y > h - 65) { pdf.addPage(); header(); y = 26; }
    p(diagram.title, { size: 11, bold: true });
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    for (const str of diagram.lines) {
      if (y > h - 24) { pdf.addPage(); header(); y = 26; }
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(8);
      const ascii = String(str).slice(0, 74);
      pdf.text(ascii, margin + 2, y);
      y += 4.6;
    }
    y += 6;
  }

  p('AVISO LEGAL - LEIA ATENTAMENTE (TEXTO ORIGINAL EM REVISAO)', { size: 12, bold: true });
  p('ATENCAO - IMPORTANTE. O cliente declara estar ciente de que:');
  for (const warning of legalWarnings) p('- ' + warning);
  p('DECLARACAO ORIGINAL - NAO DISPONIVEL PARA ASSINATURA:', { bold: true });
  p(consent);
  p('BOTAO ORIGINAL: ACEITAR E AUTORIZAR PRODUCAO DE TELHAS (DESABILITADO)', { bold: true });

  p('PONTOS DE REVISAO JURIDICA E TECNICA', { size: 12, bold: true });
  for (const issue of reviewFlags) p('[ ] ' + issue, { after: 1 });
  p('[ ] Validar interpretacao de SITU, faturamento e elegibilidade de fabricacao no SIC.');
  p('[ ] Conferir empresa emitente, documento fiscal, identificacao do cliente e dados obrigatorios.');
  p('[ ] Homologar texto final, versionamento, assinatura, evidencias e direitos do consumidor.');
  p('NAO ASSINAR - NAO ENVIAR AO CLIENTE - NAO AUTORIZA FABRICACAO.', { bold: true });
  const count = pdf.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(160, 0, 0);
    pdf.text('MINUTA DE REVISAO v' + version + ' - Pagina ' + i + '/' + count, margin, h - 9);
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
async function storageUpload(path, content) {
  const { url, key } = getSecretConfig();
  const res = await fetch(url + '/storage/v1/object/' + BUCKET + '/' + path, {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key,
      'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'x-upsert': 'false' },
    body: content,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('Private document storage failed');
}
async function storageDownload(path) {
  const { url, key } = getSecretConfig();
  if (!/^reviews\/[0-9a-f-]{36}\/v[0-9]{1,2}-[0-9a-f-]{36}\.pdf$/i.test(path)) {
    throw invalid('Caminho do documento invalido', 422);
  }
  const res = await fetch(url + '/storage/v1/object/' + BUCKET + '/' + path, {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('Private document read failed');
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > 4 * 1024 * 1024) throw new Error('Document too large');
  return bytes;
}
async function orderById(id) {
  const rows = await supabaseFetch(ORDER + '?id=eq.' + id +
    '&select=id,order_number,origin,sic_company_id,sic_order_number,client_name,order_snapshot,status,details&limit=1');
  return rows?.[0];
}
async function versions(id) {
  return (await supabaseFetch(DOCS + '?order_id=eq.' + id +
    '&document_type=eq.review_draft&select=id,version,file_sha256,storage_path,created_at&order=version.desc&limit=30')) || [];
}
exports.handler = async (event) => {
  try {
    if (!['POST', 'GET'].includes(event.httpMethod)) throw invalid('Metodo nao permitido', 405);
    const { authUser, member } = await requireStaff(event);
    // Restrict document issuance/reading to administrators in this phase.
    if (member.role !== 'admin') throw invalid('Somente administradores podem preparar documentos', 403);
    let id;
    let newVersion = false;
    if (event.httpMethod === 'POST') {
      if ((event.body || '').length > 400) throw invalid('Corpo muito grande', 400);
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch { throw invalid('JSON invalido', 400); }
      id = body.draftId;
      newVersion = body.newVersion === true;
    } else {
      id = event.queryStringParameters?.draftId;
    }
    if (!UUID.test(id || '')) throw invalid('Identificador de rascunho invalido', 400);
    const order = await orderById(id);
    if (!order || order.origin !== 'SIC_SUPRASYS' || order.status !== 'rascunho' ||
        order.details?.draftOnly !== true || order.details?.legalDocumentApproved !== false) {
      throw invalid('Pedido indisponivel para revisao', 409);
    }
    const docs = await versions(id);
    const latest = docs[0];
    if (event.httpMethod === 'GET') {
      if (!latest) return respond(404, { error: 'Nenhuma minuta arquivada' });
      if (event.queryStringParameters?.download === '1') {
        const bytes = await storageDownload(latest.storage_path);
        if (sha(bytes) !== latest.file_sha256.trim()) throw new Error('Document integrity check failed');
        return { statusCode: 200, isBase64Encoded: true, headers: {
          'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
          'Content-Disposition': 'attachment; filename="minuta-revisao-' +
            order.order_number + '-v' + latest.version + '.pdf"',
          'X-Content-Type-Options': 'nosniff',
        }, body: bytes.toString('base64') };
      }
      return respond(200, { documentId: latest.id, version: latest.version,
        sha256: latest.file_sha256.trim(), createdAt: latest.created_at,
        reviewOnly: true, signingEnabled: false });
    }
    if (latest && !newVersion) return respond(200, {
      documentId: latest.id, version: latest.version,
      sha256: latest.file_sha256.trim(), createdAt: latest.created_at,
      reviewOnly: true, signingEnabled: false, created: false,
    });
    if (docs.length >= 20 || (newVersion && !latest)) throw invalid('Limite ou sequencia de versoes invalida', 409);
    const version = latest ? latest.version + 1 : 1;
    const pdf = pdfForReview(order, version);
    if (pdf.length > 4 * 1024 * 1024) throw new Error('Document too large');
    const hash = sha(pdf);
    const path = 'reviews/' + id + '/v' + version + '-' + randomUUID() + '.pdf';
    await storageUpload(path, pdf);
    const rows = await supabaseFetch(DOCS + '?select=id,version,file_sha256,created_at', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: { order_id: id, document_type: 'review_draft', version,
        storage_path: path, file_sha256: hash },
    });
    if (!rows?.[0]?.id) throw new Error('Document registration failed');
    await supabaseFetch('/rest/v1/aceite_audit_events', {
      method: 'POST',
      body: { order_id: id, actor_type: 'usuario', actor_id: authUser.id,
        action: 'review_draft_document_generated', metadata: {
          documentId: rows[0].id, version, sha256: hash, reviewOnly: true,
        } },
    });
    return respond(201, { documentId: rows[0].id, version, sha256: hash,
      createdAt: rows[0].created_at, reviewOnly: true, signingEnabled: false, created: true });
  } catch (error) { return handleError(error); }
};
