'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../scripts/diagnostico-espelho-v3.cjs'),'utf8');
test('v3 nunca para em erro de campo e inclui identificacao de etapa',()=>{
 assert.match(script,/stage:'ARQES13-header'/);
 assert.match(script,/stage:'ARQCAD-presence'/);
 assert.match(script,/stage:'CAD_PRODUTO-'/);
 assert.match(script,/finally\(\(\)=>/);
 assert.match(script,/process\.stdout\.write\(JSON\.stringify\(report/);
});
test('v3 usa SELECTs parametrizados e nao imprime dados do cliente',()=>{
 assert.match(script,/WHERE PEDIDO = \?/);
 assert.match(script,/WHERE CODIC = \?/);
 assert.match(script,/CAST\('\+field\+' AS VARCHAR\(80\)\) = \?/);
 assert.doesNotMatch(script,/\b(?:UPDATE|DELETE|INSERT|ALTER|DROP|TRUNCATE)\s+(?:TABLE|INTO|ARQES|ARQCAD|CAD_PRODUTO)/i);
 assert.doesNotMatch(script,/console\.log\(rows\)|JSON\.stringify\(customer\)/);
});
