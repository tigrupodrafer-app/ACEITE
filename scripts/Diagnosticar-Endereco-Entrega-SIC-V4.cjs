'use strict';
// Somente leitura: verifica se a rua do espelho SIC 354569 corresponde a algum endereco cadastrado.
// Nunca imprime nomes, ruas, numeros, CEP ou dados pessoais.
const {conectar}=require('./src/config/firebird');
const q=(db,s,p=[])=>new Promise((ok,no)=>db.query(s,p,(e,r)=>e?no(e):ok(r||[])));
const c=()=>new Promise((ok,no)=>conectar((e,d)=>e?no(e):ok(d)));
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/^(RUA|R|AV|AVENIDA) /,'');
(async()=>{let db;try{db=await c();const h=await q(db,'SELECT FIRST 2 PEDIDO,TIPOC,CODIC,SEQENDENTREGA,NRO_ENTREGA FROM ARQES13 WHERE PEDIDO=?',[354569]);if(h.length!==1)throw Error('PEDIDO_NAO_UNICO');
const a=await q(db,`SELECT SEQENDE,TIPOE,ENDE_PRINCIPAL,ENDERECO,ENDE_NRO,BAIRRO,CEP,STATUS FROM ARQCADEND WHERE TIPOC=? AND CODIGO=?`,[h[0].TIPOC,h[0].CODIC]);
const expected=norm('RUA ALVINO GOMES TEIXEIRA');
const matches=a.filter(x=>norm(x.ENDERECO)===expected);
const print={diagnostico:'DRAFER_ENDERECO_CANDIDATOS_V4',pedido:354569,totalEnderecos:a.length,totalCorrespondenciasRua:matches.length,
correspondencias:matches.map(x=>({sequencia:x.SEQENDE,tipo:x.TIPOE,principal:x.ENDE_PRINCIPAL,status:x.STATUS,numeroConfere:String(x.ENDE_NRO||'').trim()==='3051',bairroConfere:norm(x.BAIRRO)===norm('BAIRRO CASTELO BRANCO'),cepPreenchido:!!String(x.CEP||'').trim()})),
referenciaEntregaNula:h[0].SEQENDENTREGA==null,numeroEntrega:h[0].NRO_ENTREGA};
console.log(JSON.stringify(print,null,2));
}catch(e){console.error('DIAGNOSTICO_FALHOU:',e.message);process.exitCode=1}finally{if(db)try{db.detach()}catch{}}})();