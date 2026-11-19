/**
 * Contrato preliminar de versão do pedido comercial SIC.
 * Não cria aceite nem publica dados. Persistência e autorização devem ocorrer
 * no backend, que precisa recalcular o hash antes de emitir qualquer link.
 */
const plain = value => {
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined)
      .map(key => [key, plain(value[key])]));
  }
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Valor não finito no pedido.');
    return value;
  }
  throw new Error('Campo não serializável no pedido.');
};

export function serializarPedidoComercial(pedido) {
  if (!pedido || pedido.origem !== 'SIC_SUPRASYS' || !/^\d{1,12}$/.test(String(pedido.numeroPedido || ''))) {
    throw new Error('Pedido SIC inválido para versionamento.');
  }
  if (!pedido.aptoParaPreparacao || (pedido.pendencias || []).length) {
    throw new Error('Pedido com pendências não pode ser versionado para aceite.');
  }
  const dados = {
    versaoContrato: 1,
    origem: pedido.origem,
    numeroPedido: pedido.numeroPedido,
    empresa: pedido.empresa,
    cliente: pedido.cliente,
    dataPedido: pedido.dataPedido,
    dataEntregaPrevista: pedido.dataEntregaPrevista,
    tipoVenda: pedido.tipoVenda,
    codigoVendedor: pedido.codigoVendedor,
    enderecoCadastral: pedido.enderecoCadastral,
    enderecoEntrega: pedido.enderecoEntrega,
    enderecoEntregaConfirmado: pedido.enderecoEntregaConfirmado,
    itens: pedido.itens,
    valores: pedido.valores
  };
  return JSON.stringify(plain(dados));
}

export async function prepararVersaoPedidoComercial(pedido) {
  const conteudo = serializarPedidoComercial(pedido);
  const bytes = new TextEncoder().encode(conteudo);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return { schema: 'DRAFER_SIC_PEDIDO_V1', numeroPedido: pedido.numeroPedido, sha256, conteudo };
}
