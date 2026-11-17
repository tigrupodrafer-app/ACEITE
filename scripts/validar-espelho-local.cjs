// ACEITE DRAFER - smoke test do complemento de espelho; SEM PII.
'use strict';
const {buscarEspelhoComplementar}=require('./src/services/espelhoService');
const pedidos=process.argv.slice(2).length?process.argv.slice(2):['352488','352688'];
if(pedidos.length>3||!pedidos.every(s=>/^[1-9]\d{0,11}$/.test(s)))throw Error('Pedido invalido');
const report={diagnostico:'ESPELHO_COMPLEMENTAR_V1',pedidos:[],observacao:'Somente leitura; os dados pessoais foram omitidos.'};
(async()=>{
 for(const texto of pedidos){
  const numero=Number(texto);
  try{
   const p=await buscarEspelhoComplementar(numero);
   report.pedidos.push({
    pedido:numero,
    ok:true,
    empresa:p.empresa,
    codigoVendedor:p.codigoVendedor,
    tabelaPreco:p.tabelaPreco,
    tipoVendaCodigo:p.tipoVendaCodigo,
    codigoCliente:p.codigoCliente,
    codigoCidadeCliente:p.codigoCidadeCliente,
    codigoCondicaoPagamentoCadastral:p.codigoCondicaoPagamentoCadastral,
    cliente:{
      nomeDisponivel:!!p.cliente?.nome,
      enderecoDisponivel:!!p.cliente?.endereco,
      numeroDisponivel:!!p.cliente?.numeroEndereco,
      bairroDisponivel:!!p.cliente?.bairro,
      cepDisponivel:!!p.cliente?.cep,
      telefoneDisponivel:!!p.cliente?.telefone,
      documentoDisponivel:!!p.cliente?.cnpjCpf,
      emailDisponivel:!!p.cliente?.email
    }
   });
  }catch(e){
   report.pedidos.push({pedido:numero,ok:false,erro:'O complemento nao pode consultar este pedido. Verificar SQL, permissao ou relacionamento.'});
  }
 }
})().catch(()=>{process.exitCode=1}).finally(()=>{
 console.log(JSON.stringify(report,null,2));
});
