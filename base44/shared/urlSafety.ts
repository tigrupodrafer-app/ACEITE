// Validação de URLs que o servidor vai buscar ou persistir.
// Qualquer URL vinda do corpo da requisição é considerada hostil: sem esta
// checagem o servidor pode ser induzido a buscar endereços internos (SSRF)
// e a armazenar um endereço de terceiros que depois é exibido ao cliente.

const ALLOWED_HOST_SUFFIXES = [
  '.base44.app',
  '.base44.com',
  '.supabase.co',
  '.supabase.in',
];

// Faixas privadas / loopback / link-local / metadata de nuvem
function isBlockedIPv4(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some(n => n > 255)) return true;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isIpLiteral(host) {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (host.includes(':')) return true; // IPv6 literal
  return false;
}

export function isSafeFileUrl(raw) {
  if (!raw || typeof raw !== 'string' || raw.length > 2048) return false;

  let u;
  try {
    u = new URL(raw);
  } catch (e) {
    return false;
  }

  // Somente https — bloqueia javascript:, data:, file:, gopher:, http: etc.
  if (u.protocol !== 'https:') return false;

  // Credenciais embutidas são usadas para confundir o parser do destino
  if (u.username || u.password) return false;

  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return false;

  // Nunca aceita endereço IP literal nem nomes locais
  if (isIpLiteral(host)) return false;
  if (isBlockedIPv4(host)) return false;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return false;
  }

  // Precisa ser um host de armazenamento conhecido da plataforma
  return ALLOWED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix));
}

export function assertSafeFileUrl(raw) {
  if (!isSafeFileUrl(raw)) {
    const err = new Error('URL de arquivo não permitida');
    err.code = 'url_nao_permitida';
    throw err;
  }
  return raw;
}
