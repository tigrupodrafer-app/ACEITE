import { supabase } from '@/lib/supabaseClient';

export async function apiGet(path) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data: sessionInfo, error } = await supabase.auth.getSession();
  if (error || !sessionInfo?.session?.access_token) throw new Error('Sessão expirada; entre novamente.');
  // Never send token to another origin.
  if (!/^\/\.netlify\/functions\/[a-z-]+(?:\?.*)?$/.test(path)) {
    throw new Error('Endereço de API não permitido');
  }
  const response = await fetch(path, {
    headers: { Authorization: 'Bearer ' + sessionInfo.session.access_token },
    cache: 'no-store',
  });
  if (!response.ok) {
    let data;
    try { data = await response.json(); } catch { /* ignore untrusted responses */ }
    throw new Error(data?.error || 'Erro na consulta (' + response.status + ')');
  }
  return response.json();
}
