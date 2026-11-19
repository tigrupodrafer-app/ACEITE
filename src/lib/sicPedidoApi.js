import { adaptarPedidoSic } from './sicPedidoAdapter';

/**
 * O navegador nunca acessa o Firebird. A URL deve apontar para uma API HTTPS
 * autenticada, com CORS restrito e autorização de consulta implementados.
 * VITE_* é público: nunca colocar credenciais ou tokens de serviço aqui.
 */
export async function consultarPedidoSic(numero, { signal } = {}) {
  const n = String(numero || '').trim();
  if (!/^\d{1,12}$/.test(n)) throw new Error('Informe um número de pedido válido.');
  const base = String(import.meta.env.VITE_ACEITE_API_URL || '').trim().replace(/\/$/, '');
  if (!base || !/^https:\/\//i.test(base)) {
    throw new Error('Integração SIC indisponível: configure uma URL HTTPS autorizada.');
  }
  const response = await fetch(base + '/api/pedidos/' + encodeURIComponent(n), {
    method: 'GET', credentials: 'include', cache: 'no-store',
    headers: { Accept: 'application/json' }, signal
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('Acesso não autorizado à consulta SIC.');
  }
  if (response.status === 404) throw new Error('Pedido não encontrado no SIC.');
  if (!response.ok) throw new Error('Falha na consulta SIC (' + response.status + ').');
  return adaptarPedidoSic(await response.json());
}
