/**
 * Adaptador de leitura SIC SupraSYS -> ACEITE.
 * Não grava no ERP ou Base44; não confunde endereço cadastral com endereço da obra.
 */
const clean = value => value == null ? '' : String(value).trim();
const finite = value => typeof value === 'number' && Number.isFinite(value);
const digits = value => clean(value).replace(/\D/g, '');

export function validarCpfCnpj(documento) {
  const d = digits(documento);
  if (![11, 14].includes(d.length) || /^(\d)\1+$/.test(d)) return false;
  const check = (base, weights) => {
    const sum = weights.reduce((total, weight, i) => total + Number(base[i]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  if (d.length === 11) {
    return check(d, [10,9,8,7,6,5,4,3,2]) === Number(d[9])
      && check(d, [11,10,9,8,7,6,5,4,3,2]) === Number(d[10]);
  }
  return check(d, [5,4,3,2,9,8,7,6,5,4,3,2]) === Number(d[12])
    && check(d, [6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(d[13]);
}

export function adaptarPedidoSic(resposta) {
  if (!resposta || resposta.sucesso !== true || !resposta.pedido) {
    throw new Error('Resposta do SIC inválida ou pedido não encontrado.');
  }
  const p = resposta.pedido;
  const cliente = p.cliente || {};
  const valores = p.valores || {};
  const itens = Array.isArray(p.itens) ? p.itens : [];
  const endereco = p.enderecoPrincipalCadastrado || {};
  const pendencias = [];
  if (!clean(cliente.nome)) pendencias.push('Nome do cliente não cadastrado.');
  if (!clean(cliente.cnpjCpf)) pendencias.push('CPF/CNPJ ausente no cadastro SIC.');
  else if (!validarCpfCnpj(cliente.cnpjCpf)) pendencias.push('CPF/CNPJ inválido (dígitos verificadores).');
  if (!itens.length) pendencias.push('Pedido sem itens.');
  if (!resposta.validacao || resposta.validacao.valido !== true ||
      (Array.isArray(resposta.validacao.avisos) && resposta.validacao.avisos.length)) {
    pendencias.push('Validação financeira do SIC não aprovada.');
  }
  if (![valores.subtotal, valores.desconto, valores.total].every(finite)) {
    pendencias.push('Valores comerciais ausentes ou inválidos.');
  }
  for (const [i, item] of itens.entries()) {
    if (!clean(item.descricao) || !finite(item.quantidade) || item.quantidade <= 0) {
      pendencias.push('Item ' + (i + 1) + ' incompleto.');
    }
  }
  const enderecoCadastral = [endereco.endereco, endereco.numero, endereco.bairro,
    cliente.cidade, cliente.uf, endereco.cep].map(clean).filter(Boolean).join(', ');
  return {
    origem: 'SIC_SUPRASYS',
    numeroPedido: clean(p.numero),
    empresa: { codigo: p.empresa, razaoSocial: clean(p.razaoSocialEmpresa || p.nomeEmpresa),
      fantasia: clean(p.nomeFantasiaEmpresa), telefone: clean(p.telefoneEmpresa) },
    cliente: { codigo: p.codigoCliente ?? cliente.codigo, nome: clean(cliente.nome),
      documento: clean(cliente.cnpjCpf), email: clean(cliente.email) },
    dataPedido: clean(p.dataPedido),
    dataEntregaPrevista: clean(p.dataEntrega),
    situacao: clean(p.situacao),
    liberado: clean(p.liberado),
    tipoVenda: clean(p.tipoVenda),
    tipoVendaCodigo: clean(p.tipoVendaCodigo),
    enderecoCadastral,
    enderecoEntregaConfirmado: endereco.enderecoEntregaConfirmado === true,
    itens: itens.map(item => ({
      item: item.item, codigo: item.codigoProduto, descricao: clean(item.descricao),
      unidade: clean(item.unidade), quantidade: item.quantidade,
      valorUnitario: item.valorUnitario, valorTotal: item.valorTotal,
      quantidadePecas: item.quantidadePecas, pesoLiquidoKg: item.pesoLiquidoKg
    })),
    valores: { subtotal: valores.subtotal, desconto: valores.desconto,
      total: valores.total, frete: p.frete },
    pendencias,
    aptoParaPreparacao: pendencias.length === 0,
    // Prévia de compatibilidade; NÃO criar Order automaticamente.
    sugestaoOrder: {
      order_number: clean(p.numero), client_name: clean(cliente.nome),
      client_document: clean(cliente.cnpjCpf), client_email: clean(cliente.email),
      sale_date: clean(p.dataPedido).slice(0, 10)
    }
  };
}
