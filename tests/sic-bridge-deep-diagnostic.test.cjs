'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../scripts/Diagnostico-Profundo-Ponte-Notepad.ps1'),'utf8');
test('diagnostico de ponte confirma processos, DPAPI, erros categorizados sem token',()=>{
 for(const value of ['Get-CimInstance Win32_Process','ACEITE-Ponte-Worker','ConvertTo-SecureString','SIC_BRIDGE_TOKEN','Get-Content -LiteralPath $file.FullName -Tail 250','Bridge polling failed','Netlify upload failed','HTTP=403','Start-Process -FilePath notepad.exe'])
  assert.ok(src.includes(value),value);
 assert.doesNotMatch(src,/X-Sic-Bridge-Token\s*=|headers\s*=\s*@\{|Restart-Service|Stop-Service|Stop-Process|taskkill|Update-Item|Set-ItemProperty/i);
 assert.match(src,/NENHUMA chamada autenticada foi feita/);
 assert.match(src,/\$workers=@\(\)/);
 assert.match(src,/\$logs=@\(\)/);
});
