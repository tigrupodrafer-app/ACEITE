import React,{useEffect,useState} from 'react';
import {apiGet,apiPost,apiDownloadPdf} from '@/lib/apiClient';
import {Button} from '@/components/ui/button';
import {FileCheck2,Download,Loader2,LockKeyhole,RefreshCw} from 'lucide-react';

export default function ApprovalDossier({draftId,document}) {
 const [data,setData]=useState(null);
 const [decision,setDecision]=useState(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [downloading,setDownloading]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 async function refresh(){
  if(!draftId)return;
  setLoading(true);setError('');
  try{
   const [d,a]=await Promise.all([
    apiGet('/.netlify/functions/approval-dossier?draftId='+encodeURIComponent(draftId)),
    apiGet('/.netlify/functions/formal-approval?draftId='+encodeURIComponent(draftId))
   ]);
   setData(d);setDecision(a);
  }catch(e){setError(e.message||'Falha ao consultar dossiê');}
  finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[draftId,document?.documentId]);
 const approved=decision?.status?.bothApproved===true&&
    decision?.document?.id===document?.documentId&&
    decision?.document?.sha256===document?.sha256;
 async function create(){
  if(saving||!approved)return;
  setSaving(true);setNotice('');setError('');
  try{
   const res=await apiPost('/.netlify/functions/approval-dossier',{draftId});
   setNotice(res.message||'Dossiê interno registrado.');
   await refresh();
  }catch(e){setError(e.message||'Não foi possível arquivar o dossiê.');}
  finally{setSaving(false);}
 }
 async function download(){
  if(downloading||!data?.available)return;
  setDownloading(true);setError('');
  try{
   await apiDownloadPdf('/.netlify/functions/approval-dossier?draftId='+encodeURIComponent(draftId)+'&download=1',
     'ACEITE-DRAFER-dossie-interno-v'+data.version+'.pdf');
  }catch(e){setError(e.message||'Falha no download do dossiê.');}
  finally{setDownloading(false);}
 }
 return <section className="rounded-lg border bg-white p-4 space-y-3">
  <div className="flex items-center gap-2"><FileCheck2 className="w-5 h-5"/>
   <h5 className="font-semibold">Dossiê interno de homologação</h5>
  </div>
  <p className="text-sm text-slate-600">
   Este dossiê comprova as decisões jurídica e comercial sobre a mesma minuta e seu SHA-256.
   Ele não é o termo jurídico definitivo e não pode ser enviado ao cliente.
  </p>
  {loading&&<p className="text-sm inline-flex gap-2 items-center"><Loader2 className="w-4 h-4 animate-spin"/>Conferindo decisões...</p>}
  {!loading&&decision&&<div className="rounded bg-slate-50 p-3 text-sm space-y-1">
   <p><strong>Jurídico:</strong> {decision.status?.legalDecision||'Pendente'}</p>
   <p><strong>Comercial:</strong> {decision.status?.commercialDecision||'Pendente'}</p>
   <p className="text-xs text-slate-600">Minuta v{document?.version}; hash verificado na emissão pelo servidor.</p>
  </div>}
  {data?.available&&<div role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm space-y-1">
   <p><strong>Dossiê interno arquivado — versão {data.version}</strong></p>
   <p className="text-xs break-all"><strong>SHA-256:</strong> {data.sha256}</p>
  </div>}
  <div className="flex flex-wrap gap-2">
   <Button type="button" variant="outline" disabled={loading} onClick={()=>void refresh()} className="gap-2">
    <RefreshCw className="w-4 h-4"/> Atualizar decisões
   </Button>
   {!data?.available&&<Button type="button" disabled={loading||saving||!approved} onClick={create} className="gap-2">
    {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<FileCheck2 className="w-4 h-4"/>}
    Gerar dossiê de homologação
   </Button>}
   {data?.available&&<Button type="button" variant="outline" disabled={downloading} onClick={download} className="gap-2">
    {downloading?<Loader2 className="w-4 h-4 animate-spin"/>:<Download className="w-4 h-4"/>}
    Baixar dossiê arquivado
   </Button>}
  </div>
  {error&&<p role="alert" className="text-red-800 text-sm">{error}</p>}
  {notice&&<p role="status" className="text-emerald-800 text-sm">{notice}</p>}
  <div className="flex gap-2 items-start text-amber-900 bg-amber-50 border border-amber-200 rounded p-3 text-xs">
   <LockKeyhole className="w-4 h-4 shrink-0"/>
   O documento final, a assinatura eletrônica e a autorização de fabricação permanecem bloqueados.
  </div>
 </section>;
}
