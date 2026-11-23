'use strict';

// Only prepares a private, non-signable draft from an existing authenticated SIC job.
// NO legal acceptance, no token, no client link and no automatic production authorization.
const { respond, requireStaff, supabaseFetch, onlyMethod, handleError } = require('./_lib/backend.cjs');
const REQUESTS = '/rest/v1/aceite_sic_requests';
const ORDERS = '/rest/v1/aceite_orders';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function invalid(message, statusCode = 422) {
  return Object.assign(new Error(message), { statusCode });
}
function num(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string' || !value.trim()) return NaN;
  return Number(value);
}
async function findExisting(company, number) {
  const rows = await supabaseFetch(ORDERS +
    '?origin=eq.SIC_SUPRASYS&sic_company_id=eq.' + company +
    '&sic_order_number=eq.' + number + '&select=id,order_number,status&limit=1');
  return rows?.[0] || null;
}
exports.handler = async (event) => {
  try {
    onlyMethod(event, 'POST');
    const { authUser } = await requireStaff(event, { allowedRoles: ['admin', 'vendedor', 'aprovador'] });
    if ((event.body || '').length > 512) throw invalid('Requisição inválida', 400);
    let input;
    try { input = JSON.parse(event.body || '{}'); } catch { throw invalid('JSON inválido', 400); }
    if (!uuid.test(input.requestId || '')) throw invalid('Consulta SIC inválida', 400);

    // The browser submits ONLY the request ID. The trusted backend fetches the snapshot.
    const queries = await supabaseFetch(REQUESTS +
      '?id=eq.' + input.requestId + '&requested_by=eq.' + authUser.id +
      '&status=eq.completed&select=id,order_number,finished_at,result&limit=1');
    const query = queries?.[0];
    if (!query?.result || !query.finished_at ||
        Date.now() - new Date(query.finished_at).getTime() > 30 * 60 * 1000 ||
        Date.now() < new Date(query.finished_at).getTime() - 60 * 1000) {
      throw invalid('Consulta expirada ou indisponível. Consulte o SIC novamente.', 409);
    }

    const { pedidoCompleto: pedido, itens, validacao } = query.result;
    const orderNumber = num(query.order_number);
    const company = num(pedido?.empresa);
    const clientName = typeof pedido?.cliente?.nome === 'string' ? pedido.cliente.nome.trim() : '';
    const total = num(pedido?.valores?.total);
    const calculated = num(validacao?.somaItens);
    const subtotal = num(pedido?.valores?.subtotal);
    const discount = num(pedido?.valores?.desconto);
    const freight = num(pedido?.frete ?? 0);
    // Compare like-for-like amounts: item sum -> subtotal -> net total.
    // Monetary checks use integer cents to avoid binary floating point rounding.
    const cents = value => Math.round(value * 100);
    const financialsValid = [total, calculated, subtotal, discount, freight].every(Number.isFinite) &&
      subtotal >= 0 && discount >= 0 && freight >= 0 &&
      discount <= subtotal &&
      Math.abs(cents(calculated) - cents(subtotal)) <= 2 &&
      Math.abs(cents(total) - (cents(subtotal) - cents(discount) + cents(freight))) <= 2;
    if (!pedido || !Array.isArray(itens) || !itens.length || itens.length > 200 ||
        !Number.isSafeInteger(orderNumber) || !Number.isSafeInteger(company) || company <= 0 ||
        num(pedido.numero) !== orderNumber ||
        String(pedido.liberado || '').trim().toUpperCase() !== 'S' ||
        clientName.length < 2 || clientName.length > 220 ||
        validacao?.valido !== true || !Number.isFinite(total) || total <= 0 ||
        !financialsValid ||
        itens.some(i => !i || typeof i.descricao !== 'string' || !Number.isFinite(num(i.valorTotal)))) {
      throw invalid('Dados do SIC insuficientes para registrar um rascunho. Revise o pedido.', 422);
    }
    // No assumption about SITU/FATURADO or approval to manufacture.
    const existing = await findExisting(company, orderNumber);
    if (existing) {
      if (existing.status !== 'rascunho') return respond(200, {
        draftId: existing.id, status: existing.status, created: false,
        message: 'Pedido já registrado. O espelho não foi alterado.',
      });
      // Atomic refresh: only a recent, owned SIC query can replace an unsigned draft.
      // Historical review PDFs remain immutable and must not be represented as current.
      const refreshed = await supabaseFetch('/rest/v1/rpc/aceite_atualizar_rascunho_sic', {
        method: 'POST', body: { p_order_id: existing.id, p_request_id: query.id, p_actor_id: authUser.id },
      });
      return respond(200, { draftId: existing.id, status: 'rascunho', created: false,
        refreshed: refreshed?.updated === true,
        message: refreshed?.updated ? 'Espelho SIC atualizado. Gere uma nova versão da minuta para revisão.' :
          'Espelho SIC já atualizado. Nenhum documento anterior foi alterado.' });
    }

    const payload = {
      origin: 'SIC_SUPRASYS', sic_company_id: company, sic_order_number: orderNumber,
      order_number: String(orderNumber), client_name: clientName,
      sale_date: null, // Avoid timezone conversion of Firebird dates until canonicalized.
      status: 'rascunho', warranty_blocked: true, created_by: authUser.id,
      order_snapshot: { pedidoCompleto: pedido, itens, validacao, sourceRequestId: query.id,
        enderecosEntrega: query.result.enderecosEntrega || [],
        enderecoCadastralEntrega: query.result.enderecoCadastralEntrega || null },
      details: {
        material: itens.length === 1 ? String(itens[0].descricao) : itens.length + ' itens do SIC',
        quantity: itens.length === 1 && Number.isFinite(num(itens[0].quantidade))
          ? num(itens[0].quantidade) : null,
        draftOnly: true, eligibilityApproved: false, legalDocumentApproved: false,
        source: 'SIC_SUPRASYS',
      },
    };
    let rows;
    try {
      rows = await supabaseFetch(ORDERS + '?select=id,order_number,status', {
        method: 'POST', headers: { Prefer: 'return=representation' }, body: payload,
      });
    } catch (error) {
      // A concurrent request might already have created the draft; DB UNIQUE prevents duplicates.
      const concurrent = await findExisting(company, orderNumber);
      if (concurrent) return respond(200, {
        draftId: concurrent.id, status: concurrent.status, created: false,
        message: 'Rascunho já existente. Não foi criado outro registro.',
      });
      throw error;
    }
    const draft = rows?.[0];
    if (!draft?.id) throw new Error('Draft insertion did not return an id');
    return respond(201, {
      draftId: draft.id, status: 'rascunho', created: true,
      message: 'Rascunho interno registrado. Documento final e assinatura permanecem bloqueados.',
    });
  } catch (error) { return handleError(error); }
};
