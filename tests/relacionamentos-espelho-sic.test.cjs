'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const load=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('diagnostico SQL read-only e sem exportar valores cadastrais',()=>{
 const s=load('scripts/Mapear-Relacionamentos-Espelho-SIC.cjs');
 assert.match(s,/RDB\$RELATION_FIELDS/);
 assert.match(s,/SELECT COUNT\(\*\) AS TOTAL/);
 assert.match(s,/WHERE PEDIDO=\?/);
 assert.match(s,/WHERE CODIC=\?/);
 assert.doesNotMatch(s,/INSERT INTO|UPDATE\s+ARQ|DELETE FROM|ALTER TABLE/i);
});
test('PowerShell verifica hash e abre Notepad sem reiniciar API ou ponte',()=>{
 const s=load('scripts/Executar-Relacionamentos-Espelho-Notepad.ps1');
 assert.match(s,/f42135448dbd36a280c93578dee63c1ac477b241/);
 assert.match(s,/2d3fa935f59cb1de3f02c47d7fb38f2e735b2a58\/scripts\/Mapear-Relacionamentos-Espelho-SIC\.cjs/);
 assert.doesNotMatch(s,/scripts\/Mapear-Campos-Complementares-SIC\.cjs/);
 assert.match(s,/Import-Clixml/);
 assert.match(s,/Start-Process notepad\.exe/);
 assert.doesNotMatch(s,/Stop-Process|Restart-Service|Stop-Service|taskkill/i);
});