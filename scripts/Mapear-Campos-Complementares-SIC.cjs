// DRAFER ACEITE - MAPEAMENTO CADASTRAL READ-ONLY DO ESPELHO SIC.
// Pesquisa metadados e presenca de dados em dois pedidos. NUNCA lista valores pessoais.
// Usar em C:\DRAFER\ACEITE-API para resolver ./src/config/firebird.
'use strict';
const {conectar}=require('./src/config/firebird');
const orders=[352488,352688];
const query=(db,sql,args=[])=>new Promise((ok,no)=>db.query(sql,args,(e,rows)=>e?no(e):ok(rows||[])));
const connect=()=>new Promise((ok,no)=>conectar((e,db)=>e?no(e):ok(db)));
const clean=x=>String(x??'').trim().toUpperCase();
const pattern=/EMPRES|FILIAL|CIDAD|MUNIC|ESTADO|UF$|COBR|PAG|PRAZO|COND|FINANC|ENTREGA|ENDERE|COMPRADOR|VENDED|USUARIO|TAB_PRECO|TIPO_VENDA|TPVENDA|DATA|HORA|DOCUMENT|CPF|CNPJ|NCPF|COMPLEM|FANTASIA|TELEF|FONE|OBSERV/i;
const secret=/SENHA|PASSWORD|TOKEN|HASH|SECRET|CHAVE|CERT|CREDENC|AUTH/i;
const keepText=name=>!secret.test(name);
const metaTable=['ARQES13','ARQCAD','ARQEMP','EMPRESA','CIDADE','ARQCID','ARQES15'];
const printJSON=obj=>process.stdout.write(JSON.stringify(obj,null,2)+'\n');
const output={diagnostico:'ACEITE_CAMPOS_COMPLEMENTARES_READONLY_V1',utc:new Date().toISOString(),
 pedidos:orders,metadados:{},candidatosPorAssunto:{},presencaPorPedido:[],alertas:[],
 legenda:'PRESENTE significa campo nao nulo e nao vazio; nao prova significado comercial. Nao ha valores de cliente no relatorio.'};
function err(e,stage){return {stage,code:Number(e?.gdscode)||null,type:typeof e?.code==='string'?e.code.slice(0,45):null};}
(async()=>{
 let db;
 try{
  db=await connect();
  const rows=await query(db,
    "SELECT TRIM(RF.RDB$RELATION_NAME) AS TABELA,TRIM(RF.RDB$FIELD_NAME) AS CAMPO "+
    "FROM RDB$RELATION_FIELDS RF JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME=RF.RDB$RELATION_NAME "+
    "WHERE R.RDB$SYSTEM_FLAG=0 AND RF.RDB$RELATION_NAME NOT STARTING WITH 'RDB$' "+
    "ORDER BY RF.RDB$RELATION_NAME,RF.RDB$FIELD_POSITION");
  const tables=new Map();
  for(const r of rows){const t=clean(r.TABELA),c=clean(r.CAMPO);if(!keepText(t)||!keepText(c))continue;
    if(!tables.has(t))tables.set(t,new Set());tables.get(t).add(c)}
  output.metadados.totalTabelas=tables.size;
  const primary=['ARQES13','ARQCAD','ARQES15'];
  output.metadados.tabelasPrincipais=Object.fromEntries(primary.map(t=>[t,{existe:tables.has(t),camposCandidatos:[...(tables.get(t)||[])].filter(x=>pattern.test(x)).slice(0,100)}]));
  const ranks=[
   ['empresas',/EMPRES|FILIAL|RAZAO|FANTASIA|TELEF|FONE/],
   ['municipioUf',/CIDADE|MUNIC|ESTADO|UF$|SEQCIDADE/],
   ['cobranca',/COBR|PAG|PRAZO|COND|FINANC|BANCO/],
   ['entrega',/ENTREG|ENDERE|BAIRRO|CEP|COMPLEM|LOGRAD/],
   ['comprador',/COMPRAD|CONTATO|RESPONSAV/],
   ['emissao',/EMISS|DATA|HORA|DIGIT|USUARIO|OPERADOR/]
  ];
  for(const [subject,rx] of ranks){
    output.candidatosPorAssunto[subject]=[...tables.entries()].map(([t,fields])=>{
      const selected=[...fields].filter(f=>rx.test(f)).slice(0,14);
      const tableMatches=rx.test(t);
      return {tabela:t,campos:selected,nota:tableMatches?'nome da tabela compativel':undefined};
    }).filter(x=>x.campos.length>0||x.nota).sort((a,b)=>{
      const key=t=> (t.tabela==='ARQES13'||t.tabela==='ARQCAD'?6:0)+(t.nota?3:0)+Math.min(5,t.campos.length);
      return key(b)-key(a);
    }).slice(0,22);
  }
  const headerFields=['PEDIDO','COD_EMPRESA','CODIC','CODIV','TAB_PRECO','TPVENDA',
   'DATA','DATA_DIGITACAO','HORA','DATA_EMISSAO','HORA_EMISSAO','SEQENDENTREGA',
   'NRO_ENTREGA','CODCOBR','COD_COBRANCA','CODPAGTO','PRAZO_PAGTO','FORMA_COBRANCA',
   'OBS','OBSERVACAO','USUARIO','COD_USUARIO'];
  const customerFields=['CODIC','NCPF','CNPJ','CPF','DOCUMENTO','EMAIL','FONE1',
    'SEQCIDADE','CODCIDADE','CIDADE','UF','ESTADO','ENDERECO','ENDE','ENDE_NRO',
    'COMPRADOR','CONTATO','PRAZO_PAGTO','CODR','NOME_FANTASIA'];
  if(!tables.get('ARQES13')?.has('PEDIDO'))throw Error('ARQES13_PEDIDO_AUSENTE');
  const headers=headerFields.filter(f=>tables.get('ARQES13').has(f));
  const customers=customerFields.filter(f=>tables.get('ARQCAD')?.has(f));
  output.metadados.camposPedidoAmostrados=headers;
  output.metadados.camposClienteAmostrados=customers;
  for(const num of orders){
    const h=await query(db,'SELECT FIRST 2 '+headers.join(',')+' FROM ARQES13 WHERE PEDIDO=?',[num]);
    const summary={pedido:num,linhasPedido:h.length,camposPedido:{},cadastro:{vinculoEncontrado:false,linhas:0,campos:{}},situacao:'OK'};
    for(const f of headers)summary.camposPedido[f]=h.some(row=>row[f]!==null&&row[f]!==undefined&&String(row[f]).trim()!=='')?'PRESENTE':'VAZIO';
    if(h.length!==1){summary.situacao='PEDIDO_AUSENTE_OU_AMBIGUO';output.presencaPorPedido.push(summary);continue;}
    if(tables.get('ARQCAD')?.has('CODIC')&&h[0].CODIC!==null&&h[0].CODIC!==undefined){
      const c=await query(db,'SELECT FIRST 2 '+customers.join(',')+' FROM ARQCAD WHERE CODIC=?',[h[0].CODIC]);
      summary.cadastro.linhas=c.length;summary.cadastro.vinculoEncontrado=c.length===1;
      for(const f of customers)summary.cadastro.campos[f]=c.some(row=>row[f]!==null&&row[f]!==undefined&&String(row[f]).trim()!=='')?'PRESENTE':'VAZIO';
    }
    output.presencaPorPedido.push(summary);
  }
  output.alertas.push('Tabelas e colunas sao candidatas por nome; nenhuma relacao entre elas foi presumida.');
  output.alertas.push('Nao inclui investigacao do codigo de impressao 3847 nem busca pedido/venda.');
  output.alertas.push('Sem SELECT * de dados cadastrais, sem DML, sem alteracoes no Firebird.');
 }catch(e){
  output.erro=err(e,'consulta-metadata-ou-pedido');
  output.alertas.push('Erro no diagnostico. Verificar conectividade/configuracao, sem divulgar credenciais.');
  process.exitCode=1;
 }finally{
  if(db)try{db.detach()}catch{}
  printJSON(output);
 }
})();
