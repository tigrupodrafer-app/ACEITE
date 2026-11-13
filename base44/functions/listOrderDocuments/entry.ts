import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
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

    const res = await base44.asServiceRole.entities.GeneratedDocument.filter(
      { order_id: orderId },
      { sort: 'created_date', limit: 100 }
    );
    const items = res.items || [];
    // Agrupa por tipo e retorna a versão mais recente de cada documento
    const latest = {};
    for (const d of items) {
      const cur = latest[d.document_type];
      if (!cur || (d.version || 1) > (cur.version || 1)) latest[d.document_type] = d;
    }
    return Response.json({
      documents: Object.values(latest),
      all_versions: items.map(d => ({
        id: d.id, document_type: d.document_type, version: d.version,
        file_hash: d.file_hash, generated_at: d.generated_at, generated_by: d.generated_by,
      })),
    });
  } catch (error) {
    console.error('listOrderDocuments error:', error);
    return Response.json({ error: 'Não foi possível listar os documentos. Tente novamente.' }, { status: 500 });
  }
}