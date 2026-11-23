'use strict';
// Patch para SRV-DRAFER/ACEITE-API/src/routes/aceites.js
// Endpoint somente de preparacao interna. Nao emite link, assinatura ou autorizacao de producao.
const express = require('express');
const { buscarPedido } = require('../services/pedidosService');
const { buscarItensPedido } = require('../services/itensService');
const { buscarEspelhoComplementar } = require('../services/espelhoService');
const { mergePedidoEspelho } = require('../services/espelhoMerge');
const { validarPedido } = require('../utils/validarPedido');
const { prepararAceitePedido } = require('../services/aceitePedidoService');
const router = express.Router();
router.get('/preparar/:numero', async (req, res) => {
  const texto = req.params.numero;
  if (!/^[1-9][0-9]*$/.test(texto) || !Number.isSafeInteger(Number(texto))) {
    return res.status(400).json({ erro: 'Numero de pedido invalido.' });
  }
  const numero = Number(texto);
  try {
    const pedido = await buscarPedido(numero);
    if (!pedido) return res.status(404).json({ erro: 'Pedido nao encontrado.' });
    const itens = await buscarItensPedido(numero);
    // Fail closed: nao preparar documento parcial caso o espelho nao possa ser lido.
    const complemento = await buscarEspelhoComplementar(numero);
    const enriquecido = mergePedidoEspelho(pedido, complemento);
    const completo = { ...enriquecido, itens, quantidadeItens: itens.length };
    const validacao = validarPedido(completo);
    if (!validacao.valido) {
      return res.status(422).json({
        sucesso: false, erro: 'Pedido com divergencias financeiras.', validacao
      });
    }
    const aceite = prepararAceitePedido(completo, validacao);
    // Endereco do cadastro nao equivale a endereco de entrega confirmado.
    // Nao promover campos informativos para assinatura.
    return res.json({
      sucesso: true, aceite,
      espelho: {
        cliente: completo.cliente,
        nomeEmpresa: completo.nomeEmpresa ?? null,
        razaoSocialEmpresa: completo.razaoSocialEmpresa ?? null,
        enderecoPrincipalCadastrado: completo.enderecoPrincipalCadastrado ?? null,
        enderecoEntregaConfirmado: completo.enderecoEntregaConfirmado === true,
        enderecoEntrega: completo.enderecoEntrega ?? null,
        localEntrega: completo.localEntrega ?? null
      },
      observacao: 'Preparacao preliminar. Nao autoriza assinatura.'
    });
  } catch (erro) {
    console.error('Falha ao preparar aceite:', erro.message);
    return res.status(503).json({
      sucesso: false,
      erro: 'Preparacao indisponivel: nao foi possivel validar o espelho SIC completo.'
    });
  }
});
module.exports = router;
