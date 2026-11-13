import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { logAudit } from '../../shared/acceptanceTokens.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const documentId = body.document_id;
    if (!documentId) return Response.json({ error: 'document_id obrigatório' }, { status: 400 });

    let document;
    try {
      document = await base44.asServiceRole.entities.GeneratedDocument.get(documentId);
    } catch (e) {
      document = null;
    }
    if (!document) return Response.json({ error: 'Documento não encontrado' }, { status: 404 });

    // Acesso validado contra o pedido do documento (dono ou admin) — nunca pelo id do documento sozinho
    let order;
    try {
      order = await base44.entities.Order.get(document.order_id);
    } catch (e) {
      order = null;
    }
    if (!order) return Response.json({ error: 'ACESSO NEGADO' }, { status: 403 });

    const url = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: document.file_uri,
      expires_in: 300,
    });

    await logAudit(base44, {
      user_id: user.id,
      order_id: document.order_id,
      action: 'DOCUMENT_DOWNLOADED',
      entity: 'GeneratedDocument',
      entity_id: document.id,
      new_value: { document_type: document.document_type, version: document.version },
    });

    return Response.json({
      signed_url: url.signed_url,
      file_name: document.file_name,
      document_type: document.document_type,
      version: document.version,
    });
  } catch (error) {
    console.error('downloadOrderDocument error:', error);
    return Response.json({ error: 'Não foi possível baixar o documento. Tente novamente.' }, { status: 500 });
  }
}