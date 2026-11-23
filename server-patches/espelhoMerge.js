'use strict';
// Merge conservador do espelho SIC. Nao transforma endereco cadastral em entrega confirmada.
function presente(v) { return v !== null && v !== undefined && v !== ''; }
function mergePedidoEspelho(pedido, espelho) {
  if (!pedido || !espelho || Number(espelho.numero) !== Number(pedido.numero)) {
    throw new Error('Espelho nao corresponde ao pedido');
  }
  if (Number(espelho.empresa) !== Number(pedido.empresa)) {
    throw new Error('Empresa SIC divergente no espelho');
  }
  const cliente = { ...(pedido.cliente || {}) };
  for (const [key, val] of Object.entries(espelho.cliente || {})) {
    if (presente(val)) cliente[key] = val;
  }
  const extra = {};
  for (const key of [
    'codigoVendedor', 'tabelaPreco', 'tipoVendaCodigo', 'tipoVenda',
    'codigoCliente', 'codigoCidadeCliente', 'codigoCondicaoPagamentoCadastral',
    'codigoRegiaoCliente', 'codigoEnderecoEntrega', 'frete', 'nomeEmpresa',
    'usuarioPedidoSic', 'usuarioInclusaoSic', 'codigoEmpresaFiscal',
    'razaoSocialEmpresa', 'nomeFantasiaEmpresa', 'telefoneEmpresa'
  ]) {
    if (presente(espelho[key])) extra[key] = espelho[key];
  }
  const enderecoPrincipalCadastrado =
    espelho.enderecoPrincipalCadastrado ?? pedido.enderecoPrincipalCadastrado ?? null;
  // ARQCAD e ARQCADEND podem divergir. Expor a origem, sem afirmar entrega.
  const enderecoCadastralCliente = [
    cliente.endereco, cliente.numeroEndereco, cliente.bairro, cliente.cidade, cliente.uf
  ].some(presente) ? {
    origem: 'ARQCAD',
    endereco: cliente.endereco ?? null,
    numero: cliente.numeroEndereco ?? null,
    complemento: cliente.complemento ?? null,
    bairro: cliente.bairro ?? null,
    cep: cliente.cep ?? null,
    cidade: cliente.cidade ?? null,
    uf: cliente.uf ?? cliente.estado ?? null
  } : null;
  // Confirmacao nunca deriva do endereco cadastral nem da existencia de um endereco principal.
  const enderecoEntregaConfirmado = pedido.enderecoEntregaConfirmado === true;
  return {
    ...pedido, ...extra, cliente,
    enderecoPrincipalCadastrado,
    enderecoCadastralCliente,
    enderecoEntregaConfirmado,
    _espelhoHomologacao: {
      ...(espelho._espelhoHomologacao || {}),
      codigoImpressaoHomologado: false,
      enderecoEntregaHomologado: enderecoEntregaConfirmado
    }
  };
}
module.exports = { mergePedidoEspelho };
