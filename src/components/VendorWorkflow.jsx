import React,{useEffect,useState} from 'react';
import printCalc from '@/lib/sicPrintTotals.cjs';
const {totalsForPrint,itemWeight}=printCalc;
import {apiGet,apiPost} from '@/lib/apiClient';
import {Search,Loader2,Printer,RefreshCw,FileText,LockKeyhole,Copy,MessageCircle,ShieldCheck} from 'lucide-react';

const brl=v=>v===null||v===undefined||v===''?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=(v,precision=3)=>v===null||v===undefined||v===''?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:precision});
const field=x=>x===null||x===undefined||String(x).trim()===''?'—':String(x);
const date=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(d)};
const simpleStatus={nao_registrado:'Aceite ainda não gerado',rascunho:'Pedido em rascunho',link_ativo:'Aguardando assinatura',assinado:'Aceite assinado',pendente:'Pendente'};
function ItemTable({items}){
 return <div className="overflow-x-auto"><table className="w-full min-w-[810px] text-[13px] border-collapse">
  <thead><tr className="border-b border-black">{['Código','Descrição','Unid.','Qtde. KG','Qtde. PC','Vr. Unit.','Valor Total'].map(h=><th key={h} className="py-2 px-1 font-normal text-left">{h}</th>)}</tr></thead>
  <tbody>{items.map((item,i)=><tr key={i} className="align-top">
    <td className="p-1">{field(item.codigoProdutoImpressao??item.codigoImpressao)}</td>
    <td className="p-1">{field(item.descricao)}</td>
    <td className="p-1">{field(item.unidade)}</td>
    <td className="p-1 text-right">{num(itemWeight(item))}</td>
    <td className="p-1 text-right">{num(item.quantidadePecas)}</td>
    <td className="p-1 text-right">{num(item.valorUnitarioPeca??item.valorUnitario)}</td>
    <td className="p-1 text-right">{brl(item.valorTotal)}</td>
  </tr>)}</tbody>
 </table></div>;
}
function LabelValue({label,value}){return <div className="min-w-0"><strong>{label}:</strong> {field(value)}</div>}
function PrintedOrder({order,items}){
 const c=order.cliente||{}, totals=order.valores||{},summary=totalsForPrint(items);
 const seller=order.vendedor||order.codigoVendedor;
 const payment=order.condicaoPagamento||order.condicoesPagamento;
 return <article className="bg-white border-2 border-slate-700 text-slate-950 font-[Arial] print:shadow-none print:border-black" aria-label="Espelho de impressão do pedido SIC">
  <header className="border-b-2 border-black p-2">
   <div className="grid md:grid-cols-3 gap-2 items-start">
    <div><h2 className="font-bold text-lg sm:text-2xl leading-none">{field(order.nomeEmpresa||order.razaoSocialEmpresa||null)}</h2>
     <p className="text-sm sm:text-lg mt-2">FONE: {field(order.telefoneEmpresa)}</p></div>
    <div className="text-center">
     <p className="text-sm sm:text-lg">{field(order.tipoVenda)}</p>
     <h3 className="font-bold text-2xl sm:text-4xl mt-2">PEDIDO Nº {field(order.numero)}</h3>
    </div>
    <div className="md:text-right"><p>Pág: 1</p><p className="mt-4">Tabela: {field(order.tabelaPreco)}</p></div>
   </div>
  </header>
  <div className="px-2 pt-2 space-y-2 text-[13px] sm:text-[16px]">
   <div className="grid md:grid-cols-3 gap-2"><LabelValue label="Emissão" value={date(order.dataPedido)}/><LabelValue label="Data entrega" value={date(order.dataEntrega)}/><LabelValue label="Vendedor" value={seller}/></div>
   <div className="grid md:grid-cols-2 gap-2"><LabelValue label="Cliente" value={[c.codigo,c.nome].filter(Boolean).join(' — ')}/><LabelValue label="Fone" value={c.telefone||order.telefoneCliente}/></div>
   <div className="grid md:grid-cols-3 gap-2"><LabelValue label="CNPJ" value={c.cnpj||c.cpf||order.cnpjCpf}/><LabelValue label="Comprador" value={c.comprador||order.comprador}/><LabelValue label="Email" value={c.email||order.emailCliente}/></div>
   <div className="grid md:grid-cols-4 gap-2"><LabelValue label="Endereço" value={c.endereco||order.endereco}/><LabelValue label="Cidade" value={c.cidade||order.cidade}/><LabelValue label="Estado" value={c.estado||order.estado}/><LabelValue label="Bairro / CEP" value={[c.bairro||order.bairro,c.cep||order.cep].filter(Boolean).join(' / ')}/></div>
   <div className="grid md:grid-cols-2 gap-2"><LabelValue label="Forma cobrança" value={order.formaCobranca||order.formaPagamento}/><LabelValue label="Cond. Pagto" value={payment}/></div>
   <LabelValue label="Local de Entrega" value={order.localEntrega||order.enderecoEntrega}/>
   <LabelValue label="Obs" value={order.observacoes||order.obs}/>
  </div>
  <div className="p-2 pt-12 sm:pt-20 min-h-[260px] sm:min-h-[360px]"><ItemTable items={items}/></div>
  <div className="border-t-2 border-black px-2 py-2 grid grid-cols-2 md:grid-cols-6 gap-1 text-[12px] sm:text-sm">
   <span><b>Tot. Qtde:</b> {summary.quantityGroups.length?summary.quantityGroups.map(g=>num(g.quantity,2)+' '+g.unit).join(' + '):'—'}</span>
   <span><b>Tot. Qtde KG:</b> {summary.weightKg===null?'—':num(summary.weightKg)+' KG'}</span>
   <span><b>Frete:</b> {brl(totals.frete)}</span>
   <span><b>Itens:</b> {brl(totals.subtotal)}</span>
   <span><b>Desconto:</b> {brl(totals.desconto)}</span>
   <span><b>Total Venda:</b> {brl(totals.total)}</span>
  </div>
  <div className="border-t border-black px-2 py-2 text-sm">Não executamos serviços, apenas venda de mercadorias. De Acordo: Data____/____/______ RG____________ Ass.:_________________</div>
 </article>;
}
function Term({term}){
 return <section className="bg-white border rounded-lg p-4 sm:p-6 mt-5 space-y-4" aria-label="Termo de aceite integral">
  <h3 className="text-lg font-bold">{term.heading}</h3>
  <p className="text-sm rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">Texto original em revisão. Esta prévia não pode ser assinada nem enviada ao cliente como documento definitivo.</p>
  {(term.sections||[]).map((s,i)=><section key={i} className="space-y-2 text-sm">
   <h4 className="font-bold">{s.heading}</h4>
   {(s.paragraphs||[]).map((p,j)=><p key={j}>{p}</p>)}
   {(s.lists||[]).map((l,j)=><div key={j}>{l.intro&&<p className="font-semibold">{l.intro}</p>}<ul className="list-disc pl-5">{(l.items||[]).map((v,k)=><li key={k}>{v}</li>)}</ul></div>)}
   {(s.after||[]).map((a,j)=><p key={j} className="font-semibold">{a}</p>)}
   {(s.subsections||[]).map((sub,j)=><div key={j}><p className="font-semibold">{sub.title}</p><p>{sub.text}</p><ul className="list-disc pl-5">{(sub.bullets||[]).map((v,k)=><li key={k}>{v}</li>)}</ul></div>)}
  </section>)}
  {(term.diagrams||[]).map((d,i)=><section key={i}><h4 className="font-bold text-sm">{d.title}</h4><pre className="overflow-x-auto whitespace-pre text-xs border p-2">{(d.lines||[]).join('\n')}</pre></section>)}
  <h4 className="font-bold">Avisos legais</h4><ul className="text-sm list-disc pl-5">{(term.legalWarnings||[]).map((p,i)=><li key={i}>{p}</li>)}</ul>
  <p className="font-semibold text-sm">Declaração original — somente revisão</p><p className="text-sm">{term.consent}</p>
  <div className="border-2 border-dashed rounded-lg p-5 text-center text-sm text-slate-600">
   <LockKeyhole className="h-6 w-6 mx-auto mb-2"/> Área de assinatura do cliente (habilitar somente após homologação do termo definitivo)
  </div>
 </section>;
}
export default function VendorWorkflow(){
 const [number,setNumber]=useState('');
 const [request,setRequest]=useState(null);
 const [order,setOrder]=useState(null);
 const [term,setTerm]=useState(null);
 const [status,setStatus]=useState(null);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{apiGet('/.netlify/functions/vendor-legal-preview').then(setTerm).catch(()=>setTerm(null));},[]);
 const refreshStatus=async n=>{
  try{setStatus(await apiGet('/.netlify/functions/vendor-acceptance-status?number='+encodeURIComponent(n)))}catch(e){setError(e.message)}
 };
 async function consult(e){
  e.preventDefault();setOrder(null);setStatus(null);setRequest(null);setError('');
  if(!/^[1-9]\d{0,11}$/.test(number)){setError('Informe um número válido.');return}
  setWorking(true);
  try{
   const r=await apiPost('/.netlify/functions/sic-request',{orderNumber:number});
   setRequest({requestId:r.requestId,status:r.status});
   await refreshStatus(number);
  }catch(e){setError(e.message)}finally{setWorking(false)}
 }
 useEffect(()=>{
  if(!request?.requestId||!['pending','processing'].includes(request.status))return;
  let active=true;
  const timer=window.setInterval(async()=>{
   try{
    const r=await apiGet('/.netlify/functions/sic-request?id='+encodeURIComponent(request.requestId));
    if(!active)return;
    setRequest({requestId:r.requestId,status:r.status});
    if(r.status==='completed'){
     if(!r.result?.pedidoCompleto||!Array.isArray(r.result?.itens))setError('Pedido sem detalhes disponíveis no SIC.');
     else setOrder(r.result);
    }
    if(r.status==='failed'||r.status==='expired')setError(r.error||'Consulta SIC não concluída.');
   }catch(e){if(active)setError(e.message)}
  },3000);
  return()=>{active=false;window.clearInterval(timer)};
 },[request?.requestId,request?.status]);
 const items=order?.itens||[];
 const different=items.some(i=>i.codigoProdutoImpressao==null&&i.codigoImpressao==null);
 return <section className="space-y-5">
  <div className="bg-white p-5 border rounded-lg space-y-3 print:hidden">
   <h2 className="font-bold text-xl">Consultar pedido e gerar aceite</h2>
   <form onSubmit={consult} className="flex flex-wrap gap-2">
    <input className="border rounded px-3 py-2 flex-1 min-w-[170px]" inputMode="numeric" placeholder="Número do pedido SIC" value={number} onChange={e=>setNumber(e.target.value)} aria-label="Número do pedido"/>
    <button disabled={working} type="submit" className="flex gap-2 items-center bg-slate-900 text-white px-5 py-2 rounded disabled:opacity-50">
     {working?<Loader2 className="w-4 h-4 animate-spin"/>:<Search className="w-4 h-4"/>}Consultar
    </button>
   </form>
   {request&&<p className="text-sm text-slate-600">Consulta SIC: {request.status}</p>}
   {error&&<p role="alert" className="bg-red-50 border border-red-200 text-red-900 p-3 rounded">{error}</p>}
  </div>
  {order&&<>
   <PrintedOrder order={order.pedidoCompleto} items={items}/>
   {!totalsForPrint(items).weightComplete&&<p role="status" className="print:hidden bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">Há itens sem unidade de peso homologada. O total em KG não inclui produtos contabilizados apenas em unidades; confira o relatório SIC antes da emissão.</p>}
   <div className="print:hidden bg-white border rounded p-4 space-y-3">
    <h3 className="font-bold">Conferência antes de gerar aceite</h3>
    {different&&<p className="text-sm bg-amber-50 border border-amber-200 rounded p-3 text-amber-900">
     A integração ainda não informa o código usado na impressão do SIC para este pedido. Não substituímos pelo código interno ou comercial, pois podem ser diferentes. A emissão definitiva continua bloqueada até homologar esse mapeamento.
    </p>}
    <div className="flex flex-wrap gap-2">
     <button type="button" onClick={()=>window.print()} className="border rounded px-3 py-2 inline-flex gap-2 items-center"><Printer className="w-4 h-4"/>Imprimir prévia</button>
     <button type="button" onClick={()=>void refreshStatus(number)} className="border rounded px-3 py-2 inline-flex gap-2 items-center"><RefreshCw className="w-4 h-4"/>Verificar aceite</button>
    </div>
    <div className="text-sm"><p><strong>Status:</strong> {simpleStatus[status?.state]||status?.state||'Consultando...'}</p>
     {status?.acceptances?.map(a=><p key={a.id} className="mt-2">Assinado: {field(a.signerName)} — {date(a.acceptedAt)} — SHA-256: <code className="break-all">{a.signatureSha256}</code></p>)}
    </div>
    <div className="border-t pt-3 space-y-2">
     <h4 className="font-semibold">Gerar e compartilhar aceite</h4>
     <p className="text-sm text-amber-900">Emissão e link público ainda bloqueados: texto final e código de impressão precisam ser homologados. O fluxo novo não exige aprovação jurídica e comercial individual por pedido.</p>
     <div className="flex flex-wrap gap-2">
      <button type="button" disabled className="bg-slate-300 text-slate-700 rounded px-4 py-2 inline-flex gap-2 items-center"><FileText className="w-4 h-4"/>Gerar aceite</button>
      <button type="button" disabled className="border rounded px-4 py-2 inline-flex gap-2 items-center"><Copy className="w-4 h-4"/>Copiar link</button>
      <button type="button" disabled className="border rounded px-4 py-2 inline-flex gap-2 items-center"><MessageCircle className="w-4 h-4"/>WhatsApp</button>
     </div>
    </div>
   </div>
   {term&&<Term term={term}/>}
  </>}
 </section>;
}
