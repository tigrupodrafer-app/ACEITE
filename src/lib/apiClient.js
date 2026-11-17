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


// Download privado sem expor o JWT na URL. Endpoint autorizado no mesmo dominio.
export async function apiDownloadPdf(path, filename) {
  if (!/^\/\.netlify\/functions\/(?:review-document|approval-dossier)\?draftId=[a-f0-9-]{36}&download=1$/i.test(path)) {
    throw new Error('Caminho de download nao permitido');
  }
  if (!supabase) throw new Error('Supabase nao configurado.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Sessao expirada.');
  const res = await fetch(path, {
    headers: { Authorization: 'Bearer ' + data.session.access_token },
    cache: 'no-store',
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'Nao foi possivel baixar o PDF.');
  }
  const blob = await res.blob();
  if (blob.type !== 'application/pdf' || blob.size < 100) throw new Error('Arquivo PDF invalido.');
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}
