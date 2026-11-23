'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('complemento do espelho SIC usa tabelas e vínculo confirmados e nao grava no Firebird',()=>{
 const c=read('server-patches/espelhoService.js');
 assert.match(c,/ARQES13 H LEFT JOIN ARQCAD C ON C.CODIC=H.CODIC/);
 assert.match(c,/WHERE H.PEDIDO=\?/);
 assert.match(c,/H.CODIV/);
 assert.match(c,/H.TAB_PRECO/);
 assert.match(c,/C.ENDE_NRO/);
 assert.match(c,/C.FONE1/);
 assert.match(c,/C.EMAIL/);
 assert.doesNotMatch(c,/\b(?:UPDATE|DELETE|INSERT|ALTER|DROP|TRUNCATE)\s+(?:TABLE|INTO|ARQES|ARQCAD|CAD_PRODUTO)/i);
 assert.doesNotMatch(c,/3847\s*:\s*1379/);
});
test('validador so imprime disponibilidade de dados pessoais',()=>{
 const c=read('scripts/validar-espelho-local.cjs');
 for(const key of ['nomeDisponivel','enderecoDisponivel','telefoneDisponivel','documentoDisponivel','emailDisponivel'])
   assert.ok(c.includes(key));
 assert.doesNotMatch(c,/console\.log\(p\)/);
});
test('instalador executa validacao e abre Notepad sem alterar API em funcionamento',()=>{
 const c=read('scripts/Executar-Validacao-Espelho-Notepad.ps1');
 assert.match(c,/git hash-object/);
 assert.match(c,/Start-Process -FilePath notepad\.exe/);
 assert.match(c,/validar-espelho-local\.cjs/);
 assert.doesNotMatch(c,/Restart-Service|Stop-Service|Set-Service|src\\server\.js/i);
});
