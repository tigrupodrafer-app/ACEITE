-- DRAFER ACEITE: homologacao UNICA por versao do texto juridico.
-- Executar somente apos revisao do DBA/juridico; nao altera pedidos existentes.
create table if not exists public.aceite_legal_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'pendente' check (status in ('pendente','homologado','revogado')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  justification text,
  created_at timestamptz not null default now(),
  unique (version, content_sha256),
  constraint legal_version_approval_consistency check (
    (status = 'homologado' and approved_by is not null and approved_at is not null
      and length(trim(coalesce(justification,''))) >= 30)
    or status <> 'homologado'
  )
);
create unique index if not exists aceite_legal_versions_one_approved_per_version
  on public.aceite_legal_versions (version) where status = 'homologado';
alter table public.aceite_legal_versions enable row level security;
revoke all on public.aceite_legal_versions from anon, authenticated;
-- Acesso somente via backend com service role e verificacao de autoridade.
-- A homologacao nao cria tokens, nao altera pedidos e nao libera assinatura.
