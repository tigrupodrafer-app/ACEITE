import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, AlertCircle, Factory, RefreshCw } from 'lucide-react';
import FilePreview from '@/components/FilePreview';

export default function ManufacturingOrderUpload({ order, refetch }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [orderFile, setOrderFile] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const hasData = order.manufacturing_auth_number && order.manufacturing_order_items?.length > 0;

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke('processManufacturingOrder', {
        orderId: order.id,
        imageUrl: file_url,
      });
      if (res.data?.success) {
        setSuccess(true);
        setFile(null);
        await refetch();
      } else {
        setError(res.data?.error || 'Erro ao processar imagem');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleOrderImageUpload = async () => {
    if (!orderFile) return;
    setOrderLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: orderFile });
      await base44.entities.Order.update(order.id, { order_image_url: file_url });
      setOrderFile(null);
      await refetch();
    } catch (e) {
      setError(e.message);
    }
    setOrderLoading(false);
  };

  return (
    <Card className="border-2" style={{ borderColor: hasData ? '#22c55e' : '#e2e8f0' }}>
      <CardHeader style={{ backgroundColor: '#1a1a1a' }} className="rounded-t-xl">
        <CardTitle className="flex items-center gap-2 text-white text-base">
          <Factory className="w-5 h-5" style={{ color: '#cc0000' }} />
          Ordem de Fabricação
          {hasData && <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {/* Imagem do Pedido de Venda */}
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-500">📄 Pedido de Venda</p>
            <label className="text-xs text-blue-600 cursor-pointer hover:underline flex items-center gap-1">
              <Upload className="w-3 h-3" />
              {order.order_image_url ? 'Substituir' : 'Enviar'}
              <input type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => setOrderFile(e.target.files?.[0])} />
            </label>
          </div>
          {order.order_image_url && <FilePreview url={order.order_image_url} alt="Pedido de Venda" height={280} />}
          {orderFile && (
            <div className="p-2 bg-blue-50 flex items-center justify-between gap-2">
              <span className="text-xs text-blue-700 truncate">{orderFile.name}</span>
              <Button size="sm" onClick={handleOrderImageUpload} disabled={orderLoading} style={{ backgroundColor: '#cc0000' }} className="text-white text-xs h-7 shrink-0">
                {orderLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          )}
        </div>

        {/* Imagem da Autorização de Fabricação */}
        {order.manufacturing_order_image_url && (
          <div className="rounded-lg overflow-hidden border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 px-3 py-2 bg-slate-50 border-b border-slate-200">🏭 Autorização de Fabricação</p>
            <FilePreview url={order.manufacturing_order_image_url} alt="Autorização de Fabricação" height={420} />
          </div>
        )}

        {/* Upload */}
        <div
          className="border border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-slate-400 transition-colors"
          onClick={() => document.getElementById('mfg-file-input').click()}
        >
          <input id="mfg-file-input" type="file" accept="image/*,.pdf" className="hidden"
            onChange={e => { setFile(e.target.files?.[0]); setError(null); setSuccess(false); }} />
          {hasData ? <RefreshCw className="w-4 h-4 text-slate-400 mx-auto mb-1" /> : <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />}
          <p className="text-slate-500 text-xs">{file ? file.name : (hasData ? 'Substituir Autorização de Fabricação' : 'Selecionar Autorização de Fabricação')}</p>
        </div>

        {error && (
          <div className="flex gap-2 bg-red-50 border border-red-200 rounded p-3">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-xs">{error}</p>
          </div>
        )}

        {file && (
          <Button onClick={handleUpload} disabled={loading} className="w-full text-white" style={{ backgroundColor: '#cc0000' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processando...</> : <><Upload className="w-4 h-4 mr-2" />{hasData ? 'Reprocessar com IA' : 'Enviar e Extrair com IA'}</>}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}