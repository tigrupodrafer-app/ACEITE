import React, {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiGet} from '@/lib/apiClient';
import {FileCheck2,ShieldAlert,FileDown,ArrowLeft,CheckCircle2,LockKeyhole,Loader2,Printer,ClipboardList} from 'lucide-react';

const DEMO_ID='1c26fdfa-8400-449a-8e84-4042695c2bf4';
const money=x=>x==null?'Não informado':Number(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty=x=>x==null?'—':Number(x).toLocaleString('pt-BR',{maximumFractionDigits:3});
const value=x=>x==null||x===''?'—':String(x);
function dataBR(d){if(!d)return '—';const x=new Date(d);return Number.isNaN(x.getTime())?String(d):new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(x);}
const steps=[
  'Pedido consultado no SIC','Conferência e minuta arquivada','Análise jurídica e comercial',
  'Emissão de termo definitivo','Assinatura e evidências','Liberação conforme regras SIC'
];
const role={juridico:'Jurídico',comercial:'Comercial'};

export default function AcceptancePresentation(){
 const navigate=useNavigate();
 const [id,setId]=useState(DEMO_ID);
 const [info,setInfo]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [checked,setChecked]=useState(false);
 const [signer,setSigner]=useState('');
 const [demonstrated,setDemonstrated]=useState(false);
 const [exporting,setExporting]=useState(false);
 const [expanded,setExpanded]=useState(true);
 async function load(draftId){
  if(!/^[0-9a-f-]{36}$/i.test(draftId)) {setError('Identificador de pedido inválido.');return;}
  setBusy(true);setError('');setInfo(null);setSigner('');setChecked(false);setDemonstrated(false);
  try{
   const data=await apiGet('/.netlify/functions/acceptance-presentation?draftId='+draftId);
   setInfo(data);
  }catch(e){setError(e.message||'Não foi possível preparar a apresentação.');}
  finally{setBusy(false);}
 }
 useEffect(()=>{const p=new URLSearchParams(window.location.search);
   const orderId=p.get('draftId')||DEMO_ID;setId(orderId);void load(orderId);
 },[]);
 function simulate(){
  if(!checked||signer.trim().length<3||!info)return;
  // UI-only: absolutely no API call or persisted event. Never considered a signature.
  setDemonstrated(true);
 }
 async function exportPdf(){
  if(!info||exporting)return;
  setExporting(true);setError('');
  try{
   const {jsPDF}=await import('jspdf');
   const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
   let y=26;const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
   function header(){
    doc.setDrawColor(178,22,22);doc.setTextColor(160,0,0);doc.setFontSize(10);
    doc.setFont('helvetica','bold');doc.text('ACEITE DRAFER - DEMONSTRACAO / SEM VALIDADE JURIDICA',15,12);
    doc.line(15,16,w-15,16);doc.setTextColor(30,30,30);
   }
   function add(t,{bold=false,size=10,monospace=false}={}){
    doc.setFont(monospace?'courier':'helvetica',bold?'bold':'normal');doc.setFontSize(size);
    const safe=String(t??'—').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\u0000-\u001f]/g,' ').slice(0,4000);
    const lines=doc.splitTextToSize(safe,w-30);
    for(const l of lines){
     if(y>h-23){doc.addPage();header();y=26;}
     doc.text(l,15,y);y+=size>=12?7.8:5.4;
    }y+=3;
   }
   header();
   add('TERMO DE ACEITE - AUTORIZACAO DE FABRICACAO', {bold:true,size:15});
   add('SIMULACAO INTERNA. NAO E TERMO EMITIDO. NAO AUTORIZA PRODUCAO, NAO ENVIAR AO CLIENTE.',{bold:true});
   add('Pedido SIC: '+info.order.number+' | Empresa '+info.order.company,{bold:true});
   add('Cliente: '+info.order.clientName);
   add('Data do pedido: '+dataBR(info.order.saleDate));
   add('Minuta de referencia: v'+(info.reviewVersion??'—')+' | SHA-256: '+value(info.reviewSha256));
   add('ITENS DO PEDIDO', {bold:true,size:12});
   for(const item of info.order.items){
    add(value(item.description),{bold:true});
    add('Codigo comercial: '+value(item.commercialCode)+' | Interno: '+value(item.internalCode)+
      ' | Referencia: '+value(item.supplierReference));
    add('Quantidade: '+qty(item.quantity)+' '+value(item.unit)+' | Peso: '+qty(item.weightKg)+
      ' kg | Pecas: '+qty(item.pieces)+' | Valor total: '+money(item.total));
   }
   add('Valor do pedido: '+money(info.order.total),{bold:true});
   add('TERMO DE GARANTIA, ARMAZENAGEM, MANUSEIO E INSTALACAO - TEXTO ORIGINAL EM REVISAO',{bold:true,size:12});
   for(const section of info.term.sections){
    add(section.heading,{bold:true,size:12});
    for(const p of section.paragraphs||[])add(p);
    for(const li of section.lists||[]){if(li.intro)add(li.intro,{bold:true});for(const item of li.items||[])add('- '+item);}
    for(const p of section.after||[])add(p);
    for(const sub of section.subsections||[]){add(sub.title,{bold:true});if(sub.text)add(sub.text);for(const b of sub.bullets||[])add('- '+b);}
   }
   add('DIAGRAMAS TECNICOS ILUSTRATIVOS - SUJEITOS A VALIDACAO',{bold:true,size:12});
   for(const diag of info.term.diagrams){
    add(diag.title,{bold:true});
    for(const line of diag.lines)add(line,{monospace:true,size:8});
   }
   add('AVISO LEGAL - CLAUSULAS ORIGINAIS EM REVISAO',{bold:true,size:12});
   for(const p of info.term.legalWarnings)add('- '+p);
   add('DECLARACAO ORIGINAL NAO DISPONIVEL PARA ASSINATURA',{bold:true});
   add(info.term.consent);
   add('REVISAO OBRIGATORIA ANTES DE USO REAL',{bold:true,size:12});
   for(const p of info.term.reviewFlags)add('[ ] '+p);
   add('SIMULACAO LOCAL: '+(demonstrated?'Fluxo demonstrado sem gravacao':'Nao executada'));
   if(demonstrated)add('Identificacao informada apenas no navegador: '+signer.trim());
   for(let page=1;page<=doc.getNumberOfPages();page++){
    doc.setPage(page);doc.setFontSize(9);doc.setFont('helvetica','bold');
    doc.setTextColor(170,0,0);doc.text('DEMONSTRACAO - SEM VALIDADE JURIDICA',15,h-9);
    doc.text(page+'/'+doc.getNumberOfPages(),w-25,h-9);
   }
   doc.save('ACEITE-DRAFER-DEMONSTRACAO-pedido-'+info.order.number+'.pdf');
  }catch(e){setError('Falha ao gerar PDF de apresentação.');}
  finally{setExporting(false);}
 }
 return <main className="min-h-screen bg-slate-100 px-4 py-8">
  <div className="mx-auto max-w-5xl space-y-5">
   <header className="rounded-xl bg-white shadow-sm border p-5 flex flex-wrap justify-between gap-4 items-center">
    <div className="flex items-center gap-3">
     <FileCheck2 className="text-red-700 w-9 h-9"/>
     <div><h1 className="text-2xl font-bold text-slate-900">ACEITE DRAFER</h1>
      <p className="text-sm text-slate-600">Apresentação do fluxo de aceite — modo demonstração</p></div>
    </div>
    <button onClick={()=>navigate('/Dashboard')} type="button" className="flex gap-2 items-center bg-slate-900 text-white px-4 py-2 rounded">
     <ArrowLeft className="w-4 h-4"/> Dashboard
    </button>
   </header>
   <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex gap-3 text-amber-950" role="status">
    <ShieldAlert className="h-6 w-6 shrink-0"/>
    <p><strong>DEMONSTRAÇÃO — SEM VALIDADE JURÍDICA.</strong> Não gera assinaturas reais, links públicos, tokens, registros de aceite ou autorização de fabricação. Os dados do pedido vêm do SIC, por meio do rascunho autorizado no Supabase.</p>
   </div>
   <section className="rounded-xl border bg-white p-5 space-y-3">
    <h2 className="font-semibold text-lg">Pedido para demonstração</h2>
    <form onSubmit={e=>{e.preventDefault();void load(id);}} className="flex flex-wrap gap-2">
     <input type="text" value={id} onChange={e=>setId(e.target.value)} aria-label="Identificador do rascunho"
       className="border rounded px-3 py-2 flex-1 min-w-[180px] font-mono text-sm" maxLength={36}/>
     <button type="submit" disabled={busy} className="rounded bg-slate-900 text-white px-4 py-2 disabled:opacity-50">
      {busy?'Consultando...':'Carregar pedido'}
     </button>
    </form>
    {error&&<p role="alert" className="bg-red-50 p-3 rounded text-red-800">{error}</p>}
    {busy&&<p className="text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Carregando dados...</p>}
   </section>
   {info&&<>
    <section className="rounded-xl border bg-white p-5 space-y-4">
     <h2 className="font-bold text-lg">Fluxo de ponta a ponta</h2>
     <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {steps.map((s,i)=>{
       const completed=i<2||(i===2&&info.decisions.bothFavorable);
       const sim=i===4&&demonstrated;
       return <div className="border rounded-lg p-3 flex items-start gap-2" key={s}>
        {completed?<CheckCircle2 className="text-emerald-600 w-5 h-5 shrink-0"/>:
         sim?<CheckCircle2 className="text-amber-600 w-5 h-5 shrink-0"/>:
         <LockKeyhole className="text-slate-400 w-5 h-5 shrink-0"/>}
        <div><p className="font-semibold text-sm">{i+1}. {s}</p>
         <p className="text-xs text-slate-600">{completed?'Concluído no fluxo interno':sim?'Simulado localmente':'Pendente / não liberado'}</p></div>
       </div>;
      })}
     </div>
    </section>
    <article className="rounded-xl bg-white border shadow-sm p-6 space-y-5">
     <div className="flex flex-wrap justify-between items-start gap-3">
      <div><h2 className="font-bold text-2xl">Termo de Aceite — Autorização de Fabricação</h2>
       <p className="text-red-700 font-bold text-sm">PRÉVIA NÃO ASSINÁVEL • EXCLUSIVA PARA APRESENTAÇÃO</p></div>
      <button type="button" onClick={exportPdf} disabled={exporting}
       className="inline-flex gap-2 items-center border rounded px-3 py-2 text-sm disabled:opacity-50">
       {exporting?<Loader2 className="w-4 h-4 animate-spin"/>:<FileDown className="w-4 h-4"/>}
       Gerar PDF demonstrativo
      </button>
     </div>
     <div className="grid md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
      <div><p className="text-xs text-slate-500">Pedido SIC</p><p className="font-bold">{info.order.number}</p></div>
      <div><p className="text-xs text-slate-500">Empresa</p><p className="font-bold">{info.order.company}</p></div>
      <div><p className="text-xs text-slate-500">Cliente</p><p className="font-bold break-words">{info.order.clientName}</p></div>
      <div><p className="text-xs text-slate-500">Documento de referência</p><p className="font-bold">Minuta v{info.reviewVersion??'—'}</p></div>
     </div>
     <div className="overflow-x-auto">
      <table className="min-w-[700px] w-full text-sm border-collapse">
       <thead><tr className="bg-slate-100 text-left">
        {['Produto','Código','Qtd.','Und.','Peso kg','Peças','Total'].map(x=><th key={x} className="p-2 border">{x}</th>)}
       </tr></thead>
       <tbody>{info.order.items.map((item,i)=><tr key={i}>
        <td className="p-2 border">{value(item.description)}</td>
        <td className="p-2 border">{value(item.commercialCode)}</td>
        <td className="p-2 border">{qty(item.quantity)}</td>
        <td className="p-2 border">{value(item.unit)}</td>
        <td className="p-2 border">{qty(item.weightKg)}</td>
        <td className="p-2 border">{qty(item.pieces)}</td>
        <td className="p-2 border">{money(item.total)}</td>
       </tr>)}</tbody>
      </table>
     </div>
     <div className="text-right font-bold text-lg">Total do pedido: {money(info.order.total)}</div>
     <div className="border-t pt-4">
      <button type="button" onClick={()=>setExpanded(v=>!v)} className="font-bold flex gap-2 items-center text-lg">
       <ClipboardList className="w-5 h-5"/> Termo de Garantia, Armazenagem, Manuseio e Instalação
       <span className="text-sm text-slate-500">({expanded?'Ocultar':'Expandir'})</span>
      </button>
      {expanded&&<div className="space-y-5 mt-4">
       <p className="text-sm text-amber-800">Texto original em revisão jurídica e técnica. A reprodução abaixo não significa aprovação das cláusulas.</p>
       {info.term.sections.map(section=><section key={section.heading} className="space-y-2">
        <h3 className="font-semibold">{section.heading}</h3>
        {(section.paragraphs||[]).map((t,i)=><p key={i} className="text-sm">{t}</p>)}
        {(section.lists||[]).map((list,i)=><div key={i}>
         <p className="font-medium text-sm">{list.intro}</p>
         <ul className="list-disc pl-6 text-sm">{list.items.map((t,j)=><li key={j}>{t}</li>)}</ul>
        </div>)}
        {(section.after||[]).map((t,i)=><p key={i} className="text-sm font-semibold">{t}</p>)}
        {(section.subsections||[]).map((sub,i)=><div key={i} className="ml-3 text-sm">
         <p className="font-semibold">{sub.title}</p>{sub.text&&<p>{sub.text}</p>}
         {sub.bullets&&<ul className="list-disc pl-6">{sub.bullets.map((t,j)=><li key={j}>{t}</li>)}</ul>}
        </div>)}
       </section>)}
       <section className="space-y-3">
        <h3 className="font-semibold">Diagramas técnicos — ilustrativos</h3>
        {info.term.diagrams.map(d=><div key={d.title} className="border rounded p-3 overflow-x-auto">
         <p className="font-semibold text-sm">{d.title}</p>
         <pre className="text-xs leading-relaxed whitespace-pre">{d.lines.join('\n')}</pre>
        </div>)}
       </section>
       <section className="space-y-2">
        <h3 className="font-semibold">Aviso legal — texto original pendente de aprovação</h3>
        <ul className="list-disc pl-6 text-sm">{info.term.legalWarnings.map((t,i)=><li key={i}>{t}</li>)}</ul>
       </section>
      </div>}
     </div>
    </article>
    <section className="bg-white border rounded-xl p-6 space-y-4">
     <h2 className="text-xl font-bold">Experiência de assinatura — demonstração local</h2>
     <p className="text-sm text-slate-700">Apresentação da etapa que o cliente utilizará futuramente. Nenhuma informação digitada aqui é enviada ou salva no servidor.</p>
     <label className="block text-sm font-medium space-y-2">
      <span>Nome demonstrativo do signatário</span>
      <input value={signer} onChange={e=>{setSigner(e.target.value);setDemonstrated(false);}}
       maxLength={100} placeholder="Digite um nome fictício para o teste"
       className="w-full border rounded p-3"/>
     </label>
     <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={e=>{setChecked(e.target.checked);setDemonstrated(false);}} className="mt-1"/>
      <span>Estou simulando a ciência do termo exibido. Entendo que esta ação não representa consentimento real, assinatura eletrônica ou autorização de fabricação.</span>
     </label>
     <button type="button" disabled={!checked||signer.trim().length<3} onClick={simulate}
      className="bg-red-700 text-white font-semibold rounded-lg px-5 py-3 disabled:bg-slate-400">
      Simular aceite — sem registro jurídico
     </button>
     {demonstrated&&<div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
      <p className="font-semibold text-emerald-900">Fluxo demonstrado na interface!</p>
      <p className="text-sm">Signatário fictício: {signer.trim()}.</p>
      <p className="text-sm">Nenhuma assinatura foi registrada. Para uma assinatura real, o termo definitivo, a identidade do cliente e as evidências precisarão ser homologados.</p>
     </div>}
     <div className="border border-amber-200 rounded p-3 text-xs text-amber-900">
      Pendências de produção: texto jurídico definitivo, regras SIC, emissão imutável, link de uso único,
      prova de consentimento, política LGPD, auditoria e validação de assinatura.
     </div>
    </section>
   </>}
  </div>
 </main>;
}
