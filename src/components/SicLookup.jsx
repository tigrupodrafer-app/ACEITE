import React, { useEffect, useState } from 'react';
import { Loader2, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const labels = {
  pending: 'Solicitação enviada. Aguardando o conector interno SIC...',
  processing: 'Conector interno consultando o SIC...',
  failed: 'O conector informou uma falha. Verifique a API local.',
  expired: 'Consulta expirada. Verifique o serviço do conector interno.',
};

function JsonView({ label, value }) {
  return (
    <details className="rounded-md border bg-slate-50 p-3">
      <summary className="cursor-pointer font-semibold text-sm">{label}</summary>
      <pre className="text-xs overflow-auto max-h-80 whitespace-pre-wrap break-words mt-2">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export default function SicLookup() {
  const [orderNumber, setOrderNumber] = useState('344137');
  const [requestId, setRequestId] = useState('');
  const [state, setState] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    if (!/^[1-9]\d{0,11}$/.test(orderNumber)) {
      setError('Informe apenas o número válido do pedido SIC.');
      return;
    }
    setSubmitting(true);
    try {
      const next = await apiPost('/.netlify/functions/sic-request', { orderNumber });
      setRequestId(next.requestId);
      setState({ requestId: next.requestId, status: next.status, orderNumber });
      await refresh(next.requestId);
    } catch (e) {
      setError(e.message);
    } finally { setSubmitting(false); }
  }

  const result = state?.result;
  const pedido = result?.pedidoCompleto;
  const items = result?.itens;
  const validation = result?.validacao;

  return (
    <Card className="border-red-100 mb-8">
      <CardHeader><CardTitle>Consultar pedido no SIC SupraSYS</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 text-sm font-medium">
            Número do pedido
            <input
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value.trim())}
              inputMode="numeric"
              maxLength={12}
              autoComplete="off"
              className="mt-1 block w-full border rounded-md bg-white px-3 py-2"
              aria-label="Número do pedido SIC"
            />
          </label>
          <Button type="submit" disabled={submitting || (state && ['pending', 'processing'].includes(state.status))} className="sm:self-end">
            {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Consultar SIC
          </Button>
        </form>
        <p className="text-xs text-slate-500">
          Consulta autenticada. O conector instalado no SRV-DRAFER busca os dados no banco SIC pela API local; não há acesso público ao Firebird.
        </p>
        {error && <p role="alert" className="rounded bg-red-50 border border-red-200 text-red-700 p-3">{error}</p>}
        {state?.status && state.status !== 'completed' && (
          <div role="status" className="p-3 rounded border bg-slate-50 flex items-center gap-2 text-sm">
            {['pending', 'processing'].includes(state.status) ? <Loader2 className="animate-spin h-4 w-4" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
            {labels[state.status] || 'Aguardando atualização...'}
            {state.error ? ' (' + state.error + ')' : ''}
          </div>
        )}
        {result && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-green-800 text-sm">
              <CheckCircle2 className="w-5 h-5" /> Dados recebidos do SIC para conferência.
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded text-sm text-amber-900">
              <strong>Somente consulta:</strong> nenhum termo ou link de assinatura será gerado nesta fase. O pedido 344137 foi usado anteriormente como exemplo de pedido faturado; situação SIC e valores precisam ser validados antes de liberar um aceite novo.
            </div>
            <JsonView label="Dados completos do pedido SIC" value={pedido} />
            <JsonView label={'Itens do pedido (' + (items?.length || 0) + ')'} value={items} />
            <JsonView label="Validação financeira retornada pela API interna" value={validation} />
            <Button variant="outline" disabled title="Aguarda homologação da regra financeira e jurídica">
              Gerar termo de aceite — bloqueado para homologação
            </Button>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
