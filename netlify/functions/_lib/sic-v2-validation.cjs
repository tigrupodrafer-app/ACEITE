'use strict';
// Validation for the trusted V2 bridge response. Not an authorization to sign.
const fail = () => { throw Object.assign(new Error('Resultado SIC V2 inconsistente'), {statusCode:422}); };
const cents = v => {
  if ((typeof v !== 'number' && typeof v !== 'string') || String(v).trim()==='' || !Number.isFinite(Number(v))) fail();
  const n = Math.round(Number(v)*100);
  if (!Number.isSafeInteger(n)) fail();
  return n;
};
function validateV2(data, expectedNumber) {
  const p=data?.pedidoCompleto, v=data?.validacao, items=data?.itens;
  if (!p || !v || !Array.isArray(items) || items.length<1 || items.length>200 ||
      String(p.numero)!==String(expectedNumber) || v.financeiroV2!==true ||
      v.identidadeConferida!==true || v.itensConferem!==true ||
      v.parcelasConferem!==true || v.aptoParaAceite!==false ||
      !Array.isArray(v.pendencias) || !Array.isArray(p.cobranca?.parcelas) ||
      !p.cobranca.parcelas.length || !p.enderecoEntregaResolucao || !p.observacoes || !p.pcp) fail();
  const total=cents(p.valores?.total);
  if (total<=0 || cents(p.valores?.totalEfetivo)!==total ||
      items.reduce((s,i)=>s+cents(i.valorTotalEfetivo),0)!==total ||
      p.cobranca.parcelas.reduce((s,i)=>s+cents(i.VALOR),0)!==total) fail();
  if (!Array.isArray(p.itens) || p.itens.length!==items.length ||
      new Set(items.map(i=>String(i.item))).size!==items.length ||
      items.some((i,k)=>String(i.item)!==String(p.itens[k].item) ||
        cents(i.valorTotalEfetivo)!==cents(p.itens[k].valorTotalEfetivo))) fail();
  return {financiallyValidated:true, acceptanceEnabled:false};
}
module.exports={validateV2};
