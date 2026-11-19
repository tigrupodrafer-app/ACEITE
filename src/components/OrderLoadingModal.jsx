import React, {useEffect} from 'react';
import {Loader2, CheckCircle2, AlertCircle} from 'lucide-react';

const descriptions={
  enviando:'Preparando solicitação ao conector SIC...',
  pending:'Aguardando o servidor interno receber o pedido...',
  processing:'Consultando informações e itens no SIC SupraSYS...',
  montando:'Conferindo os dados e montando o espelho de impressão...',
  verificando:'Verificando o histórico de aceites deste pedido...',
  erro:'Não foi possível concluir a consulta.',
};
const stages=['enviando','pending','processing','montando','verificando'];
export default function OrderLoadingModal({open,phase,orderNumber,onClose,error='',elapsed=0}){
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous};
 },[open]);
 if(!open)return null;
 const errored=phase==='erro';
 const index=stages.indexOf(phase);
 return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 px-4 print:hidden" role="presentation">
  <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="loading-order-title" aria-describedby="loading-order-description">
   <div className="flex flex-col items-center text-center gap-3">
    <div className="relative w-20 h-20 flex items-center justify-center" aria-hidden="true">
     <div className="absolute inset-0 rounded-full border-[5px] border-slate-100"/>
     {errored?<AlertCircle className="w-10 h-10 text-red-700"/>:
      <div className="absolute inset-0 rounded-full border-[5px] border-transparent border-t-red-700 border-r-red-700 animate-spin"/>}
     {!errored&&<Loader2 className="w-8 h-8 text-red-700 animate-spin"/>}
    </div>
    <h2 id="loading-order-title" className="text-xl font-bold text-slate-900">
     {errored?'Consulta não concluída':'Carregando pedido SIC'}
    </h2>
    <p className="text-sm text-slate-700">Pedido nº <strong>{orderNumber}</strong></p>
    <p id="loading-order-description" className="text-sm text-slate-600 min-h-[2.5rem]" aria-live="polite">
     {errored?(error||descriptions.erro):(descriptions[phase]||descriptions.pending)}
    </p>
    {!errored&&<div className="w-full space-y-2 mt-2 text-left">
     {stages.map((item,i)=><div key={item} className={'flex items-center gap-2 text-xs '+(index===i?'text-red-700 font-semibold':index>i?'text-slate-500':'text-slate-400')}>
      {index>i?<CheckCircle2 className="w-4 h-4 text-emerald-700"/>:
       index===i?<Loader2 className="w-4 h-4 animate-spin"/>:<div className="w-4 h-4 rounded-full border border-slate-300"/>}
      {descriptions[item]}
     </div>)}
    </div>}
    {!errored&&<p className="text-xs text-slate-500 mt-2">Tempo decorrido: {elapsed}s. O conector pode levar alguns instantes; não é necessário clicar novamente.</p>}
    {errored&&<button type="button" onClick={onClose} className="mt-2 rounded-lg bg-slate-900 text-white px-5 py-2">Fechar e tentar novamente</button>}
   </div>
  </div>
 </div>;
}
