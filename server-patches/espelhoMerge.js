'use strict';
// Merge conservador: o SIC continua sendo a fonte de verdade. Nao apaga campos existentes por null.
// Atributos novos do espelho permanecem somente informativos.
function mergePedidoEspelho(pedido, espelho){
 if(!espelho||Number(espelho.numero)!==Number(pedido.numero))throw Error('Espelho nao corresponde ao pedido');
 if(Number(espelho.empresa)!==Number(pedido.empresa))throw Error('Empresa SIC divergente no espelho');
 const cliente={...(pedido.cliente||{})};
 for(const [key,val] of Object.entries(espelho.cliente||{})){
  if(val!==null&&val!==undefined&&val!=='')cliente[key]=val;
 }
 const extra={};
 for(const key of ['codigoVendedor','tabelaPreco','tipoVendaCodigo','codigoCliente',
  'codigoCidadeCliente','codigoCondicaoPagamentoCadastral','codigoRegiaoCliente',
  'codigoEnderecoEntrega','frete']){
  if(espelho[key]!==undefined&&espelho[key]!==null&&espelho[key]!=='')extra[key]=espelho[key];
 }
 return {...pedido,...extra,cliente,
  _espelhoHomologacao:{...(espelho._espelhoHomologacao||{}),codigoImpressaoHomologado:false}};
}
module.exports={mergePedidoEspelho};
