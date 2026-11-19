'use strict';
// Consulta somente leitura do estado de homologacao da VERSAO JURIDICA.
// Nao consulta aprovacao por pedido e nunca libera assinatura.
const { createHash } = require('node:crypto');
const legal = require('../../src/lib/legalTermRevised.json');
const { respond, requireStaff, supabaseFetch, handleError, onlyMethod } = require('./_lib/backend.cjs');

const legalHash = createHash('sha256').update(JSON.stringify(legal), 'utf8').digest('hex');

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    const { member } = await requireStaff(event, { allowedRoles: ['admin', 'aprovador'] });
    if (!['admin','aprovador'].includes(member.role)) {
      return respond(403, {error:'Acesso restrito'});
    }
    // Fail closed: tabela ainda pode nao existir ate a migracao ser homologada.
    let entries;
    try {
      entries = await supabaseFetch('/rest/v1/aceite_legal_versions?version=eq.' +
        encodeURIComponent(legal.version) + '&content_sha256=eq.' + legalHash +
        '&select=id,version,status,approved_at,created_at&limit=2');
    } catch {
      return respond(200, {
        version: legal.version, contentSha256: legalHash, status: 'infraestrutura_pendente',
        approved: false, signingEnabled: false,
      });
    }
    const approved = Array.isArray(entries) &&
      entries.length === 1 && entries[0].status === 'homologado';
    return respond(200, {
      version: legal.version, contentSha256: legalHash,
      status: approved ? 'homologado' : 'pendente',
      approved, approvedAt: approved ? entries[0].approved_at : null,
      signingEnabled: false,
      note: 'Homologacao juridica por versao nao substitui validacao de pedido e assinatura.',
    });
  } catch (error) { return handleError(error); }
};
