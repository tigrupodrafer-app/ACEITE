import React,{useEffect,useState} from 'react';
import {FileSignature,ShieldAlert,CheckCircle2,Loader2,LockKeyhole} from 'lucide-react';

export default function DemoSign(){
 const token=new URLSearchParams(window.location.search).get('token')||'';
 const [data,setData]=useState(null);
 const [name,setName]=useState('');
 const [consent,setConsent]=useState(false);
 const [pending,setPending]=useState(true);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [proof,setProof]=useState(null);
 useEffect(()=>{
  if(!/^[0-9a-f]{64}$/i.test(token)){setPending(false);setError('Link de teste inválido.');return;}
  let active=true;
  fetch('/.netlify/functions/demo-public?token='+encodeURIComponent(token),{
   cache:'no-store',referrerPolicy:'no-referrer',
  }).then(async r=>{
   const p=await r.json();
   if(!r.ok)throw Error(p.error||'Link indisponível');
   if(active)setData(p);
  }).catch(e=>{if(active)setError(e.message)})
    .finally(()=>{if(active)setPending(false)});
  return()=>{active=false;};
 },[token]);
 async function sign(e){
  e.preventDefault();
  if(sending||!consent||name.trim().length<3||!data)return;
  setSending(true);setError('');
  try{
   const response=await fetch('/.netlify/functions/demo-public',{
    method:'POST',cache:'no-store',referrerPolicy:'no-referrer',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token,documentSha256:data.document.sha256,
      signerName:name.trim(),consent:true}),
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Não foi possível confirmar');
   setProof(result);
   setData(previous=>({...previous,status:'aceite_simulado'}));
  }catch(e){setError(e.message)}
  finally{setSending(false)}
 }
 return <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
  <div className="max-w-2xl mx-auto space-y-5">
   <header className="rounded-xl border bg-white p-5 flex gap-3 items-center">
    <FileSignature className="w-9 h-9 text-red-700"/>
    <div><h1 className="text-xl font-bold">ACEITE DRAFER</h1>
     <p className="text-sm text-slate-600">Laboratório de assinatura — dados fictícios</p></div>
   </header>
   <div role="alert" className="border-2 border-amber-400 rounded-lg p-4 bg-amber-50 text-amber-950 flex gap-2">
    <ShieldAlert className="w-6 h-6 shrink-0"/>
    <p><strong>APENAS TESTE — SEM VALIDADE JURÍDICA.</strong> Não informe dados pessoais reais. Este link não representa contrato, aceite do cliente nem autorização de produção.</p>
   </div>
   {pending&&<p className="flex gap-2 items-center"><Loader2 className="animate-spin w-4 h-4"/> Validando link de teste...</p>}
   {error&&<div role="alert" className="bg-red-50 text-red-800 border border-red-200 rounded p-3">{error}</div>}
   {data&&<section className="border bg-white rounded-xl p-6 space-y-5">
    <div className="flex justify-between flex-wrap gap-2">
     <h2 className="text-xl font-bold">Autorização de fabricação — SIMULAÇÃO</h2>
     <span className="text-xs font-bold text-red-700">DOCUMENTO FICTÍCIO</span>
    </div>
    <div className="grid sm:grid-cols-2 gap-3 bg-slate-50 rounded p-4 text-sm">
     <p><strong>Pedido:</strong> {data.order.number}</p>
     <p><strong>Empresa:</strong> {data.order.company}</p>
     <p><strong>Cliente:</strong> {data.order.clientName}</p>
     <p><strong>Produto:</strong> {data.order.material}</p>
     <p><strong>Quantidade:</strong> {data.order.quantity} {data.order.unit}</p>
     <p><strong>Valor:</strong> {data.order.value}</p>
    </div>
    <div className="space-y-2">
     <h3 className="font-semibold">Texto exibido na simulação</h3>
     <pre className="font-sans text-sm whitespace-pre-wrap bg-slate-50 rounded border p-4">{data.document.text}</pre>
     <p className="text-xs text-slate-600 break-all">SHA-256 do texto de teste: {data.document.sha256}</p>
    </div>
    {data.status!=='aguardando_aceite' ? <div className="border border-emerald-200 bg-emerald-50 rounded p-4 text-sm text-emerald-950">
     <CheckCircle2 className="w-5 h-5 inline mr-2"/>
     Aceite de teste já registrado. O link não permite nova confirmação.
    </div> : <form onSubmit={sign} className="space-y-4">
     <label className="block text-sm font-semibold space-y-2">
      <span>Nome fictício do signatário para teste</span>
      <input value={name} maxLength={100} required minLength={3}
       onChange={e=>setName(e.target.value)}
       placeholder="Ex.: Cliente de Teste" className="w-full rounded border p-3"/>
     </label>
     <label className="flex gap-3 text-sm items-start">
      <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1"/>
      <span>Declaro estar apenas testando a interface e a confirmação deste texto fictício. Esta ação não constitui assinatura jurídica.</span>
     </label>
     <button disabled={!consent||name.trim().length<3||sending} type="submit"
      className="bg-red-700 text-white rounded-lg py-3 px-5 font-semibold disabled:opacity-50 flex gap-2 items-center">
      {sending?<Loader2 className="h-4 w-4 animate-spin"/>:<FileSignature className="h-4 w-4"/>}
      Confirmar aceite de TESTE
     </button>
    </form>}
    {proof&&<div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm space-y-1">
     <p className="font-bold">Registro de homologação criado</p>
     <p>ID de teste: {proof.eventId}</p>
     <p>Registrado em: {new Date(proof.acceptedAt).toLocaleString('pt-BR')}</p>
     <p>Nenhuma assinatura juridicamente válida foi produzida.</p>
    </div>}
   </section>}
   <p className="text-sm flex items-start gap-2 text-slate-600">
    <LockKeyhole className="w-4 h-4 shrink-0"/> O acesso ao pedido real e ao módulo SIC não é concedido por este link.
   </p>
  </div>
 </main>;
}
