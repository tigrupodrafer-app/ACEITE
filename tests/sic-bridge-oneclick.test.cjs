'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('inicializador apenas abre ponte SIC, sem reiniciar API ou expor token',()=>{
 const ps=read('scripts/INICIAR-PONTE-ACEITE.ps1');
 assert.match(ps,/api\/health/);
 assert.match(ps,/ACEITE-Ponte-Worker\.ps1/);
 assert.match(ps,/ConvertFrom-SecureString/);
 assert.match(ps,/Read-Host .* -AsSecureString/);
 assert.match(ps,/git hash-object/);
 assert.match(ps,/Start-Process -FilePath \$psExe/);
 assert.match(ps,/Start-Process -FilePath notepad\.exe/);
 assert.doesNotMatch(ps,/Restart-Service|Stop-Service|Stop-Process|taskkill/i);
 assert.doesNotMatch(ps,/Write-Host.*\$plain|Write-Host.*\$token|lines\.Add\(.*\$plain/);
});
test('worker so decripta DPAPI na conta local, nao transmite senha em argumento',()=>{
 const ps=read('scripts/ACEITE-Ponte-Worker.ps1');
 assert.match(ps,/ConvertTo-SecureString/);
 assert.match(ps,/SIC_BRIDGE_TOKEN/);
 assert.match(ps,/& \$bridge/);
 assert.doesNotMatch(ps,/Restart-Service|Stop-Service|Write-Host.*\$token/i);
});
test('BAT consulta commit fixo e hash do instalador e executa localmente',()=>{
 const bat=read('scripts/INICIAR-PONTE-ACEITE.bat');
 assert.match(bat,/704543489baebc4625b1cf39ffb9af9e3b39f049/);
 assert.match(bat,/1957093bbdae2094faf24f66142cba89dd68c881/);
 assert.match(bat,/git hash-object/);
 assert.match(bat,/powershell\.exe -NoProfile/);
});
