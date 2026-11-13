import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Save, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function NewOrder() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client_name: '',
    client_document: '',
    client_phone: '',
    client_email: '',
    client_address: '',
    site_responsible: '',
    sale_date: new Date().toISOString().split('T')[0],
    seller_name: '',
    store_name: '',
    tile_type: '',
    material: '',
    thickness: '',
    length: '',
    quantity: '',
    approx_weight: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      window.location.href = `${createPageUrl('OrderDetail')}?id=${newOrder.id}`;
    },
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.client_name || !formData.client_document || !formData.material) {
        alert('Preencha todos os campos obrigatórios');
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    const orderNumber = `PED-${Date.now()}`;
    createMutation.mutate({
      ...formData,
      order_number: orderNumber,
      status: 'aguardando_aceite_pedido',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Novo Pedido</h1>
          <p className="text-slate-600 mt-2">Etapa {step} de 2</p>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
            <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${(step / 2) * 100}%` }}></div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle>
              {step === 1 ? 'Dados do Cliente e Pedido' : 'Confirmar Especificações'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 mb-4">Dados do Cliente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome / Razão Social *</Label>
                      <Input value={formData.client_name} onChange={(e) => handleInputChange('client_name', e.target.value)} placeholder="Nome completo" className="mt-1" />
                    </div>
                    <div>
                      <Label>CPF / CNPJ *</Label>
                      <Input value={formData.client_document} onChange={(e) => handleInputChange('client_document', e.target.value)} placeholder="000.000.000-00" className="mt-1" />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input value={formData.client_phone} onChange={(e) => handleInputChange('client_phone', e.target.value)} placeholder="(11) 99999-9999" className="mt-1" />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input value={formData.client_email} onChange={(e) => handleInputChange('client_email', e.target.value)} placeholder="cliente@email.com" className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label>Endereço da Obra</Label>
                      <Input value={formData.client_address} onChange={(e) => handleInputChange('client_address', e.target.value)} placeholder="Rua, número, cidade" className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label>Responsável pela Obra</Label>
                      <Input value={formData.site_responsible} onChange={(e) => handleInputChange('site_responsible', e.target.value)} placeholder="Nome do responsável" className="mt-1" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-4">Dados da Venda</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data da Venda</Label>
                      <Input type="date" value={formData.sale_date} onChange={(e) => handleInputChange('sale_date', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Vendedor</Label>
                      <Input value={formData.seller_name} onChange={(e) => handleInputChange('seller_name', e.target.value)} placeholder="Nome do vendedor" className="mt-1" />
                    </div>
                    <div>
                      <Label>Loja</Label>
                      <Input value={formData.store_name} onChange={(e) => handleInputChange('store_name', e.target.value)} placeholder="Nome da loja" className="mt-1" />
                    </div>
                    <div>
                      <Label>Tipo de Telha</Label>
                      <Input value={formData.tile_type} onChange={(e) => handleInputChange('tile_type', e.target.value)} placeholder="Ex: Telha Colonial" className="mt-1" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-4">Especificações do Material</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Material *</Label>
                      <Select value={formData.material} onValueChange={(value) => handleInputChange('material', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BGL">BGL (Bobina Galvalume)</SelectItem>
                          <SelectItem value="Galvalume">Galvalume</SelectItem>
                          <SelectItem value="Pre-pintada">Telha Pré-Pintada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Espessura</Label>
                      <Input value={formData.thickness} onChange={(e) => handleInputChange('thickness', e.target.value)} placeholder="Ex: 0.5mm" className="mt-1" />
                    </div>
                    <div>
                      <Label>Comprimento</Label>
                      <Input value={formData.length} onChange={(e) => handleInputChange('length', e.target.value)} placeholder="Ex: 2000mm" className="mt-1" />
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input type="number" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} placeholder="0" className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label>Peso Aproximado</Label>
                      <Input value={formData.approx_weight} onChange={(e) => handleInputChange('approx_weight', e.target.value)} placeholder="Ex: 500kg" className="mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">Resumo do Pedido</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                    <p><strong>Cliente:</strong> {formData.client_name}</p>
                    <p><strong>Material:</strong> {formData.material}</p>
                    <p><strong>Quantidade:</strong> {formData.quantity} unidades</p>
                    <p><strong>Espessura:</strong> {formData.thickness}</p>
                  </div>
                </div>

                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 flex gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-orange-900 mb-2">ATENÇÃO</p>
                    <p className="text-sm text-orange-800">
                      Este material será fabricado sob medida conforme especificação informada pelo cliente.
                      Após a fabricação não será possível cancelamento, devolução ou alteração do pedido.
                    </p>
                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                      <input type="checkbox" required className="w-4 h-4" />
                      <span className="text-sm font-semibold text-orange-900">Li e concordo com a fabricação sob medida</span>
                    </label>
                  </div>
                </div>

                <p className="text-sm text-slate-600">
                  Após confirmar, o pedido será criado e aguardará aceite do cliente para iniciar a fabricação.
                </p>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              {step === 2 && (
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
              )}
              {step === 1 && (
                <Button onClick={handleNext} className="flex-1 bg-slate-900 hover:bg-slate-800">
                  Próximo <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {step === 2 && (
                <Button onClick={handleSubmit} className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={createMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? 'Criando...' : 'Criar Pedido'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}