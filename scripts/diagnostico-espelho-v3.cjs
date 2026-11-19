// ACEITE DRAFER: V3 de diagnostico SIC, exclusivamente SELECT, resiliente a campos incompatíveis.
// Colocar em C:\DRAFER\ACEITE-API\diagnostico-espelho-v3.cjs
// Executar: node .\diagnostico-espelho-v3.cjs 352488 352688
// Resultado: JSON SEM dados pessoais; erros SQL sem ecoar parametros ou credenciais.
'use strict';
const {conectar}=require('./src/config/firebird');
const numbers=process.argv.slice(2).length?process.argv.slice(2):['352488','352688'];
if(numbers.length>3||!numbers.every(x=>/^[1-9]\d{0,11}$/.test(x)))throw Error('Pedidos invalidos');
const open=()=>new Promise((res,rej)=>conectar((err,db)=>err?rej(err):res(db)));
const sql=(db,text,params=[])=>new Promise((res,rej)=>db.query(text,params,(err,rows)=>err?rej(err):res(rows||[])));
const summary=error=>({
  // SQLCODE e status Firebird; NAO escrever mensagem de excecao que possa conter credenciais.
  code:Number.isFinite(Number(error?.sqlcode))?Number(error.sqlcode):null,
  gdscode:Number.isFinite(Number(error?.gdscode))?Number(error.gdscode):null,
  reason:'Falha SQL. Verifique campos e tipos desta etapa.'
});
const scalar=v=>v===null||v===undefined?null:
  typeof v==='string'?v.slice(0,60):
  typeof v==='number'&&Number.isFinite(v)?v:null;
const report={diagnostico:'ESPELHO_SIC_READONLY_V3',orders:[],productCodeSearch:[],stages:[],
  notes:'Resultado apenas tecnico, sem nomes, documentos, contatos, enderecos ou outros dados pessoais. Sem UPDATE/INSERT/DELETE.'};
async function main(){
 const db=await open();
 try{
  let columns=[];
  try{
   const meta=await sql(db,"SELECT TRIM(RDB$RELATION_NAME) AS TABELA, TRIM(RDB$FIELD_NAME) AS CAMPO FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME IN ('ARQES13','ARQCAD','CAD_PRODUTO')");
   columns=meta.map(x=>({table:String(x.TABELA).trim(),field:String(x.CAMPO).trim()}));
   report.stages.push({stage:'metadata',ok:true,count:columns.length});
  }catch(e){report.stages.push({stage:'metadata',ok:false,error:summary(e)});return;}
  const has=(table,field)=>columns.some(x=>x.table===table&&x.field===field);
  const header=['PEDIDO','CODIC','CODIV','CODIT','TAB_PRECO','TPVENDA','COD_EMPRESA','DATA','DATA_DIGITACAO','NRO_ENTREGA','SEQENDENTREGA','FRETE','VR_FRETE'].filter(f=>has('ARQES13',f));
  report.stages.push({stage:'schema',ok:true,headerColumns:header,clientCode:has('ARQCAD','CODIC')});
  if(!header.includes('PEDIDO')){report.stages.push({stage:'header-query',ok:false,error:{reason:'ARQES13.PEDIDO nao encontrado'}});return;}
  // Query com nomes fixos obtidos do proprio catalogo Firebird; nunca SQL arbitrario.
  for(const text of numbers){
   const pedido=Number(text),o={pedido,headers:[],customerFieldsPresent:null};
   try{
    const rows=await sql(db,'SELECT FIRST 5 '+header.join(',')+' FROM ARQES13 WHERE PEDIDO = ?',[pedido]);
    o.count=rows.length;
    for(const row of rows){
     const headerRecord=Object.fromEntries(header.map(col=>[col,scalar(row[col])]));
     o.headers.push(headerRecord);
     if(has('ARQCAD','CODIC')&&row.CODIC!=null){
      // Analisa PRESENCA das colunas do cliente, sem SELECT de dados pessoais.
      const cols=['NOME','ENDE','ENDE_NRO','BAIRRO','NCEP','FONE1','NCPF','EMAIL','CODR','SEQCIDADE','PRAZO_PAGTO']
        .filter(c=>has('ARQCAD',c));
      const parts=cols.map(col=>"MAX(CASE WHEN "+col+" IS NOT NULL THEN 1 ELSE 0 END) AS "+col);
      if(parts.length){
       try{
        const found=await sql(db,'SELECT COUNT(*) AS TOTAL,'+parts.join(',')+' FROM ARQCAD WHERE CODIC = ?',[row.CODIC]);
        o.customerFieldsPresent={matches:Number(found[0]?.TOTAL||0),columns:Object.fromEntries(cols.map(c=>[c,Number(found[0]?.[c]||0)>0]))};
       }catch(e){o.customerFieldsPresent={error:summary(e)};report.stages.push({stage:'ARQCAD-presence',pedido,ok:false,error:summary(e)});}
      }
     }
    }
    report.stages.push({stage:'ARQES13-header',pedido,ok:true,count:rows.length});
   }catch(e){o.error=summary(e);report.stages.push({stage:'ARQES13-header',pedido,ok:false,error:summary(e)});}
   report.orders.push(o);
  }
  // Buscar 3847 nos quatro identificadores, separadamente.
  for(const field of ['CODIGO','SEQPRODUTO','CODACESSOG','CODACESSO']){
   if(!has('CAD_PRODUTO',field)){report.productCodeSearch.push({field,exists:false});continue;}
   try{
    const rows=await sql(db,'SELECT FIRST 5 CODIGO,SEQPRODUTO,CODACESSOG,CODACESSO FROM CAD_PRODUTO WHERE CAST('+field+' AS VARCHAR(80)) = ?',['3847']);
    report.productCodeSearch.push({field,exists:true,found:rows.length>0,
      matchingCodes:rows.map(x=>({codigo:scalar(x.CODIGO),seqproduto:scalar(x.SEQPRODUTO),
        codacessog:scalar(x.CODACESSOG),codacesso:scalar(x.CODACESSO)}))});
    report.stages.push({stage:'CAD_PRODUTO-'+field,ok:true});
   }catch(e){
    report.productCodeSearch.push({field,exists:true,error:summary(e)});
    report.stages.push({stage:'CAD_PRODUTO-'+field,ok:false,error:summary(e)});
   }
  }
 }finally{try{db.detach()}catch{}}
}
main().catch(e=>{
 report.stages.push({stage:'connection-or-global',ok:false,error:summary(e)});
 process.exitCode=1;
}).finally(()=>{
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
});
