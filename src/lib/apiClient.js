import { supabase } from '@/lib/supabaseClient';

async function apiRequest(path, method, body) {
  if (!supabase) throw new Error('Supabase não configurado.');
  // Only same-origin Netlify Functions; no user-controlled external URL.
  if (!/^\/\.netlify\/functions\/[a-z-]+(?:\?.*)?$/.test(path)) {
    throw new Error('Endereço de API não permitido');
  }
  const { data: sessionInfo, error } = await supabase.auth.getSession();
  if (error || !sessionInfo?.session?.access_token) throw new Error('Sessão expirada; entre novamente.');
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: 'Bearer ' + sessionInfo.session.access_token,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    let data;
    try { data = await response.json(); } catch { /* ignore */ }
    throw new Error(data?.error || 'Erro na consulta (' + response.status + ')');
  }
  return response.json();
}

export function apiGet(path) { return apiRequest(path, 'GET'); }
export function apiPost(path, body) { return apiRequest(path, 'POST', body); }
