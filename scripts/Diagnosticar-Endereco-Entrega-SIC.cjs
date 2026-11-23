'use strict';
// Diagnostico somente leitura. Nao exibe enderecos, nomes ou documentos.
const { conectar } = require('./src/config/firebird');
const orders = [352488, 354569];
const query = (db,sql,args=[]) => new Promise((ok,no)=>db.query(sql,args,(e,r)=>e?no(e):ok(r||[])));
const connect = () => new Promise((ok,no)=>conectar((e,db)=>e?no(e):ok(db)));
(async()=>{
 let db;
 try {
  db=await connect();
  const names=await query(db,`SELECT TRIM(RDB$RELATION_NAME) AS TABELA FROM RDB$RELATIONS
   WHERE COALESCE(RDB$SYSTEM_FLAG,0)=0 AND RDB$VIEW_BLR IS NULL
   AND (UPPER(RDB$RELATION_NAME) CONTAINING 'END' OR UPPER(RDB$RELATION_NAME) CONTAINING 'ENTREG')
   ORDER BY RDB$RELATION_NAME`);
  const tableNames=[...new Set(['ARQES13','ARQCAD',...names.map(r=>String(r.TABELA).trim())])].filter(n=>/^[A-Z0-9_]+$/.test(n)).slice(0,120);
  const output={diagnostico:'DRAFER_ENTREGA_RELACIONAMENTOS_V1',pedidos:[],tabelas:[],foreignKeys:[]};
  for(const t of tableNames){
   const cols=await query(db,'SELECT TRIM(RDB$FIELD_NAME) AS CAMPO FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? ORDER BY RDB$FIELD_POSITION',[t]);
   const fields=cols.map(x=>String(x.CAMPO).trim());
   output.tabelas.push({tabela:t,campos:fields.filter(x=>/END|ENTREG|CODIC|CLIENT|SEQU|ATIV|TIPO|BAIRRO|CIDADE|NUMERO|^NRO$|^COD$/.test(x))});
  }
  const fks=await query(db,`SELECT TRIM(rc.RDB$RELATION_NAME) AS ORIGEM,TRIM(s.RDB$FIELD_NAME) AS CAMPO,
   TRIM(ri.RDB$RELATION_NAME) AS DESTINO,TRIM(ds.RDB$FIELD_NAME) AS CAMPO_DESTINO
   FROM RDB$RELATION_CONSTRAINTS rc
   JOIN RDB$REF_CONSTRAINTS ref ON ref.RDB$CONSTRAINT_NAME=rc.RDB$CONSTRAINT_NAME
   JOIN RDB$RELATION_CONSTRAINTS ri ON ri.RDB$CONSTRAINT_NAME=ref.RDB$CONST_NAME_UQ
   JOIN RDB$INDEX_SEGMENTS s ON s.RDB$INDEX_NAME=rc.RDB$INDEX_NAME
   JOIN RDB$INDEX_SEGMENTS ds ON ds.RDB$INDEX_NAME=ri.RDB$INDEX_NAME AND ds.RDB$FIELD_POSITION=s.RDB$FIELD_POSITION
   WHERE rc.RDB$CONSTRAINT_TYPE='FOREIGN KEY'`);
  output.foreignKeys=fks.filter(x=>tableNames.includes(x.ORIGEM)||tableNames.includes(x.DESTINO));
  const head=output.tabelas.find(x=>x.tabela==='ARQES13');
  const hfields=head?.campos||[];
  const selection=['PEDIDO','CODIC','COD_EMPRESA','SEQENDENTREGA','NRO_ENTREGA'].filter(x=>hfields.includes(x));
  for(const n of orders){
   const rows=await query(db,'SELECT FIRST 2 '+selection.join(',')+' FROM ARQES13 WHERE PEDIDO=?',[n]);
   const result={pedido:n,unico:rows.length===1,campos:{},candidatos:[]};
   if(rows.length===1){
    const h=rows[0];
    for(const key of selection)result.campos[key]=key==='PEDIDO'?n:(h[key]===null||h[key]===undefined||String(h[key]).trim()===''?'VAZIO':'PRESENTE');
    for(const t of output.tabelas){
     if(['ARQES13','ARQCAD'].includes(t.tabela))continue;
     for(const col of ['SEQENDENTREGA','NRO_ENTREGA']){
      if(!t.campos.includes(col)||h[col]==null)continue;
      const filters=[col+'=?'],params=[h[col]];
      if(t.campos.includes('CODIC')&&h.CODIC!=null){filters.push('CODIC=?');params.push(h.CODIC)}
      try{
       const matches=await query(db,'SELECT COUNT(*) AS TOTAL FROM '+t.tabela+' WHERE '+filters.join(' AND '),params);
       result.candidatos.push({tabela:t.tabela,chave:col,filtradoPorCliente:filters.length>1,quantidade:Number(matches[0]?.TOTAL||0)});
      }catch(e){result.candidatos.push({tabela:t.tabela,chave:col,erro:'CONSULTA_FALHOU'})}
     }
    }
   }
   output.pedidos.push(result);
  }
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
 }catch(e){process.stderr.write('DIAGNOSTICO_FALHOU: '+e.message+'\n');process.exitCode=1}
 finally{if(db)try{db.detach()}catch{}}
})();