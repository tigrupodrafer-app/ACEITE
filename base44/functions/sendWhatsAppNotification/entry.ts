import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Limita o tamanho de qualquer texto que entre na mensagem, para que ninguém
// possa usar esta função como gerador de mensagens arbitrárias.
const clamp = (value: unknown, max: number) =>
    String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { sellerPhone, clientName, orderNumber, tileType, quantity } = await req.json();

        if (!sellerPhone || !clientName || !orderNumber) {
            return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
        }

        // Formata o telefone
        const cleanedPhone = String(sellerPhone).replace(/\D/g, '');
        if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
            return Response.json({ error: 'Telefone inválido' }, { status: 400 });
        }
        const formattedPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;

        // Monta a mensagem
        const message = `Olá! O cliente *${clamp(clientName, 120)}* finalizou o aceite do pedido *#${clamp(orderNumber, 40)}*.\n\nProduto: ${clamp(tileType, 80) || 'Conforme especificado'}\nQuantidade: ${clamp(quantity, 40) || 'Conforme especificado'}\n\nAcesse o sistema para mais detalhes.`;

        // Gera a URL do WhatsApp
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

        return Response.json({
            success: true,
            whatsapp_url: whatsappUrl
        });
    } catch (error) {
        console.error('sendWhatsAppNotification error:', error);
        return Response.json({ error: 'Não foi possível gerar a notificação. Tente novamente.' }, { status: 500 });
    }
});
