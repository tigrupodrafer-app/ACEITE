import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/apiClient';
import StatsCards from '../components/dashboard/StatsCards.jsx';
import OrdersTable from '../components/dashboard/OrdersTable.jsx';

export default function Dashboard() {
  const { data: orders = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['aceite-orders'],
    queryFn: async () => {
      const data = await apiGet('/.netlify/functions/orders?limit=100');
      return data.orders || [];
    },
  });

  const stats = {
    total: orders.length,
    fabricacao: orders.filter(o => o.status === 'em_fabricacao').length,
    pendentes: orders.filter(o => ['aguardando_aceite_pedido', 'aguardando_aceite_entrega', 'aguardando_aceite_instalacao'].includes(o.status)).length,
    concluidos: orders.filter(o => o.status === 'concluido').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">DRAFER ACEITE</h1>
            <p className="text-slate-600 mt-1">Pedidos jurídicos — Supabase</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'w-4 h-4 mr-2 animate-spin' : 'w-4 h-4 mr-2'} /> Atualizar
          </Button>
        </div>
        {isError && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-5">
          Não foi possível carregar pedidos: {error?.message}
        </div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCards icon={FileText} title="Pedidos carregados" value={isLoading ? '—' : stats.total} color="text-blue-600" />
          <StatsCards icon={Loader2} title="Em fabricação" value={isLoading ? '—' : stats.fabricacao} color="text-yellow-600" />
          <StatsCards icon={AlertCircle} title="Aguardando aceite" value={isLoading ? '—' : stats.pendentes} color="text-red-600" />
          <StatsCards icon={CheckCircle2} title="Concluídos" value={isLoading ? '—' : stats.concluidos} color="text-green-600" />
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Exibindo até 100 pedidos da base Supabase. O cadastro e a visualização detalhada ainda estão em migração.
        </p>
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-slate-50"><CardTitle>Pedidos registrados</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isError ? <p className="p-6">Pedidos indisponíveis.</p> :
              <OrdersTable orders={orders} isLoading={isLoading} readOnly />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
