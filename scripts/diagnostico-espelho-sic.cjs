// DRAFER ACEITE - diagnóstico técnico SOMENTE LEITURA no Firebird SIC.
// Colocar em C:\DRAFER\ACEITE-API\diagnostico-espelho-sic.cjs
// Executar: node .\diagnostico-espelho-sic.cjs 352488
// Não imprime nome/documento/contato/endereço do cliente, senha ou token.
// Não altera serviços, tabelas ou arquivos da API.
'use strict';
const { conectar } = require('./src/config/firebird');
const ORDERS = process.argv.slice(2).length ? process.argv.slice(2) : ['352488','352688'];
if (ORDERS.length > 3 || !ORDERS.every(n => /^[1-9]\d{0,11}$/.test(n)))
  throw new Error('Informe no maximo 3 numeros de pedido validos.');
const TABLES = ['ARQES13','ARQES15','ARQCAD','CAD_PRODUTO'];
const TARGETS = new Set(['3847','2506','1379']);
const CANDIDATE = /COD|PROD|REF|ACESS|TAB|VEND|COBR|PAG|OBS|ENTREG|TRANSP|FRETE|END|BAIRR|CIDADE|MUNIC|UF|CEP|EMAIL|FONE|TEL|CNPJ|CPF|NOME|CLIENT|COND|HORA|DATA/i;
const SENSITIVE = /SENHA|PASSWORD|TOKEN|CHAVE|SECRET|HASH/i;
const LIMIT = 40;
const connect = () => new Promise((resolve,reject) =>
  conectar((err,db)=>err?reject(err):resolve(db)));
const query = (db,sql,args=[]) => new Promise((resolve,reject)=>
  db.query(sql,args,(err,rows)=>err?reject(err):resolve(rows||[])));
const normalized = v => String(v??'').trim();
const clean = name => normalized(name).toUpperCase();
const safeValue = v => {
  if (v===null||v===undefined||typeof v==='object') return '';
  return normalized(v).slice(0,100);
};
async function main(){
 const db=await connect();
 try{
  const meta=await query(db,
    "SELECT TRIM(RF.RDB$RELATION_NAME) AS TABELA, TRIM(RF.RDB$FIELD_NAME) AS CAMPO "+
    "FROM RDB$RELATION_FIELDS RF WHERE RF.RDB$RELATION_NAME IN ('ARQES13','ARQES15','ARQCAD','CAD_PRODUTO') "+
    "ORDER BY RF.RDB$RELATION_NAME, RF.RDB$FIELD_POSITION");
  const names={};
  for(const tbl of TABLES)names[tbl]=new Set();
  for(const m of meta){
    const t=clean(m.TABELA),c=clean(m.CAMPO);
    if(names[t])names[t].add(c);
  }
  const schema=[];
  for(const t of TABLES)
    for(const f of names[t])
      if(CANDIDATE.test(f)&&!SENSITIVE.test(f))schema.push({tabela:t,campo:f});
  const samples=[];
  const matches=[];
  for(const text of ORDERS){
    const pedido=Number(text);
    // Aqui só obtemos campos tecnicos do pedido e dos itens; NÃO mostramos dados de clientes.
    const rows=await query(db,'SELECT FIRST '+LIMIT+' * FROM ARQES15 WHERE PEDIDO = ? ORDER BY ITEM',[pedido]);
    const distinct=[...new Set(rows.map(x=>x.PRODUTO).filter(x=>Number.isSafeInteger(Number(x))&&Number(x)>0).map(Number))].slice(0,LIMIT);
    for(const [index,row] of rows.entries()){
      const raw={};
      for(const [key,value] of Object.entries(row)){
        const field=clean(key);
        if(SENSITIVE.test(field))continue;
        if(CANDIDATE.test(field)&&TARGETS.has(safeValue(value)))raw[field]=safeValue(value);
      }
      if(Object.keys(raw).length)matches.push({tabela:'ARQES15',pedido,linha:index+1,campos:raw});
    }
    for(const id of distinct){
      const products=await query(db,'SELECT FIRST 1 * FROM CAD_PRODUTO WHERE CODIGO = ?',[id]);
      for(const p of products){
        const raw={};
        for(const [key,value] of Object.entries(p)){
          const field=clean(key);
          if(SENSITIVE.test(field))continue;
          // Saida SOMENTE para coincidencia exata dos 3 codigos sob investigacao.
          if(CANDIDATE.test(field)&&TARGETS.has(safeValue(value)))raw[field]=safeValue(value);
        }
        matches.push({tabela:'CAD_PRODUTO',origemPedido:pedido,codigoInterno:id,campos:raw});
      }
    }
    samples.push({pedido,itensConsultados:rows.length,codigosInternos:distinct});
  }
  console.log(JSON.stringify({
    diagnostico:'ESPELHO_SIC_READONLY_V1',
    dataUTC:new Date().toISOString(),
    tabelasInspecionadas:TABLES,
    camposCandidatos:schema,
    amostras:samples,
    coincidenciasDosCodigosAlvo:matches,
    alvos:[...TARGETS],
    observacao:'Coincidencia de valor NAO prova codigo de impressao. Verificar mapeamento do relatorio SIC e comparar pedidos reais.',
    seguranca:'Consulta exclusiva SELECT; sem alteracoes Firebird ou servicos.',
  },null,2));
 }finally{try{db.detach()}catch{}}
}
main().catch(err=>{
 console.error('DIAGNOSTICO_FALHOU: '+String(err?.message||err).replace(/password|senha|token|secret/ig,'[oculto]'));
 process.exitCode=1;
});
