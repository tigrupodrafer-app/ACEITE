import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Loader2, User, Package, Receipt } from 'lucide-react';

const CONF_META = (c) =>
  c >= 0.9
    ? { text: 'Identificação confiável', cls: 'bg-green-100 text-green-700' }
    : c >= 0.7
    ? { text: 'Necessita conferência', cls: 'bg-amber-100 text-amber-700' }
    : { text: 'Baixa confiança', cls: 'bg-red-100 text-red-700' };

const CRITICAL = ['client_name', 'material', 'quantity'];

function Field({ fieldKey, label, form, set, type = 'text' }) {
  const empty = !String(form[fieldKey] || '').trim();
  const isCritical = CRITICAL.includes(fieldKey);
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      {type === 'select' ? (
        <select
          value={form[fieldKey]}
          onChange={set(fieldKey)}
          className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">Selecione...</option>
          <option value="BGL">BGL</option>
          <option value="Galvalume">Galvalume</option>
          <option value="Pre-pintada">Pre-pintada</option>
        </select>
      ) : (
        <Input className="mt-1" type={type} value={form[fieldKey]} onChange={set(fieldKey)} />
      )}
      {empty && isCritical && (
        <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Não identificado automaticamente. Preencha manualmente.
        </p>
      )}
    </div>
  );
}

export default function ExtractedDataReview({ extracted, user, loading, error, onConfirm, onBack }) {
  const { data, confidence } = extracted;

  const [form, setForm] = useState({
    client_name: data.client.name || '',
    client_document: data.client.document || '',
    client_phone: data.client.phone || '',
    client_email: data.client.email || '',
    client_address: data.client.address || '',
    site_responsible: data.client.site_responsible || '',
    product_code: data.product.product_code || '',
    tile_model: data.product.tile_model || '',
    tile_type: data.product.tile_type || '',
    material: data.product.material || '',
    thickness: data.product.thickness || '',
    length: data.product.length || '',
    quantity: data.product.quantity != null ? String(data.product.quantity) : '',
    approx_weight: data.product.approx_weight || '',
    sale_date: data.sale.sale_date || '',
    seller_name: data.sale.seller_name || (user?.full_name || ''),
    seller_phone: data.sale.seller_phone || (user?.phone || ''),
    store_name: data.sale.store_name || '',
  });
  const [missing, setMissing] = useState([]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isEmpty = (k) => !String(form[k] || '').trim();

  const handleConfirm = () => {
    const req = ['client_name', 'material', 'quantity'].filter(isEmpty);
    if (req.length) {
      setMissing(req);
      return;
    }
    setMissing([]);
    onConfirm(form);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Dados Identificados</h1>
          <p className="text-slate-600 mt-2">
            Confira e corrija os dados antes de criar o pedido. Campos críticos não identificados estão destacados.
          </p>
        </div>

        {/* Confiança da IA */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['client', 'material', 'quantity'].map((k) => {
            const meta = CONF_META(confidence?.[k] ?? 0);
            return (
              <span key={k} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${meta.cls}`}>
                {k === 'client' ? 'Cliente' : k === 'material' ? 'Material' : 'Quantidade'}: {meta.text} ({Math.round((confidence?.[k] ?? 0) * 100)}%)
              </span>
            );
          })}
        </div>

        {missing.length > 0 && (
          <div className="flex gap-3 bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">Preencha os campos obrigatórios destacados antes de confirmar.</p>
          </div>
        )}

        {error && (
          <div className="flex gap-3 bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Cliente */}
          <div className="rounded-xl border bg-white shadow overflow-hidden">
            <div className="py-3 px-4 border-b flex items-center gap-2" style={{ backgroundColor: '#1a1a1a' }}>
              <User className="w-4 h-4" style={{ color: '#cc0000' }} />
              <span className="text-white text-sm font-semibold">Dados do Cliente</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field fieldKey="client_name" label="Cliente / Razão Social" form={form} set={set} />
              <Field fieldKey="client_document" label="CPF / CNPJ" form={form} set={set} />
              <Field fieldKey="client_phone" label="Telefone do Cliente" form={form} set={set} />
              <Field fieldKey="client_email" label="E-mail" form={form} set={set} />
              <div className="md:col-span-2">
                <Field fieldKey="client_address" label="Endereço da Obra" form={form} set={set} />
              </div>
              <Field fieldKey="site_responsible" label="Responsável pela Obra" form={form} set={set} />
            </div>
          </div>

          {/* Produto */}
          <div className="rounded-xl border bg-white shadow overflow-hidden">
            <div className="py-3 px-4 border-b flex items-center gap-2" style={{ backgroundColor: '#1a1a1a' }}>
              <Package className="w-4 h-4 text-orange-400" />
              <span className="text-white text-sm font-semibold">Material e Produto</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field fieldKey="material" label="Material" form={form} set={set} type="select" />
              <Field fieldKey="tile_model" label="Modelo" form={form} set={set} />
              <Field fieldKey="tile_type" label="Tipo / Descrição da Telha" form={form} set={set} />
              <Field fieldKey="product_code" label="Código do Produto" form={form} set={set} />
              <Field fieldKey="thickness" label="Espessura" form={form} set={set} />
              <Field fieldKey="length" label="Comprimento" form={form} set={set} />
              <Field fieldKey="quantity" label="Quantidade" form={form} set={set} type="number" />
              <Field fieldKey="approx_weight" label="Peso Aproximado" form={form} set={set} />
            </div>
          </div>

          {/* Venda */}
          <div className="rounded-xl border bg-white shadow overflow-hidden">
            <div className="py-3 px-4 border-b flex items-center gap-2" style={{ backgroundColor: '#1a1a1a' }}>
              <Receipt className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm font-semibold">Venda</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field fieldKey="sale_date" label="Data da Venda" form={form} set={set} type="date" />
              <Field fieldKey="seller_name" label="Vendedor" form={form} set={set} />
              <Field fieldKey="seller_phone" label="WhatsApp do Vendedor" form={form} set={set} />
              <Field fieldKey="store_name" label="Loja" form={form} set={set} />
            </div>
          </div>

          <div className="flex gap-3 justify-end pb-8">
            <Button variant="outline" onClick={onBack} disabled={loading}>
              Voltar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="font-bold text-white"
              style={{ backgroundColor: '#cc0000' }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Confirmar Dados</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}