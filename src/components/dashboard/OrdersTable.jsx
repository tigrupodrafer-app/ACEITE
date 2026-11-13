import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function OrdersTable({ orders, isLoading, readOnly = false }) {
  const statusLabels = {
    'rascunho': 'Rascunho',
    'aguardando_aceite_pedido': 'Aguardando Aceite',
    'em_fabricacao': 'Em Fabricação',
    'aguardando_aceite_entrega': 'Aguardando Entrega',
    'entregue': 'Entregue',
    'aguardando_aceite_instalacao': 'Aguardando Instalação',
    'concluido': 'Concluído',
  };

  const statusColors = {
    'rascunho': 'bg-gray-200',
    'aguardando_aceite_pedido': 'bg-yellow-200',
    'em_fabricacao': 'bg-blue-200',
    'aguardando_aceite_entrega': 'bg-yellow-200',
    'entregue': 'bg-green-100',
    'aguardando_aceite_instalacao': 'bg-yellow-200',
    'concluido': 'bg-green-200',
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-600">Carregando pedidos...</div>;
  }

  if (orders.length === 0) {
    return <div className="p-6 text-center text-slate-600">Nenhum pedido criado ainda.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 border-b">
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Qtd</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aceites</TableHead>
            <TableHead>Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-sm font-bold">{order.order_number}</TableCell>
              <TableCell className="text-sm">{order.client_name}</TableCell>
              <TableCell className="text-sm">{order.material || '—'}</TableCell>
              <TableCell className="text-sm">{order.quantity ?? '—'}</TableCell>
              <TableCell>
                <Badge className={`${statusColors[order.status]} text-slate-900 text-xs`}>
                  {statusLabels[order.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <div className="flex gap-1">
                  {order.level1_accepted && <span className="text-green-600 font-bold">✓</span>}
                  {order.level2_accepted && <span className="text-green-600 font-bold">✓</span>}
                  {order.level3_accepted && <span className="text-green-600 font-bold">✓</span>}
                  {order.warranty_blocked && <AlertCircle className="w-4 h-4 text-red-600" />}
                </div>
              </TableCell>
              <TableCell>
                {readOnly ? (
                  <span className="text-xs text-slate-500">Detalhes em migração</span>
                ) : (
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <a href={`${createPageUrl('OrderDetail')}?id=${order.id}`}>
                      <Eye className="w-4 h-4" /> Ver
                    </a>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}