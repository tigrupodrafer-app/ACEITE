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
   'H.FRETE,H.VR_FRETE,H.SEQENDENTREGA,H.NOME_USUARIO,H.USUARIO_INCLUIU,',
   'C.NOME AS CLIENTE_NOME,C.ENDE AS CLIENTE_ENDERECO,C.ENDE_NRO AS CLIENTE_NUMERO,',
   'C.BAIRRO AS CLIENTE_BAIRRO,C.NCEP AS CLIENTE_CEP,',
   'C.FONE1 AS CLIENTE_FONE,C.NCPF AS CLIENTE_DOCUMENTO,',
   'C.NCGC AS CLIENTE_CNPJ,C.CONTATO AS CLIENTE_CONTATO,C.COMPRADOR AS CLIENTE_COMPRADOR,',
   'C.ENDE_COMPLEMENTO AS CLIENTE_COMPLEMENTO,',
   'C.EMAIL AS CLIENTE_EMAIL,C.SEQCIDADE AS CLIENTE_SEQCIDADE,',
   'C.PRAZO_PAGTO AS CLIENTE_PRAZO_PAGTO,',
   'C.CODR AS CLIENTE_CODR',,
   'FROM ARQES13 H LEFT JOIN ARQCAD C ON C.CODIC=H.CODIC',
   'WHERE H.PEDIDO=?',
  ].join(' '),[numeroPedido]);
  if(hs.length!==1)throw Error('Pedido inexistente ou relacionamento ambiguo no SIC');
  const r=hs[0];
  // Os dois relacionamentos abaixo foram confirmados como unicos nos pedidos de homologacao.
  // Evitar JOINs multiplos: cada cadastro deve ter exatamente um registro por chave.
  const empresaRows=r.COD_EMPRESA==null?[]:await read(db,
   'SELECT FIRST 2 COD_EMPRESA,NOME_EMPRESA FROM EMPRESA WHERE COD_EMPRESA=?',[r.COD_EMPRESA]);
  const cidadeRows=r.CLIENTE_SEQCIDADE==null?[]:await read(db,
   'SELECT FIRST 2 SEQCIDADE,NOME,ESTADO FROM CIDADES WHERE SEQCIDADE=?',[r.CLIENTE_SEQCIDADE]);
  const empresa=empresaRows.length===1?empresaRows[0]:null;
  const cidade=cidadeRows.length===1?cidadeRows[0]:null;
  return {
   numero:r.PEDIDO,
   empresa:r.COD_EMPRESA,
   nomeEmpresa:nonEmpty(empresa?.NOME_EMPRESA),
   usuarioPedidoSic:nonEmpty(r.NOME_USUARIO),
   usuarioInclusaoSic:nonEmpty(r.USUARIO_INCLUIU),
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
    complemento:nonEmpty(r.CLIENTE_COMPLEMENTO),
    cidade:nonEmpty(cidade?.NOME),
    estado:nonEmpty(cidade?.ESTADO),
    contato:nonEmpty(r.CLIENTE_CONTATO),
    comprador:nonEmpty(r.CLIENTE_COMPRADOR),
    bairro:nonEmpty(r.CLIENTE_BAIRRO),
    cep:nonEmpty(r.CLIENTE_CEP),
    telefone:nonEmpty(r.CLIENTE_FONE),
    cnpjCpf:nonEmpty(r.CLIENTE_DOCUMENTO)||nonEmpty(r.CLIENTE_CNPJ),
    email:nonEmpty(r.CLIENTE_EMAIL),
   },
   _espelhoHomologacao:{
    schema:'ARQES13+ARQCAD',
    faltam:'nome do vendedor, telefone filial, descricao condicao de pagamento, endereco entrega; demais campos a homologar',
    somenteLeitura:true
   }
  };
 }finally{try{db.detach()}catch{}}
}
module.exports={buscarEspelhoComplementar,merge};
