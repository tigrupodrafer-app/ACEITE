'use strict';
const { respond, requireStaff, supabaseFetch, handleError } = require('./_lib/backend.cjs');

const BASE = '/rest/v1/aceite_sic_requests';

function invalid(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

exports.handler = async (event) => {
  try {
    if (!['GET', 'POST'].includes(event.httpMethod)) throw invalid('Method not allowed', 405);
    const { authUser } = await requireStaff(event);

    if (event.httpMethod === 'POST') {
      if ((event.body || '').length > 1024) throw invalid('Requisição muito grande');
      let payload;
      try { payload = JSON.parse(event.body || '{}'); }
      catch { throw invalid('JSON inválido'); }

      // Do not allow foreign company identifiers or arbitrary SQL.
      const numberText = String(payload.orderNumber || '');
      if (!/^[1-9]\d{0,11}$/.test(numberText)) {
        throw invalid('Número do pedido inválido');
      }
      // Prevent repeated pending requests and limit amplification.
      const recent = await supabaseFetch(BASE + '?requested_by=eq.' + authUser.id +
        '&status=in.(pending,processing)&created_at=gte.' + encodeURIComponent(
          new Date(Date.now() - 10 * 60 * 1000).toISOString()) +
        '&select=id,order_number,status&limit=10');
      const same = (recent || []).find(r => String(r.order_number) === numberText);
      if (same) return respond(200, { requestId: same.id, status: same.status });
      if ((recent || []).length >= 5) throw invalid('Muitas consultas pendentes. Tente novamente mais tarde.', 429);

      const created = await supabaseFetch(BASE + '?select=id,status', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: { requested_by: authUser.id, order_number: Number(numberText) },
      });
      const row = created?.[0];
      if (!row) throw new Error('Failed to enqueue');
      return respond(202, { requestId: row.id, status: row.status });
    }

    // GET request status for the user who requested it, not arbitrary orders.
    const id = event.queryStringParameters?.id;
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(id || '')) throw invalid('Consulta inválida');
    const rows = await supabaseFetch(BASE + '?id=eq.' + id +
      '&requested_by=eq.' + authUser.id +
      '&select=id,order_number,status,created_at,expires_at,finished_at,result,error_message&limit=1');
    const item = rows?.[0];
    if (!item) throw invalid('Consulta não encontrada', 404);
    if (item.status !== 'completed' && new Date(item.expires_at).getTime() < Date.now()) {
      return respond(200, { requestId: item.id, status: 'expired', orderNumber: item.order_number });
    }
    return respond(200, {
      requestId: item.id,
      orderNumber: item.order_number,
      status: item.status,
      createdAt: item.created_at,
      finishedAt: item.finished_at,
      result: item.status === 'completed' ? item.result : null,
      error: item.status === 'failed' ? (item.error_message || 'Falha na consulta SIC') : null,
    });
  } catch (error) { return handleError(error); }
};
