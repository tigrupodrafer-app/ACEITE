'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('correlacao SIC: consulta somente dados tecnicos e metadados',()=>{
 const s=src('scripts/diagnostico-espelho-etapa2.cjs');
 assert.match(s,/ARQES13 WHERE PEDIDO = \?/);
 assert.match(s,/ARQCAD WHERE CODIC = \?/);
 assert.match(s,/CAD_PRODUTO WHERE CAST/);
 assert.match(s,/TARGETS|catalogProductCodeCheck/);
 assert.match(s,/nonEmptyFields/);
 assert.match(s,/NCPF/);
 assert.doesNotMatch(s,/\b(?:UPDATE|DELETE|INSERT|ALTER|DROP|TRUNCATE)\s+(?:TABLE|INTO|ARQES|ARQCAD|CAD_PRODUTO)/i);
 assert.doesNotMatch(s,/console\.log\(rows\)|console\.log\(customer\)/);
});
test('executor nao modifica o serviço existente',()=>{
 const s=src('scripts/Executar-Diagnostico-Espelho-Etapa2.ps1');
 assert.match(s,/hash-object/);
 assert.match(s,/920679d7ddbab7380b1084a1446d6df16ebe3685/);
 assert.match(s,/node --check/);
 assert.doesNotMatch(s,/Restart-Service|Stop-Service|Start-Service|Set-Service/i);
});
