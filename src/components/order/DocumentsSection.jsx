import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, RefreshCw, Loader2, AlertTriangle, Clock } from 'lucide-react';

const DOC_ROWS = [
  { type: 'level1_acceptance', label: 'Termo de Aceite — Pedido', available: (o) => !!o.level1_accepted },
  { type: 'warranty', label: 'Termo de Garantia', available: (o) => !!o.level1_accepted },
];

export default function DocumentsSection({ order }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', order.id],
    queryFn: () => base44.functions.invoke('listOrderDocuments', { order_id: order.id }),
  });

  const documents = data?.data?.documents || [];

  const generate = useMutation({
    mutationFn: (payload) => base44.functions.invoke('generateOrderDocument', payload),
    onSuccess: () => refetch(),
  });

  const download = useMutation({
    mutationFn: (documentId) => base44.functions.invoke('downloadOrderDocument', { document_id: documentId }),
    onSuccess: (res) => {
      const url = res?.data?.signed_url;
      if (url) window.open(url, '_blank');
    },
  });

  const docFor = (type) => documents.find((d) => d.document_type === type) || null;

  return (
    <Card>
      <CardHeader className="border-b" style={{ backgroundColor: '#1a1a1a' }}>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <FileText className="w-4 h-4" /> DOCUMENTOS
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {DOC_ROWS.map((row) => {
          const doc = docFor(row.type);
          const accepted = row.available(order);
          const generating = generate.isPending && generate.variables?.document_type === row.type;
          const downloading = download.isPending && download.variables === doc?.id;
          const failed = generate.isError && generate.variables?.document_type === row.type;

          return (
            <div key={row.type} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg px-4 py-3 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 shrink-0" style={{ color: '#cc0000' }} />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{row.label}</p>
                  {doc ? (
                    <p className="text-xs text-slate-500">
                      v{doc.version} • gerado em {doc.generated_at ? new Date(doc.generated_at).toLocaleString('pt-BR') : '—'}
                      {doc.file_hash ? ` • hash ${String(doc.file_hash).slice(0, 10)}…` : ''}
                    </p>
                  ) : accepted ? (
                    <p className="text-xs text-slate-500">Aceite registrado — documento em geração</p>
                  ) : (
                    <p className="text-xs text-slate-400">Disponível após o aceite correspondente</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {doc && (
                  <Badge className="bg-green-100 text-green-800">Disponível</Badge>
                )}
                {doc && (
                  <Button
                    size="sm"
                    className="gap-2"
                    style={{ backgroundColor: '#cc0000' }}
                    onClick={() => download.mutate(doc.id)}
                    disabled={downloading}
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    BAIXAR PDF
                  </Button>
                )}
                {!doc && generating && (
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Gerando documento...
                  </span>
                )}
                {!doc && !generating && accepted && (
                  <Button
                    size="sm"
                    variant={failed ? 'destructive' : 'outline'}
                    className="gap-2"
                    onClick={() => generate.mutate({ order_id: order.id, document_type: row.type })}
                  >
                    {failed ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {failed ? 'TENTAR GERAR NOVAMENTE' : 'GERAR AGORA'}
                  </Button>
                )}
                {doc && isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    title="Gera uma nova versão, mantendo a original em auditoria"
                    onClick={() => generate.mutate({ order_id: order.id, document_type: row.type })}
                    disabled={generating}
                  >
                    <RefreshCw className="w-4 h-4" /> Regenerar
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {download.isError && (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Não foi possível abrir o documento. Tente novamente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}