'use strict';
// Diagnostico somente leitura: compara o endereco principal com a rua ja visivel no espelho oficial 354569.
// Nao imprime enderecos, dados pessoais nem credenciais.
const { conectar }=require('./src/config/firebird');
const q=(db,sql,p=[])=>new Promise((ok,no)=>db.query(sql,p,(e,r)=>e?no(e):ok(r||[])));
const conn=()=>new Promise((ok,no)=>conectar((e,db)=>e?no(e):ok(db)));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/^(RUA|R|AVENIDA|AV) /,'');
(async()=>{let db;try{
 db=await conn();const out=[];
 for(const pedido of [352488,354569]){
  const h=await q(db,'SELECT FIRST 2 PEDIDO,TIPOC,CODIC,SEQENDENTREGA,NRO_ENTREGA FROM ARQES13 WHERE PEDIDO=?',[pedido]);
  if(h.length!==1){out.push({pedido,erro:'PEDIDO_NAO_UNICO'});continue}
  const r=await q(db,`SELECT e.SEQENDE,e.TIPOE,e.ENDE_PRINCIPAL,e.ENDERECO,e.ENDE_NRO,e.BAIRRO,e.CEP,e.SEQCIDADE,c.NOME AS CIDADE,c.ESTADO AS UF
   FROM ARQCADEND e LEFT JOIN CIDADES c ON c.SEQCIDADE=e.SEQCIDADE
   WHERE e.TIPOC=? AND e.CODIGO=? AND e.TIPOE='E'`,[h[0].TIPOC,h[0].CODIC]);
  const principal=r.filter(x=>String(x.ENDE_PRINCIPAL||'').trim().toUpperCase()==='S');
  const result={pedido,referenciaExplicita:h[0].SEQENDENTREGA!=null,quantidadeEnderecos:r.length,quantidadePrincipais:principal.length,
   principalCompleto:principal.length===1&&!!String(principal[0].ENDERECO||'').trim()&&!!String(principal[0].CIDADE||'').trim()&&!!String(principal[0].UF||'').trim(),
   principalTemNumero:principal.length===1&&!!String(principal[0].ENDE_NRO||'').trim(),
   principalTemCep:principal.length===1&&!!String(principal[0].CEP||'').trim()};
  if(pedido===354569&&principal.length===1){
   result.ruaPrincipalConfereComImpressao=norm(principal[0].ENDERECO)===norm('RUA ALVINO GOMES TEIXEIRA');
  }
  out.push(result);
 }
 console.log(JSON.stringify({diagnostico:'DRAFER_ENDERECO_PRINCIPAL_V3',pedidos:out},null,2));
}catch(e){console.error('DIAGNOSTICO_FALHOU:',e.message);process.exitCode=1}finally{if(db)try{db.detach()}catch{}}})();