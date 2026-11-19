'use strict';
const { respond, supabaseFetch, sha256, onlyMethod, handleError } = require('./_lib/backend.cjs');

// Public mirror is served exclusively from a frozen, validated SIC snapshot.
// Do not expose a raw snapshot: it can contain internal fields and unrelated PII.
function sicMirror(order) {
  if (order.origin !== 'SIC_SUPRASYS' || order.details?.draftOnly === true ||
      order.details?.legalDocumentApproved !== true ||
      order.details?.eligibilityApproved !== true) return null;
  const snapshot = order.order_snapshot;
  const p = snapshot?.pedidoCompleto;
  const items = snapshot?.itens;
  if (!p || !Array.isArray(items) || !items.length || items.length > 200 ||
      snapshot.validacao?.valido !== true ||
      String(p.numero) !== String(order.sic_order_number) ||
      Number(p.empresa) !== Number(order.sic_company_id) ||
      String(p.liberado || '').trim().toUpperCase() !== 'S' ||
      !Number.isFinite(Number(p.valores?.total)) || Number(p.valores.total) <= 0 ||
      !Number.isFinite(Number(snapshot.validacao?.somaItens)) ||
      Math.abs(Number(p.valores.total) - Number(snapshot.validacao.somaItens)) > 0.02 ||
      !items.every(x => x && typeof x.descricao === 'string' && x.descricao.trim() &&
        x.valorTotal !== null && x.valorTotal !== undefined && Number.isFinite(Number(x.valorTotal)))) return null;
  const scalar = v => typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 250) : null;
  const money = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
  const client = p.cliente || {};
  return {
    company: { name: scalar(p.nomeEmpresa || p.razaoSocialEmpresa), phone: scalar(p.telefoneEmpresa) },
    order: { number: scalar(p.numero), saleType: scalar(p.tipoVenda || p.tipoVendaDescricao || p.tipoVendaCodigo),
      date: scalar(p.dataPedido), deliveryDate: scalar(p.dataEntrega), seller: scalar(p.vendedor || p.codigoVendedor),
      payment: scalar(p.condicaoPagamento || p.condicoesPagamento || p.codigoCondicaoPagamentoCadastral),
      deliveryAddress: scalar(p.localEntrega || p.enderecoEntrega), notes: scalar(p.observacoes || p.obs) },
    client: { name: scalar(client.nome), code: scalar(client.codigo), document: scalar(client.cnpj || client.cpf || client.cnpjCpf),
      phone: scalar(client.telefone || p.telefoneCliente), address: scalar(client.endereco || p.endereco),
      city: scalar(client.cidade || p.cidade), state: scalar(client.estado || p.estado), zip: scalar(client.cep || p.cep) },
    items: items.map(x => ({ code: scalar(x.codigoProdutoImpressao || x.codigoImpressao || x.codigoProdutoComercial),
      description: scalar(x.descricao), unit: scalar(x.unidade), quantity: money(x.quantidade),
      pieces: money(x.quantidadePecas), weightKg: money(x.pesoLiquidoKg), unitPrice: money(x.valorUnitario),
      unitPricePiece: money(x.valorUnitarioPeca), total: money(x.valorTotal) })),
    totals: { subtotal: money(p.valores?.subtotal), discount: money(p.valores?.desconto),
      freight: money(p.valores?.frete ?? p.frete), total: money(p.valores?.total) },
  };
}

const expectedState = {
  1: 'aguardando_aceite_pedido',
  2: 'aguardando_aceite_entrega',
  3: 'aguardando_aceite_instalacao',
};

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    const token = event.queryStringParameters?.token;
    // SHA256 digest is the only token representation stored in the DB.
    if (typeof token !== 'string' || !/^[a-fA-F0-9]{64}$/.test(token)) {
      return respond(404, { error: 'Link inválido ou expirado' });
    }
    const hash = sha256(token);
    const rows = await supabaseFetch('/rest/v1/aceite_tokens?token_hash=eq.' + hash +
      '&select=order_id,level,expires_at,used_at,revoked_at&limit=1');
    const item = rows?.[0];
    if (!item || item.used_at || item.revoked_at || new Date(item.expires_at).getTime() <= Date.now()) {
      return respond(404, { error: 'Link inválido ou expirado' });
    }
    const orders = await supabaseFetch('/rest/v1/aceite_orders?id=eq.' + encodeURIComponent(item.order_id) +
      '&select=id,order_number,client_name,status,details,origin,sic_company_id,sic_order_number,order_snapshot&limit=1');
    const order = orders?.[0];
    if (!order || order.status !== expectedState[item.level]) {
      return respond(404, { error: 'Aceite indisponível para este pedido' });
    }
    const d = order.details || {};
    const mirror = sicMirror(order);
    if (!mirror) {
      // Never present a customer with a partial or ineligible order as an acceptance document.
      return respond(404, { error: 'Aceite indisponível para este pedido' });
    }
    // A populated projection is not proof of complete SIC mapping or document integrity.
    // Keep this false until the final field-by-field and snapshot-hash homologation.
    const mirrorComplete = false;
    // Only the explicitly selected mirror projection is returned; never send raw snapshots or hashes.
    return respond(200, {
      order: {
        order_number: order.order_number,
        client_name: order.client_name,
        material: typeof d.material === 'string' ? d.material : '',
        tile_type: typeof d.tile_type === 'string' ? d.tile_type : '',
        tile_model: typeof d.tile_model === 'string' ? d.tile_model : '',
        quantity: typeof d.quantity === 'number' ? d.quantity : null,
        thickness: typeof d.thickness === 'string' ? d.thickness : '',
        level: item.level,
        mirror,
        mirrorComplete,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};
