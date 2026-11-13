import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateAcceptanceDocument, generateWarrantyDocument } from '../../shared/acceptanceDocuments.ts';

export default async function(req) {
  try {
    // Gera (ou regenera, criando nova versão) o PDF de aceite/garantia de um pedido
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const orderId = body.order_id;
    if (!orderId) return Response.json({ error: 'order_id obrigatório' }, { status: 400 });

    // Verificação de acesso ao pedido via RLS (dono ou admin)
    let order;
    try {
      order = await base44.entities.Order.get(orderId);
    } catch (e) {
      order = null;
    }
    if (!order) return Response.json({ error: 'ACESSO NEGADO' }, { status: 403 });

    let record;
    if (body.document_type === 'warranty') {
      record = await generateWarrantyDocument(base44, { orderId, generatedBy: user.id });
    } else {
      const level = Number(body.level);
      if (![1, 2, 3].includes(level)) {
        return Response.json({ error: 'Nível inválido' }, { status: 400 });
      }
      record = await generateAcceptanceDocument(base44, { orderId, level, generatedBy: user.id });
    }

    return Response.json({ success: true, document: record });
  } catch (error) {
    console.error('generateOrderDocument error:', error);
    return Response.json({ error: 'Não foi possível gerar o documento. Tente novamente.' }, { status: 500 });
  }
}