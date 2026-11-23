// DRAFER ACEITE - Diagnostico de metadados Firebird, somente leitura.
// Executar dentro de C:\\DRAFER\\ACEITE-API com variaveis FB_* do launcher oficial.
// Nao exibe dados pessoais, credenciais nem valores de pedidos.
'use strict';
const { conectar } = require('../src/config/firebird');
const sql = `
SELECT TRIM(r.RDB$RELATION_NAME) AS TABELA,
       TRIM(r.RDB$FIELD_NAME) AS CAMPO,
       r.RDB$FIELD_POSITION AS POSICAO
FROM RDB$RELATION_FIELDS r
WHERE r.RDB$SYSTEM_FLAG = 0
  AND (
    UPPER(TRIM(r.RDB$RELATION_NAME)) IN
      ('ARQES13','ARQES15','ARQCAD','ARQCADEND','CAD_PRODUTO','ARQES13_ENDERECO')
    OR UPPER(TRIM(r.RDB$RELATION_NAME)) CONTAINING 'ENTREGA'
  )
  AND (
    UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'END'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'LOCAL'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'ENTREGA'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'IMP'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'COD'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'ACESS'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'REF'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'OBS'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'COMP'
    OR UPPER(TRIM(r.RDB$FIELD_NAME)) CONTAINING 'SEQ'
  )
ORDER BY 1,3
`;
conectar((error, db) => {
  if (error) { console.error('Falha ao conectar ao Firebird.'); process.exitCode=1; return; }
  db.query(sql, [], (err, rows) => {
    try { db.detach(); } catch (_) {}
    if (err) { console.error('Falha ao consultar metadados:',err.message); process.exitCode=1; return; }
    console.log('=== CAMPOS CANDIDATOS (METADADOS, SEM DADOS DE CLIENTES) ===');
    for (const row of rows || []) console.log(row.TABELA+' | '+row.CAMPO);
    console.log('Total de campos:',(rows||[]).length);
  });
});
