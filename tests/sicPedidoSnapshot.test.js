import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararVersaoPedidoComercial, serializarPedidoComercial } from '../src/lib/sicPedidoSnapshot.js';

const pedido = () => ({
  origem: 'SIC_SUPRASYS', numeroPedido: '351482', aptoParaPreparacao: true, pendencias: [],
  empresa: { codigo: 1, razaoSocial: 'Empresa Teste' },
  cliente: { nome: 'Cliente Teste', documento: '52998224725' },
  enderecoEntregaConfirmado: true, enderecoEntrega: 'Rua da Obra, 10',
  itens: [{ item: 1, descricao: 'Produto', quantidade: 2, unidade: 'PC', valorTotal: 100 }],
  valores: { subtotal: 100, desconto: 0, total: 100 }
});

test('hash permanece igual para dados comerciais equivalentes', async () => {
  const a = await prepararVersaoPedidoComercial(pedido());
  const b = await prepararVersaoPedidoComercial(pedido());
  assert.equal(a.sha256, b.sha256);
  assert.match(a.sha256, /^[a-f0-9]{64}$/);
  assert.equal(a.numeroPedido, '351482');
});

test('alteração de item muda a impressão digital da versão', async () => {
  const a = await prepararVersaoPedidoComercial(pedido());
  const alterado = pedido(); alterado.itens[0].quantidade = 3;
  const b = await prepararVersaoPedidoComercial(alterado);
  assert.notEqual(a.sha256, b.sha256);
});

test('não cria versão de pedido com pendências', () => {
  const p = pedido(); p.aptoParaPreparacao = false; p.pendencias = ['Pedido não liberado'];
  assert.throws(() => serializarPedidoComercial(p), /pendências/);
});

test('não inclui número da venda ou estado transitório na versão', () => {
  const p = pedido(); p.numeroVenda = '999'; p.carregando = true;
  const parsed = JSON.parse(serializarPedidoComercial(p));
  assert.equal(parsed.numeroPedido, '351482');
  assert.equal(parsed.numeroVenda, undefined);
  assert.equal(parsed.carregando, undefined);
});
