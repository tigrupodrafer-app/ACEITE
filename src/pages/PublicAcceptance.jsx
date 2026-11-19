import React, { useEffect, useState } from 'react';
import SignatureCapture from '@/components/SignatureCapture';
import { LEGAL_SECTIONS, LEGAL_CONSENT, LEGAL_TITLE } from '@/lib/legalTermRevised';
import { AlertTriangle, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react';



// Independent public read-only page. Signing is intentionally disabled
// until the transactional signature endpoint and legal-document hashing exist.
export default function PublicAcceptance() {
  const [result, setResult] = useState({ loading: true, order: null, error: '' });
  const [expanded, setExpanded] = useState([]);
  const [consents, setConsents] = useState([false, false, false]);
  const allConfirmed = consents.every(Boolean);
  const [signerName,setSignerName] = useState('');
  const [signature,setSignature] = useState(null);
  const [submitting,setSubmitting] = useState(false);
  const [receipt,setReceipt] = useState(null);
  const [submitError,setSubmitError] = useState('');
  const canSign = Boolean(result.order?.mirrorComplete && result.order?.signingEnabled && allConfirmed && signature && signerName.trim().length >= 5);
  async function submitAcceptance(event) {
    event.preventDefault();
    if (!canSign || submitting) return;
    setSubmitting(true); setSubmitError('');
    try {
      const token = new URLSearchParams(window.location.search).get('token');
      const response = await fetch('/.netlify/functions/confirm-acceptance', {
        method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
        body:JSON.stringify({token,signerName,signature,consents:{
          conferenciaPedido:consents[0],condicoesFornecimentoGarantia:consents[1],concordanciaAutorizacao:consents[2]
        }})
      });
      const data = await response.json();
      if (!response.ok || !data.accepted) throw new Error(data.error || 'Não foi possível confirmar o aceite.');
      setReceipt(data);
    } catch(error) {setSubmitError(error.message || 'Falha ao registrar assinatura.');}
    finally {setSubmitting(false);}
  }
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setResult({ loading: false, order: null, error: 'Link inválido ou expirado.' });
      return;
    }
    const controller = new AbortController();
    fetch('/.netlify/functions/public-order?token=' + encodeURIComponent(token), {
      cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Link inválido, expirado ou ainda indisponível.');
      const data = await response.json();
      setResult({ loading: false, order: data.order, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ loading: false, order: null, error: error.message });
    });
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="max-w-4xl mx-auto bg-white border shadow-lg rounded-xl p-8">
        <header className="flex gap-3 items-center mb-6">
          <FileText className="text-red-700 w-8 h-8" />
          <div><h1 className="font-bold text-xl">ACEITE DRAFER</h1>
            <p className="text-sm text-slate-500">Confirmação de pedido</p></div>
        </header>
        {result.loading && <p className="flex gap-2 items-center"><Loader2 className="animate-spin" /> Consultando...</p>}
        {result.error && <p role="alert" className="text-red-700">{result.error}</p>}
        {result.order && (
          <div className="space-y-3">
            <p><strong>Pedido:</strong> {result.order.order_number}</p>
            <p><strong>Cliente:</strong> {result.order.client_name}</p>
            <p><strong>Material:</strong> {result.order.material || 'Não informado'}</p>
            <p><strong>Modelo:</strong> {result.order.tile_model || 'Não informado'}</p>
            <p><strong>Quantidade:</strong> {result.order.quantity ?? 'Não informada'}</p>
          </div>
        )}

        {result.order && <section className="mt-6 border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold text-lg">Espelho do pedido SIC</h2>
          {!result.order.mirror ? <p className="text-sm text-amber-800" role="status">Espelho SIC indisponível para este pedido. O aceite permanece bloqueado até a validação dos dados.</p> : <>
            {!result.order.mirrorComplete && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3" role="status">Prévia parcial do espelho SIC. A conferência de todos os campos e a integridade documental ainda não foram homologadas. Não é possível assinar.</p>}
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                ['Empresa',result.order.mirror.company.name],['Telefone da empresa',result.order.mirror.company.phone],
                ['Pedido nº',result.order.mirror.order.number],['Tipo de venda',result.order.mirror.order.saleType],
                ['Emissão',result.order.mirror.order.date],['Previsão de entrega',result.order.mirror.order.deliveryDate],
                ['Vendedor',result.order.mirror.order.seller],['Condição de pagamento',result.order.mirror.order.payment],
                ['Cliente',result.order.mirror.client.name],['Código do cliente',result.order.mirror.client.code],
                ['CPF/CNPJ',result.order.mirror.client.document],['Telefone do cliente',result.order.mirror.client.phone],
                ['Endereço',result.order.mirror.client.address],['Cidade',result.order.mirror.client.city],
                ['Estado',result.order.mirror.client.state],['CEP',result.order.mirror.client.zip],
                ['Local de entrega',result.order.mirror.order.deliveryAddress],['Observações',result.order.mirror.order.notes]
              ].map(([label,value])=><p key={label}><strong>{label}:</strong> {value || 'Não informado no SIC'}</p>)}
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm border-collapse">
              <thead><tr className="border-b bg-slate-50">{['Código','Descrição','Unidade','Quantidade','Peças','Peso (kg)','Valor unitário','Total'].map(x=><th key={x} className="p-2 text-left">{x}</th>)}</tr></thead>
              <tbody>{result.order.mirror.items.map((item,i)=><tr key={i} className="border-b">{[item.code,item.description,item.unit,item.quantity,item.pieces,item.weightKg,item.unitPrice,item.total].map((v,j)=><td key={j} className="p-2">{v ?? '—'}</td>)}</tr>)}</tbody>
            </table></div>
            <div className="text-sm grid sm:grid-cols-2 gap-2 border-t pt-3">{[['Subtotal',result.order.mirror.totals.subtotal],['Desconto',result.order.mirror.totals.discount],['Frete',result.order.mirror.totals.freight],['Total do pedido',result.order.mirror.totals.total]].map(([label,value])=><p key={label}><strong>{label}:</strong> {value == null ? 'Não informado no SIC' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)}</p>)}</div>
          </>}
        </section>}
        {result.order && <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-lg">{LEGAL_TITLE} — 13 tópicos</h2><button type="button" className="border rounded px-3 py-2 text-sm" onClick={()=>setExpanded(expanded.length===13?[]:Array.from({length:13},(_,i)=>i))}>{expanded.length===13?'Recolher todos':'Expandir todos'}</button></div>
          {LEGAL_SECTIONS.map((section,i)=><div key={i} className="border rounded-lg">
            <button type="button" className="w-full flex justify-between items-center text-left p-3 font-medium" aria-expanded={expanded.includes(i)} onClick={()=>setExpanded(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i])}><span>{i+1}. {section[0]}</span>{expanded.includes(i)?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</button>
            {expanded.includes(i)&&<div className="border-t p-3 text-sm text-slate-700">{section[1].map((paragraph,j)=><p key={j} className="mb-2 last:mb-0">{paragraph}</p>)}</div>}
          </div>)}
        </section>}
        {result.order && <section className="mt-6 border-t pt-4 space-y-3">
          <h2 className="font-semibold text-lg">Declaração de conferência e aceite</h2>
          {LEGAL_CONSENT.map((text,i)=><label key={i} className="flex gap-2 text-sm items-start"><input type="checkbox" className="mt-1" checked={consents[i]} onChange={event=>setConsents(old=>old.map((v,j)=>j===i?event.target.checked:v))}/><span>{text}</span></label>)}
          {receipt ? <div role="status" className="bg-green-50 border border-green-300 rounded p-4">
            <strong>Aceite registrado.</strong><p>Protocolo: {receipt.acceptanceId}</p>
            <p>Data/hora: {new Date(receipt.acceptedAt).toLocaleString('pt-BR')}</p>
            <p>O vendedor deverá conferir o comprovante antes de encaminhar o pedido à produção.</p>
          </div> : <form onSubmit={submitAcceptance} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="signer-name">Nome completo de quem assina</label>
            <input id="signer-name" className="w-full border rounded p-2" maxLength={160} autoComplete="name"
              value={signerName} onChange={event=>setSignerName(event.target.value)} />
            <SignatureCapture onChange={setSignature} disabled={submitting || !result.order.signingEnabled} />
            {!result.order.signingEnabled && <p className="text-sm text-amber-800" role="status">
              A assinatura permanece bloqueada até a homologação do espelho, do documento e da versão jurídica.
            </p>}
            {submitError && <p role="alert" className="text-red-700">{submitError}</p>}
            <button type="submit" disabled={!canSign || submitting}
              className="w-full rounded bg-red-700 text-white p-3 disabled:bg-slate-200 disabled:text-slate-500">
              {submitting?'Registrando aceite...':'Confirmar as três declarações e assinar'}
            </button>
          </form>}
        </section>}
        {result.order && <div className="bg-amber-50 border border-amber-200 p-4 mt-6 rounded flex gap-3 text-amber-900">
          <AlertTriangle className="shrink-0 w-6 h-6" />
          <p>Ambiente de migração: a assinatura permanece desabilitada até a homologação jurídica, de segurança e do registro de evidências.</p>
        </div>}
      </section>
    </main>
  );
}
