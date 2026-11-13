import React, { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Send, FileText, Loader2 } from 'lucide-react';
import SignaturePad from 'signature_pad';

export default function TabLevel1({ order, refetch }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (canvasRef.current && !order.level1_accepted) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = 200 * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      const pad = new SignaturePad(canvas);
      setSignaturePad(pad);
    }
  }, [order.level1_accepted]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.update(order.id, data),
    onSuccess: () => {
      // Geração do PDF do termo — em segundo plano; falha não afeta o aceite
      base44.functions.invoke('generateOrderDocument', { order_id: order.id, level: 1 }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      refetch();
    },
  });

  const handleSign = () => {
    if (!agreed) {
      alert('Você deve concordar com os termos');
      return;
    }
    if (!signaturePad || signaturePad.isEmpty()) {
      alert('Assinatura obrigatória');
      return;
    }

    const signatureData = signaturePad.toDataURL();
    updateMutation.mutate({
      level1_accepted: true,
      level1_date: new Date().toISOString(),
      level1_signature: signatureData,
      status: 'em_fabricacao',
      warranty_blocked: false,
    });
  };

  const { data: docsData } = useQuery({
    queryKey: ['documents', order.id],
    queryFn: () => base44.functions.invoke('listOrderDocuments', { order_id: order.id }),
  });
  const termo = (docsData?.data?.documents || []).find((d) => d.document_type === 'level1_acceptance');

  const download = useMutation({
    mutationFn: (documentId) => base44.functions.invoke('downloadOrderDocument', { document_id: documentId }),
    onSuccess: (res) => {
      const url = res?.data?.signed_url;
      if (url) window.open(url, '_blank');
    },
  });

  if (order.level1_accepted) {
    return (
      <Card className="bg-green-50 border-2 border-green-300">
        <CardContent className="pt-6 text-center">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-green-900 font-bold text-lg">Aceite Nível 1 Assinado</p>
          <p className="text-green-800 text-sm mt-2">
            Data: {new Date(order.level1_date).toLocaleString('pt-BR')}
          </p>
          <p className="text-green-800 text-sm mt-1">
            IP: {order.level1_ip} | Dispositivo: {order.level1_device}
          </p>
          <Button
            className="mt-6 bg-green-600 hover:bg-green-700 gap-2"
            disabled={!termo || download.isPending}
            onClick={() => termo && download.mutate(termo.id)}
          >
            {download.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Baixar Termo
          </Button>
          {!termo && (
            <p className="text-green-800 text-xs mt-2">O PDF do termo está sendo gerado e aparecerá aqui em instantes.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-orange-50 border-b">
          <CardTitle className="flex gap-2 items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Aviso Legal Obrigatório
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded">
            <p className="text-orange-900 font-bold mb-3">ATENÇÃO</p>
            <p className="text-orange-800 text-sm leading-relaxed">
              Este material será fabricado sob medida conforme especificação informada pelo cliente.
              Após a fabricação não será possível <strong>cancelamento, devolução ou alteração</strong> do pedido.
            </p>
            <p className="text-orange-800 text-sm leading-relaxed mt-3">
              A responsabilidade sobre o produto passa ao cliente após a entrega.
            </p>
          </div>

          <label className="flex items-start gap-3 mt-6 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={setAgreed}
              className="mt-1"
            />
            <span className="text-sm font-semibold text-slate-900">
              Li, entendi e concordo com a fabricação sob medida. Assumo total responsabilidade após a entrega.
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>Assinatura Digital do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <canvas
            ref={canvasRef}
            className="border-2 border-dashed border-slate-300 rounded-lg bg-white w-full cursor-crosshair"
            style={{ maxWidth: '100%' }}
          ></canvas>
          <Button
            variant="outline"
            onClick={() => signaturePad?.clear()}
            className="w-full"
          >
            Limpar Assinatura
          </Button>

          <Button
            onClick={handleSign}
            disabled={updateMutation.isPending || !agreed}
            className="w-full bg-orange-600 hover:bg-orange-700 gap-2 h-12"
          >
            <Send className="w-4 h-4" />
            {updateMutation.isPending ? 'Processando...' : 'Assinar e Autorizar Fabricação'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-50">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600">
            <strong>Dados Registrados:</strong> Esta assinatura será registrada com data, hora, IP do dispositivo e localização aproximada para fins de prova jurídica.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}