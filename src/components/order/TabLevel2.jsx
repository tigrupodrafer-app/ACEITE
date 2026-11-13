import React, { useRef, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Send, FileText, Upload } from 'lucide-react';
import SignaturePad from 'signature_pad';

export default function TabLevel2({ order, refetch }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [checklist, setChecklist] = useState({
    conferido: false,
    quantidades_corretas: false,
    sem_danos: false,
    responsabilidade_aceita: false,
  });
  const [receiverName, setReceiverName] = useState('');
  const [receiverDoc, setReceiverDoc] = useState('');
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    if (canvasRef.current && !order.level2_accepted) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = 200 * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      const pad = new SignaturePad(canvas);
      setSignaturePad(pad);
    }
  }, [order.level2_accepted]);

  const [serverError, setServerError] = useState(null);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      let photoUrl = null;
      if (photoFile) {
        const uploadRes = await base44.integrations.Core.UploadFile({ file: photoFile });
        photoUrl = uploadRes.file_url;
      }
      // O aceite é registrado pelo servidor, que reconfere a ordem dos níveis
      const res = await base44.functions.invoke('signOrderLevel', {
        order_id: order.id,
        level: 2,
        ...data,
        photo_url: photoUrl || undefined,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Não foi possível registrar o aceite.');
      }
      return res.data;
    },
    onError: (e) => setServerError(e.message || 'Não foi possível registrar o aceite.'),
    onSuccess: () => {
      setServerError(null);
      // Geração do PDF do termo — em segundo plano; falha não afeta o aceite
      base44.functions.invoke('generateOrderDocument', { order_id: order.id, level: 2 }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      refetch();
    },
  });

  const handleSign = () => {
    if (!Object.values(checklist).every(v => v)) {
      alert('Todos os itens do checklist devem ser confirmados');
      return;
    }
    if (!receiverName || !receiverDoc) {
      alert('Dados de quem recebeu são obrigatórios');
      return;
    }
    if (!signaturePad || signaturePad.isEmpty()) {
      alert('Assinatura obrigatória');
      return;
    }

    const signatureData = signaturePad.toDataURL();
    updateMutation.mutate({
      signature: signatureData,
      receiver_name: receiverName,
      receiver_document: receiverDoc,
      checklist,
    });
  };

  if (order.level2_accepted) {
    return (
      <Card className="bg-green-50 border-2 border-green-300">
        <CardContent className="pt-6 text-center">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-green-900 font-bold text-lg">Aceite Nível 2 Assinado</p>
          <p className="text-green-800 text-sm mt-2">
            Data: {new Date(order.level2_date).toLocaleString('pt-BR')}
          </p>
          <p className="text-green-800 text-sm mt-1">
            Recebido por: {order.level2_receiver_name}
          </p>
          <Button className="mt-6 bg-green-600 hover:bg-green-700 gap-2">
            <FileText className="w-4 h-4" /> Baixar Termo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-blue-50 border-b">
          <CardTitle>Checklist de Recebimento</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {[
            { key: 'conferido', label: 'Conferiu o material no momento da entrega' },
            { key: 'quantidades_corretas', label: 'As quantidades estão corretas' },
            { key: 'sem_danos', label: 'Não há danos visíveis no momento da entrega' },
            { key: 'responsabilidade_aceita', label: 'A partir da descarga a responsabilidade passa ao cliente' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={checklist[item.key]}
                onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, [item.key]: checked }))}
              />
              <span className="text-sm text-slate-700">{item.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>Dados de Quem Recebeu</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Nome completo"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Documento</Label>
            <Input
              value={receiverDoc}
              onChange={(e) => setReceiverDoc(e.target.value)}
              placeholder="CPF"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex gap-2 items-center">
            <Upload className="w-4 h-4" /> Foto da Entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0])}
              className="hidden"
              id="photo-input"
            />
            <label htmlFor="photo-input" className="cursor-pointer">
              <div className="text-slate-600">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">Clique para adicionar foto</p>
                {photoFile && <p className="text-xs text-green-600 mt-2">✓ {photoFile.name}</p>}
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>Assinatura Digital</CardTitle>
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
            disabled={updateMutation.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700 gap-2 h-12"
          >
            <Send className="w-4 h-4" />
            {updateMutation.isPending ? 'Processando...' : 'Assinar Recebimento'}
          </Button>

          {serverError && (
            <p className="text-sm font-semibold text-red-600">{serverError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}