import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Loader2, ShieldAlert } from 'lucide-react';

const ITEMS = [
  ['texto_garantia','Prazo e condições de garantia'],
  ['direitos_consumidor','Direitos do consumidor, cancelamento e devolução'],
  ['responsabilidades','Responsabilidades de transporte, recebimento e instalação'],
  ['regras_sic','Situação do pedido, faturamento e liberação no SIC'],
  ['empresa_emitente','Razão social, CNPJ e documentos da empresa emitente'],
  ['diagramas_tecnicos','Diagramas e instruções técnicas por família de produto'],
  ['dados_pedido','Cliente, produto, quantidades e valores do pedido'],
  ['assinatura_evidencias','Processo de assinatura e requisitos de evidências'],
];
const defaults = Object.fromEntries(ITEMS.map(([key])=>[key,false]));
const stamp = value => value ? new Date(value).toLocaleString('pt-BR') : '—';

export default function DocumentReview({ draftId, document }) {
  const [checklist,setChecklist] = useState(defaults);
  const [notes,setNotes] = useState('');
  const [assessment,setAssessment] = useState('ajustes_solicitados');
  const [reviews,setReviews] = useState([]);
  const [loading,setLoading] = useState(false);
  const [sending,setSending] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [currentDoc,setCurrentDoc] = useState(null);
  useEffect(()=>{
    if(!draftId || !document?.documentId) return;
    let alive=true;
    setLoading(true);
    setReviews([]);
    setError('');
    apiGet('/.netlify/functions/document-review?draftId='+encodeURIComponent(draftId))
      .then(data=>{if(alive){setReviews(data.reviews||[]);setCurrentDoc(data.latestDocument);}})
      .catch(err=>{if(alive)setError(err.message);})
      .finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[draftId,document?.documentId]);

  const current = currentDoc?.id===document?.documentId;
  async function submit(event) {
    event.preventDefault();
    if(!current || sending) return;
    setError('');
    setMessage('');
    setSending(true);
    try {
      const res=await apiPost('/.netlify/functions/document-review',{
        draftId,documentId:document.documentId,assessment,notes,checklist,
      });
      setMessage(res.message);
      setNotes('');
      const fresh=await apiGet('/.netlify/functions/document-review?draftId='+encodeURIComponent(draftId));
      setReviews(fresh.reviews||[]);
      setCurrentDoc(fresh.latestDocument);
    } catch(err){setError(err.message);}
    finally{setSending(false);}
  }

  return <section className="border border-slate-200 rounded-lg bg-white p-4 space-y-4">
    <div className="flex gap-2 items-center">
      <ClipboardCheck className="w-5 h-5 text-slate-700"/>
      <h5 className="font-semibold text-slate-900">Parecer interno sobre o documento</h5>
    </div>
    <p className="text-sm text-slate-600">
      Confira a minuta integral e marque apenas o que foi analisado. Este registro
      é uma anotação interna: não equivale a homologação jurídica formal, não gera link público
      e não autoriza a fabricação.
    </p>
    <p className="text-xs text-slate-600 break-all">
      Documento v{document.version} · SHA-256: {document.sha256}
    </p>
    {loading && <p className="text-xs text-slate-600 flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/>Carregando pareceres...</p>}
    {!loading && currentDoc && !current && <p role="alert" className="text-amber-800 text-sm">A versão mudou. Atualize a consulta antes de registrar parecer.</p>}
    <form onSubmit={submit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="font-semibold text-sm">Checklist da análise</legend>
        {ITEMS.map(([key,label])=><label key={key} className="flex gap-2 text-sm items-start">
          <input type="checkbox" checked={checklist[key]}
            onChange={e=>setChecklist(v=>({...v,[key]:e.target.checked}))}
            className="mt-1 h-4 w-4" />
          <span>{label}</span>
        </label>)}
      </fieldset>
      <label className="block text-sm font-medium space-y-1">
        <span>Resultado da revisão interna</span>
        <select className="w-full border rounded px-3 py-2" value={assessment} onChange={e=>setAssessment(e.target.value)}>
          <option value="ajustes_solicitados">Solicitar ajustes</option>
          <option value="parecer_registrado">Registrar parecer de conferência (sem aprovação jurídica)</option>
        </select>
      </label>
      <label className="block text-sm font-medium space-y-1">
        <span>Observações para revisão jurídica e técnica</span>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} minLength={15} maxLength={2000}
          rows={4} required placeholder="Descreva cláusulas a revisar, condições do pedido ou resultado da conferência..."
          className="w-full border rounded px-3 py-2"/>
      </label>
      <Button type="submit" disabled={sending||loading||!current||notes.trim().length<15} className="gap-2">
        {sending?<Loader2 className="w-4 h-4 animate-spin"/>:<ClipboardCheck className="w-4 h-4"/>}
        Registrar parecer interno
      </Button>
    </form>
    {error && <p role="alert" className="text-red-800 bg-red-50 border border-red-200 rounded p-2 text-sm">{error}</p>}
    {message && <p role="status" className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2 text-sm">{message}</p>}
    {reviews.length>0&&<div className="space-y-2">
      <h6 className="font-semibold text-sm">Histórico de pareceres ({reviews.length})</h6>
      {reviews.map(r=><div key={r.id} className="border rounded p-3 text-sm space-y-1">
        <p><strong>{r.assessment==='ajustes_solicitados'?'Ajustes solicitados':'Parecer registrado'}</strong> · Versão {r.documentVersion} · {stamp(r.createdAt)}</p>
        <p className="whitespace-pre-wrap break-words">{r.notes}</p>
        <p className="text-xs text-slate-600">{Object.values(r.checklist||{}).filter(Boolean).length} de {ITEMS.length} tópicos analisados</p>
      </div>)}
    </div>}
    <div className="text-xs text-amber-900 flex gap-2 border border-amber-200 bg-amber-50 p-3 rounded">
      <ShieldAlert className="h-4 w-4 shrink-0"/>
      Assinatura e aprovação final permanecem tecnicamente bloqueadas.
    </div>
  </section>;
}
