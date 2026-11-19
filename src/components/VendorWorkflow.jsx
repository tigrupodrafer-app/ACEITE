import React,{useEffect,useState,useRef} from 'react';
import OrderLoadingModal from '@/components/OrderLoadingModal';
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
  <p className="text-sm rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">Minuta v1.0 em homologação única. A assinatura e o envio definitivo permanecem bloqueados.</p>
  <button type="button" className="border rounded px-3 py-2 text-sm print:hidden" onClick={()=>setExpanded(v=>v.length===LEGAL_SECTIONS.length?[]:LEGAL_SECTIONS.map((_,i)=>i))}>{expanded.length===LEGAL_SECTIONS.length?'Recolher todos':'Expandir todos'}</button>
  {LEGAL_SECTIONS.map(([title,paragraphs],i)=><div key={i} className="border rounded-lg break-inside-avoid print:break-inside-avoid">
   <button type="button" className="w-full text-left font-semibold p-3" aria-expanded={expanded.includes(i)} onClick={()=>setExpanded(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i])}>{i+1}. {title} <span className="print:hidden">{expanded.includes(i)?'−':'+'}</span></button>
   <div className={(expanded.includes(i)?'block':'hidden')+' print:block border-t p-3 space-y-2 text-sm'}>{paragraphs.map((p,j)=><p key={j}>{p}</p>)}</div>
  </div>)}
  <h4 className="font-semibold">Declaração de conferência e aceite</h4>
  {LEGAL_CONSENT.map((p,i)=><p key={i} className="text-sm">{p}</p>)}
  <div className="border-2 border-dashed rounded-lg p-5 text-center text-sm text-slate-600"><LockKeyhole className="h-6 w-6 mx-auto mb-2"/> Assinatura indisponível até a homologação e integração do espelho completo.</div>
 </section>;
}
export default function VendorWorkflow(){
 const [number,setNumber]=useState('');
 const [request,setRequest]=useState(null);
 const [order,setOrder]=useState(null);
 const [status,setStatus]=useState(null);
 const [draft,setDraft]=useState(null);
 const [review,setReview]=useState(null);
 const [customerLink,setCustomerLink]=useState('');
 const [linkBusy,setLinkBusy]=useState(false);
 const [linkError,setLinkError]=useState('');
 const [evidence,setEvidence]=useState(null);
 const [signedPdf,setSignedPdf]=useState(null);
 const [handoff,setHandoff]=useState(null);
 const [legalApproval,setLegalApproval]=useState(null);
 const [legalBusy,setLegalBusy]=useState(false);
 const [pdfBusy,setPdfBusy]=useState(false);
 const [pdfError,setPdfError]=useState('');
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [loadingPhase,setLoadingPhase]=useState(null);
 const [loadingError,setLoadingError]=useState('');
 const [elapsed,setElapsed]=useState(0);
 const startedAt=useRef(0);
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
  if(loadingPhase&&loadingPhase!=='erro')return;
  const query=number.trim();
  if(!/^[1-9]\d{0,11}$/.test(query)){setError('Informe um número de pedido válido.');return;}
  const seq=++querySequence.current;
  setOrder(null);setStatus(null);setRequest(null);setDraft(null);setReview(null);setCustomerLink('');setEvidence(null);setSignedPdf(null);setHandoff(null);setLinkError('');setPdfError('');setError('');setLoadingError('');
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
 const preparePdf=async()=>{
  if(!request?.requestId||request.status!=='completed') {setPdfError('Consulte novamente o pedido SIC para gerar a minuta.');return;}
  setPdfBusy(true);setPdfError('');
  try{
   const prepared=await apiPost('/.netlify/functions/acceptance-draft',{requestId:request.requestId});
   if(!prepared.draftId)throw Error('Rascunho sem identificador.');
   setDraft(prepared);
   const document=await apiPost('/.netlify/functions/review-document',{draftId:prepared.draftId});
   if(!document.documentId||!document.sha256)throw Error('Documento não registrado corretamente.');
   setReview(document);
  }catch(e){setPdfError(e.message||'Falha ao gerar minuta.');}
  finally{setPdfBusy(false);}
 };
 const downloadPdf=async()=>{
  if(!draft?.draftId||!review?.documentId)return;
  setPdfBusy(true);setPdfError('');
  try{await apiDownloadPdf('/.netlify/functions/review-document?draftId='+draft.draftId+'&download=1','DRAFER-minuta-'+number+'-v'+review.version+'.pdf');}
  catch(e){setPdfError(e.message||'Falha no download.');}
  finally{setPdfBusy(false);}
 };
 const issueLink=async()=>{
  if(!status?.orderId){setLinkError('Registre primeiro o pedido e confirme a elegibilidade.');return;}
  setLinkBusy(true);setLinkError('');
  try{
   const result=await apiPost('/.netlify/functions/issue-acceptance-link',{orderId:status.orderId});
   if(!result.relativeUrl)throw Error('O servidor não retornou o endereço do cliente.');
   setCustomerLink(new URL(result.relativeUrl,window.location.origin).toString());
   await refreshStatus(number);
  }catch(e){setLinkError(e.message||'Não foi possível gerar o link.');}
  finally{setLinkBusy(false);}
 };
 const verifyEvidence=async()=>{
  if(!status?.orderId)return;
  setLinkBusy(true);setLinkError('');
  try{setEvidence(await apiGet('/.netlify/functions/seller-acceptance-evidence?orderId='+encodeURIComponent(status.orderId)));}
  catch(e){setLinkError(e.message||'Não foi possível conferir as evidências.');}
  finally{setLinkBusy(false);}
 };
 const generateSignedPdf=async()=>{
  if(!status?.orderId)return;
  setLinkBusy(true);setLinkError('');
  try{setSignedPdf(await apiPost('/.netlify/functions/signed-acceptance-document',{orderId:status.orderId}));}
  catch(e){setLinkError(e.message||'Não foi possível gerar o documento assinado.');}
  finally{setLinkBusy(false);}
 };
 const downloadSignedPdf=async()=>{
  if(!status?.orderId||!signedPdf)return;
  setLinkBusy(true);setLinkError('');
  try{await apiDownloadPdf('/.netlify/functions/signed-acceptance-document?orderId='+encodeURIComponent(status.orderId),'DRAFER-aceite-assinado-'+number+'.pdf');}
  catch(e){setLinkError(e.message||'Não foi possível baixar o documento assinado.');}
  finally{setLinkBusy(false);}
 };
 const handoffToProduction=async()=>{
  if(!status?.orderId||!signedPdf||!evidence?.signatureIntegrity)return;
  if(!window.confirm('Confirma que conferiu o pedido, a assinatura e o PDF e deseja registrar o encaminhamento para a produção? Esta ação não altera o SIC.'))return;
  setLinkBusy(true);setLinkError('');
  try{setHandoff(await apiPost('/.netlify/functions/production-handoff',{orderId:status.orderId,confirmed:true}));}
  catch(e){setLinkError(e.message||'Não foi possível registrar o encaminhamento.');}
  finally{setLinkBusy(false);}
 };
 const homologateLegal=async()=>{
  if(!window.confirm('Confirma a homologação jurídica da versão 1.0-minuta das 13 cláusulas revisadas? Esta aprovação será vinculada à sua conta autenticada.'))return;
  setLegalBusy(true);setLinkError('');
  try{setLegalApproval(await apiPost('/.netlify/functions/approve-legal-version',{
    confirmed:true,version:'1.0-minuta',
    justification:'Homologação expressamente autorizada da versão jurídica revisada das treze cláusulas para o sistema DRAFER ACEITE.'
  }));}
  catch(e){setLinkError(e.message||'Não foi possível registrar a homologação.');}
  finally{setLegalBusy(false);}
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
    <button disabled={working||Boolean(loadingPhase&&loadingPhase!=='erro')} type="submit" className="flex gap-2 items-center bg-slate-900 text-white px-5 py-2 rounded disabled:opacity-50">
     {working?<Loader2 className="w-4 h-4 animate-spin"/>:<Search className="w-4 h-4"/>}Consultar
    </button>
   </form>
   {request&&<p className="text-sm text-slate-600">Consulta SIC: {request.status}</p>}
   {error&&<p role="alert" className="bg-red-50 border border-red-200 text-red-900 p-3 rounded">{error}</p>}
  </div>
  {order&&<>
   <div id="drafer-print-document" className="print:block">
   <PrintedOrder order={order.pedidoCompleto} items={items}/>
   {!totalsForPrint(items).weightComplete&&<p role="status" className="print:hidden bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">Há itens sem unidade de peso homologada. O total em KG não inclui produtos contabilizados apenas em unidades; confira o relatório SIC antes da emissão.</p>}
   <div className="print:hidden bg-white border rounded p-4 space-y-3">
    <h3 className="font-bold">Conferência antes de gerar aceite</h3>
    {missingPrintCode&&<p className="text-sm bg-slate-50 border border-slate-200 rounded p-3 text-slate-700">
     O código de impressão não foi retornado pelo SIC para um ou mais itens. O código interno é exibido apenas como referência técnica, sem substituir o código impresso. A divergência do ERP foi registrada e sua investigação foi encerrada por decisão de escopo.
    </p>}
    <div className="flex flex-wrap gap-2">
     <button type="button" onClick={()=>window.print()} className="border rounded px-3 py-2 inline-flex gap-2 items-center"><Printer className="w-4 h-4"/>Imprimir prévia</button>
     <button type="button" onClick={()=>void refreshStatus(number)} className="border rounded px-3 py-2 inline-flex gap-2 items-center"><RefreshCw className="w-4 h-4"/>Verificar aceite</button>
    </div>
    <div className="text-sm"><p><strong>Status:</strong> {simpleStatus[status?.state]||status?.state||'Consultando...'}</p>
     {status?.acceptances?.map(a=><p key={a.id} className="mt-2">Assinado: {field(a.signerName)} — {date(a.acceptedAt)} — SHA-256: <code className="break-all">{a.signatureSha256}</code></p>)}
    </div>
    <div className="border-t pt-3 space-y-2">
     <h4 className="font-semibold">PDF preliminar — revisão interna</h4>
     <p className="text-sm text-slate-600">Geração privada e versionada, com SHA-256. Não é documento assinado e não pode ser enviado ao cliente.</p>
     <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pdfBusy||request?.status!=='completed'} onClick={preparePdf} className="border rounded px-4 py-2 disabled:opacity-50">{pdfBusy?'Processando...':'Gerar PDF preliminar'}</button>
      {review&&<button type="button" disabled={pdfBusy} onClick={downloadPdf} className="border rounded px-4 py-2 disabled:opacity-50">Baixar PDF preliminar</button>}
     </div>
     {review&&<div className="text-xs text-slate-700 break-all" role="status">Minuta v{review.version} · SHA-256: {review.sha256} · Uso interno, sem assinatura.</div>}
     {pdfError&&<p role="alert" className="text-sm text-red-700">{pdfError}</p>}
    </div>
    <div className="border-t pt-3 space-y-2">
     <h4 className="font-semibold">Gerar e compartilhar aceite</h4>
     <div className="border rounded p-3 space-y-2 text-sm">
      <p className="font-semibold">Homologação jurídica da versão revisada</p>
      <p>A autorização da redação já foi concedida. Um administrador ou aprovador deve registrar a homologação usando sua sessão autenticada.</p>
      <button type="button" disabled={legalBusy||Boolean(legalApproval?.approved)} onClick={homologateLegal} className="border rounded px-3 py-2 disabled:opacity-50">{legalBusy?'Registrando...':'Registrar homologação da versão revisada'}</button>
      {legalApproval?.approved&&<p role="status" className="text-green-800 break-all">Homologada: {legalApproval.version} — SHA-256: {legalApproval.sha256}</p>}
     </div>
     <p className="text-sm text-amber-900">O servidor só emitirá o link após validar o espelho integral, a elegibilidade e a versão jurídica homologada. Nenhuma aprovação individual por pedido é exigida.</p>
     <div className="flex flex-wrap gap-2">
      <button type="button" disabled={linkBusy||!status?.orderId||status?.state==='assinado'} onClick={issueLink} className="bg-slate-900 text-white disabled:bg-slate-300 disabled:text-slate-600 rounded px-4 py-2 inline-flex gap-2 items-center"><FileText className="w-4 h-4"/>Gerar link do cliente</button>
      <button type="button" disabled={!customerLink} onClick={()=>navigator.clipboard.writeText(customerLink).catch(()=>setLinkError('Não foi possível copiar o link.'))} className="border rounded px-4 py-2 inline-flex gap-2 items-center disabled:opacity-50"><Copy className="w-4 h-4"/>Copiar link</button>
      <button type="button" disabled={!customerLink} onClick={()=>window.open('https://wa.me/?text='+encodeURIComponent('Confira e assine seu pedido DRAFER: '+customerLink),'_blank','noopener,noreferrer')} className="border rounded px-4 py-2 inline-flex gap-2 items-center disabled:opacity-50"><MessageCircle className="w-4 h-4"/>WhatsApp</button>
      <button type="button" disabled={linkBusy||!status?.orderId} onClick={verifyEvidence} className="border rounded px-4 py-2 inline-flex gap-2 items-center disabled:opacity-50"><ShieldCheck className="w-4 h-4"/>Conferir assinatura</button>
     </div>
     {customerLink&&<p className="text-xs break-all border rounded p-2" role="status">Link individual (compartilhe somente com o cliente): {customerLink}</p>}
     {linkError&&<p role="alert" className="text-red-700 text-sm">{linkError}</p>}
     {evidence&&<div className="border rounded p-3 text-sm space-y-1" role="status">
       <p><strong>Assinado:</strong> {evidence.signed?'Sim':'Ainda não'}</p>
       {evidence.signed&&<><p><strong>Assinante:</strong> {field(evidence.signerName)}</p><p><strong>Data:</strong> {date(evidence.acceptedAt)}</p>
       <p><strong>Integridade da assinatura:</strong> {evidence.signatureIntegrity?'Verificada':'Não verificada — bloqueado'}</p>
       <p className="break-all"><strong>SHA-256:</strong> {field(evidence.signatureSha256)}</p></>}
       {evidence.signed&&evidence.signatureIntegrity&&<div className="flex flex-wrap gap-2 pt-2">
        <button type="button" disabled={linkBusy} onClick={generateSignedPdf} className="border rounded px-3 py-2 disabled:opacity-50">Gerar PDF assinado</button>
        {signedPdf&&<button type="button" disabled={linkBusy} onClick={downloadSignedPdf} className="border rounded px-3 py-2 disabled:opacity-50">Baixar PDF assinado</button>}
       </div>}
       {signedPdf&&<p className="text-xs break-all">SHA-256 do PDF: {signedPdf.sha256}</p>}
       {signedPdf&&evidence.signatureIntegrity&&!handoff&&<button type="button" disabled={linkBusy} onClick={handoffToProduction} className="bg-slate-900 text-white rounded px-4 py-2 disabled:opacity-50">Conferi o aceite — registrar encaminhamento à produção</button>}
       {handoff&&<p role="status" className="text-green-800">Encaminhamento registrado em {new Date(handoff.registeredAt).toLocaleString('pt-BR')}. Entregue à fila de conferência da produção; nenhuma alteração no SIC.</p>}
       <p className="text-amber-900">A produção não é iniciada automaticamente e o SIC permanece inalterado.</p>
     </div>}
    </div>
   </div>
   <Term/>
   </div>
  </>}
 </section>;
}
