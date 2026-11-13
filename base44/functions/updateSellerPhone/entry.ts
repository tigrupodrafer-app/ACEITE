import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { phone } = await req.json();

        if (!phone || typeof phone !== 'string') {
            return Response.json({ error: 'Telefone obrigatório' }, { status: 400 });
        }

        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) {
            return Response.json({ error: 'Telefone inválido' }, { status: 400 });
        }

        await base44.auth.updateMe({ seller_phone: digits });

        return Response.json({ success: true, message: 'Telefone salvo com sucesso' });
    } catch (error) {
        console.error('updateSellerPhone error:', error);
        return Response.json({ error: 'Não foi possível salvar o telefone. Tente novamente.' }, { status: 500 });
    }
});