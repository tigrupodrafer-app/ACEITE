// DRAFER ACEITE - Etapa 2: metadados e relacionamentos reais, SELECT read-only.
// Nao exporta valores de clientes, empresas ou transacoes; so nomes de campos e contagens.
'use strict';
const {conectar}=require('./src/config/firebird');
const orders=[352488,352688];
const tablesToInspect=['ARQES13','ARQCAD','EMPRESA','NFE_EMPRESAS','CIDADES','ARQES13_ENDERECO','ARQCADEND','ARQTPAG','ARQTCOB','ARQCADCOBR','ARQBC04'];
const dbQuery=(db,sql,args=[])=>new Promise((ok,no)=>db.query(sql,args,(err,rows)=>err?no(err):ok(rows||[])));
const connect=()=>new Promise((ok,no)=>conectar((err,db)=>err?no(err):ok(db)));
const trim=x=>String(x??'').trim().toUpperCase();
const output={diagnostico:'ACEITE_RELACIONAMENTOS_SIC_READONLY_V2',timestamp:new Date().toISOString(),tabelas:{},validacao:[],observacoes:[
 'Campos identificados pelo nome, mas sem atribuicao de significado comercial ate homologacao.',
 'Sem leitura ou impressao de nomes, documentos, contatos, enderecos ou senhas.',
 'Nao consulta codigo de impressao nem mapeia numero de venda. Nenhuma alteracao Firebird.'
]};
const errorCode=e=>({sqlCode:Number(e?.gdscode)||null,categoria:'CONSULTA_NAO_CONCLUIDA'});
const exists=(table,col)=>colNames.get(table)?.has(col)===true;
let colNames=new Map();
(async()=>{
 let db;
 try{
  db=await connect();
  const columns=await dbQuery(db,"SELECT TRIM(RDB$RELATION_NAME) AS TABELA, TRIM(RDB$FIELD_NAME) AS CAMPO FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME IN ("+
   tablesToInspect.map(() => '?').join(',')+") ORDER BY RDB$RELATION_NAME,RDB$FIELD_POSITION", tablesToInspect);
  for(const name of tablesToInspect)colNames.set(name,new Set());
  for(const row of columns){const table=trim(row.TABELA),field=trim(row.CAMPO);if(colNames.has(table))colNames.get(table).add(field)}
  for(const name of tablesToInspect){
   const fields=[...colNames.get(name)];
   output.tabelas[name]={existe:fields.length>0,totalCampos:fields.length,campos:fields.slice(0,140)};
  }
  const headerColumns=['PEDIDO','COD_EMPRESA','CODIC','NRO_ENTREGA','SEQENDENTREGA','TAB_PRECO',
    'TPVENDA','DATA','DATA_DIGITACAO','NOME_USUARIO','USUARIO_INCLUIU','CONTATO']
    .filter(x=>exists('ARQES13',x));
  const customerColumns=['CODIC','SEQCIDADE','COD_EMPRESA','NCPF','COMPRADOR','CONTATO',
    'ENDE_COMPLEMENTO','NFANTASIA'].filter(x=>exists('ARQCAD',x));
  if(!exists('ARQES13','PEDIDO')||!exists('ARQES13','CODIC')||!exists('ARQCAD','CODIC'))throw Error('SCHEMA_BASE_AUSENTE');
  for(const order of orders){
   const result={pedido:order,pedidoUnico:false,camposCabecalho:{},cadastroUnico:false,camposCadastro:{},relacionamentos:{}};
   const headers=await dbQuery(db,'SELECT FIRST 2 '+headerColumns.join(',')+' FROM ARQES13 WHERE PEDIDO=?',[order]);
   result.pedidoUnico=headers.length===1;
   if(!result.pedidoUnico){output.validacao.push(result);continue}
   const h=headers[0];
   for(const col of headerColumns)result.camposCabecalho[col]=h[col]===null||h[col]===undefined||String(h[col]).trim()===''?'VAZIO':'PRESENTE';
   const clients=await dbQuery(db,'SELECT FIRST 2 '+customerColumns.join(',')+' FROM ARQCAD WHERE CODIC=?',[h.CODIC]);
   result.cadastroUnico=clients.length===1;
   const c=clients.length===1?clients[0]:null;
   if(c)for(const col of customerColumns)result.camposCadastro[col]=c[col]===null||c[col]===undefined||String(c[col]).trim()===''?'VAZIO':'PRESENTE';
   const probes=[
    {nome:'empresa_por_cod_empresa',from:'EMPRESA',column:'COD_EMPRESA',value:h.COD_EMPRESA},
    {nome:'cidade_cliente_por_seqcidade',from:'CIDADES',column:'SEQCIDADE',value:c?.SEQCIDADE},
    {nome:'endereco_pedido_por_numero_entrega',from:'ARQES13_ENDERECO',column:'NRO_ENTREGA',value:h.NRO_ENTREGA},
    {nome:'endereco_pedido_por_seq_entrega',from:'ARQES13_ENDERECO',column:'SEQENDENTREGA',value:h.SEQENDENTREGA},
    {nome:'endereco_cliente_por_codic',from:'ARQCADEND',column:'CODIC',value:h.CODIC},
    {nome:'endereco_cliente_por_seq',from:'ARQCADEND',column:'SEQENDENTREGA',value:h.SEQENDENTREGA},
    {nome:'cobranca_cliente_por_codic',from:'ARQCADCOBR',column:'CODIC',value:h.CODIC},
   ];
   for(const p of probes){
    if(!exists(p.from,p.column)){result.relacionamentos[p.nome]={situacao:'COLUNA_NAO_EXISTE'};continue}
    if(p.value===null||p.value===undefined||String(p.value).trim()===''){result.relacionamentos[p.nome]={situacao:'CHAVE_VAZIA'};continue}
    try{
     const rows=await dbQuery(db,'SELECT COUNT(*) AS TOTAL FROM '+p.from+' WHERE '+p.column+'=?',[p.value]);
     result.relacionamentos[p.nome]={situacao:'CONSULTADO',encontrados:Number(rows[0]?.TOTAL??0)};
    }catch(e){result.relacionamentos[p.nome]={situacao:'ERRO_SQL',erro:errorCode(e)}}
   }
   output.validacao.push(result);
  }
 }catch(e){output.erro=errorCode(e);process.exitCode=1}
 finally{
  if(db)try{db.detach()}catch{}
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
 }
})();
