'use strict';
// Read-only Firebird delivery-address investigation. No customer/address values printed.
const { conectar } = require('./src/config/firebird');
const q=(db,sql,p=[])=>new Promise((resolve,reject)=>db.query(sql,p,(e,r)=>e?reject(e):resolve(r||[])));
const connect=()=>new Promise((resolve,reject)=>conectar((e,db)=>e?reject(e):resolve(db)));
const tables=['ARQES13','ARQES13_ENDERECO','ARQCADEND','CIDADES'];
(async()=>{let db;try{
 db=await connect();
 const cols={};for(const t of tables){const r=await q(db,'SELECT TRIM(RDB$FIELD_NAME) AS N FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? ORDER BY RDB$FIELD_POSITION',[t]);cols[t]=r.map(x=>x.N)}
 const out={diagnostico:'DRAFER_ENDERECO_V2',esquema:cols,pedidos:[]};
 for(const pedido of [352488,354569]){
  const fields=['PEDIDO','TIPOC','CODIC','SEQENDENTREGA','NRO_ENTREGA'].filter(c=>cols.ARQES13.includes(c));
  const heads=await q(db,'SELECT FIRST 2 '+fields.join(',')+' FROM ARQES13 WHERE PEDIDO=?',[pedido]);
  const x={pedido,registrosPedido:heads.length,referencias:{},enderecoPedido:{},enderecoCliente:{},erros:[]};
  if(heads.length!==1){out.pedidos.push(x);continue}
  const h=heads[0];for(const k of fields.filter(k=>k!=='PEDIDO'))x.referencias[k]=h[k]===null||h[k]===undefined?'NULO':String(h[k]).trim()===''?'VAZIO':k==='SEQENDENTREGA'||k==='NRO_ENTREGA'?String(h[k]):'PRESENTE';
  if(cols.ARQES13_ENDERECO.includes('PEDIDO')){
   const r=await q(db,'SELECT * FROM ARQES13_ENDERECO WHERE PEDIDO=?',[pedido]);
   x.enderecoPedido.quantidade=r.length;
   x.enderecoPedido.registros=r.slice(0,5).map(a=>Object.fromEntries(Object.keys(a).map(k=>[k,a[k]===null?'NULO':typeof a[k]==='string'&&!a[k].trim()?'VAZIO':'PRESENTE'])));
  }
  if(cols.ARQCADEND.includes('SEQENDE')&&h.SEQENDENTREGA!=null){
   const r=await q(db,'SELECT * FROM ARQCADEND WHERE SEQENDE=?',[h.SEQENDENTREGA]);
   x.enderecoCliente.vinculoSeqQuantidade=r.length;
   x.enderecoCliente.vinculoCliente=r.map(a=>String(a.CODIGO)===String(h.CODIC)&&String(a.TIPOC)===String(h.TIPOC));
  }
  if(cols.ARQCADEND.includes('CODIGO')&&cols.ARQCADEND.includes('TIPOC')){
   const r=await q(db,'SELECT * FROM ARQCADEND WHERE CODIGO=? AND TIPOC=?',[h.CODIC,h.TIPOC]);
   x.enderecoCliente.quantidadeCadastrada=r.length;
   x.enderecoCliente.sequencias=r.slice(0,20).map(a=>({seq:a.SEQENDE,tipo:a.TIPOE,principal:a.ENDE_PRINCIPAL,comEndereco:!!String(a.ENDERECO||'').trim()}));
  }
  out.pedidos.push(x);
 }
 console.log(JSON.stringify(out,null,2));
}catch(e){console.error('DIAGNOSTICO_FALHOU:',e.message);process.exitCode=1}finally{if(db)try{db.detach()}catch{}}})();