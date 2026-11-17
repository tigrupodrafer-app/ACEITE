import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiGet,apiPost} from '@/lib/apiClient';
import {FlaskConical,Copy,ExternalLink,RefreshCw,ShieldAlert,CheckCircle2,Factory,Loader2,ArrowLeft} from 'lucide-react';

const statusText={
 aguardando_aceite:'Aguardando assinatura de teste',
 aceite_simulado:'Aceite de teste registrado',
 fabricacao_simulada:'Fabricação simulada — sem efeito no SIC',
};
export default function DemoLab(){
 const navigate=useNavigate();
 const [flow,setFlow]=useState(null);
 const [url,setUrl]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 async function create(){
  setBusy(true);setError('');setMessage('');setFlow(null);setUrl('');
  try{
   const result=await apiPost('/.netlify/functions/demo-flow',{action:'create'});
   setFlow(result.flow);
   setUrl(window.location.origin+'/AssinarDemo?token='+encodeURIComponent(result.token));
   setMessage('Link de teste criado. Utilize somente com dados fictícios.');
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 async function refresh(){
  if(!flow)return;
  setBusy(true);setError('');
  try{
   const result=await apiGet('/.netlify/functions/demo-flow?flowId='+flow.id);
   setFlow(result.flow);
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 async function release(){
  if(!flow||flow.status!=='aceite_simulado')return;
  setBusy(true);setError('');setMessage('');
  try{
   const res=await apiPost('/.netlify/functions/demo-flow',{action:'release',flowId:flow.id});
   setMessage(res.message);
   await refresh();
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 async function copy(){
  if(!url)return;
  try{await navigator.clipboard.writeText(url);setMessage('Link de teste copiado.');}
  catch{setError('Não foi possível copiar automaticamente. Selecione o link manualmente.');}
 }
 return <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
  <div className="max-w-3xl mx-auto space-y-5">
   <header className="flex gap-3 justify-between flex-wrap items-center bg-white border rounded-xl p-5">
    <div className="flex gap-3 items-center">
     <FlaskConical className="w-9 h-9 text-red-700"/>
     <div><h1 className="text-2xl font-bold">ACEITE DRAFER</h1>
      <p className="text-sm text-slate-600">Laboratório — assinatura e fabricação simuladas</p></div>
    </div>
    <button type="button" onClick={()=>navigate('/Dashboard')}
     className="rounded bg-slate-900 text-white px-4 py-2 flex items-center gap-2">
     <ArrowLeft className="w-4 h-4"/> Dashboard
    </button>
   </header>
   <div role="alert" className="border-2 border-amber-300 bg-amber-50 rounded p-4 flex gap-3 text-amber-900">
    <ShieldAlert className="w-6 h-6 shrink-0"/>
    <div><strong>HOMOLOGAÇÃO COM DADOS FICTÍCIOS.</strong>
     <p className="text-sm mt-1">Esta ferramenta não utiliza dados de clientes, não altera pedidos do SIC, não emite termos definitivos e não autoriza fabricação.</p></div>
   </div>
   <section className="bg-white border rounded-xl p-5 space-y-4">
    <h2 className="text-lg font-bold">1. Gerar link exclusivo de teste</h2>
    <p className="text-sm text-slate-700">
     Um token aleatório será válido por até 30 minutos e poderá ser utilizado uma única vez.
     A conta administrativa pode acompanhar o resultado.
    </p>
    <button type="button" onClick={create} disabled={busy}
     className="flex items-center gap-2 bg-red-700 text-white font-semibold rounded px-4 py-2 disabled:opacity-50">
     {busy?<Loader2 className="animate-spin h-4 w-4"/>:<FlaskConical className="h-4 w-4"/>}
     Criar nova demonstração
    </button>
    {url&&<div className="space-y-3 rounded-lg border bg-slate-50 p-4">
     <label className="block space-y-1 text-sm font-medium">
      <span>Link do cliente fictício</span>
      <input readOnly value={url} className="w-full border rounded px-3 py-2 font-mono text-xs" onFocus={e=>e.target.select()}/>
     </label>
     <div className="flex flex-wrap gap-2">
      <button onClick={()=>void copy()} type="button" className="flex items-center gap-2 border bg-white rounded px-3 py-2 text-sm">
       <Copy className="w-4 h-4"/> Copiar link
      </button>
      <button onClick={()=>window.open(url,'_blank','noopener,noreferrer')} type="button"
       className="flex items-center gap-2 border bg-white rounded px-3 py-2 text-sm">
       <ExternalLink className="w-4 h-4"/> Abrir página do teste
      </button>
     </div>
    </div>}
   </section>
   {flow&&<section className="bg-white border rounded-xl p-5 space-y-4">
    <h2 className="text-lg font-bold">2. Acompanhar assinatura de teste</h2>
    <p className="text-sm"><strong>Situação:</strong> {statusText[flow.status]||flow.status}</p>
    <p className="text-xs text-slate-600">Expiração do link: {new Date(flow.expires_at).toLocaleString('pt-BR')}</p>
    {flow.accepted_at&&<p className="text-sm flex gap-2 items-center text-emerald-800">
     <CheckCircle2 className="w-4 h-4"/> Confirmado em {new Date(flow.accepted_at).toLocaleString('pt-BR')}
    </p>}
    {flow.status==='fabricacao_simulada'&&<p className="text-sm text-emerald-800 flex items-center gap-2">
     <Factory className="w-4 h-4"/> Etapa de fabricação demonstrada. Nenhuma operação ocorreu no SIC.
    </p>}
    <div className="flex flex-wrap gap-2">
     <button onClick={()=>void refresh()} disabled={busy} type="button"
      className="border rounded px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
      <RefreshCw className={'w-4 h-4 '+(busy?'animate-spin':'')}/> Atualizar situação
     </button>
     <button onClick={()=>void release()} disabled={busy||flow.status!=='aceite_simulado'}
      type="button" className="bg-slate-900 text-white font-semibold rounded px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
      <Factory className="w-4 h-4"/> Simular liberação de fabricação
     </button>
    </div>
    <p className="text-xs text-slate-600">
     A liberação simulada só pode ocorrer após o aceite de teste e apenas uma vez.
    </p>
   </section>}
   {error&&<p role="alert" className="bg-red-50 text-red-800 border rounded p-3">{error}</p>}
   {message&&<p role="status" className="bg-emerald-50 text-emerald-900 border rounded p-3">{message}</p>}
  </div>
 </main>;
}
