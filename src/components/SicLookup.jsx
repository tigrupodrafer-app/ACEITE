import React, { useEffect, useState } from 'react';
import {
  Loader2, Search, AlertTriangle, CheckCircle2, FileText,
  ShieldCheck, LockKeyhole, Download, Package, UserRound, ClipboardList,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const labels = {
  pending: 'Solicitação enviada. Aguardando conector SIC...',
  processing: 'Conector interno consultando o SIC...',
  failed: 'A consulta falhou. Verifique o conector e a API interna.',
  expired: 'Consulta expirada. Envie uma nova solicitação.',
};
const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(n) : '—';
};
const quantity = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(n) : '—';
};
const dateText = (value) => {
  if (!value) return 'Não informada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
};
function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900 break-words">{children ?? '—'}</dd>
    </div>
  );
}
function Pill({ ok, children }) {
  return (
    <span className={'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ' +
      (ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')}>
      {children}
    </span>
  );
}
function safeForExport(v) {
  return typeof v === 'string' ? v.replace(/[\r\n\t]/g, ' ').slice(0, 170) : String(v ?? '');
}

export default function SicLookup() {
  const [orderNumber, setOrderNumber] = useState('352488');
  const [requestId, setRequestId] = useState('');
  const [state, setState] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [draftExporting, setDraftExporting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);

  async function refresh(id) {
    try {
      const next = await apiGet('/.netlify/functions/sic-request?id=' + encodeURIComponent(id));
      setState(next);
      setError('');
    } catch (e) { setError(e.message); }
  }
  useEffect(() => {
    if (!requestId || !['pending', 'processing'].includes(state?.status)) return;
    const timer = window.setInterval(() => { void refresh(requestId); }, 3500);
    return () => window.clearInterval(timer);
  }, [requestId, state?.status]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setState(null);
    setSavedDraft(null);
    setRequestId('');
    if (!/^[1-9]\d{0,11}$/.test(orderNumber)) {
      setError('Informe apenas um número de pedido válido.');
      return;
    }
    setSubmitting(true);
    try {
      const next = await apiPost('/.netlify/functions/sic-request', { orderNumber });
      setRequestId(next.requestId);
      setState({ requestId: next.requestId, status: next.status, orderNumber });
      await refresh(next.requestId);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  const result = state?.result;
  const pedido = result?.pedidoCompleto;
  const items = Array.isArray(result?.itens) ? result.itens : [];
  const validation = result?.validacao;
  const financialOk = validation?.valido === true;
  const sicReleased = String(pedido?.liberado || '').trim().toUpperCase() === 'S';
  // Situacao "0" is not interpreted as legally eligible without a confirmed SIC mapping.
  const juridicalApproved = false;
  const canGenerateAcceptance = financialOk && sicReleased && juridicalApproved;

  async function saveInternalDraft() {
    if (!requestId || state?.status !== 'completed' || savingDraft) return;
    setSavingDraft(true);
    setError('');
    try {
      const saved = await apiPost('/.netlify/functions/acceptance-draft', { requestId });
      setSavedDraft(saved);
    } catch (e) {
      setError(e.message || 'Falha ao registrar rascunho interno.');
    } finally {
      setSavingDraft(false);
    }
  }

  async function downloadDraft() {
    if (!pedido || draftExporting) return;
    setDraftExporting(true);
    try {
      const { exportAcceptanceDraft } = await import('@/lib/acceptanceDraftPdf');
      await exportAcceptanceDraft({ pedido, itens: items, validacao: validation });
    } catch {
      setError('Não foi possível gerar a minuta PDF. Tente novamente.');
    } finally { setDraftExporting(false); }
  }

  async function downloadSnapshot() {
    if (!pedido || exporting) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const left = 16;
      const right = pageWidth - 16;
      let y = 22;
      function line(value, size = 10, weight = 'normal') {
        doc.setFont('helvetica', weight);
        doc.setFontSize(size);
        const rows = doc.splitTextToSize(safeForExport(value), right - left);
        for (const row of rows) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(row, left, y);
          y += size > 12 ? 8 : 6;
        }
      }
      line('DRAFER ACEITE - ESPELHO DE CONSULTA SIC', 15, 'bold');
      line('DOCUMENTO DE CONFERENCIA - NAO E TERMO JURIDICO', 10, 'bold');
      y += 5;
      line('Pedido: ' + safeForExport(pedido.numero || state.orderNumber), 12, 'bold');
      line('Empresa SIC: ' + safeForExport(pedido.empresa));
      line('Cliente: ' + safeForExport(pedido.cliente?.nome || 'Nao informado'));
      line('Data do pedido: ' + dateText(pedido.dataPedido));
      line('Previsao de entrega: ' + dateText(pedido.dataEntrega));
      line('Situacao SIC (codigo bruto): ' + safeForExport(pedido.situacao));
      line('Liberado SIC: ' + safeForExport(pedido.liberado));
      y += 4;
      line('ITENS (' + items.length + ')', 12, 'bold');
      items.forEach((item, index) => {
        line((index + 1) + '. ' + safeForExport(item.descricao || 'Produto'));
        line('Codigo comercial SIC: ' + safeForExport(item.codigoProdutoComercial ?? 'nao informado') +
          ' | Seq. interna: ' + safeForExport(item.codigoProdutoInterno ?? item.codigoProduto));
        if (item.referenciaFornecedor != null) line('Referencia fornecedor: ' + safeForExport(item.referenciaFornecedor));
        line('Qtd API: ' + quantity(item.quantidade) + ' ' + safeForExport(item.unidade) +
          ' | Unitario API (base a confirmar): ' + money(item.valorUnitario) +
          ' | Total: ' + money(item.valorTotal));
        if (item.pesoLiquidoKg != null) line('Peso liquido: ' + quantity(item.pesoLiquidoKg) + ' kg');
        if (item.pesoBrutoKg != null) line('Peso bruto: ' + quantity(item.pesoBrutoKg) + ' kg');
        if (item.quantidadePecas != null) line('Quantidade de pecas: ' + quantity(item.quantidadePecas));
        if (item.valorUnitarioPeca != null) line('Valor unitario por peca: ' + money(item.valorUnitarioPeca));
      });
      y += 4;
      line('CONFERENCIA FINANCEIRA', 12, 'bold');
      line('Subtotal: ' + money(pedido.valores?.subtotal));
      line('Desconto: ' + money(pedido.valores?.desconto));
      line('Total: ' + money(pedido.valores?.total));
      line('Validacao aritmetica: ' + (financialOk ? 'APROVADA' : 'NAO APROVADA'));
      y += 5;
      line('Este espelho nao substitui o pedido oficial e nao cria aceite, assinatura ou obrigacao juridica.', 9);
      doc.save('consulta-sic-' + String(pedido.numero || state.orderNumber).replace(/\D/g, '') + '.pdf');
    } catch {
      setError('Não foi possível exportar o espelho PDF.');
    } finally { setExporting(false); }
  }

  return (
    <Card className="mb-8 border-slate-200 shadow-sm">
      <CardHeader className="border-b bg-white">
        <CardTitle className="flex gap-2 items-center text-xl">
          <Search className="h-5 w-5 text-red-700" />
          Consultar pedido no SIC SupraSYS
        </CardTitle>
        <p className="text-sm text-slate-500">
          Busca segura no SIC pelo conector interno. Os dados são consultados em modo leitura.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 text-sm font-medium text-slate-700">
            Número do pedido
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric" maxLength={12} autoComplete="off"
              aria-label="Número do pedido SIC"
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base font-semibold"
            />
          </label>
          <Button type="submit" disabled={submitting || ['pending', 'processing'].includes(state?.status)} className="sm:self-end gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar SIC
          </Button>
        </form>
        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
        {state?.status && state.status !== 'completed' && (
          <div role="status" className="flex items-start gap-2 rounded-md border bg-slate-50 p-3 text-sm">
            {['pending', 'processing'].includes(state.status)
              ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
            <span>{labels[state.status] || 'Atualizando consulta...'} {state.error ? '(' + state.error + ')' : ''}</span>
          </div>
        )}

        {pedido && (
          <div className="space-y-5" aria-label="Resultado da consulta SIC">
            <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Pedido consultado no SIC</p>
                <h3 className="text-2xl font-bold text-slate-900">Nº {pedido.numero || state.orderNumber}</h3>
                <p className="text-sm text-slate-600">Empresa {pedido.empresa ?? '—'} · {items.length} item(ns)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill ok={financialOk}>{financialOk ? 'Financeiro conferido' : 'Conferência pendente'}</Pill>
                <Pill ok={sicReleased}>{sicReleased ? 'Liberado no SIC' : 'Não liberado no SIC'}</Pill>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                  <UserRound className="h-4 w-4" /> Cliente e pedido
                </h4>
                <dl className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Field label="Cliente">{pedido.cliente?.nome || 'Não informado'}</Field></div>
                  <Field label="Código do cliente">{pedido.cliente?.codigo ?? '—'}</Field>
                  <Field label="Empresa">{pedido.empresa ?? '—'}</Field>
                  <Field label="Data do pedido">{dateText(pedido.dataPedido)}</Field>
                  <Field label="Previsão de entrega">{dateText(pedido.dataEntrega)}</Field>
                  <Field label="Situação SIC (código)">{pedido.situacao ?? '—'}</Field>
                  <Field label="Liberado">{pedido.liberado ?? '—'}</Field>
                </dl>
              </section>
              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                  <ClipboardList className="h-4 w-4" /> Resumo financeiro
                </h4>
                <dl className="space-y-3">
                  <div className="flex justify-between gap-4 text-sm"><dt>Subtotal</dt><dd className="font-medium">{money(pedido.valores?.subtotal)}</dd></div>
                  <div className="flex justify-between gap-4 text-sm"><dt>Desconto</dt><dd className="font-medium">{money(pedido.valores?.desconto)}</dd></div>
                  <div className="flex justify-between gap-4 border-t pt-3"><dt className="font-semibold">Valor total</dt><dd className="text-xl font-bold text-slate-900">{money(pedido.valores?.total)}</dd></div>
                  <div className="flex justify-between gap-4 text-sm"><dt>Soma dos itens</dt><dd>{money(validation?.somaItens)}</dd></div>
                </dl>
                <div className={'mt-4 flex items-center gap-2 rounded-md p-3 text-sm ' +
                  (financialOk ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900')}>
                  {financialOk ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  {financialOk ? 'Valores conferidos pela API do SIC.' : 'Valores exigem revisão.'}
                </div>
                {Array.isArray(validation?.avisos) && validation.avisos.length > 0 && (
                  <ul className="mt-3 list-disc pl-5 text-xs text-amber-900">
                    {validation.avisos.map((aviso, index) => <li key={index}>{String(aviso)}</li>)}
                  </ul>
                )}
              </section>
            </div>

            <section className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">
                <Package className="h-4 w-4" />
                <h4 className="font-semibold">Itens do pedido ({items.length})</h4>
              </div>
              <p className="px-4 py-3 text-xs text-slate-700 bg-slate-50 border-b">
                Código comercial e referência obtidos de CAD_PRODUTO quando disponíveis; código interno
                permanece registrado para rastreabilidade. Peso e peças são campos distintos do SIC.
                A regra jurídica de elegibilidade continua pendente.
              </p>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[740px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr><th className="p-3">Item</th><th className="p-3">Código comercial</th><th className="p-3">Seq. interna</th><th className="p-3">Ref. fornecedor</th><th className="p-3">Descrição</th><th className="p-3 text-right">Qtd. base</th><th className="p-3">Un.</th><th className="p-3 text-right">Unitário base</th><th className="p-3 text-right">Peso líquido (kg)</th><th className="p-3 text-right">Peças</th><th className="p-3 text-right">Unitário/peça</th><th className="p-3 text-right">Total</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="p-3">{item.item ?? index + 1}</td>
                        <td className="p-3 font-semibold">{item.codigoProdutoComercial ?? '—'}</td>
                        <td className="p-3">{item.codigoProdutoInterno ?? item.codigoProduto ?? '—'}</td>
                        <td className="p-3">{item.referenciaFornecedor ?? '—'}</td>
                        <td className="p-3 font-medium">{item.descricao || '—'}</td>
                        <td className="p-3 text-right">{quantity(item.quantidade)}</td>
                        <td className="p-3">{item.unidade || '—'}</td>
                        <td className="p-3 text-right">{money(item.valorUnitario)}</td>
                        <td className="p-3 text-right">{item.pesoLiquidoKg == null ? '—' : quantity(item.pesoLiquidoKg)}</td>
                        <td className="p-3 text-right">{item.quantidadePecas == null ? '—' : quantity(item.quantidadePecas)}</td>
                        <td className="p-3 text-right">{item.valorUnitarioPeca == null ? '—' : money(item.valorUnitarioPeca)}</td>
                        <td className="p-3 text-right font-semibold">{money(item.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <h4 className="flex items-center gap-2 font-semibold text-amber-950">
                <ShieldCheck className="h-5 w-5" /> Elegibilidade para aceite jurídico
              </h4>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <p>{financialOk ? '✓' : '!' } Conferência financeira: {financialOk ? 'aprovada' : 'pendente'}</p>
                <p>{sicReleased ? '✓' : '!' } Liberação no SIC: {sicReleased ? 'sim' : 'não'}</p>
                <p>! Regra comercial/jurídica: não homologada</p>
              </div>
              <p className="text-sm text-amber-900">
                A situação SIC é apresentada em seu código original, sem presumir elegibilidade jurídica.
                O aceite e a assinatura só serão liberados após homologação das regras e do termo.
              </p>
              {savedDraft && (
                <div role="status" className="border border-emerald-200 bg-emerald-50 p-3 rounded-md text-sm text-emerald-900">
                  <strong>Rascunho interno:</strong> {savedDraft.message}
                  <p className="mt-1 text-xs">Identificação: {savedDraft.draftId} · Status: {savedDraft.status}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={saveInternalDraft}
                  disabled={savingDraft || !!savedDraft || !requestId || state?.status !== 'completed' || !financialOk || !sicReleased}
                  className="gap-2">
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                  {savedDraft ? 'Rascunho registrado' : 'Registrar rascunho interno'}
                </Button>
                <Button type="button" variant="outline" onClick={downloadSnapshot} disabled={exporting} className="gap-2 bg-white">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Baixar espelho da consulta (PDF)
                </Button>
                <Button type="button" variant="outline" onClick={downloadDraft}
                  disabled={draftExporting} className="gap-2 bg-white">
                  {draftExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Baixar minuta do termo (PDF)
                </Button>
                <Button type="button" disabled={!canGenerateAcceptance} className="gap-2"
                  title="Pendente de homologação jurídica, regras comerciais e emissão final">
                  <FileText className="h-4 w-4" /> Gerar termo de aceite
                  {!canGenerateAcceptance && <LockKeyhole className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-900">
                O registro do rascunho é restrito à equipe autenticada, não gera link público e não autoriza fabricação. O espelho e a minuta PDF são apenas para conferência interna. A minuta não pode ser enviada ao cliente nem utilizada para assinatura.
              </p>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
