import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, LockKeyhole } from 'lucide-react';

const scopeLabel={juridico:'Aprovação jurídica',comercial:'Aprovação comercial'};
const decisionLabel={aprovado:'Aprovado para elaboração do documento final',reprovado:'Reprovado — requer nova versão'};
function Flag({label,value}) {
  return <p className="text-sm"><strong>{label}:</strong> {value||'Pendente'}</p>;
}
export default function FormalApproval({draftId,document}) {
  const [info,setInfo]=useState(null);
  const [scope,setScope]=useState('');
  const [decision,setDecision]=useState('reprovado');
  const [justification,setJustification]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    if(!draftId||!document?.documentId)return;
    let alive=true;
    setInfo(null);
    setError('');
    apiGet('/.netlify/functions/formal-approval?draftId='+encodeURIComponent(draftId))
      .then(v=>{if(alive){setInfo(v);setScope(v.scopes?.[0]||'');}})
      .catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[draftId,document?.documentId]);
  async function send(e){
    e.preventDefault();
    if(busy||!scope||!confirmed)return;
    setBusy(true);setError('');setNotice('');
    try{
      const res=await apiPost('/.netlify/functions/formal-approval',{
        draftId,documentId:document.documentId,documentSha256:document.sha256,
        scope,decision,justification,declarationAccepted:true,
      });
      setNotice(res.message);
      const next=await apiGet('/.netlify/functions/formal-approval?draftId='+encodeURIComponent(draftId));
      setInfo(next);setJustification('');setConfirmed(false);
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  const current=info?.document?.id===document?.documentId&&
    info?.document?.sha256===document?.sha256;
  const used=(info?.decisions||[]).filter(x=>x.isCurrentDocument);
  const available=(info?.scopes||[]).filter(x=>!used.some(d=>d.scope===x));
  const approved=info?.status?.bothApproved===true;
  return <section className="border border-slate-200 p-4 rounded-lg bg-white space-y-3">
    <h5 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5"/>Aprovação formal — jurídico e comercial</h5>
    <p className="text-sm text-slate-700">
      Somente responsáveis formalmente nomeados podem registrar decisões.
      O sistema exige pessoas diferentes para a etapa jurídica e a comercial.
      A decisão refere-se exclusivamente à versão e ao hash do documento preliminar.
    </p>
    {info&&<div className="rounded bg-slate-50 p-3 space-y-1">
      <Flag label="Jurídico" value={info.status?.legalDecision}/>
      <Flag label="Comercial" value={info.status?.commercialDecision}/>
      <p className="text-sm">{approved
        ? 'Ambas as decisões foram favoráveis nesta versão. Ainda é necessário gerar e validar o termo jurídico definitivo.'
        : 'Uma ou ambas as decisões ainda não foram favoráveis.'}</p>
    </div>}
    {info&&!info.scopes?.length&&<p className="text-sm text-amber-900">
      Sua conta não está designada como responsável formal por esta empresa.
      A nomeação deve ser cadastrada pela administração do sistema.
    </p>}
    {current&&available.length>0&&<form onSubmit={send} className="space-y-3">
      <label className="block text-sm font-medium space-y-1">
        <span>Área responsável</span>
        <select className="w-full rounded border p-2" value={available.includes(scope)?scope:available[0]}
          onChange={e=>setScope(e.target.value)}>
          {available.map(s=><option key={s} value={s}>{scopeLabel[s]}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium space-y-1">
        <span>Decisão sobre o texto analisado</span>
        <select className="w-full rounded border p-2" value={decision}
          onChange={e=>setDecision(e.target.value)}>
          <option value="reprovado">Reprovar e solicitar nova versão</option>
          <option value="aprovado">Aprovar para elaboração do documento final (sem assinatura)</option>
        </select>
      </label>
      <label className="block text-sm font-medium space-y-1">
        <span>Justificativa formal</span>
        <textarea className="w-full border rounded p-2" rows={4}
          required minLength={30} maxLength={3000} value={justification}
          onChange={e=>setJustification(e.target.value)}
          placeholder="Fundamente a decisão, com referências às condições da minuta e ressalvas jurídicas/comerciais."/>
      </label>
      <label className="flex gap-2 items-start text-sm">
        <input type="checkbox" className="mt-1" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
        <span>Confirmo que fui designado para esta etapa e analisei a versão do documento indicada. Esta decisão não autoriza assinatura nem fabricação.</span>
      </label>
      <Button type="submit" disabled={busy||!confirmed||justification.trim().length<30||!current}>
        {busy?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:null}Registrar decisão formal
      </Button>
    </form>}
    {info&&used.length>0&&<div className="space-y-1">
      <p className="text-sm font-semibold">Decisões nesta versão</p>
      {used.map(x=><p className="text-xs" key={x.id}>
        {scopeLabel[x.scope]} — {decisionLabel[x.decision]} — {new Date(x.createdAt).toLocaleString('pt-BR')}
      </p>)}
    </div>}
    {error&&<p role="alert" className="text-red-700 text-sm">{error}</p>}
    {notice&&<p role="status" className="text-emerald-700 text-sm">{notice}</p>}
    <p className="flex gap-2 items-start text-xs text-amber-900 bg-amber-50 rounded p-3 border border-amber-200">
      <LockKeyhole className="w-4 h-4 shrink-0"/>O termo final e a assinatura publica continuam bloqueados por projeto,
      mesmo apos duas decisoes favoraveis.
    </p>
  </section>;
}
