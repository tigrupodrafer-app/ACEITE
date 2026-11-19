'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../scripts/Provar-Token-Ponte-Notepad.ps1'),'utf8');
test('prova token sem retirar pedidos da fila',()=>{
 assert.match(source,/Method Post -Headers \$headers -Body '\{\}'/);
 assert.doesNotMatch(source,/Method Get -Headers \$headers|method:\s*'GET'|Invoke-RestMethod -Method Get/);
 assert.match(source,/switch\(\$status\)/);
 for(const code of ['400','403','503'])assert.match(source,new RegExp(''+code+' \\{'));
});
test('abertura em Notepad e sem gravar token em relatorio',()=>{
 assert.match(source,/ConvertTo-SecureString/);
 assert.match(source,/Start-Process -FilePath notepad\.exe/);
 assert.match(source,/ZeroFreeBSTR/);
 assert.doesNotMatch(source,/Write-Host.*\$token|\$lines\.Add\(.*\$token|Stop-Process|Restart-Service|Stop-Service|taskkill/);
});
