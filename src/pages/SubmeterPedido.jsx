import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, AlertCircle, CheckCircle, FileText, Factory } from 'lucide-react';
import { createPageUrl } from '@/utils';
import ExtractedDataReview from '@/components/order/ExtractedDataReview';

function UploadZone({ id, file, onFile, label, icon: Icon, color }) {
  const [focused, setFocused] = useState(false);
  const zoneRef = useRef(null);

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) onFile(blob);
        break;
      }
    }
  };

  const handleClick = () => {
    // Foca a zona para aceitar Ctrl+V, mas não abre o file picker automaticamente
    zoneRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    // Enter ou Espaço abrem o file picker
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById(id).click();
    }
  };

  return (
    <div
      ref={zoneRef}
      tabIndex={0}
      className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all outline-none"
      style={{
        borderColor: file ? '#22c55e' : focused ? color : color + '99',
        backgroundColor: file ? '#f0fdf4' : focused ? color + '10' : '#fafafa',
        boxShadow: focused ? `0 0 0 3px ${color}33` : 'none',
      }}
      onClick={handleClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <input
        id={id}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {file ? (
        <>
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
          <p className="text-green-700 font-semibold text-sm truncate max-w-full px-2">{file.name || 'Arquivo selecionado'}</p>
          <p className="text-green-600 text-xs mt-1">Clique para trocar</p>
        </>
      ) : focused ? (
        <>
          <Icon className="w-10 h-10 mx-auto mb-2" style={{ color }} />
          <p className="font-bold text-slate-800 text-sm">Cole a imagem com Ctrl+V</p>
          <p className="text-slate-500 text-xs mt-1">ou pressione Enter para escolher arquivo</p>
        </>
      ) : (
        <>
          <Icon className="w-10 h-10 mx-auto mb-2" style={{ color }} />
          <p className="font-semibold text-slate-700 text-sm">{label}</p>
          <p className="text-slate-400 text-xs mt-1">Clique · arraste · ou Ctrl+V</p>
        </>
      )}
    </div>
  );
}

export default function SubmeterPedido() {
  const [orderFile, setOrderFile] = useState(null);
  const [mfgFile, setMfgFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Sem paste global — cada zona cuida do próprio paste via onFocus/onPaste

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderFile) {
      setError('Selecione a imagem do Pedido de Venda');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload do pedido
      const uploadedOrder = await base44.integrations.Core.UploadFile({ file: orderFile });

      // Extração por IA (não cria o pedido ainda — conferência primeiro)
      const response = await base44.functions.invoke('processOrderImage', {
        imageUrl: uploadedOrder.file_url,
      });

      if (!response.data?.success) {
        setError(response.data?.error || 'Não foi possível processar a imagem. Tente enviar uma imagem mais nítida.');
        setLoading(false);
        return;
      }

      console.log('IA EXTRAÇÃO:', {
        client_name: response.data.data.client.name || null,
        material: response.data.data.product.material || null,
        quantity: response.data.data.product.quantity ?? null,
      });

      setExtracted({
        imageUrl: uploadedOrder.file_url,
        data: response.data.data,
        confidence: response.data.confidence,
      });
      setLoading(false);
    } catch (err) {
      console.error('Erro ao enviar pedido:', err);
      setError(err.response?.data?.error || err.message || 'Não foi possível processar a imagem. Tente enviar uma imagem mais nítida.');
      setLoading(false);
    }
  };

  // Confirmação: cria o Order APENAS após conferência do vendedor
  const handleConfirm = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      let manufacturing_order_image_url = null;

      // Se houver Ordem de Fabricação, apenas salva a imagem (não processa com IA agora)
      if (mfgFile) {
        const uploadedMfg = await base44.integrations.Core.UploadFile({ file: mfgFile });
        manufacturing_order_image_url = uploadedMfg.file_url;
      }

      // Mapeamento IA/FormData → Order
      const order = await base44.entities.Order.create({
        order_number: `PED-${Date.now()}`,
        status: 'rascunho',
        level1_accepted: false,
        level2_accepted: false,
        level3_accepted: false,
        warranty_blocked: true,
        order_image_url: extracted.imageUrl,
        manufacturing_order_image_url,
        // Cliente
        client_name: formData.client_name,
        client_document: formData.client_document,
        client_phone: formData.client_phone,
        client_email: formData.client_email,
        client_address: formData.client_address,
        site_responsible: formData.site_responsible,
        // Produto
        product_code: formData.product_code,
        tile_model: formData.tile_model,
        tile_type: formData.tile_type,
        material: formData.material,
        thickness: formData.thickness,
        length: formData.length,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        approx_weight: formData.approx_weight,
        // Venda
        sale_date: formData.sale_date,
        seller_name: formData.seller_name || (user?.full_name || ''),
        seller_phone: formData.seller_phone,
        store_name: formData.store_name,
      });

      console.log('MAPPING → SAVE:', {
        Order_client_name: order.client_name,
        Order_material: order.material,
        Order_quantity: order.quantity,
        status: 'SUCCESS',
      });

      setResult({ order });
      setExtracted(null);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao salvar pedido:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao salvar o pedido. Tente novamente.');
      setLoading(false);
    }
  };

  if (extracted) {
    return (
      <ExtractedDataReview
        extracted={extracted}
        user={user}
        loading={loading}
        error={error}
        onConfirm={handleConfirm}
        onBack={() => { setExtracted(null); setError(null); }}
      />
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md bg-green-50 border-2 border-green-300">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-green-900">Pedido Criado!</h2>
              <p className="text-green-800">Pedido: <strong>{result.order.order_number}</strong></p>
              <p className="text-green-800">Cliente: <strong>{result.order.client_name}</strong></p>
              {mfgFile && <p className="text-green-700 text-sm">✓ Ordem de Fabricação processada</p>}
              <div className="flex gap-3 justify-center mt-6">
                <Button asChild variant="outline" className="border-green-600 text-green-600">
                  <a href={`${createPageUrl('OrderDetail')}?id=${result.order.id}`}>Ver Detalhes</a>
                </Button>
                <Button
                  onClick={() => { setResult(null); setOrderFile(null); setMfgFile(null); setError(null); }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Novo Pedido
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Submeter Novo Pedido</h1>
          <p className="text-slate-600 mt-2">Faça upload do Pedido de Venda e da Ordem de Fabricação</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload do Pedido */}
          <Card className="overflow-hidden">
            <CardHeader className="py-3 border-b" style={{ backgroundColor: '#1a1a1a' }}>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: '#cc0000' }} />
                1. Pedido de Venda <span className="text-red-400 text-xs">(obrigatório)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <UploadZone
                id="order-file"
                file={orderFile}
                onFile={(f) => { setOrderFile(f); setError(null); }}
                label="Clique ou arraste o Pedido de Venda"
                icon={FileText}
                color="#cc0000"
              />
            </CardContent>
          </Card>

          {/* Upload da Ordem de Fabricação */}
          <Card className="overflow-hidden">
            <CardHeader className="py-3 border-b" style={{ backgroundColor: '#1a1a1a' }}>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Factory className="w-4 h-4 text-orange-400" />
                2. Ordem de Fabricação <span className="text-gray-400 text-xs">(opcional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <UploadZone
                id="mfg-file"
                file={mfgFile}
                onFile={(f) => { setMfgFile(f); setError(null); }}
                label="Clique ou arraste a Ordem de Fabricação"
                icon={Factory}
                color="#f97316"
              />
            </CardContent>
          </Card>

          {error && (
            <div className="flex gap-3 bg-red-50 border border-red-300 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !orderFile}
            className="w-full h-12 text-base font-bold gap-2 text-white"
            style={{ backgroundColor: loading || !orderFile ? undefined : '#cc0000' }}
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processando com IA...</>
            ) : (
              <><Upload className="w-5 h-5" /> Enviar e Processar</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}