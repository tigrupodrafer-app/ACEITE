import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { createAcceptanceToken, logAudit, getRequestMeta } from '../../shared/acceptanceTokens.ts';

// Origem do link: SOMENTE o domínio do próprio app (nunca headers controlados pelo chamador)
const APP_ORIGIN = 'https://blindagem-metal-copy-142602c1.base44.app';
const ALLOWED_ORIGIN_SUFFIX = '.base44.app';

function resolveOrigin(req) {
  const origin = req.headers.get('origin') || '';
  try {
    const u = new URL(origin);
    if (u.protocol === 'https:' && u.hostname.endsWith(ALLOWED_ORIGIN_SUFFIX)) {
      return u.origin;
    }
  } catch (e) {
    // origem inválida/ausente → usa a origem oficial do app
  }
  return APP_ORIGIN;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'orderId required' }, { status: 400 });
    }

    // Leitura com o token do usuário: as regras de acesso garantem que ele
    // só manipule pedidos próprios (ou admin). Pedido de terceiros → erro.
    let order = null;
    try {
      order = await base44.entities.Order.get(orderId);
    } catch (e) {
      order = null;
    }
    if (!order) {
      return Response.json({ error: 'Pedido não encontrado ou sem permissão' }, { status: 403 });
    }

    if (order.level1_accepted) {
      return Response.json({ error: 'Este pedido já foi aceito pelo cliente' }, { status: 400 });
    }

    // Gera token opaco aleatório (armazenado apenas como hash SHA-256)
    const { token, token_id, acceptance_id, expires_at } = await createAcceptanceToken(base44, order.id, 1);
    const meta = getRequestMeta(req);

    // Atualiza status do pedido para aguardando aceite
    await base44.asServiceRole.entities.Order.update(order.id, {
      status: 'aguardando_aceite_pedido',
    });

    await logAudit(base44, {
      user_id: user.id,
      order_id: order.id,
      action: 'TOKEN_CRIADO',
      entity: 'AcceptanceToken',
      entity_id: token_id,
      new_value: { level: 1, expires_at },
      ip: meta.ip,
      device: meta.device,
    });

    const signatureUrl = `${resolveOrigin(req)}/AssinarAceite?token=${token}`;

    return Response.json({
      success: true,
      signatureUrl,
      expires_at,
      message: 'Link de assinatura gerado',
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Não foi possível gerar o link de aceite. Tente novamente.' }, { status: 500 });
  }
}