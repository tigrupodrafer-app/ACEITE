import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function ConfigureSeller() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setPhone(u?.seller_phone || '');
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!phone.trim()) {
      alert('Digite um telefone válido');
      return;
    }

    setSaving(true);
    try {
      await base44.functions.invoke('updateSellerPhone', { phone });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader style={{ backgroundColor: '#1a1a1a' }}>
            <CardTitle className="text-white">Configurar Telefone do Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-gray-600">
              Configure seu número de telefone para receber notificações via WhatsApp quando clientes assinarem pedidos.
            </p>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (com DDD)</Label>
              <Input
                id="phone"
                placeholder="(18) 99805-3375"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg"
              />
              <p className="text-xs text-gray-500">Exemplo: (18) 99805-3375</p>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-300 rounded p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">Telefone salvo com sucesso!</span>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 h-10 gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Salvando...' : 'Salvar Telefone'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}