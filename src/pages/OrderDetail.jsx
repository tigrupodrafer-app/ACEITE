import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Download, Send, FileText, Check, AlertTriangle, Camera, Printer, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import TabLevel1 from '../components/order/TabLevel1.jsx';
import TabLevel2 from '../components/order/TabLevel2.jsx';
import TabLevel3 from '../components/order/TabLevel3.jsx';
import SendAcceptanceWhatsApp from '../components/SendAcceptanceWhatsApp.jsx';
import ManufacturingOrderUpload from '../components/order/ManufacturingOrderUpload.jsx';
import DocumentsSection from '../components/order/DocumentsSection.jsx';
import { exportElementToPdf } from '../lib/pdfExport.js';

export default function OrderDetail() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');
  const contentRef = React.useRef(null);
  const actionsRef = React.useRef(null);
  const [exporting, setExporting] = React.useState(false);

  const handleExportPdf = async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    try {
      await exportElementToPdf(
        contentRef.current,
        `pedido_${order?.order_number || orderId || 'detalhe'}.pdf`,
        [actionsRef.current]
      );
    } finally {
      setExporting(false);
    }
  };
  
  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.Order.get(orderId),
    enabled: !!orderId,
  });

  const statusLabels = {
    'rascunho': { label: 'Rascunho', color: 'bg-gray-200' },
    'aguardando_aceite_pedido': { label: 'Aguardando Aceite Pedido', color: 'bg-yellow-200' },
    'em_fabricacao': { label: 'Em Fabricação', color: 'bg-blue-200' },
    'aguardando_aceite_entrega': { label: 'Aguardando Aceite Entrega', color: 'bg-yellow-200' },
    'entregue': { label: 'Entregue', color: 'bg-green-100' },
    'aguardando_aceite_instalacao': { label: 'Aguardando Aceite Instalação', color: 'bg-yellow-200' },
    'concluido': { label: 'Concluído', color: 'bg-green-200' },
  };

  if (isLoading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center">Pedido não encontrado</div>;
  }

  const status = statusLabels[order.status] || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div ref={contentRef} className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{order.order_number}</h1>
            <p className="text-slate-600 mt-1">{order.client_name}</p>
            <Badge className={`${status.color} text-slate-900 mt-3`}>{status.label}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <QrCode className="w-4 h-4" /> QR Code
            </Button>
            <div ref={actionsRef} className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <QrCode className="w-4 h-4" /> QR Code
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportPdf} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
              </Button>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {(order.product_code || order.tile_model) && (
            <Card className="border-2 md:col-span-2" style={{ borderColor: '#cc0000' }}>
              <CardContent className="pt-4 pb-4">
                {order.product_code && (
                  <div className="mb-1">
                    <div className="text-xs text-slate-500 uppercase font-semibold">Código do Produto</div>
                    <div className="text-lg font-bold text-slate-900">{order.product_code}</div>
                  </div>
                )}
                {order.tile_model && (
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-semibold">Modelo</div>
                    <span className="px-3 py-1 rounded text-white text-base font-bold" style={{ backgroundColor: '#cc0000' }}>
                      {order.tile_model}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600">Material</div>
              <div className="text-lg font-bold text-slate-900">{order.material}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600">Quantidade</div>
              <div className="text-lg font-bold text-slate-900">{order.quantity} un.</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600">Garantia</div>
              <div className="text-lg font-bold text-red-600">{order.warranty_blocked ? 'BLOQUEADA' : 'OK'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Ordem de Fabricação */}
        <div className="mb-6">
          <ManufacturingOrderUpload order={order} refetch={refetch} />
        </div>

        {/* Documentos */}
        <div className="mb-6">
          <DocumentsSection order={order} />
        </div>

        {/* Enviar via WhatsApp */}
        {(order.status === 'rascunho' || order.status === 'aguardando_aceite_pedido') && (
          <div className="mb-8">
            <SendAcceptanceWhatsApp order={order} />
          </div>
        )}

        {/* Tabs for Levels */}
        <Tabs defaultValue="level1" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="level1" className={order.level1_accepted ? 'text-green-700' : ''}>
              {order.level1_accepted && <Check className="w-4 h-4 mr-2" />}
              Nível 1 - Pedido
            </TabsTrigger>
            <TabsTrigger value="level2" className={order.level2_accepted ? 'text-green-700' : ''}>
              {order.level2_accepted && <Check className="w-4 h-4 mr-2" />}
              Nível 2 - Entrega
            </TabsTrigger>
            <TabsTrigger value="level3" className={order.level3_accepted ? 'text-green-700' : ''}>
              {order.level3_accepted && <Check className="w-4 h-4 mr-2" />}
              Nível 3 - Instalação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="level1">
            <TabLevel1 order={order} refetch={refetch} />
          </TabsContent>

          <TabsContent value="level2">
            {order.level1_accepted ? (
              <TabLevel2 order={order} refetch={refetch} />
            ) : (
              <Card className="bg-orange-50 border-2 border-orange-300">
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                  <p className="text-orange-900 font-semibold">Complete primeiro o Nível 1 - Aceite do Pedido</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="level3">
            {order.level2_accepted ? (
              <TabLevel3 order={order} refetch={refetch} />
            ) : (
              <Card className="bg-orange-50 border-2 border-orange-300">
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                  <p className="text-orange-900 font-semibold">Complete primeiro o Nível 2 - Aceite de Entrega</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}