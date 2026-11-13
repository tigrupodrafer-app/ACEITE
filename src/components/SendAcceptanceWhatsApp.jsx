import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Copy, Check, Loader2, Factory } from 'lucide-react';

export default function SendAcceptanceWhatsApp({ order }) {
  const [whatsappNumber, setWhatsappNumber] = useState(order.client_phone || '');
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateAcceptanceLink', { orderId: order.id });
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedUrl(data.signatureUrl);
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!whatsappNumber) {
      alert('Digite o número do WhatsApp do cliente');
      return;
    }
    const cleanNumber = whatsappNumber.replace(/\D/g, '');

    const itemsText = (order.manufacturing_order_items || [])
      .map(item => {
        const modelo = item.modelo || item.descricao?.match(/^[A-Z]+-?\d+/)?.[0] || '';
        return `  • ${item.qtd_pc} pc × ${item.comprimento}mm = ${item.qtd_metros}m${modelo ? ` (${modelo})` : ''}`;
      })
      .join('\n');

    const message = encodeURIComponent(
      `Olá ${order.client_name}! 👋\n\n` +
      `Segue seu *Aceite de Fabricação* — Pedido ${order.order_number}:\n\n` +
      `📋 *Dados do Pedido:*\n` +
      `  • Material: ${order.material}${order.tile_type ? ` - ${order.tile_type}` : ''}\n` +
      (order.thickness ? `  • Espessura: ${order.thickness}\n` : '') +
      `\n` +
      (order.manufacturing_auth_number
        ? `📐 *Autorização de Fabricação nº ${order.manufacturing_auth_number}:*\n${itemsText}\n\n` +
          `📦 Total: ${order.manufacturing_total_pc} peças | ${order.manufacturing_total_metros} metros\n\n`
        : '') +
      `👉 Clique para revisar e *assinar digitalmente*:\n` +
      `${generatedUrl}\n\n` +
      `⚠️ Após a fabricação não é possível cancelamento, devolução ou alteração.`
    );

    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  return (
    <Card className="border-2" style={{ borderColor: '#cc0000' }}>
      <CardHeader className="border-b" style={{ backgroundColor: '#1a1a1a' }}>
        <CardTitle className="flex gap-2 items-center text-white text-base">
          <Factory className="w-5 h-5" style={{ color: '#cc0000' }} />
          Aceite de Fabricação
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <p className="text-xs text-slate-500">
          Envie o link completo com o pedido e a ordem de fabricação para o cliente assinar.
        </p>
        <div>
          <Label className="text-xs">WhatsApp do Cliente (com DDD)</Label>
          <Input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="11999999999"
            className="mt-1 h-9"
          />
        </div>

        {!generatedUrl ? (
          <Button
            onClick={() => generateLinkMutation.mutate()}
            disabled={generateLinkMutation.isPending}
            className="w-full h-10 gap-2 text-white"
            style={{ backgroundColor: '#cc0000' }}
          >
            {generateLinkMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
            ) : 'Gerar Link de Aceite de Fabricação'}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={generatedUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-xs bg-slate-50"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              onClick={handleSendWhatsApp}
              className="w-full h-10 gap-2 font-semibold text-white"
              style={{ backgroundColor: '#22c55e' }}
            >
              <MessageCircle className="w-4 h-4" />
              Abrir WhatsApp e Enviar
            </Button>
            <Button variant="outline" onClick={() => setGeneratedUrl(null)} className="w-full h-9 text-sm">
              Gerar novo link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}