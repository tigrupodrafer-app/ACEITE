import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';

// Independent public read-only page. Signing is intentionally disabled
// until the transactional signature endpoint and legal-document hashing exist.
export default function PublicAcceptance() {
  const [result, setResult] = useState({ loading: true, order: null, error: '' });
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setResult({ loading: false, order: null, error: 'Link inválido ou expirado.' });
      return;
    }
    const controller = new AbortController();
    fetch('/.netlify/functions/public-order?token=' + encodeURIComponent(token), {
      cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Link inválido, expirado ou ainda indisponível.');
      const data = await response.json();
      setResult({ loading: false, order: data.order, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ loading: false, order: null, error: error.message });
    });
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="max-w-2xl mx-auto bg-white border shadow-lg rounded-xl p-8">
        <header className="flex gap-3 items-center mb-6">
          <FileText className="text-red-700 w-8 h-8" />
          <div><h1 className="font-bold text-xl">DRAFER ACEITE</h1>
            <p className="text-sm text-slate-500">Confirmação de pedido</p></div>
        </header>
        {result.loading && <p className="flex gap-2 items-center"><Loader2 className="animate-spin" /> Consultando...</p>}
        {result.error && <p role="alert" className="text-red-700">{result.error}</p>}
        {result.order && (
          <div className="space-y-3">
            <p><strong>Pedido:</strong> {result.order.order_number}</p>
            <p><strong>Cliente:</strong> {result.order.client_name}</p>
            <p><strong>Material:</strong> {result.order.material || 'Não informado'}</p>
            <p><strong>Modelo:</strong> {result.order.tile_model || 'Não informado'}</p>
            <p><strong>Quantidade:</strong> {result.order.quantity ?? 'Não informada'}</p>
          </div>
        )}
        <div className="bg-amber-50 border border-amber-200 p-4 mt-6 rounded flex gap-3 text-amber-900">
          <AlertTriangle className="shrink-0 w-6 h-6" />
          <p>Ambiente de migração: a assinatura permanece desabilitada até a homologação jurídica, de segurança e do registro de evidências.</p>
        </div>
      </section>
    </main>
  );
}
