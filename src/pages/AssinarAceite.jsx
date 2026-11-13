import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import TermoGarantia from '../components/TermoGarantia.jsx';
import PublicSignaturePad from '@/components/PublicSignaturePad.jsx';
import FilePreview from '@/components/FilePreview.jsx';

export default function AssinarAceite() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [agreed, setAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [sigError, setSigError] = useState(null);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Token inválido');
      return;
    }
    base44.functions.invoke('getOrderByToken', { token })
      .then(res => {
        if (res.data.error || !res.data.order) {
          setError(res.data.error || 'Pedido não encontrado ou link inválido');
        } else if (res.data.order.level1_accepted) {
          setError('Este aceite já foi realizado para este pedido');
        } else {
          setOrder(res.data.order);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Pedido não encontrado ou link inválido');
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!agreed) {
      alert('Você deve concordar com os termos');
      return;
    }
    if (!signatureData) {
      setSigError('Por favor, realize sua assinatura antes de confirmar o aceite.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('signOrderByToken', { token, signatureData });
      if (res.data?.success) {
        setSigned(true);
      } else {
        setError(res.data?.error || 'Erro ao aceitar');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error in handleAccept:', err);
      setError(err.message || 'Erro ao aceitar pedido');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-500" />
            <p className="text-slate-600 mt-4">Carregando pedido...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-red-50 border-2 border-red-300">
          <CardContent className="pt-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <p className="text-red-900 font-semibold">{error || 'Link inválido ou expirado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 p-8 rounded-xl" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="bg-white rounded-lg p-4 mb-4 inline-block">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b080ba942cb63e0f99eb48/c1b6412c8_WhatsAppImage2026-02-04at142058.jpg"
                alt="Grupo Drafer"
                className="h-16 object-contain"
              />
            </div>
            <p className="text-white font-bold text-2xl">Obrigado pelo seu Aceite!</p>
            <p className="text-gray-400 text-sm mt-2">Grupo Drafer - Telhas Metálicas</p>
          </div>

          <Card className="bg-green-50 border-2 border-green-300 overflow-hidden">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto" />
              
              <div>
                <h2 className="text-3xl font-bold text-green-900 mb-3">Pedido Autorizado! ✓</h2>
                <p className="text-green-800 text-lg font-semibold">
                  Pedido: <span style={{ color: '#cc0000' }}>#{order.order_number}</span>
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 text-left space-y-3 border border-green-200">
                <p className="text-slate-700">
                  <strong>Cliente:</strong> {order.client_name}
                </p>
                <p className="text-slate-700">
                  <strong>Material:</strong> {order.material} {order.tile_type && `- ${order.tile_type}`}
                </p>
                <p className="text-slate-700">
                  <strong>Quantidade:</strong> {order.quantity} unidades
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-green-800 font-semibold">✅ Sua assinatura digital foi registrada com sucesso!</p>
                <p className="text-green-700 text-sm">
                  A fabricação de sua encomenda iniciará em breve.
                </p>
                <p className="text-green-700 text-sm">
                  Você receberá atualizações por WhatsApp durante todo o processo.
                </p>
              </div>

              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 text-left rounded">
                <p className="text-orange-900 font-semibold text-sm mb-2">📋 Próximas Etapas:</p>
                <ul className="text-orange-800 text-sm space-y-1 ml-4 list-disc">
                  <li>Armazenamento e inspeção da matéria-prima</li>
                  <li>Fabricação conforme especificações</li>
                  <li>Preparação para entrega</li>
                  <li>Acompanhamento completo pelo WhatsApp</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6 text-slate-600 text-sm">
            <p>Obrigado por confiar na Grupo Drafer!</p>
            <p className="text-xs text-slate-500 mt-1">Documento registrado digitalmente com validade jurídica</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Cabeçalho Drafer */}
        <div className="text-center mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1a1a1a' }}>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b080ba942cb63e0f99eb48/c1b6412c8_WhatsAppImage2026-02-04at142058.jpg"
            alt="Drafer"
            className="h-10 object-contain mx-auto mb-1"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <p className="text-white font-bold text-sm mt-1">Termo de Aceite — Autorização de Fabricação</p>
          <p className="text-gray-400 text-xs">Pedido: {order.order_number}</p>
        </div>

        <Card className="mb-6 overflow-hidden">
          <CardHeader className="border-b py-3" style={{ backgroundColor: '#1a1a1a' }}>
            <CardTitle className="text-base text-white">Dados do Cliente e Pedido</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-500 uppercase font-semibold">Cliente</p><p className="text-sm font-bold text-slate-900">{order.client_name}</p></div>

              <div><p className="text-xs text-slate-500 uppercase font-semibold">Material</p><p className="text-sm font-bold text-slate-900">{order.material} {order.tile_type && `- ${order.tile_type}`}</p></div>
              <div><p className="text-xs text-slate-500 uppercase font-semibold">Espessura</p><p className="text-sm font-bold text-slate-900">{order.thickness || '—'}</p></div>
              {order.product_code && <div><p className="text-xs text-slate-500 uppercase font-semibold">Código do Produto</p><p className="text-sm font-bold text-slate-900">{order.product_code}</p></div>}
              {order.tile_model && <div><p className="text-xs text-slate-500 uppercase font-semibold">Modelo</p><p><span className="px-2 py-1 rounded text-white text-sm font-bold" style={{ backgroundColor: '#cc0000' }}>{order.tile_model}</span></p></div>}
            </div>
          </CardContent>
        </Card>

        {/* Prints dos documentos */}
        {order.order_image_url && (
          <Card className="mb-4 overflow-hidden">
            <CardHeader className="py-3" style={{ backgroundColor: '#1a1a1a' }}>
              <CardTitle className="text-sm text-white">📄 Pedido de Venda</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <FilePreview url={order.order_image_url} alt="Pedido de Venda" height={280} />
            </CardContent>
          </Card>
        )}

        {order.manufacturing_order_image_url && (
          <Card className="mb-6 overflow-hidden border-2" style={{ borderColor: '#cc0000' }}>
            <CardHeader className="py-3" style={{ backgroundColor: '#cc0000' }}>
              <CardTitle className="text-sm text-white">🏭 Autorização de Fabricação</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <FilePreview url={order.manufacturing_order_image_url} alt="Autorização de Fabricação" height={420} />
            </CardContent>
          </Card>
        )}

        {/* Termo de Garantia Completo */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="border-b py-3" style={{ backgroundColor: '#1a1a1a' }}>
            <CardTitle className="text-base text-white">📋 Termo de Garantia, Armazenagem, Manuseio e Instalação</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <TermoGarantia />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="bg-orange-50 border-b">
            <CardTitle className="flex gap-2 items-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Aviso Legal - Leia Atentamente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded">
              <p className="text-orange-900 font-bold mb-3">⚠️ ATENÇÃO - IMPORTANTE</p>
              <p className="text-orange-800 text-sm leading-relaxed mb-3">
                O cliente declara estar ciente de que:
              </p>
              <ul className="text-orange-800 text-sm space-y-2 ml-4 list-disc">
                <li>Este material será fabricado sob medida conforme especificação acima.</li>
                <li>Após a fabricação não será possível <strong>cancelamento, devolução ou alteração</strong> do pedido.</li>
                <li>A responsabilidade sobre o produto passa completamente ao cliente após a entrega.</li>
                <li>O cliente assume total responsabilidade por transporte, armazenagem e instalação.</li>
                <li>A garantia do produto será bloqueada até a conclusão de todos os aceites.</li>
                <li>Esta assinatura digital é uma prova jurídica legalmente válida.</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 p-4 bg-slate-50 rounded cursor-pointer">
              <Checkbox
                checked={agreed}
                onCheckedChange={setAgreed}
                className="mt-1"
              />
              <span className="text-sm font-semibold text-slate-900">
                ✓ Li, entendi e concordo com todos os termos acima. Autorizo a fabricação e assumo total responsabilidade sobre o produto.
              </span>
            </label>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-base">Assinatura do cliente</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-600">
              Desenhe sua assinatura na área abaixo usando o dedo, mouse ou caneta.
            </p>
            <PublicSignaturePad
              onChange={(data) => {
                setSignatureData(data);
                setSigError(null);
              }}
            />
            {sigError && (
              <p className="text-sm font-semibold text-red-600">{sigError}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <Button
              onClick={handleAccept}
              disabled={submitting || !agreed}
              className="w-full bg-green-600 hover:bg-green-700 h-14 gap-2 text-lg font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  ACEITAR E AUTORIZAR PRODUÇÃO DE TELHAS
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500">
          <p>Ao aceitar, você autoriza a produção e concorda com todos os termos.</p>
        </div>
      </div>
    </div>
  );
}