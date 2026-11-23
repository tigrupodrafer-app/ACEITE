'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('diagnostico Firebird local limitado a SELECT e pedidos parametro',()=>{
 const c=read('scripts/diagnostico-espelho-sic.cjs');
 assert.match(c,/const TABLES = \['ARQES13','ARQES15','ARQCAD','CAD_PRODUTO'\]/);
 assert.match(c,/TARGETS = new Set\(\['3847','2506','1379'\]\)/);
 assert.match(c,/WHERE PEDIDO = \?/);
 assert.match(c,/CAD_PRODUTO WHERE CODIGO = \?/);
 assert.match(c,/FROM RDB\$RELATION_FIELDS/);
 assert.doesNotMatch(c,/\b(?:UPDATE|DELETE|INSERT|ALTER|DROP|TRUNCATE)\s+(?:TABLE|INTO|ARQES|CAD_)/i);
 assert.doesNotMatch(c,/console\.log\((?:db|row|products|rows)\)/);
});
test('instalador nao reinicia servicos e verifica blob imutavel',()=>{
 const c=read('scripts/Executar-Diagnostico-Espelho-SIC.ps1');
 assert.match(c,/hash-object/);
 assert.match(c,/149866a5267c56890b4e14ed1ed5b30559e16a6c/);
 assert.match(c,/a788ebf8f3a829f42c24996846688075507d2e16/);
 assert.match(c,/node --check/);
 assert.match(c,/Set-Location \$base/);
 assert.doesNotMatch(c,/Restart-Service|Stop-Service|Set-Service|Start-Process/i);
});
