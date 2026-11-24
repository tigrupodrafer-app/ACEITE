import React, {useState} from 'react';
import {useAuth} from '@/lib/AuthContext';
import {apiPost} from '@/lib/apiClient';
import VendorWorkflow from '@/components/VendorWorkflowSimplificado';
import legal from '@/lib/legalTermRevised.json';

function LegalAdministration(){
 const [justification,setJustification]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 async function approve(){
  if(busy||justification.trim().length<30||!window.confirm('Confirma a homologação jurídica desta versão para todos os pedidos?'))return;
  setBusy(true);setMessage('');
  try{
   const r=await apiPost('/.netlify/functions/approve-legal-version',{confirmed:true,version:legal.version,justification:justification.trim()});
   setMessage(r.approved?'Homologação registrada.':'Homologação não confirmada.');
  }catch(e){setMessage(e.message);}
  finally{setBusy(false);}
 }
 return <details className="mt-8 border rounded-lg bg-white p-4">
  <summary className="font-semibold cursor-pointer">Administração — homologação jurídica</summary>
  <div className="space-y-3 mt-4">
   <p>Versão {legal.version}. Homologação única por versão, mediante autorização jurídica.</p>
   <details><summary>Consultar termo jurídico</summary>{legal.sections.map(([title,paragraphs],i)=><section key={i} className="mt-3"><h3 className="font-semibold">{i+1}. {title}</h3>{paragraphs.map((p,j)=><p key={j}>{p}</p>)}</section>)}{legal.consent.map((p,i)=><p key={i} className="mt-2">{p}</p>)}</details>
   <textarea className="w-full border rounded p-2" aria-label="Fundamentação da homologação" placeholder="Informe a autorização jurídica e sua fundamentação" value={justification} maxLength={1000} onChange={e=>setJustification(e.target.value)}/>
   <button disabled={busy||justification.trim().length<30} onClick={approve} className="border rounded px-4 py-2 disabled:opacity-50">Registrar homologação</button>
   {message&&<p role="status">{message}</p>}
  </div>
 </details>;
}
export default function Dashboard(){
 const {user}=useAuth();
 return <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
  <div className="max-w-5xl mx-auto">
   <header className="mb-6"><h1 className="text-3xl font-bold text-slate-900">ACEITE DRAFER</h1><p className="text-slate-600">Consulte, confirme e envie o pedido para assinatura.</p></header>
   <VendorWorkflow/>
   {['admin','aprovador'].includes(user?.role)&&<LegalAdministration/>}
  </div>
 </main>;
}
