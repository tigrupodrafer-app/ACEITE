// SRV-DRAFER / ACEITE-API / src/services/itensService.js
// Leia somente ARQES15: campos homologados em pedido 352488.
// Vinculo confirmado em SQL de homologacao: C.CODIGO = I.PRODUTO.
// Preservar codigoProduto para consumidores existentes; adicionar codigos de acesso em campos separados.
const { conectar } = require('../config/firebird');

function buscarItensPedido(numeroPedido) {
  return new Promise((resolve, reject) => {
    if (!Number.isSafeInteger(numeroPedido) || numeroPedido <= 0) {
      return reject(new Error('Numero de pedido invalido.'));
    }
    conectar((erro, db) => {
      if (erro) return reject(erro);
      const sql = [
        'SELECT I.ITEM AS ITEM,',
        '  I.PRODUTO AS CODIGO_PRODUTO,',
        '  C.CODACESSOG AS CODIGO_COMERCIAL,',
        '  C.CODACESSO AS REFERENCIA_FORNECEDOR,',
        '  I.NOME AS PRODUTO,',
        '  I.UND AS UNIDADE,',
        '  I.QTDE AS QUANTIDADE,',
        '  I.VUNIT AS VALOR_UNITARIO,',
        '  I.VTOTAL AS VALOR_TOTAL,',
        '  I.PESO_LIQUIDO AS PESO_LIQUIDO_KG,',
        '  I.PESO_BRUTO AS PESO_BRUTO_KG,',
        '  I.QTDE_PC AS QUANTIDADE_PECAS,',
        '  I.VUNIT_PC AS VALOR_UNITARIO_PECA,',
        '  I.PESO_PC AS PESO_PECA',
        'FROM ARQES15 I',
        'LEFT JOIN CAD_PRODUTO C ON C.CODIGO = I.PRODUTO',
        'WHERE I.PEDIDO = ?',
        'ORDER BY I.ITEM',
      ].join('\n');

      db.query(sql, [numeroPedido], (erroConsulta, registros) => {
        // Libera conexao tambem em caso de falha de consulta.
        try { db.detach(); } catch (_) { /* noop */ }
        if (erroConsulta) return reject(erroConsulta);
        resolve((registros || []).map(item => ({
          item: item.ITEM,
          codigoProduto: item.CODIGO_PRODUTO, // Compatibilidade: codigo interno para clientes antigos.
          codigoProdutoInterno: item.CODIGO_PRODUTO,
          codigoProdutoComercial: item.CODIGO_COMERCIAL,
          referenciaFornecedor: item.REFERENCIA_FORNECEDOR,
          descricao: item.PRODUTO,
          unidade: item.UNIDADE,
          quantidade: item.QUANTIDADE,
          valorUnitario: item.VALOR_UNITARIO,
          valorTotal: item.VALOR_TOTAL,
          pesoLiquidoKg: item.PESO_LIQUIDO_KG,
          pesoBrutoKg: item.PESO_BRUTO_KG,
          quantidadePecas: item.QUANTIDADE_PECAS,
          valorUnitarioPeca: item.VALOR_UNITARIO_PECA,
          pesoPorPeca: item.PESO_PECA,
        })));
      });
    });
  });
}
module.exports = { buscarItensPedido };
