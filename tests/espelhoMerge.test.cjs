'use strict';
// Testes locais, sem Firebird, sem Supabase e sem redeploy.
// Executar: node --test tests/espelhoMerge.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { mergePedidoEspelho } = require('../server-patches/espelhoMerge.js');
const pedido = () => ({
  numero: 352488, empresa: 1,
  cliente: { codigo: 1177, nome: 'CLIENTE EXEMPLO' },
  valores: { subtotal: 225.98, desconto: 0.08, total: 225.90 }
});
const espelho = () => ({
  numero: 352488, empresa: 1,
  tipoVenda: 'Venda a prazo',
  razaoSocialEmpresa: 'EMPRESA EXEMPLO',
  cliente: { endereco: 'RUA EXEMPLO', numeroEndereco: 'S/N', bairro: 'CENTRO', cidade: 'PANORAMA', uf: 'SP', complemento: 'GALPAO' },
  enderecoPrincipalCadastrado: { origem: 'ARQCADEND', endereco: 'RUA DIFERENTE', numero: '645' },
  enderecoEntregaConfirmado: false
});
test('nao confirma entrega com base no cadastro ou endereco adicional', () => {
  const resultado = mergePedidoEspelho(pedido(), espelho());
  assert.equal(resultado.enderecoEntregaConfirmado, false);
  assert.equal(resultado.enderecoCadastralCliente.origem, 'ARQCAD');
  assert.equal(resultado.enderecoCadastralCliente.endereco, 'RUA EXEMPLO');
  assert.equal(resultado.enderecoPrincipalCadastrado.endereco, 'RUA DIFERENTE');
  assert.equal(resultado.localEntrega, undefined);
});
test('preserva valores e campos fiscais', () => {
  const resultado = mergePedidoEspelho(pedido(), espelho());
  assert.deepEqual(resultado.valores, pedido().valores);
  assert.equal(resultado.razaoSocialEmpresa, 'EMPRESA EXEMPLO');
  assert.equal(resultado.tipoVenda, 'Venda a prazo');
});
test('nao apaga dados do cliente por valores nulos do espelho', () => {
  const e = espelho();
  e.cliente.nome = null;
  assert.equal(mergePedidoEspelho(pedido(), e).cliente.nome, 'CLIENTE EXEMPLO');
});
test('rejeita espelho de pedido ou empresa divergente', () => {
  assert.throws(() => mergePedidoEspelho(pedido(), {...espelho(), numero: 352489}));
  assert.throws(() => mergePedidoEspelho(pedido(), {...espelho(), empresa: 3}));
});
