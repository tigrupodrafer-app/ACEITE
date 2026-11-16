'use strict';
const crypto = require('node:crypto');
const { respond, supabaseFetch, handleError } = require('./_lib/backend.cjs');
const BASE = '/rest/v1/aceite_sic_requests';

function err(msg, code) { return Object.assign(new Error(msg), { statusCode: code }); }
function digest(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

function authorize(event) {
  const configured = process.env.SIC_BRIDGE_TOKEN;
  const supplied = event.headers?.['x-sic-bridge-token'] || event.headers?.['X-Sic-Bridge-Token'];
  if (!configured || configured.length < 32) throw err('Bridge not configured', 503);
  if (typeof supplied !== 'string' || supplied.length !== configured.length ||
      !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(configured))) {
    // Short SHA-256 fingerprints of a 256-bit randomly generated secret are
    // safe to compare in restricted Function logs. Never log either token.
    // This diagnostic does not change or weaken authorization.
    const fingerprint = (value) => typeof value === 'string'
      ? crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 12)
      : 'missing';
    console.warn('[sic-bridge] denied', {
      configuredLength: configured.length,
      receivedLength: typeof supplied === 'string' ? supplied.length : 0,
      configuredFingerprint: fingerprint(configured),
      receivedFingerprint: fingerprint(supplied),
    });
    throw err('Acesso negado', 403);
  }
}

exports.handler = async (event) => {
  try {
    authorize(event);
    if (event.httpMethod === 'GET') {
      // Outbound-only worker claims one job. Use optimistic compare-and-swap.
      const now = new Date();
      const stale = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const candidates = await supabaseFetch(BASE + '?select=id,order_number,status,claim_count' +
        '&expires_at=gt.' + encodeURIComponent(now.toISOString()) +
        '&claim_count=lt.3' +
        '&or=(status.eq.pending,and(status.eq.processing,claimed_at.lt.' + stale + '))' +
        '&order=created_at.asc&limit=10');
      for (const item of candidates || []) {
        const lease = crypto.randomBytes(32).toString('hex');
        const filter = BASE + '?id=eq.' + item.id +
          '&status=eq.' + item.status +
          '&claim_count=eq.' + item.claim_count + '&select=id,order_number';
        const claimed = await supabaseFetch(filter, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: {
            status: 'processing', claimed_at: now.toISOString(),
            claim_count: item.claim_count + 1,
            lease_hash: digest(lease),
          },
        });
        if (claimed?.length) {
          return respond(200, { requestId: item.id, orderNumber: String(item.order_number), lease });
        }
      }
      return respond(200, { requestId: null });
    }
    if (event.httpMethod !== 'POST') throw err('Method not allowed', 405);
    if ((event.body || '').length > 128 * 1024) throw err('Resposta muito grande', 413);
    let input;
    try { input = JSON.parse(event.body || '{}'); } catch { throw err('JSON inválido', 400); }
    if (!/^[0-9a-f-]{36}$/.test(input.requestId || '') ||
        !/^[0-9a-f]{64}$/.test(input.lease || '')) throw err('Resposta inválida', 400);

    const leaseHash = digest(input.lease);
    const pending = await supabaseFetch(BASE + '?id=eq.' + input.requestId +
      '&status=eq.processing&lease_hash=eq.' + leaseHash +
      '&expires_at=gt.' + encodeURIComponent(new Date().toISOString()) +
      '&select=id,order_number&limit=1');
    if (!pending?.[0]) throw err('Consulta expirada ou já respondida', 409);

    const ok = input.ok === true;
    const data = input.data;
    // Fail closed: no acceptance generation or financial approval in this endpoint.
    if (ok && (!data || typeof data !== 'object' || Array.isArray(data) ||
      !data.pedidoCompleto || !Array.isArray(data.itens) || !data.validacao)) {
      throw err('Formato do resultado SIC não validado', 422);
    }

    const body = ok
      ? { status: 'completed', result: {
          pedidoCompleto: data.pedidoCompleto,
          itens: data.itens.slice(0, 200),
          validacao: data.validacao,
          policy: { acceptanceEnabled: false, reason: 'Homologação: situação e validação financeira pendentes' },
        }, error_message: null, finished_at: new Date().toISOString() }
      : { status: 'failed', result: null,
          error_message: ['NOT_FOUND', 'LOCAL_API_UNAVAILABLE', 'SIC_ERROR', 'INVALID_DATA'].includes(input.errorCode)
            ? input.errorCode : 'SIC_ERROR',
          finished_at: new Date().toISOString() };
    const updated = await supabaseFetch(BASE + '?id=eq.' + input.requestId +
      '&lease_hash=eq.' + leaseHash +
      '&status=eq.processing&select=id', {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body,
    });
    if (!updated?.length) throw err('Atualização concorrente', 409);
    return respond(200, { acknowledged: true });
  } catch (error) { return handleError(error); }
};
