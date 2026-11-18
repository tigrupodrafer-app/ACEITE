'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const service=fs.readFileSync(path.join(__dirname,'../server-patches/espelhoService.js'),'utf8');
const merge=require('../server-patches/espelhoMerge.js');
const install=fs.readFileSync(path.join(__dirname,'../scripts/Instalar-Espelho-V2-Notepad.ps1'),'utf8');
test('SIC enrichment reads two verified relations with parameterized queries',()=>{
 assert.match(service,/FROM EMPRESA WHERE COD_EMPRESA=\?/);
 assert.match(service,/FROM CIDADES WHERE SEQCIDADE=\?/);
 assert.match(service,/empresaRows\.length===1/);
 assert.match(service,/cidadeRows\.length===1/);
 assert.match(service,/CLIENTE_CONTATO/);
 assert.match(service,/CLIENTE_CNPJ/);
 assert.doesNotMatch(service,/INSERT INTO|UPDATE\s+ARQ|DELETE FROM|ALTER TABLE/i);
});
test('merge keeps original order, supplement city and company but not null',()=>{
 const output=merge.mergePedidoEspelho(
  {numero:1,empresa:1,cliente:{cidade:'Antiga',nome:'Exemplo'}},
  {numero:1,empresa:1,nomeEmpresa:'Filial',cliente:{cidade:'Nova',nome:null,estado:'SP'}}
 );
 assert.equal(output.nomeEmpresa,'Filial');
 assert.equal(output.cliente.cidade,'Nova');
 assert.equal(output.cliente.nome,'Exemplo');
 assert.equal(output.cliente.estado,'SP');
});
test('installer stages with hash, backup and never restarts process',()=>{
 assert.match(install,/b50c5fbfe02112df837ee419076f46d324dd0d34/);
 assert.match(install,/6b9ef352a98ab5ae2130787d1260b57ab9ee0471/);
 assert.match(install,/bak-v2-/);
 assert.match(install,/node --check/);
 assert.match(install,/Start-Process notepad\.exe/);
 assert.doesNotMatch(install,/Restart-Service|Stop-Process|Stop-Service|taskkill/i);
});
