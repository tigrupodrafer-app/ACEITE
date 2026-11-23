'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('V4 isola consultas e evita CAST de CODACESSO com string malformada',()=>{
 const x=read('scripts/diagnostico-espelho-v4.cjs');
 assert.match(x,/ESPELHO_SIC_READONLY_V4/);
 assert.match(x,/WHERE PEDIDO=\?/);
 assert.match(x,/FROM CAD_PRODUTO WHERE CODIGO=\?/);
 assert.match(x,/WHERE \x27\+key\+\x27=\?/);
 assert.doesNotMatch(x,/CAST\(CODACESSO|CAST\(\x27\+field/);
 assert.match(x,/finally\(\(\)=>/);
});
test('V4 salva e abre resultado no bloco de notas',()=>{
 const s=read('scripts/Executar-Diagnostico-Espelho-V4-Notepad.ps1');
 assert.match(s,/Start-Process -FilePath 'notepad\.exe'/);
 assert.match(s,/git hash-object/);
 assert.match(s,/node --check/);
 assert.match(s,/Out-File -LiteralPath \$report/);
 assert.doesNotMatch(s,/Restart-Service|Stop-Service|Start-Service/i);
});
