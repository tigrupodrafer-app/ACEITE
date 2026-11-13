import React, { useRef, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Send, FileText } from 'lucide-react';
import SignaturePad from 'signature_pad';

export default function TabLevel3({ order, refetch }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [unloadingChecks, setUnloadingChecks] = useState({
    nao_arrastar: false,
    nao_torcao: false,
    apoio_adequado: false,
    sem_impacto: false,
    equipe_adequada: false,
  });
  const [storageChecks, setStorageChecks] = useState({
    local_seco: false,
    evitar_umidade: false,
    ventilacao: false,
    nao_solo: false,
    nao_empilhado: false,
  });
  const [installationChecks, setInstallationChecks] = useState({
    normas_tecnicas: false,
    caimento_minimo: false,
    fixadores_corretos: false,
    cortes_corretos: false,
    profissional_qualificado: false,
  });

  useEffect(() => {
    if (canvasRef.current && !order.level3_accepted) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = 200 * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      const pad = new SignaturePad(canvas);
      setSignaturePad(pad);
    }
  }, [order.level3_accepted]);

  const [serverError, setServerError] = useState(null);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // O aceite é registrado pelo servidor, que reconfere a ordem dos níveis
      // e só libera a garantia quando os três estão completos
      const res = await base44.functions.invoke('signOrderLevel', {
        order_id: order.id,
        level: 3,
        ...data,
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
      base44.functions.invoke('generateOrderDocument', { order_id: order.id, level: 3 }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      refetch();
    },
  });

  const handleSign = () => {
    if (!Object.values(unloadingChecks).every(v => v)) {
      alert('Todos os itens de descarregamento devem ser confirmados');
      return;
    }
    if (!Object.values(storageChecks).every(v => v)) {
      alert('Todos os itens de armazenagem devem ser confirmados');
      return;
    }
    if (!Object.values(installationChecks).every(v => v)) {
      alert('Todos os itens de instalação devem ser confirmados');
      return;
    }
    if (!signaturePad || signaturePad.isEmpty()) {
      alert('Assinatura obrigatória');
      return;
    }

    const signatureData = signaturePad.toDataURL();
    updateMutation.mutate({
      signature: signatureData,
      unloading_checklist: unloadingChecks,
      storage_checklist: storageChecks,
      installation_checklist: installationChecks,
    });
  };

  if (order.level3_accepted) {
    return (
      <Card className="bg-green-50 border-2 border-green-300">
        <CardContent className="pt-6 text-center">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-green-900 font-bold text-lg">Aceite Nível 3 Completo</p>
          <p className="text-green-800 text-sm mt-2">
            Data: {new Date(order.level3_date).toLocaleString('pt-BR')}
          </p>
          <p className="text-green-800 text-sm mt-3">
            Toda responsabilidade de transporte, armazenamento e instalação está sob responsabilidade do cliente.
          </p>
          <Button className="mt-6 bg-green-600 hover:bg-green-700 gap-2">
            <FileText className="w-4 h-4" /> Baixar Termo Completo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Descarregamento */}
      <Card>
        <CardHeader className="bg-blue-50 border-b">
          <CardTitle>Descarregamento</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {[
            { key: 'nao_arrastar', label: 'As telhas não devem ser arrastadas' },
            { key: 'nao_torcao', label: 'Não devem sofrer torção' },
            { key: 'apoio_adequado', label: 'Devem ser descarregadas com apoio adequado' },
            { key: 'sem_impacto', label: 'Não devem sofrer impacto ou queda' },
            { key: 'equipe_adequada', label: 'Devem ser movimentadas com equipe adequada' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={unloadingChecks[item.key]}
                onCheckedChange={(checked) => setUnloadingChecks(prev => ({ ...prev, [item.key]: checked }))}
              />
              <span className="text-sm text-slate-700">{item.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Armazenagem */}
      <Card>
        <CardHeader className="bg-blue-50 border-b">
          <CardTitle>Armazenagem</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {[
            { key: 'local_seco', label: 'Armazenar em local seco' },
            { key: 'evitar_umidade', label: 'Evitar contato com água ou umidade' },
            { key: 'ventilacao', label: 'Manter ventilação entre as telhas' },
            { key: 'nao_solo', label: 'Não encostar diretamente no solo' },
            { key: 'nao_empilhado', label: 'Não empilhar de forma inadequada' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={storageChecks[item.key]}
                onCheckedChange={(checked) => setStorageChecks(prev => ({ ...prev, [item.key]: checked }))}
              />
              <span className="text-sm text-slate-700">{item.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Instalação */}
      <Card>
        <CardHeader className="bg-blue-50 border-b">
          <CardTitle>Instalação</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {[
            { key: 'normas_tecnicas', label: 'A instalação seguirá normas técnicas' },
            { key: 'caimento_minimo', label: 'O telhado terá caimento adequado' },
            { key: 'fixadores_corretos', label: 'Serão usados fixadores corretos' },
            { key: 'cortes_corretos', label: 'Os cortes serão feitos com ferramenta adequada' },
            { key: 'profissional_qualificado', label: 'A instalação será feita por profissional qualificado' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={installationChecks[item.key]}
                onCheckedChange={(checked) => setInstallationChecks(prev => ({ ...prev, [item.key]: checked }))}
              />
              <span className="text-sm text-slate-700">{item.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Aviso Final */}
      <Card className="bg-red-50 border-2 border-red-300">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900 mb-2">ATENÇÃO - AVISO FINAL</p>
              <p className="text-red-800 text-sm leading-relaxed">
                Após a entrega do material, toda responsabilidade de transporte, armazenagem e instalação passa ao cliente.
              </p>
              <p className="text-red-800 text-sm leading-relaxed mt-2">
                A empresa não se responsabiliza por danos causados por descarga inadequada, transporte incorreto, armazenagem inadequada, instalação incorreta, corte inadequado, contato com produtos químicos ou ambientes corrosivos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assinatura */}
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>Assinatura Digital - Aceito e Assumo Responsabilidade</CardTitle>
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
            className="w-full bg-green-600 hover:bg-green-700 gap-2 h-12 text-base font-bold"
          >
            <Send className="w-4 h-4" />
            {updateMutation.isPending ? 'Processando...' : 'ACEITO E ASSUMO RESPONSABILIDADE'}
          </Button>

          {serverError && (
            <p className="text-sm font-semibold text-red-600">{serverError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}