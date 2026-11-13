'use strict';
const { respond, supabaseFetch, sha256, onlyMethod, handleError } = require('./_lib/backend.cjs');

const expectedState = {
  1: 'aguardando_aceite_pedido',
  2: 'aguardando_aceite_entrega',
  3: 'aguardando_aceite_instalacao',
};

exports.handler = async (event) => {
  try {
    onlyMethod(event, 'GET');
    const token = event.queryStringParameters?.token;
    // SHA256 digest is the only token representation stored in the DB.
    if (typeof token !== 'string' || !/^[a-fA-F0-9]{64}$/.test(token)) {
      return respond(404, { error: 'Link inválido ou expirado' });
    }
    const hash = sha256(token);
    const rows = await supabaseFetch('/rest/v1/aceite_tokens?token_hash=eq.' + hash +
      '&select=order_id,level,expires_at,used_at,revoked_at&limit=1');
    const item = rows?.[0];
    if (!item || item.used_at || item.revoked_at || new Date(item.expires_at).getTime() <= Date.now()) {
      return respond(404, { error: 'Link inválido ou expirado' });
    }
    const orders = await supabaseFetch('/rest/v1/aceite_orders?id=eq.' + encodeURIComponent(item.order_id) +
      '&select=id,order_number,client_name,status,details&limit=1');
    const order = orders?.[0];
    if (!order || order.status !== expectedState[item.level]) {
      return respond(404, { error: 'Aceite indisponível para este pedido' });
    }
    const d = order.details || {};
    // Whitelist public fields: never send document, address, contacts, hashes or financial snapshots.
    return respond(200, {
      order: {
        order_number: order.order_number,
        client_name: order.client_name,
        material: typeof d.material === 'string' ? d.material : '',
        tile_type: typeof d.tile_type === 'string' ? d.tile_type : '',
        tile_model: typeof d.tile_model === 'string' ? d.tile_model : '',
        quantity: typeof d.quantity === 'number' ? d.quantity : null,
        thickness: typeof d.thickness === 'string' ? d.thickness : '',
        level: item.level,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};
