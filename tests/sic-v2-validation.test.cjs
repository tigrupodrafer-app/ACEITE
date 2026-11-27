'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateV2}=require('../netlify/functions/_lib/sic-v2-validation.cjs');
function fixture(){
 const itens=[{item:1,valorTotal:530.10,valorTotalEfetivo:551.41}];
 return {pedidoCompleto:{numero:350980,itens:structuredClone(itens),valores:{total:551.41,totalEfetivo:551.41},cobranca:{parcelas:[{VALOR:551.41}]},enderecoEntregaResolucao:{confirmado:false},observacoes:{homologadas:false},pcp:{}},itens,validacao:{financeiroV2:true,identidadeConferida:true,itensConferem:true,parcelasConferem:true,aptoParaAceite:false,pendencias:['CONFIRMAR_ENDERECO_ENTREGA']}};
}
test('V2 aceita total efetivo com acrescimo sem autorizar assinatura',()=>assert.deepEqual(validateV2(fixture(),350980),{financiallyValidated:true,acceptanceEnabled:false}));
for(const [name,mutate] of [
 ['pedido divergente',d=>d.pedidoCompleto.numero=1],
 ['parcela divergente',d=>d.pedidoCompleto.cobranca.parcelas[0].VALOR=530.10],
 ['item divergente',d=>d.itens[0].valorTotalEfetivo=530.10],
 ['assinatura habilitada',d=>d.validacao.aptoParaAceite=true],
 ['financeiro nao conferido',d=>d.validacao.financeiroV2=false],
 ['valor ausente',d=>delete d.itens[0].valorTotalEfetivo],
 ['itens duplicados',d=>{d.itens.push({...d.itens[0]});d.pedidoCompleto.itens.push({...d.itens[0]});d.pedidoCompleto.valores.total=d.pedidoCompleto.valores.totalEfetivo=1102.82;d.pedidoCompleto.cobranca.parcelas[0].VALOR=1102.82;}]
])test('V2 rejeita '+name,()=>{const d=fixture();mutate(d);assert.throws(()=>validateV2(d,350980),{statusCode:422});});
