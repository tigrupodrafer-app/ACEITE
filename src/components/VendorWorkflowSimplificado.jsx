import React,{useEffect,useState,useRef,useContext,createContext} from 'react';
import OrderLoadingModal from '@/components/OrderLoadingModal';
import SeletorEnderecoEntrega from '@/components/order/SeletorEnderecoEntrega';
import { LEGAL_SECTIONS, LEGAL_CONSENT, LEGAL_TITLE } from '@/lib/legalTermRevised';
import printCalc from '@/lib/sicPrintTotals.cjs';
const {totalsForPrint,itemWeight}=printCalc;
import {apiGet,apiPost,apiDownloadPdf} from '@/lib/apiClient';
import {Search,Loader2,Printer,RefreshCw,FileText,LockKeyhole,Copy,MessageCircle,ShieldCheck} from 'lucide-react';

const brl=v=>v===null||v===undefined||v===''?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=(v,precision=3)=>v===null||v===undefined||v===''?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:precision});
const field=x=>x===null||x===undefined||String(x).trim()===''?'—':String(x);
const date=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(d)};
const printCode=item=>item.codigoProdutoImpressao??item.codigoImpressao;
const internalCode=item=>item.codigoProdutoInterno??item.codigoProduto;
const simpleStatus={nao_registrado:'Aceite ainda não gerado',rascunho:'Pedido em rascunho',link_ativo:'Aguardando assinatura',assinado:'Aceite assinado',pendente:'Pendente'};
function ItemTable({items}){
 return <div>
  <div className="sm:hidden space-y-3 print:hidden" aria-label="Itens do pedido para celular">
   {items.map((item,i)=><article key={i} className="border rounded-md p-3 space-y-2 text-sm">
    <p className="font-semibold">{field(item.descricao)}</p>
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
     <p><strong>Cód. impressão:</strong> {field(printCode(item))}</p>
     <p><strong>Cód. interno:</strong> {field(internalCode(item))}</p>
     <p><strong>Unidade:</strong> {field(item.unidade)}</p>
     <p><strong>Qtde. KG:</strong> {num(itemWeight(item))}</p>
     <p><strong>Qtde. PC:</strong> {num(item.quantidadePecas)}</p>
     <p><strong>Vr. unitário:</strong> {num(item.valorUnitarioPeca??item.valorUnitario)}</p>
     <p><strong>Total:</strong> R$ {brl(item.valorTotal)}</p>
    </div>
   </article>)}
  </div>
  <div className="hidden sm:block print:block overflow-x-auto"><table className="w-full min-w-[890px] print:min-w-0 print:text-[9px] text-[13px] border-collapse">
  <thead><tr className="border-b border-black">{['Cód. impressão','Cód. interno','Descrição','Unid.','Qtde. KG','Qtde. PC','Vr. Unit.','Valor Total'].map(h=><th key={h} className="py-2 px-1 font-normal text-left">{h}</th>)}</tr></thead>
  <tbody>{items.map((item,i)=><tr key={i} className="align-top">
    <td className="p-1">{field(printCode(item))}</td>
    <td className="p-1">{field(internalCode(item))}</td>
    <td className="p-1">{field(item.descricao)}</td>
    <td className="p-1">{field(item.unidade)}</td>
    <td className="p-1 text-right">{num(itemWeight(item))}</td>
    <td className="p-1 text-right">{num(item.quantidadePecas)}</td>
    <td className="p-1 text-right">{num(item.valorUnitarioPeca??item.valorUnitario)}</td>
    <td className="p-1 text-right">{brl(item.valorTotal)}</td>
  </tr>)}</tbody>
 </table></div></div>;
}
function LabelValue({label,value}){return <div className="min-w-0"><strong>{label}:</strong> {field(value)}</div>}
function PrintedOrder({order,items}){
 const c=order.cliente||{}, totals=order.valores||{},summary=totalsForPrint(items);
 const seller=order.vendedor||order.codigoVendedor;
 const payment=order.condicaoPagamento||order.condicoesPagamento;
 const paymentKnown=payment!==null&&payment!==undefined&&String(payment).trim()!=='';
 return <article className="bg-white border-2 border-slate-700 text-slate-950 font-[Arial] print:shadow-none print:border-black" aria-label="Espelho de impressão do pedido SIC">
  <header className="border-b-2 border-black p-2">
   <div className="grid md:grid-cols-3 gap-2 items-start">
    <div><h2 className="font-bold text-lg sm:text-2xl leading-none">{field(order.nomeEmpresa||order.razaoSocialEmpresa||null)}</h2>
     <p className="text-sm sm:text-lg mt-2">FONE: {field(order.telefoneEmpresa)}</p></div>
    <div className="text-center">
     <p className="text-sm sm:text-lg">{field(order.tipoVenda||order.tipoVendaDescricao||order.tipoVendaCodigo)}</p>
     <h3 className="font-bold text-2xl sm:text-4xl mt-2">PEDIDO Nº {field(order.numero)}</h3>
    </div>
    <div className="md:text-right"><p>Pág: 1</p><p className="mt-4">Tabela: {field(order.tabelaPreco)}</p></div>
   </div>
  </header>
  <div className="px-2 pt-2 space-y-2 text-[13px] sm:text-[16px]">
   <div className="grid md:grid-cols-3 gap-2"><LabelValue label="Emissão" value={date(order.dataPedido)}/><LabelValue label="Data entrega" value={date(order.dataEntrega)}/><LabelValue label="Vendedor" value={seller}/></div>
   <div className="grid md:grid-cols-2 gap-2"><LabelValue label="Cliente" value={[c.codigo,c.nome].filter(Boolean).join(' — ')}/><LabelValue label="Fone" value={c.telefone||order.telefoneCliente}/></div>
   <div className="grid md:grid-cols-3 gap-2"><LabelValue label="CNPJ" value={c.cnpj||c.cpf||c.cnpjCpf||order.cnpjCpf}/><LabelValue label="Comprador" value={c.comprador||order.comprador}/><LabelValue label="Email" value={c.email||order.emailCliente}/></div>
   <div className="grid md:grid-cols-4 gap-2"><LabelValue label="Endereço" value={[c.endereco||order.endereco,c.numeroEndereco].filter(Boolean).join(', ')}/><LabelValue label="Cidade" value={c.cidade||order.cidade}/><LabelValue label="Estado" value={c.estado||order.estado}/><LabelValue label="Bairro / CEP" value={[c.bairro||order.bairro,c.cep||order.cep].filter(Boolean).join(' / ')}/></div>
   <div className="grid md:grid-cols-2 gap-2"><LabelValue label="Forma cobrança" value={order.formaCobranca||order.formaPagamento}/><LabelValue label={paymentKnown?"Cond. Pagto":"Cód. condição cadastral"} value={paymentKnown?payment:order.codigoCondicaoPagamentoCadastral}/></div>
   <LabelValue label="Local de Entrega" value={order.localEntrega||order.enderecoEntrega}/>
   <LabelValue label="Obs" value={order.observacoes||order.obs}/>
  </div>
  <div className="p-2 pt-5 sm:pt-20 min-h-[220px] sm:min-h-[360px] print:pt-4 print:min-h-0"><ItemTable items={items}/></div>
  <div className="border-t-2 border-black px-2 py-2 grid grid-cols-2 md:grid-cols-6 gap-1 text-[12px] sm:text-sm">
   <span><b>Tot. Qtde:</b> {summary.quantityGroups.length?summary.quantityGroups.map(g=>num(g.quantity,2)+' '+g.unit).join(' + '):'—'}</span>
   <span><b>Tot. Qtde KG:</b> {summary.weightKg===null?'—':num(summary.weightKg)+' KG'}</span>
   <span><b>Frete:</b> {brl(totals.frete??order.frete)}</span>
   <span><b>Itens:</b> {brl(totals.subtotal)}</span>
   <span><b>Desconto:</b> {brl(totals.desconto)}</span>
   <span><b>Total Venda:</b> {brl(totals.total)}</span>
  </div>
  <div className="border-t border-black px-2 py-2 text-sm">Não executamos serviços, apenas venda de mercadorias. De Acordo: Data____/____/______ RG____________ Ass.:_________________</div>
 </article>;
}
function Term(){
 const [expanded,setExpanded]=useState([]);
 return <section className="bg-white border rounded-lg p-4 sm:p-6 mt-5 space-y-4" aria-label="Termo jurídico revisado">
  <h3 className="text-lg font-bold">{LEGAL_TITLE}</h3>
  <p className="text-sm rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">Versão jurídica revisada: o envio ao cliente exige homologação registrada e conferência do pedido SIC.</p>
  <button type="button" className="border rounded px-3 py-2 text-sm print:hidden" onClick={()=>setExpanded(v=>v.length===LEGAL_SECTIONS.length?[]:LEGAL_SECTIONS.map((_,i)=>i))}>{expanded.length===LEGAL_SECTIONS.length?'Recolher todos':'Expandir todos'}</button>
  {LEGAL_SECTIONS.map(([title,paragraphs],i)=><div key={i} className="border rounded-lg break-inside-avoid print:break-inside-avoid">
   <button type="button" className="w-full text-left font-semibold p-3" aria-expanded={expanded.includes(i)} onClick={()=>setExpanded(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i])}>{i+1}. {title} <span className="print:hidden">{expanded.includes(i)?'−':'+'}</span></button>
   <div className={(expanded.includes(i)?'block':'hidden')+' print:block border-t p-3 space-y-2 text-sm'}>{paragraphs.map((p,j)=><p key={j}>{p}</p>)}</div>
  </div>)}
  <h4 className="font-semibold">Declaração de conferência e aceite</h4>
  {LEGAL_CONSENT.map((p,i)=><p key={i} className="text-sm">{p}</p>)}
  <div className="border-2 border-dashed rounded-lg p-5 text-center text-sm text-slate-600"><LockKeyhole className="h-6 w-6 mx-auto mb-2"/> O cliente assina exclusivamente pelo link individual após a conferência do espelho SIC.</div>
 </section>;
}
const WorkspaceContext=createContext(null);
export function AcceptanceWorkspaceProvider({children}){
 const [workspace,setWorkspace]=useState({});
 return <WorkspaceContext.Provider value={{workspace,setWorkspace}}>{children}</WorkspaceContext.Provider>;
}
function useWorkspaceState(key,initial){
 const {workspace,setWorkspace}=useContext(WorkspaceContext);
 return [Object.prototype.hasOwnProperty.call(workspace,key)?workspace[key]:initial,
  next=>setWorkspace(prev=>({...prev,[key]:typeof next==='function'?next(Object.prototype.hasOwnProperty.call(prev,key)?prev[key]:initial):next}))];
}
const whatsappNumber=value=>{
 const digits=value.replace(/\D/g,'');
 return /^[1-9][0-9][2-9][0-9]{7,8}$/.test(digits)?'55'+digits:
 /^55[1-9][0-9][2-9][0-9]{7,8}$/.test(digits)?digits:'';
};
export default function VendorWorkflow(){
 const [number,setNumber]=useWorkspaceState('number','');
 const [request,setRequest]=useWorkspaceState('request',null);
 const [order,setOrder]=useWorkspaceState('order',null);
 const [status,setStatus]=useWorkspaceState('status',null);
 const [draft,setDraft]=useState(null);
 const [review,setReview]=useState(null);
 const [customerLink,setCustomerLink]=useWorkspaceState('customerLink','');
 const [phone,setPhone]=useWorkspaceState('phone','');
 const [linkBusy,setLinkBusy]=useState(false);
 const [linkError,setLinkError]=useState('');
 const [evidence,setEvidence]=useWorkspaceState('evidence',null);
 const [signedPdf,setSignedPdf]=useState(null);
 const [handoff,setHandoff]=useState(null);
 const [legalApproval,setLegalApproval]=useState(null);
 const [deliverySelection,setDeliverySelection]=useWorkspaceState('deliverySelection',null);
 const [legalBusy,setLegalBusy]=useState(false);
 const [pdfBusy,setPdfBusy]=useState(false);
 const [pdfError,setPdfError]=useState('');
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [loadingPhase,setLoadingPhase]=useState(null);
 const [loadingError,setLoadingError]=useState('');
 const [elapsed,setElapsed]=useState(0);
 const startedAt=useRef(Date.now());
 const querySequence=useRef(0);
 const pollingBusy=useRef(false);
 useEffect(()=>{
  if(!loadingPhase||loadingPhase==='erro')return;
  const timer=window.setInterval(()=>setElapsed(Math.floor((Date.now()-startedAt.current)/1000)),1000);
  return()=>window.clearInterval(timer);
 },[loadingPhase]);
 const failLoad=(message)=>{
  setError(message);
  setLoadingError(message);
  setLoadingPhase('erro');
  setWorking(false);
 };
 const refreshStatus=async n=>{
  try{
   const data=await apiGet('/.netlify/functions/vendor-acceptance-status?number='+encodeURIComponent(n));
   setStatus(data);
   if(data.relativeUrl)setCustomerLink(new URL(data.relativeUrl,window.location.origin).toString());
   else if(data.state!=='link_ativo')setCustomerLink('');
  }catch(e){
   // The SIC order remains usable even if the acceptance history endpoint is unavailable.
   setStatus({state:'indisponivel'});
   setError('Pedido consultado; histórico de aceite temporariamente indisponível: '+e.message);
  }
 };
 const finishResult=async (result,seq)=>{
  if(seq!==querySequence.current)return;
  if(!result?.pedidoCompleto||!Array.isArray(result.itens)){
   failLoad('Pedido retornou sem os dados necessários. Consulte novamente.');
   return;
  }
  setLoadingPhase('montando');
  setOrder(result);
  setLoadingPhase('verificando');
  await refreshStatus(String(result.pedidoCompleto.numero||number));
  if(seq===querySequence.current){setLoadingPhase(null);setWorking(false);}
 };
 async function consult(e){
  e.preventDefault();
  if(linkBusy)return;
  if(loadingPhase&&loadingPhase!=='erro')return;
  const query=number.trim();
  if(!/^[1-9]\d{0,11}$/.test(query)){setError('Informe um número de pedido válido.');return;}
  const seq=++querySequence.current;
  setPhone('');setDeliverySelection(null);setOrder(null);setStatus(null);setRequest(null);setDraft(null);setReview(null);setCustomerLink('');setEvidence(null);setSignedPdf(null);setHandoff(null);setLinkError('');setPdfError('');setError('');setLoadingError('');
  setElapsed(0);startedAt.current=Date.now();
  setLoadingPhase('enviando');setWorking(true);
  try{
   const r=await apiPost('/.netlify/functions/sic-request',{orderNumber:query});
   if(seq!==querySequence.current)return;
   if(!r.requestId)throw Error('O conector não retornou identificador da consulta.');
   if(r.status==='completed'){
    const ready=await apiGet('/.netlify/functions/sic-request?id='+encodeURIComponent(r.requestId));
    if(seq!==querySequence.current)return;
    setRequest({requestId:r.requestId,status:'completed'});
    await finishResult(ready.result,seq);
   }else if(['pending','processing'].includes(r.status)){
    setRequest({requestId:r.requestId,status:r.status});
    setLoadingPhase(r.status);
   }else throw Error('O conector não iniciou a consulta. Tente novamente.');
  }catch(e){if(seq===querySequence.current)failLoad(e.message||'Falha ao iniciar consulta SIC');}
  finally{if(seq===querySequence.current)setWorking(false);}
 }
 useEffect(()=>{
  if(!request?.requestId||!['pending','processing'].includes(request.status))return;
  const seq=querySequence.current;
  let active=true;
  let failures=0;
  const poll=async()=>{
   if(!active||pollingBusy.current)return;
   pollingBusy.current=true;
   try{
    if(Date.now()-startedAt.current>180000){
     failLoad('O servidor demorou além de 3 minutos. Verifique o conector SIC e tente uma nova consulta.');
     setRequest(r=>r&&({...r,status:'timeout'}));
     return;
    }
    const r=await apiGet('/.netlify/functions/sic-request?id='+encodeURIComponent(request.requestId));
    if(!active||seq!==querySequence.current)return;
    failures=0;
    if(r.status==='completed'){
     setRequest({requestId:r.requestId,status:'completed'});
     await finishResult(r.result,seq);
    }else if(['failed','expired'].includes(r.status)){
     setRequest({requestId:r.requestId,status:r.status});
     failLoad(r.error||'O conector não concluiu a consulta. Verifique o serviço interno.');
    }else if(['pending','processing'].includes(r.status)){
     setRequest({requestId:r.requestId,status:r.status});
     setLoadingPhase(r.status);
    }else failLoad('O conector retornou um estado não reconhecido.');
   }catch(e){
    if(!active||seq!==querySequence.current)return;
    failures++;
    if(failures>=3){
     setRequest(r=>r&&({...r,status:'failed'}));
     failLoad('A conexão com o SIC falhou após três tentativas. '+(e.message||''));
    }
   }finally{pollingBusy.current=false;}
  };
  void poll();
  const timer=window.setInterval(()=>void poll(),3000);
  return()=>{active=false;window.clearInterval(timer);};
 },[request?.requestId,request?.status]);
 const closeError=()=>{setLoadingPhase(null);setLoadingError('');setRequest(null);querySequence.current++;};
 const createAcceptance=async()=>{
  if(linkBusy||!deliverySelection||!request?.requestId||status?.state==='assinado'||status?.state==='indisponivel')return;
  setLinkBusy(true);setLinkError('');
  try{
   const prepared=await apiPost('/.netlify/functions/acceptance-draft',{requestId:request.requestId});
   const id=prepared.draftId;
   if(!id)throw Error('Pedido não registrado.');
   if(prepared.status==='rascunho'){
    const delivery=await apiPost('/.netlify/functions/confirm-delivery-address',{orderId:id,confirmed:true,selection:deliverySelection});
    if(!delivery.recorded)throw Error('Endereço não confirmado.');
    await apiPost('/.netlify/functions/activate-acceptance',{orderId:id,confirmed:true});
   }else throw Error('Pedido já registrado. Verifique a assinatura antes de emitir outro link.');
   const result=await apiPost('/.netlify/functions/issue-acceptance-link',{orderId:id});
   if(!result.relativeUrl)throw Error('Link não retornado.');
   setCustomerLink(new URL(result.relativeUrl,window.location.origin).toString());
  }catch(e){setLinkError(e.message);}
  finally{await refreshStatus(String(order.pedidoCompleto.numero));setLinkBusy(false);}
 };
 const resumeLink=async()=>{
  if(linkBusy||status?.state!=='pendente'||status?.orderStatus!=='aguardando_aceite_pedido'||!status?.orderId)return;
  setLinkBusy(true);setLinkError('');
  try{
   const result=await apiPost('/.netlify/functions/issue-acceptance-link',{orderId:status.orderId});
   if(!result.relativeUrl)throw Error('Link não retornado.');
   setCustomerLink(new URL(result.relativeUrl,window.location.origin).toString());
  }catch(e){setLinkError(e.message);}
  finally{await refreshStatus(String(order.pedidoCompleto.numero));setLinkBusy(false);}
 };
 const verifyEvidence=async()=>{
  setLinkBusy(true);setLinkError('');setEvidence(null);
  try{
   const n=String(order.pedidoCompleto.numero);
   const current=await apiGet('/.netlify/functions/vendor-acceptance-status?number='+encodeURIComponent(n));
   setStatus(current);
   if(current.relativeUrl)setCustomerLink(new URL(current.relativeUrl,window.location.origin).toString());
   if(current.state!=='link_ativo')setCustomerLink('');
   if(current.orderId)setEvidence(await apiGet('/.netlify/functions/seller-acceptance-evidence?orderId='+encodeURIComponent(current.orderId)));
  }catch(e){setLinkError(e.message);}
  finally{setLinkBusy(false);}
 };
 const printSigned=async()=>{
  if(!status?.orderId||!evidence?.signed||!evidence.signatureIntegrity)return;
  setLinkBusy(true);setLinkError('');
  try{
   await apiPost('/.netlify/functions/signed-acceptance-document',{orderId:status.orderId});
   await apiDownloadPdf('/.netlify/functions/signed-acceptance-document?orderId='+encodeURIComponent(status.orderId),'DRAFER-aceite-assinado-'+order.pedidoCompleto.numero+'.pdf');
  }catch(e){setLinkError(e.message);}
  finally{setLinkBusy(false);}
 };
 const items=order?.itens||[];
 const missingPrintCode=items.some(i=>printCode(i)==null);
 return <section className="space-y-5">
  <style>{`@media print {
    @page { size: A4; margin: 12mm; }
    #drafer-print-document { display: block !important; width: 100% !important; }\n    #drafer-print-document > article { break-after: page; }
    #drafer-print-document section { margin-top: 0 !important; }
    #drafer-print-document table { width: 100% !important; min-width: 0 !important; }
    #drafer-print-document tr { break-inside: avoid; }
    #drafer-print-document button { color: #111 !important; }

  }`}</style>
  <OrderLoadingModal open={Boolean(loadingPhase)} phase={loadingPhase} orderNumber={number}
   elapsed={elapsed} error={loadingError} onClose={closeError}/>
  <div className="bg-white p-5 border rounded-lg space-y-3 print:hidden">
   <h2 className="font-bold text-xl">Consultar pedido e gerar aceite</h2>
   <form onSubmit={consult} className="flex flex-wrap gap-2">
    <input className="border rounded px-3 py-2 flex-1 min-w-[170px]" inputMode="numeric" placeholder="Número do pedido SIC" value={number} onChange={e=>setNumber(e.target.value)} aria-label="Número do pedido"/>
    <button disabled={linkBusy||working||Boolean(loadingPhase&&loadingPhase!=='erro')} type="submit" className="flex gap-2 items-center bg-slate-900 text-white px-5 py-2 rounded disabled:opacity-50">
     {working?<Loader2 className="w-4 h-4 animate-spin"/>:<Search className="w-4 h-4"/>}Consultar
    </button>
   </form>
   
   {error&&<p role="alert" className="bg-red-50 border border-red-200 text-red-900 p-3 rounded">{error}</p>}
  </div>
  {order&&<div className="space-y-4">
   <details className="border rounded-lg bg-white p-4">
    <summary className="font-semibold cursor-pointer">Pedido {order.pedidoCompleto.numero} — R$ {brl(order.pedidoCompleto.valores?.total)}</summary>
    <div className="mt-3"><PrintedOrder order={order.pedidoCompleto} items={items}/></div>
   </details>
   <div className="bg-white border rounded-lg p-4 space-y-3">
    {(!status?.found||status?.state==='rascunho')&&status?.state!=='indisponivel'&&<>
     <SeletorEnderecoEntrega pedidoNumero={request?.requestId}
       opcoes={order.enderecosEntrega||order.pedidoCompleto.enderecosEntrega||[]}
       cadastral={order.enderecoCadastralEntrega||order.pedidoCompleto.enderecoCadastralEntrega||null}
       initialSelection={deliverySelection} disabled={linkBusy} onSelectionChange={setDeliverySelection}/>
     <button disabled={linkBusy||!deliverySelection||!status} onClick={createAcceptance} className="bg-slate-900 text-white rounded px-4 py-3 disabled:opacity-50">{linkBusy?'Processando...':'Gerar link do cliente'}</button>
    </>}
    {status?.state==='pendente'&&status?.orderStatus==='aguardando_aceite_pedido'&&<button disabled={linkBusy} onClick={resumeLink} className="bg-slate-900 text-white rounded px-4 py-3 disabled:opacity-50">Gerar novo link do cliente</button>}
    {status?.state==='link_ativo'&&!customerLink&&<p className="text-sm">Já existe um link ativo. Utilize o link enviado anteriormente. Um novo link poderá ser emitido após o vencimento.</p>}
    <p><strong>Status:</strong> {simpleStatus[status?.state]||status?.state||'Consultando...'}</p>
    {customerLink&&status?.state==='link_ativo'&&Date.parse(status.latestLink?.expiresAt)>Date.now()&&<div className="flex flex-wrap gap-2">
     <label className="w-full flex flex-col gap-1 text-sm font-medium">Link do cliente<input className="w-full border rounded px-3 py-2 font-mono text-xs" readOnly value={customerLink} onFocus={e=>e.target.select()}/></label>
     <p className="w-full text-sm text-slate-600">Válido até {new Date(status.latestLink.expiresAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</p>
     <button className="border rounded px-3 py-2" onClick={()=>navigator.clipboard.writeText(customerLink).catch(()=>setLinkError('Não foi possível copiar o link.'))}>Copiar link</button>
     <label className="flex flex-col text-sm gap-1">WhatsApp do cliente (DDD + número)<input type="tel" autoComplete="off" className="border rounded px-3 py-2" placeholder="(18) 99999-9999" value={phone} maxLength={24} onChange={e=>setPhone(e.target.value)}/></label>
     <button disabled={!whatsappNumber(phone)} className="border rounded px-3 py-2 disabled:opacity-50 self-end" onClick={()=>window.open('https://wa.me/'+whatsappNumber(phone)+'?text='+encodeURIComponent('Confira e assine seu pedido DRAFER: '+customerLink),'_blank','noopener,noreferrer')}>WhatsApp</button>
    </div>}
    <button disabled={linkBusy||!status?.orderId} onClick={verifyEvidence} className="border rounded px-4 py-2 disabled:opacity-50">Verificar assinatura</button>
    {evidence&&<p>{evidence.signed?(evidence.signatureIntegrity?'Assinatura verificada: '+field(evidence.signerName):'Integridade não confirmada'):'Aguardando assinatura'}</p>}
    <button disabled={linkBusy||!evidence?.signed||!evidence?.signatureIntegrity} onClick={printSigned} className="border rounded px-4 py-2 disabled:opacity-50">Imprimir aceite assinado (PDF)</button>
    {linkError&&<p role="alert" className="text-red-700">{linkError}</p>}
   </div>
  </div>}
 </section>;
}
