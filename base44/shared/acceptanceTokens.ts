// Módulo compartilhado: geração, hash e validação de tokens de aceite (N1/N2/N3)

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createAcceptanceToken(base44, orderId, level, expiresInDays = 7) {
  const plain = generateToken();
  const token_hash = await sha256Hex(plain);
  const now = new Date();
  const expires_at = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  // Revoga tokens anteriores ainda ativos do mesmo pedido/nível
  const previousRes = await base44.asServiceRole.entities.AcceptanceToken.filter({ order_id: orderId, level, active: true });
  const previous = Array.isArray(previousRes) ? previousRes : (previousRes.items || []);
  for (const t of previous) {
    await base44.asServiceRole.entities.AcceptanceToken.update(t.id, { active: false, revoked_at: now.toISOString() });
  }

  // Cria o aceite pendente vinculado
  const acceptance = await base44.asServiceRole.entities.Acceptance.create({
    order_id: orderId,
    level,
    status: 'pendente',
    accepted: false,
  });

  const record = await base44.asServiceRole.entities.AcceptanceToken.create({
    order_id: orderId,
    acceptance_id: acceptance.id,
    token_hash,
    level,
    expires_at,
    active: true,
  });

  return { token: plain, token_id: record.id, acceptance_id: acceptance.id, expires_at };
}

export async function validateAcceptanceToken(base44, token, expectedLevel) {
  if (!token || typeof token !== 'string' || token.length > 200) {
    return { ok: false, reason: 'token_invalido' };
  }
  const token_hash = await sha256Hex(token);
  const matchesRes = await base44.asServiceRole.entities.AcceptanceToken.filter({ token_hash });
  const matches = Array.isArray(matchesRes) ? matchesRes : (matchesRes.items || []);
  const record = matches[0];
  if (!record) return { ok: false, reason: 'token_invalido' };
  if (!record.active || record.revoked_at) return { ok: false, reason: 'token_revogado' };
  if (record.used_at) return { ok: false, reason: 'token_ja_utilizado' };
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) return { ok: false, reason: 'token_expirado' };
  if (expectedLevel && record.level !== expectedLevel) return { ok: false, reason: 'nivel_incorreto' };

  let order = null;
  try {
    order = await base44.asServiceRole.entities.Order.get(record.order_id);
  } catch (e) {
    order = null;
  }
  if (!order) return { ok: false, reason: 'token_invalido' };

  return { ok: true, record, order };
}

export async function logAudit(base44, entry) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: entry.user_id || 'sistema',
      order_id: entry.order_id || null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id || null,
      old_value: entry.old_value != null ? JSON.stringify(entry.old_value).slice(0, 2000) : null,
      new_value: entry.new_value != null ? JSON.stringify(entry.new_value).slice(0, 2000) : null,
      ip: entry.ip || null,
      device: entry.device || null,
    });
  } catch (e) {
    console.error('AuditLog error:', e);
  }
}

export function getRequestMeta(req) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip') || '';
  const device = req.headers.get('user-agent') || '';
  return { ip, device };
}