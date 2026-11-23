'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../scripts/Integrar-Espelho-Pedidos-Notepad.ps1'),'utf8');
test('conta marcadores por substring literal, nao por caracteres isolados',()=>{
 assert.match(script,/\[regex\]::Matches\(\$source,\[regex\]::Escape\(\$anchor\)\)/);
 assert.match(script,/\[regex\]::Matches\(\$source,\[regex\]::Escape\(\$point\)\)/);
 assert.match(script,/\[regex\]::Matches\(\$source,\[regex\]::Escape\(\$oldMerge\)\)/);
 assert.doesNotMatch(script,/\$source\.Split\(/);
});
test('patch so aplicado com backup e sintaxe validada, sem reinicio',()=>{
 assert.match(script,/node --check \$candidate/);
 assert.match(script,/Copy-Item -LiteralPath \$route -Destination \$backup/);
 assert.match(script,/Start-Process -FilePath notepad\.exe/);
 assert.doesNotMatch(script,/Restart-Service|Stop-Service|Stop-Process|taskkill/i);
});
