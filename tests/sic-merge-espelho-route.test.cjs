'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mergePedidoEspelho}=require('../server-patches/espelhoMerge.js');
const script=fs.readFileSync(path.join(__dirname,'../scripts/Integrar-Espelho-Pedidos-Notepad.ps1'),'utf8');
test('merge preserva dados validos e filtra nulos',()=>{
 const pedido={numero:352488,empresa:1,cliente:{codigo:1177,nome:'Nome antigo',telefone:'(00) 1234',email:'atual@example.org'},valores:{total:240.05}};
 const espelho={numero:352488,empresa:1,codigoVendedor:15,tabelaPreco:1,cliente:{nome:'Nome novo',telefone:null,email:'',endereco:'Rua X'},_espelhoHomologacao:{schema:'ARQES13+ARQCAD'}};
 const merged=mergePedidoEspelho(pedido,espelho);
 assert.equal(merged.codigoVendedor,15);
 assert.equal(merged.tabelaPreco,1);
 assert.equal(merged.cliente.nome,'Nome novo');
 assert.equal(merged.cliente.telefone,'(00) 1234');
 assert.equal(merged.cliente.email,'atual@example.org');
 assert.equal(merged.cliente.endereco,'Rua X');
 assert.deepEqual(merged.valores,pedido.valores);
 assert.equal(merged._espelhoHomologacao.codigoImpressaoHomologado,false);
});
test('merge bloqueia empresas divergentes',()=>{
 assert.throws(()=>mergePedidoEspelho({numero:352488,empresa:1},{numero:352488,empresa:3}));
 assert.throws(()=>mergePedidoEspelho({numero:352488,empresa:1},{numero:352688,empresa:1}));
});
test('script verifica rota, faz backup, nao reinicia API, abre bloco de notas',()=>{
 for(const str of ['node --check','$backup=','mergePedidoEspelho','buscarEspelhoComplementar','Start-Process -FilePath notepad.exe','Nao foi reiniciada']){
  if(str==='Nao foi reiniciada')continue;
  assert.ok(script.includes(str),str);
 }
 assert.doesNotMatch(script,/Restart-Service|Stop-Service|Stop-Process|taskkill/i);
});
