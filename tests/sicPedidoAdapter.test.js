import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptarPedidoSic, validarCpfCnpj } from '../src/lib/sicPedidoAdapter.js';

const base = () => ({
  sucesso: true,
  pedido: {
    numero: 352688, empresa: 1, razaoSocialEmpresa: 'Empresa Teste', liberado: 'S', dataPedido: '2026-11-18',
    cliente: { codigo: 1, nome: 'Cliente Teste', cnpjCpf: '52998224725', cidade: 'Cidade', uf: 'SP' },
    valores: { subtotal: 120, desconto: 20, total: 100 },
    enderecoPrincipalCadastrado: { endereco: 'Rua Teste', numero: '10' },
    enderecoEntregaConfirmado: true,
    _espelhoHomologacao: { schema: 'teste', faltam: '', somenteLeitura: true, codigoImpressaoHomologado: true },
    itens: [
      { item: 1, codigoProduto: 10, codigoProdutoInterno: 11, codigoProdutoComercial: 12, referenciaFornecedor: 'REF', descricao: 'Produto A', unidade: 'PC', quantidade: 2, valorUnitario: 30, valorTotal: 60, pesoBrutoKg: 4, quantidadePecas: 2 },
      { item: 2, codigoProduto: 20, descricao: 'Produto B', unidade: 'KG', quantidade: 3, valorUnitario: 20, valorTotal: 60 }
    ],
    quantidadeItens: 2
  },
  validacao: { valido: true, quantidadeItens: 2, somaItens: 120, subtotal: 120, desconto: 20, total: 100, avisos: [] }
});

test('mapeia campos do contrato real sem somar unidades incompatíveis', () => {
  const p = adaptarPedidoSic(base());
  assert.equal(p.numeroPedido, '352688');
  assert.equal(p.enderecoEntregaConfirmado, true);
  assert.equal(p.itens.length, 2);
  assert.equal(p.itens[0].codigoInterno, 11);
  assert.equal(p.itens[0].codigoComercial, 12);
  assert.equal(p.itens[0].pesoBrutoKg, 4);
  assert.equal(p.itens[1].unidade, 'KG');
  assert.equal(p.valores.total, 100);
  assert.equal(p.aptoParaPreparacao, true);
});

test('documento ausente bloqueia pré-validação', () => {
  const r = base(); r.pedido.cliente.cnpjCpf = '';
  const p = adaptarPedidoSic(r);
  assert.equal(p.aptoParaPreparacao, false);
  assert.match(p.pendencias.join(' '), /CPF\/CNPJ ausente/);
});

test('endereço de entrega não é inferido do endereço cadastral', () => {
  const r = base(); r.pedido.enderecoEntregaConfirmado = false;
  const p = adaptarPedidoSic(r);
  assert.equal(p.enderecoEntregaConfirmado, false);
  assert.match(p.enderecoCadastral, /Rua Teste/);
});

test('validação financeira com avisos bloqueia pré-validação', () => {
  const r = base(); r.validacao.avisos = ['Diferença no total'];
  assert.equal(adaptarPedidoSic(r).aptoParaPreparacao, false);
});

test('rejeita CPF inválido e aceita CPF de teste com dígitos verificadores', () => {
  assert.equal(validarCpfCnpj('11111111111'), false);
  assert.equal(validarCpfCnpj('52998224725'), true);
});

test('bloqueia divergência de quantidade de itens entre cabeçalho e lista', () => {
  const r = base(); r.pedido.quantidadeItens = 3;
  assert.equal(adaptarPedidoSic(r).aptoParaPreparacao, false);
});

test('bloqueia itens sem valor comercial', () => {
  const r = base(); delete r.pedido.itens[0].valorTotal;
  assert.equal(adaptarPedidoSic(r).aptoParaPreparacao, false);
});

test('bloqueia divergência na contagem da validação financeira', () => {
  const r = base(); r.validacao.quantidadeItens = 1;
  assert.equal(adaptarPedidoSic(r).aptoParaPreparacao, false);
});

test('pedido não liberado não pode seguir para preparação', () => {
  const r = base(); r.pedido.liberado = 'N';
  assert.equal(adaptarPedidoSic(r).aptoParaPreparacao, false);
});
test('endereço de entrega não confirmado impede preparação', () => {
  const r = base(); r.pedido.enderecoEntregaConfirmado = false;
  assert.equal(adaptarPedidoSic(r).aptoParaPreparacao, false);
});
test('empresa ausente impede preparação', () => {
  const r = base(); delete r.pedido.razaoSocialEmpresa;
  assert.equal(adaptarPedidoSic(r).aptoParaPreparacao, false);
});
test('valores negativos são recusados', () => {
  const r = base(); r.pedido.valores.total = -100;
  assert.equal(adaptarPedidoSic(r).aptoParaPreparacao, false);
});
