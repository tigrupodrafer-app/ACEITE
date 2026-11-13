import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { validateAcceptanceToken, logAudit, getRequestMeta } from '../../shared/acceptanceTokens.ts';
import { generateAcceptanceDocument, generateWarrantyDocument } from '../../shared/acceptanceDocuments.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, signatureData } = body;

    if (!token || !signatureData) {
      return Response.json({ error: 'Token e assinatura obrigatórios' }, { status: 400 });
    }

    // Validação completa do token (nível 1 = aceite do pedido)
    const result = await validateAcceptanceToken(base44, token, 1);
    if (!result.ok) {
      // Resposta uniforme: nunca revela se o token nunca existiu, já foi usado,
      // foi revogado ou expirou — isso seria um oráculo para quem tenta adivinhar.
      return Response.json({
        error: 'Link de aceite inválido, expirado ou já utilizado',
      }, { status: 403 });
    }

    const order = result.order;

    // Impede aceite duplicado (replay)
    if (order.level1_accepted) {
      return Response.json({ error: 'Aceite já realizado para este pedido' }, { status: 409 });
    }

    // Respeita o fluxo de status — só aceita quando o pedido está aguardando aceite
    if (order.status !== 'aguardando_aceite_pedido' && order.status !== 'rascunho') {
      return Response.json({ error: 'Pedido não está aguardando aceite' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const meta = getRequestMeta(req);

    // CONSOME O TOKEN ANTES de qualquer outra escrita. O token é de uso único:
    // se duas requisições chegarem juntas, a segunda falha a validação abaixo e
    // não produz um segundo aceite nem um segundo conjunto de PDFs.
    await base44.asServiceRole.entities.AcceptanceToken.update(result.record.id, {
      used_at: now,
      active: false,
    });

    // Reconfere que este processo foi quem realmente reivindicou o token
    const claimedRes = await base44.asServiceRole.entities.AcceptanceToken.get(result.record.id);
    if (!claimedRes || claimedRes.used_at !== now) {
      return Response.json({ error: 'Este link de aceite já está sendo utilizado' }, { status: 409 });
    }

    // Registra o aceite real na entidade Acceptance
    if (result.record.acceptance_id) {
      await base44.asServiceRole.entities.Acceptance.update(result.record.acceptance_id, {
        status: 'realizado',
        accepted: true,
        accepted_date: now,
        signature: String(signatureData).slice(0, 100000),
        signer_name: order.client_name,
        ip: meta.ip,
        device: meta.device,
      });
    }

    // Espelho nos campos legados do Order (compatibilidade com telas existentes)
    await base44.asServiceRole.entities.Order.update(order.id, {
      level1_accepted: true,
      level1_date: now,
      level1_signature: String(signatureData).slice(0, 100000),
      level1_ip: meta.ip,
      level1_device: meta.device,
      status: 'em_fabricacao',
      warranty_blocked: false,
    });

    await logAudit(base44, {
      user_id: 'cliente_publico',
      order_id: order.id,
      action: 'ACEITE_N1_REALIZADO',
      entity: 'Acceptance',
      entity_id: result.record.acceptance_id,
      new_value: { status: 'em_fabricacao', warranty_blocked: false },
      ip: meta.ip,
      device: meta.device,
    });

    // Geração dos PDFs após o aceite — em segundo plano; falha NÃO desfaz o aceite
    waitUntil((async () => {
      try {
        await generateAcceptanceDocument(base44, {
          orderId: order.id,
          level: 1,
          acceptanceId: result.record.acceptance_id,
          generatedBy: 'cliente_publico',
        });
      } catch (e) {
        console.error('PDF N1 generation failed:', e);
      }
      try {
        await generateWarrantyDocument(base44, {
          orderId: order.id,
          acceptanceId: result.record.acceptance_id,
          generatedBy: 'cliente_publico',
        });
      } catch (e) {
        console.error('PDF Warranty generation failed:', e);
      }
    })());

    return Response.json({ success: true, order_id: order.id });
  } catch (error) {
    console.error('signOrderByToken error:', error);
    return Response.json({ error: 'Não foi possível registrar o aceite. Tente novamente.' }, { status: 500 });
  }
}