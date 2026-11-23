'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('modal de consulta tem dialog acessivel e passos reais do backend',()=>{
 const code=read('src/components/OrderLoadingModal.jsx');
 assert.match(code,/aria-modal="true"/);
 assert.match(code,/role="dialog"/);
 for(const state of ['enviando','pending','processing','montando','verificando','erro']){
  assert.ok(code.includes(state),'Etapa ausente: '+state);
 }
 assert.match(code,/animate-spin/);
 assert.match(code,/Tempo decorrido/);
 assert.match(code,/Fechar e tentar novamente/);
});

test('modal acompanha todo o ciclo SIC incluindo erro e timeout',()=>{
 const code=read('src/components/VendorWorkflow.jsx');
 assert.match(code,/OrderLoadingModal/);
 assert.match(code,/setLoadingPhase\('enviando'\)/);
 assert.match(code,/setLoadingPhase\('montando'\)/);
 assert.match(code,/setLoadingPhase\('verificando'\)/);
 assert.match(code,/180000/);
 assert.match(code,/failures>=3/);
 assert.match(code,/setLoadingPhase\(null\)/);
 assert.match(code,/pollingBusy\.current/);
});

test('termo apresenta spinner e falha em vez de desaparecer silenciosamente',()=>{
 const code=read('src/components/VendorWorkflow.jsx');
 assert.match(code,/termLoading/);
 assert.match(code,/termError/);
 assert.match(code,/Carregando cláusulas e anexos/);
});

test('nenhum botao de emitir documento ou WhatsApp fica liberado sem termo final',()=>{
 const code=read('src/components/VendorWorkflow.jsx');
 assert.match(code,/<button type="button" disabled className="bg-slate-300/);
 assert.match(code,/<button type="button" disabled className="border rounded px-4 py-2/);
 assert.doesNotMatch(code,/signOrderByToken|aceite_tokens\?.*insert/);
});
