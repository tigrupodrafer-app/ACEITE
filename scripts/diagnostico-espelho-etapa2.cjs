// DRAFER ACEITE - etapa 2: correlacionar espelho de impressao, SOMENTE LEITURA.
// Instalar em C:\DRAFER\ACEITE-API\diagnostico-espelho-etapa2.cjs
// node .\diagnostico-espelho-etapa2.cjs 352488 352688
// Nunca imprime nome, documento fiscal, telefone, endereco, e-mail, senha ou tokens.
'use strict';
const { conectar } = require('./src/config/firebird');
const orders=process.argv.slice(2).length?process.argv.slice(2):['352488','352688'];
if(orders.length>3||!orders.every(s=>/^[1-9]\d{0,11}$/.test(s)))throw Error('Informe ate tres pedidos validos.');
const connect=()=>new Promise((resolve,reject)=>conectar((e,db)=>e?reject(e):resolve(db)));
const query=(db,sql,args=[])=>new Promise((resolve,reject)=>db.query(sql,args,(e,rows)=>e?reject(e):resolve(rows||[])));
const toVal=v=>v==null?null:(typeof v==='number'&&Number.isFinite(v)?v:String(v).trim().slice(0,70));
const target=['CODIC','CODIV','CODIT','TAB_PRECO','TPVENDA','COD_EMPRESA','DATA','DATA_DIGITACAO','NRO_ENTREGA','SEQENDENTREGA','FRETE','VR_FRETE'];
async function main(){
 const db=await connect();
 try{
  const result={diagnostico:'ESPELHO_SIC_READONLY_V2',timestampUTC:new Date().toISOString(),orders:[],catalogProductCodeCheck:[],missingJoinFields:[],note:'Somente SELECT; CODIV/CODIT/CODIC ainda sao candidatos, nao papeis homologados. Nenhum dado pessoal e incluido.'};
  const meta=await query(db,"SELECT TRIM(RDB$RELATION_NAME) AS TABELA, TRIM(RDB$FIELD_NAME) AS CAMPO FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME IN ('ARQES13','ARQCAD','CAD_PRODUTO')");
  const fields=Object.create(null);
  for(const m of meta){
    const name=String(m.TABELA).trim();
    (fields[name]??=new Set()).add(String(m.CAMPO).trim());
  }
  if(!fields.ARQES13?.has('PEDIDO')||!fields.ARQCAD?.has('CODIC'))throw Error('Colunas de consulta nao identificadas em ARQES13/ARQCAD.');
  const select=target.filter(c=>fields.ARQES13.has(c));
  if(!select.length)throw Error('Nenhum campo permitido disponivel na ARQES13.');
  const summaryColumns=['NOME','ENDE','ENDE_NRO','BAIRRO','NCEP','FONE1','NCPF','EMAIL','CODR','SEQCIDADE','PRAZO_PAGTO'].filter(c=>fields.ARQCAD.has(c));
  for(const number of orders){
   const rows=await query(db,'SELECT FIRST 5 '+select.map(c=>'"'+c+'"').join(',')+' FROM ARQES13 WHERE PEDIDO = ?',[Number(number)]);
   const s={pedido:Number(number),ocorrencias:rows.length,headerCandidates:[],clientMatches:[]};
   for(const row of rows){
    const h=Object.fromEntries(select.map(c=>[c,toVal(row[c])]));
    s.headerCandidates.push(h);
    if(h.CODIC!=null){
     const customer=await query(db,'SELECT FIRST 5 CODIC'+(summaryColumns.length?','+summaryColumns.join(','):'')+' FROM ARQCAD WHERE CODIC = ?',[h.CODIC]);
     s.clientMatches.push({
       codic:h.CODIC,matchingRows:customer.length,
       nonEmptyFields:Object.fromEntries(summaryColumns.map(c=>[c,customer.some(r=>r[c]!==null&&r[c]!==undefined&&String(r[c]).trim()!=='')])),
       // Campo de CPF/CNPJ confirmado como existente ou vazio; nunca mostra valor.
     });
    }
   }
   result.orders.push(s);
  }
  // O valor 3847 vem da imagem da impressao, mas nao dos campos de acesso 1379/2506.
  // Procurar se esse numero corresponde a outro cadastro; isso NAO comprova codigo de impressao.
  const columns=['CODIGO','SEQPRODUTO','CODACESSOG','CODACESSO'].filter(c=>fields.CAD_PRODUTO?.has(c));
  for(const col of columns){
   const hit=await query(db,'SELECT FIRST 5 CODIGO, SEQPRODUTO, CODACESSOG, CODACESSO FROM CAD_PRODUTO WHERE CAST("'+col+'" AS VARCHAR(80)) = ?',['3847']);
   result.catalogProductCodeCheck.push({searchedColumn:col,value:'3847',
     found:hit.length>0,matchingProductIds:hit.map(row=>({
       codigo:toVal(row.CODIGO),seqproduto:toVal(row.SEQPRODUTO),
       codacessog:toVal(row.CODACESSOG),codacesso:toVal(row.CODACESSO)
     }))});
  }
  console.log(JSON.stringify(result,null,2));
 }finally{try{db.detach()}catch{}}
}
main().catch(e=>{
 console.error('ERRO_DIAGNOSTICO_ETAPA2: Consulta nao concluida. Verificar campos e conexao em sessao local.');
 process.exitCode=1;
});
