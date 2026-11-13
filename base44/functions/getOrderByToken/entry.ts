import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validateAcceptanceToken } from '../../shared/acceptanceTokens.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { token, level } = await req.json();
    const expectedLevel = level || 1;

    if (!token) {
      return Response.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    // Validação completa: hash, ativo, não revogado, não usado, não expirado, nível correto
    const result = await validateAcceptanceToken(base44, token, expectedLevel);
    if (!result.ok) {
      // Resposta uniforme: nunca revela se o token nunca existiu, já foi usado,
      // foi revogado ou expirou — isso seria um oráculo para quem tenta adivinhar.
      return Response.json({
        error: 'Link de aceite inválido, expirado ou já utilizado',
      }, { status: 403 });
    }

    const order = result.order;

    // Retorna APENAS os campos necessários para a tela de aceite.
    // Nunca expõe: documento, endereço, e-mail, telefone, assinaturas, dados do vendedor.
    return Response.json({
      order: {
        order_number: order.order_number,
        client_name: order.client_name,
        material: order.material,
        tile_type: order.tile_type,
        tile_model: order.tile_model,
        thickness: order.thickness,
        product_code: order.product_code,
        quantity: order.quantity,
        order_image_url: order.order_image_url,
        manufacturing_order_image_url: order.manufacturing_order_image_url,
        status: order.status,
        level1_accepted: order.level1_accepted,
        token_level: result.record.level,
      },
    });
  } catch (error) {
    console.error('getOrderByToken error:', error);
    return Response.json({ error: 'Não foi possível carregar o pedido.' }, { status: 500 });
  }
}