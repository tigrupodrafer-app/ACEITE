// ACEITE DRAFER - diagnostico V4 somente leitura. Corrige varredura que gerou malformed_string.
// Executar em C:\DRAFER\ACEITE-API: node .\diagnostico-espelho-v4.cjs 352488 352688
// Nao imprime dados de identificacao pessoal nem credenciais.
'use strict';
const {conectar}=require('./src/config/firebird');
const orders=process.argv.slice(2).length?process.argv.slice(2):['352488','352688'];
if(orders.length>3||!orders.every(n=>/^[1-9]\d{0,11}$/.test(n)))throw Error('Pedido invalido');
const open=()=>new Promise((ok,no)=>conectar((err,db)=>err?no(err):ok(db)));
const query=(db,q,args=[])=>new Promise((ok,no)=>db.query(q,args,(e,r)=>e?no(e):ok(r||[])));
const clean=x=>String(x??'').trim();
const scalar=x=>x===null||x===undefined?null:typeof x==='number'?x:
  typeof x==='string'?x.slice(0,60):null;
const error=e=>({gdscode:Number(e?.gdscode)||null,stage:'query-failed'});
const result={diagnostico:'ESPELHO_SIC_READONLY_V4',pedidos:[],campos:[],produtos:[],etapas:[],
  nota:'Diagnostico tecnico somente SELECT. O campo CODACESSO nao e varrido via CAST por risco de texto malformado.'};
async function main(){
 const db=await open();
 try{
  const columns=await query(db,
    'SELECT TRIM(RF.RDB$RELATION_NAME) AS TABELA, TRIM(RF.RDB$FIELD_NAME) AS CAMPO, '+
    'F.RDB$FIELD_TYPE AS TIPO, F.RDB$FIELD_SUB_TYPE AS SUBTIPO, '+
    'F.RDB$CHARACTER_LENGTH AS TAMANHO, F.RDB$CHARACTER_SET_ID AS CHARSET_ID '+
    'FROM RDB$RELATION_FIELDS RF JOIN RDB$FIELDS F ON F.RDB$FIELD_NAME=RF.RDB$FIELD_SOURCE '+
    "WHERE RF.RDB$RELATION_NAME IN ('ARQES13','ARQCAD','CAD_PRODUTO','ARQES15') "+
    'ORDER BY RF.RDB$RELATION_NAME,RF.RDB$FIELD_POSITION');
  const cols=table=>new Set(columns.filter(row=>clean(row.TABELA)===table).map(row=>clean(row.CAMPO)));
  const have=(table,name)=>cols(table).has(name);
  const useful=['CODIGO','SEQPRODUTO','CODACESSO','CODACESSOG','CODIC','CODIV','CODIT','TAB_PRECO','TPVENDA','DATA','DATA_DIGITACAO','NCPF','EMAIL','FONE1','SEQCIDADE','PRAZO_PAGTO','CODR','NRO_ENTREGA','SEQENDENTREGA'];
  result.campos=columns.filter(row=>useful.includes(clean(row.CAMPO))).map(row=>({
    tabela:clean(row.TABELA),campo:clean(row.CAMPO),tipo:row.TIPO,subtipo:row.SUBTIPO,
    tamanho:row.TAMANHO,charset:row.CHARSET_ID
  }));
  result.etapas.push({etapa:'metadata',ok:true});
  const header=['PEDIDO','CODIC','CODIV','CODIT','TAB_PRECO','TPVENDA','COD_EMPRESA','NRO_ENTREGA','SEQENDENTREGA','FRETE','VR_FRETE']
    .filter(x=>have('ARQES13',x));
  for(const value of orders){
    const order=Number(value),summary={pedido:order,cabecalho:[],cadastro:{},produtosInternos:[]};
    try{
      const h=await query(db,'SELECT FIRST 5 '+header.join(',')+' FROM ARQES13 WHERE PEDIDO = ?',[order]);
      summary.cabecalho=h.map(row=>Object.fromEntries(header.map(k=>[k,scalar(row[k])])));
      result.etapas.push({etapa:'cabecalho',pedido:order,ok:true});
      for(const row of h){
        if(row.CODIC==null||!have('ARQCAD','CODIC'))continue;
        const clientCols=['NOME','ENDE','ENDE_NRO','BAIRRO','NCEP','FONE1','NCPF','EMAIL','CODR','SEQCIDADE','PRAZO_PAGTO'].filter(k=>have('ARQCAD',k));
        const tests=clientCols.map(c=>'MAX(CASE WHEN '+c+' IS NOT NULL THEN 1 ELSE 0 END) AS '+c);
        try{
          const matches=await query(db,'SELECT COUNT(*) AS TOTAL,'+tests.join(',')+' FROM ARQCAD WHERE CODIC=?',[row.CODIC]);
          summary.cadastro=Object.fromEntries(clientCols.map(c=>[c,Number(matches[0]?.[c]||0)===1]));
          summary.cadastroEncontros=Number(matches[0]?.TOTAL||0);
        }catch(e){result.etapas.push({etapa:'cliente',pedido:order,ok:false,error:error(e)});}
      }
      const rows=await query(db,'SELECT FIRST 40 PRODUTO,ITEM FROM ARQES15 WHERE PEDIDO=? ORDER BY ITEM',[order]);
      summary.produtosInternos=[...new Set(rows.map(row=>Number(row.PRODUTO)).filter(n=>Number.isSafeInteger(n)&&n>0))];
    }catch(e){result.etapas.push({etapa:'pedido',pedido:order,ok:false,error:error(e)});}
    result.pedidos.push(summary);
  }
  const all=[...new Set(result.pedidos.flatMap(p=>p.produtosInternos))];
  for(const id of all){
    try{
      const rows=await query(db,'SELECT FIRST 1 CODIGO,SEQPRODUTO,CODACESSOG,CODACESSO FROM CAD_PRODUTO WHERE CODIGO=?',[id]);
      result.produtos.push({interno:id,acesso:rows.map(r=>({
        codigo:scalar(r.CODIGO),seqproduto:scalar(r.SEQPRODUTO),
        codacessog:scalar(r.CODACESSOG),codacesso:scalar(r.CODACESSO)
      }))});
    }catch(e){result.produtos.push({interno:id,error:error(e)});}
  }
  for(const key of ['CODIGO','SEQPRODUTO']){
    if(!have('CAD_PRODUTO',key))continue;
    try{
      const rows=await query(db,'SELECT FIRST 5 CODIGO,SEQPRODUTO FROM CAD_PRODUTO WHERE '+key+'=?',[3847]);
      result.etapas.push({etapa:'busca3847-'+key,ok:true,quantidade:rows.length});
    }catch(e){result.etapas.push({etapa:'busca3847-'+key,ok:false,error:error(e)});}
  }
 }finally{try{db.detach()}catch{}}
}
main().catch(e=>{result.etapas.push({etapa:'conexao-ou-geral',ok:false,error:error(e)});process.exitCode=1;})
 .finally(()=>{process.stdout.write(JSON.stringify(result,null,2)+'\n');});
