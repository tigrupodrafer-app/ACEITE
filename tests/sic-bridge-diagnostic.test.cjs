'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../scripts/Diagnosticar-Ponte-ACEITE-Notepad.ps1'),'utf8');
test('diagnostico ponte checa worker, API e Netlify sem divulgar token',()=>{
 assert.match(script,/SIC-Bridge/);
 assert.match(script,/Get-NetTCPConnection -LocalPort 3101/);
 assert.match(script,/api\/health/);
 assert.match(script,/netlify\/functions\/sic-bridge/);
 assert.match(script,/Start-Process notepad\.exe/);
 assert.doesNotMatch(script,/Stop-Process|Restart-Service|Stop-Service|SIC_BRIDGE_TOKEN.*\$lines\.Add|X-Sic-Bridge-Token\s*=/i);
});
