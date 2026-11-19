-- DRAFER ACEITE / PROPOSTA DE MIGRAÇÃO (NÃO APLICAR AUTOMATICAMENTE)
-- Exige Supabase Auth; executar apenas após revisão de permissões e backup.
-- A API autenticada deve consultar o SIC, validar o pedido e gravar o snapshot.
-- O cliente público NUNCA deve acessar esta tabela diretamente.
create extension if not exists pgcrypto;

create table if not exists public.sic_pedido_versao (
  id uuid primary key default gen_random_uuid(),
  numero_pedido text not null check (numero_pedido ~ '^[0-9]{1,12}$'),
  empresa_codigo text not null,
  vendedor_id uuid not null references auth.users(id),
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object'),
  sha256_servidor text generated always as (encode(digest(conteudo::text, 'sha256'), 'hex')) stored,
  criado_em timestamptz not null default now(),
  unique (vendedor_id, numero_pedido, sha256_servidor)
);

create index if not exists sic_pedido_versao_vendedor_idx
  on public.sic_pedido_versao (vendedor_id, numero_pedido, criado_em desc);

alter table public.sic_pedido_versao enable row level security;
alter table public.sic_pedido_versao force row level security;

revoke all on public.sic_pedido_versao from public, anon, authenticated;
grant select on public.sic_pedido_versao to authenticated;

drop policy if exists sic_pedido_versao_select_own on public.sic_pedido_versao;
create policy sic_pedido_versao_select_own on public.sic_pedido_versao
  for select to authenticated using (vendedor_id = (select auth.uid()));

-- Sem INSERT/UPDATE/DELETE para clientes: apenas backend confiável,
-- com autenticação do vendedor e validação da autorização por pedido.
-- O backend não deve aceitar conteudo/empresa_codigo arbitrários do navegador.
-- Para evitar alteração do conteúdo mesmo por papéis privilegiados,
-- bloqueamos UPDATE/DELETE em nível de trigger (administração via migração).
create or replace function public.sic_pedido_versao_bloquear_mutacao()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Versão comercial imutável: operação não permitida';
end;
$$;

drop trigger if exists sic_pedido_versao_imutavel on public.sic_pedido_versao;
create trigger sic_pedido_versao_imutavel
  before update or delete on public.sic_pedido_versao
  for each row execute function public.sic_pedido_versao_bloquear_mutacao();

comment on table public.sic_pedido_versao is
  'Snapshots comerciais SIC, somente leitura para vendedor proprietário. Não contém token público de assinatura.';
comment on column public.sic_pedido_versao.sha256_servidor is
  'Hash calculado pelo PostgreSQL sobre JSONB canonizado internamente; diferente do hash informativo do navegador.';
