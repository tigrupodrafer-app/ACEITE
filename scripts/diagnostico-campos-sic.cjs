// DRAFER ACEITE - diagnostico somente leitura ARQES15 no SRV-DRAFER.
// Execute em sessao que ja tem FB_* corretas: node .\diagnostico-campos-sic.cjs 352488
// Nao imprime credenciais nem informacoes do cliente.
'use strict';
const { conectar } = require('./src/config/firebird');
const number = process.argv[2] || '352488';
if (!/^[1-9]\d{0,11}$/.test(number)) throw new Error('Pedido invalido');
const connection = () => new Promise((resolve, reject) => {
  conectar((err, db) => err ? reject(err) : resolve(db));
});
const query = (db, sql, args = []) => new Promise((resolve, reject) => {
  db.query(sql, args, (error, rows) => error ? reject(error) : resolve(rows || []));
});
async function main() {
  const db = await connection();
  try {
    const meta = await query(db,
      "SELECT TRIM(RF.RDB$FIELD_NAME) AS CAMPO FROM RDB$RELATION_FIELDS RF " +
      "WHERE RF.RDB$RELATION_NAME = 'ARQES15' ORDER BY RF.RDB$FIELD_POSITION"
    );
    const candidate = /PROD|COD|REF|PESO|KG|PEC|QT|QUANT|UND|UNIT|TOTAL|VALOR|ITEM|PEDIDO|FATUR|ESTOQ|ENTREG/i;
    console.log('=== CAMPOS CANDIDATOS ARQES15 ===');
    console.log(meta.map(x => String(x.CAMPO || '').trim()).filter(x => candidate.test(x)).join(', '));
    const rows = await query(db, 'SELECT FIRST 3 * FROM ARQES15 WHERE PEDIDO = ?', [Number(number)]);
    console.log('\n=== VALORES TECNICOS DO PEDIDO ' + number + ' ===');
    if (!rows.length) { console.log('Nenhum item encontrado'); return; }
    for (const [i, row] of rows.entries()) {
      console.log('AMOSTRA ' + (i + 1));
      for (const [key, value] of Object.entries(row)) {
        if (!candidate.test(key) || value === null || value === undefined || typeof value === 'object') continue;
        console.log('  ' + key + ': ' + String(value).replace(/[\r\n]/g, ' ').slice(0, 90));
      }
    }
    console.log('Somente leitura. Nada foi alterado no SIC.');
  } finally {
    try { db.detach(); } catch { /* ignore */ }
  }
}
main().catch(error => {
  console.error('Erro no diagnostico: ' + error.message);
  process.exitCode = 1;
});
