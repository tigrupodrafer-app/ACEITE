import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, User, Phone } from 'lucide-react';

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setPhone(u?.phone || '');
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ phone });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Meu Perfil</h1>
          <p className="text-slate-600 mt-1">Cadastre seu WhatsApp para receber notificações de aceite</p>
        </div>

        <Card>
          <CardHeader style={{ backgroundColor: '#1a1a1a' }} className="rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="w-5 h-5" style={{ color: '#cc0000' }} />
              Dados do Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div>
              <Label className="text-slate-700 font-semibold">Nome</Label>
              <Input value={user.full_name || ''} disabled className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold">E-mail</Label>
              <Input value={user.email || ''} disabled className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" style={{ color: '#cc0000' }} />
                WhatsApp (com DDD)
              </Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ex: 11999998888"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Este número receberá uma mensagem quando o cliente assinar o aceite.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full text-white font-bold"
              style={{ backgroundColor: '#cc0000' }}
            >
              {saved ? (
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Salvo!</span>
              ) : saving ? 'Salvando...' : 'Salvar WhatsApp'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}