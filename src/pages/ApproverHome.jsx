import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { apiGet, apiDownloadPdf } from '@/lib/apiClient';
import FormalApproval from '@/components/FormalApproval';
import { ShieldCheck, LockKeyhole, LogOut, FileText, RefreshCw, Download, Loader2 } from 'lucide-react';

const scopeName={ juridico:'Jurídico', comercial:'Comercial' };

export default function ApproverHome() {
  const { user, logout }=useAuth();
  const [queue,setQueue]=useState(null);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [downloading,setDownloading]=useState(false);
  const [error,setError]=useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data=await apiGet('/.netlify/functions/approval-queue');
      setQueue(data);
      setSelected(previous=>{
        if(!previous)return null;
        return (data.orders||[]).find(o=>o.draftId===previous.draftId)||null;
      });
    }catch(e){setError(e.message||'Não foi possível consultar a fila.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void refresh();},[]);

  async function download(order) {
    if(downloading)return;
    setDownloading(true);setError('');
    try{
      await apiDownloadPdf(
        '/.netlify/functions/review-document?draftId='+order.draftId+'&download=1',
        'ACEITE-DRAFER-minuta-'+order.number+'-v'+order.document.version+'.pdf'
      );
    }catch(e){setError(e.message||'Não foi possível baixar o documento.');}
    finally{setDownloading(false);}
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-8">
    <div className="max-w-5xl mx-auto space-y-5">
      <header className="rounded-xl bg-white border shadow-sm p-5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-3 items-center">
          <ShieldCheck className="h-9 w-9 text-red-700"/>
          <div>
            <h1 className="font-bold text-xl text-slate-900">ACEITE DRAFER</h1>
            <p className="text-sm text-slate-600">Central de Aprovações</p>
          </div>
        </div>
        <button type="button" onClick={()=>void logout()} className="px-4 py-2 bg-slate-900 text-white rounded flex gap-2 items-center">
          <LogOut className="h-4 w-4"/> Sair
        </button>
      </header>
      <div className="rounded-lg bg-white border p-4 flex flex-wrap justify-between items-center gap-3">
        <div className="text-sm space-y-1">
          <p>Conta autorizada: <strong>{user?.full_name||user?.name||user?.email}</strong></p>
          <p className="text-slate-600">{user?.email}</p>
          <p className="text-slate-600">
            Responsabilidades: {(queue?.assignments||[]).map(g=>scopeName[g.scope]+' · Empresa '+g.sic_company_id).join(' | ')||'Nenhuma designação ativa'}
          </p>
        </div>
        <button type="button" onClick={()=>void refresh()} disabled={loading}
          className="inline-flex gap-2 items-center rounded border px-3 py-2 text-sm disabled:opacity-50">
          <RefreshCw className={'h-4 w-4 '+(loading?'animate-spin':'')}/> Atualizar fila
        </button>
      </div>
      {error&&<p role="alert" className="bg-red-50 border border-red-200 rounded p-3 text-red-800">{error}</p>}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-lg text-slate-900">Documentos aguardando análise</h2>
        {loading&&<p className="text-sm text-slate-600 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Carregando documentos autorizados...</p>}
        {!loading&&queue?.orders?.length===0&&<p className="text-sm text-slate-600">
          Nenhum documento versionado disponível para suas empresas e áreas autorizadas.
        </p>}
        <div className="space-y-3">
          {(queue?.orders||[]).map(o=><article key={o.draftId}
            className={'rounded-lg border p-4 space-y-3 '+(selected?.draftId===o.draftId?'border-red-300 bg-red-50/30':'border-slate-200')}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-semibold">Pedido SIC nº {o.number} · Empresa {o.company}</p>
                <p className="text-sm text-slate-700">Cliente: {o.clientName}</p>
                <p className="text-xs text-slate-600">Minuta v{o.document.version} · Áreas: {o.scope.map(s=>scopeName[s]).join(', ')}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-start">
                <button type="button" onClick={()=>void download(o)} disabled={downloading}
                  className="inline-flex gap-2 items-center px-3 py-2 border bg-white rounded text-sm disabled:opacity-50">
                  <Download className="h-4 w-4"/> Baixar PDF de revisão
                </button>
                <button type="button" onClick={()=>setSelected(o)}
                  className="inline-flex gap-2 items-center px-3 py-2 bg-slate-900 text-white rounded text-sm">
                  <FileText className="h-4 w-4"/> Analisar
                </button>
              </div>
            </div>
          </article>)}
        </div>
      </section>
      {selected&&<FormalApproval key={selected.draftId+':'+selected.document.documentId}
        draftId={selected.draftId} document={selected.document}/>}
      <div className="text-sm bg-amber-50 border border-amber-200 text-amber-950 rounded-lg p-4 flex gap-2">
        <LockKeyhole className="h-5 w-5 shrink-0"/>
        <p>Os PDFs disponíveis são minutas internas. Mesmo que jurídico e comercial registrem decisões favoráveis, o termo final, os links de assinatura e a autorização de fabricação continuam bloqueados.</p>
      </div>
    </div>
  </main>;
}
