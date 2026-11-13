import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { logAudit, getRequestMeta } from '../../shared/acceptanceTokens.ts';
import { isSafeFileUrl } from '../../shared/urlSafety.ts';

// Registro dos aceites de n\u00edvel 2 (entrega) e 3 (instala\u00e7\u00e3o).
//
// A ordem dos aceites e a libera\u00e7\u00e3o da garantia s\u00e3o a pr\u00f3pria prova jur\u00eddica
// que este sistema existe para produzir, por isso s\u00e3o verificadas aqui no
// servidor no momento da escrita \u2014 e n\u00e3o apenas pela tela, que pode ser
// contornada por uma requisi\u00e7\u00e3o montada \u00e0 m\u00e3o.

const LEVEL_RULES = {
  2: {
    requires: 'level1_accepted',
    requiresLabel: 'o Aceite N\u00edvel 1 (Pedido)',
    acceptedField: 'level2_accepted',
    nextStatus: 'aguardando_aceite_instalacao',
  },
  3: {
    requires: 'level2_accepted',
    requiresLabel: 'o Aceite N\u00edvel 2 (Entrega)',
    acceptedField: 'level3_accepted',
    nextStatus: 'concluido',
  },
};

const str = (v, max) => (v == null ? '' : String(v).slice(0, max));

function checklistOf(raw, keys) {
  // S\u00f3 as chaves conhecidas, e s\u00f3 como booleano: nada mais do corpo entra no registro.
  const out = {};
  for (const k of keys) out[k] = raw && raw[k] === true;
  return out;
}

const L2_KEYS = ['conferido', 'quantidades_corretas', 'sem_danos', 'responsabilidade_aceita'];
const L3_UNLOADING = ['nao_arrastar', 'nao_torcao', 'apoio_adequado', 'sem_impacto', 'equipe_adequada'];
const L3_STORAGE = ['local_seco', 'evitar_umidade', 'ventilacao', 'nao_solo', 'nao_empilhado'];
const L3_INSTALL = ['normas_tecnicas', 'caimento_minimo', 'fixadores_corretos', 'cortes_corretos', 'profissional_qualificado'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'N\u00e3o autenticado' }, { status: 401 });

    const body = await req.json();
    const orderId = body.order_id;
    const level = Number(body.level);

    if (!orderId) return Response.json({ error: 'order_id obrigat\u00f3rio' }, { status: 400 });
    const rule = LEVEL_RULES[level];
    if (!rule) return Response.json({ error: 'N\u00edvel inv\u00e1lido' }, { status: 400 });

    if (!body.signature) {
      return Response.json({ error: 'Assinatura obrigat\u00f3ria' }, { status: 400 });
    }

    // Leitura com o token do usu\u00e1rio: as regras de acesso garantem que ele s\u00f3
    // manipule pedidos pr\u00f3prios (ou admin). Pedido de terceiros \u2192 nega.
    let order;
    try {
      order = await base44.entities.Order.get(orderId);
    } catch (e) {
      order = null;
    }
    if (!order) return Response.json({ error: 'ACESSO NEGADO' }, { status: 403 });

    // Pr\u00e9-requisito verificado no servidor, no momento da escrita
    if (!order[rule.requires]) {
      return Response.json({
        error: `\u00c9 necess\u00e1rio concluir ${rule.requiresLabel} antes deste aceite.`,
      }, { status: 409 });
    }

    // N\u00e3o permite reassinar um n\u00edvel j\u00e1 aceito
    if (order[rule.acceptedField]) {
      return Response.json({ error: 'Este aceite j\u00e1 foi realizado.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const meta = getRequestMeta(req);

    const update = {
      [rule.acceptedField]: true,
      [`level${level}_date`]: now,
      [`level${level}_signature`]: str(body.signature, 100000),
      [`level${level}_ip`]: meta.ip,
      [`level${level}_device`]: meta.device,
      status: rule.nextStatus,
    };

    if (level === 2) {
      if (!body.receiver_name || !body.receiver_document) {
        return Response.json({ error: 'Dados de quem recebeu s\u00e3o obrigat\u00f3rios' }, { status: 400 });
      }
      const checklist = checklistOf(body.checklist, L2_KEYS);
      if (!L2_KEYS.every(k => checklist[k])) {
        return Response.json({ error: 'Todos os itens do checklist devem ser confirmados' }, { status: 400 });
      }
      update.level2_receiver_name = str(body.receiver_name, 300);
      update.level2_receiver_document = str(body.receiver_document, 50);
      update.level2_checklist = checklist;

      // Foto opcional: a URL vem do cliente, s\u00f3 \u00e9 aceita se for do armazenamento da plataforma
      if (body.photo_url) {
        if (!isSafeFileUrl(body.photo_url)) {
          return Response.json({ error: 'Arquivo inv\u00e1lido. Envie a foto pelo pr\u00f3prio sistema.' }, { status: 400 });
        }
        update.photos_delivery = [...(order.photos_delivery || []), body.photo_url];
      }
    } else {
      const unloading = checklistOf(body.unloading_checklist, L3_UNLOADING);
      const storage = checklistOf(body.storage_checklist, L3_STORAGE);
      const install = checklistOf(body.installation_checklist, L3_INSTALL);
      if (!L3_UNLOADING.every(k => unloading[k])) {
        return Response.json({ error: 'Todos os itens de descarregamento devem ser confirmados' }, { status: 400 });
      }
      if (!L3_STORAGE.every(k => storage[k])) {
        return Response.json({ error: 'Todos os itens de armazenagem devem ser confirmados' }, { status: 400 });
      }
      if (!L3_INSTALL.every(k => install[k])) {
        return Response.json({ error: 'Todos os itens de instala\u00e7\u00e3o devem ser confirmados' }, { status: 400 });
      }
      update.level3_unloading_checklist = unloading;
      update.level3_storage_checklist = storage;
      update.level3_installation_checklist = install;
      // A garantia s\u00f3 \u00e9 liberada quando os tr\u00eas n\u00edveis est\u00e3o completos
      update.warranty_blocked = false;
    }

    await base44.asServiceRole.entities.Order.update(order.id, update);

    await logAudit(base44, {
      user_id: user.id,
      order_id: order.id,
      action: `ACEITE_N${level}_REALIZADO`,
      entity: 'Order',
      entity_id: order.id,
      new_value: { level, status: rule.nextStatus },
      ip: meta.ip,
      device: meta.device,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('signOrderLevel error:', error);
    return Response.json({ error: 'N\u00e3o foi poss\u00edvel registrar o aceite. Tente novamente.' }, { status: 500 });
  }
}
