// SRV-DRAFER ACEITE-API: enriquecimento de espelho SIC - SOMENTE LEITURA.
// Modulo isolado, ainda nao conectado ao endpoint /api/pedidos.
// Campos verificados em diagnosticos V3/V4, exceto papeis semanticos nao homologados.
// Nao muda tabelas, nao escreve Firebird, nao altera o servico ativo.
'use strict';
const {conectar}=require('../config/firebird');
function read(db,sql,args){
 return new Promise((resolve,reject)=>db.query(sql,args,(err,rows)=>err?reject(err):resolve(rows||[])));
}
const nonEmpty=v=>v===null||v===undefined||String(v).trim()===''?null:
  (typeof v==='string'?v.trim():v);
function merge(base,extension){
 return Object.fromEntries(Object.entries({...base,...extension}).filter(([,v])=>v!==undefined));
}
async function buscarEspelhoComplementar(numeroPedido){
 if(!Number.isSafeInteger(numeroPedido)||numeroPedido<=0)throw Error('Numero do pedido invalido');
 const db=await new Promise((resolve,reject)=>conectar((e,connection)=>e?reject(e):resolve(connection)));
 try{
  // Consulta exclusiva por pedido. CODIC tem uma correspondencia ARQCAD nos exemplos V4.
  const hs=await read(db,[
   'SELECT FIRST 2 H.PEDIDO,H.COD_EMPRESA,H.CODIC,H.CODIV,H.TAB_PRECO,H.TPVENDA,',
   'H.FRETE,H.VR_FRETE,H.SEQENDENTREGA,',
   'C.NOME AS CLIENTE_NOME,C.ENDE AS CLIENTE_ENDERECO,C.ENDE_NRO AS CLIENTE_NUMERO,',
   'C.BAIRRO AS CLIENTE_BAIRRO,C.NCEP AS CLIENTE_CEP,',
   'C.FONE1 AS CLIENTE_FONE,C.NCPF AS CLIENTE_DOCUMENTO,',
   'C.EMAIL AS CLIENTE_EMAIL,C.SEQCIDADE AS CLIENTE_SEQCIDADE,',
   'C.PRAZO_PAGTO AS CLIENTE_PRAZO_PAGTO,',
   'C.CODR AS CLIENTE_CODR',
   'FROM ARQES13 H LEFT JOIN ARQCAD C ON C.CODIC=H.CODIC',
   'WHERE H.PEDIDO=?',
  ].join(' '),[numeroPedido]);
  if(hs.length!==1)throw Error('Pedido inexistente ou relacionamento ambiguo no SIC');
  const r=hs[0];
  return {
   numero:r.PEDIDO,
   empresa:r.COD_EMPRESA,
   codigoVendedor:nonEmpty(r.CODIV),
   tabelaPreco:nonEmpty(r.TAB_PRECO),
   tipoVendaCodigo:nonEmpty(r.TPVENDA),
   codigoCliente:nonEmpty(r.CODIC),
   codigoCidadeCliente:nonEmpty(r.CLIENTE_SEQCIDADE),
   codigoCondicaoPagamentoCadastral:nonEmpty(r.CLIENTE_PRAZO_PAGTO),
   codigoRegiaoCliente:nonEmpty(r.CLIENTE_CODR),
   codigoEnderecoEntrega:nonEmpty(r.SEQENDENTREGA),
   frete:nonEmpty(r.VR_FRETE),
   cliente:{
    codigo:nonEmpty(r.CODIC),
    nome:nonEmpty(r.CLIENTE_NOME),
    endereco:nonEmpty(r.CLIENTE_ENDERECO),
    numeroEndereco:nonEmpty(r.CLIENTE_NUMERO),
    bairro:nonEmpty(r.CLIENTE_BAIRRO),
    cep:nonEmpty(r.CLIENTE_CEP),
    telefone:nonEmpty(r.CLIENTE_FONE),
    cnpjCpf:nonEmpty(r.CLIENTE_DOCUMENTO),
    email:nonEmpty(r.CLIENTE_EMAIL),
   },
   _espelhoHomologacao:{
    schema:'ARQES13+ARQCAD',
    faltam:'nome do vendedor, razao social/telefone filial, cidade/UF, descricao condicao de pagamento, endereco entrega, comprador, codigo produto impresso',
    somenteLeitura:true
   }
  };
 }finally{try{db.detach()}catch{}}
}
module.exports={buscarEspelhoComplementar,merge};
