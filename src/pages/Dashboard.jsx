import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import StatsCards from '../components/dashboard/StatsCards.jsx';
import OrdersTable from '../components/dashboard/OrdersTable.jsx';

export default function Dashboard() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-sale_date', 100),
  });

  const stats = {
    total: orders.length,
    em_fabricacao: orders.filter(o => o.status === 'em_fabricacao').length,
    sem_aceite: orders.filter(o => !o.level1_accepted).length,
    com_fotos: orders.filter(o => o.photos_installation?.length > 0).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Sistema de Aceite Jurídico</h1>
          <p className="text-slate-600 mt-1">Telhas Metálicas - Blindagem Jurídica</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCards icon={FileText} title="Total de Pedidos" value={stats.total} color="text-blue-600" />
          <StatsCards icon={Loader2} title="Em Fabricação" value={stats.em_fabricacao} color="text-yellow-600" />
          <StatsCards icon={AlertCircle} title="Sem Aceite" value={stats.sem_aceite} color="text-red-600" />
          <StatsCards icon={CheckCircle2} title="Com Fotos" value={stats.com_fotos} color="text-green-600" />
        </div>

        {/* Orders Table */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle>Pedidos Registrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <OrdersTable orders={orders} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}