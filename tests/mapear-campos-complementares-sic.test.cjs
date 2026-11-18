'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
test('metadados e somente presenca de dados de cliente, nunca valores',()=>{
 const src=read('scripts/Mapear-Campos-Complementares-SIC.cjs');
 assert.match(src,/RDB\$RELATION_FIELDS/);
 assert.match(src,/SELECT FIRST 2/);
 assert.match(src,/WHERE PEDIDO=\?/);
 assert.match(src,/WHERE CODIC=\?/);
 assert.match(src,/PRESENTE/);
 assert.doesNotMatch(src,/INSERT INTO|UPDATE ARQ|DELETE FROM/i);
});
test('PowerShell usa hash fixo, launcher DPAPI e Notepad sem reiniciar servicos',()=>{
 const src=read('scripts/Executar-Mapeamento-Campos-SIC-Notepad.ps1');
 assert.match(src,/f70a731bf481b62fb6f0e7f4d483b85129f23bf3/);
 assert.match(src,/firebird-credential\.xml/);
 assert.match(src,/Import-Clixml/);
 assert.match(src,/Start-Process notepad\.exe/);
 assert.doesNotMatch(src,/Stop-Process|Stop-Service|Restart-Service|taskkill|Remove-Item.*ACEITE-API/i);
});
