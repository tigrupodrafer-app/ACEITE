-- Homologation-only migration. Apply only after legal approval and review.
-- Transactional acceptance is callable solely with service_role from the Netlify backend.
create table if not exists public.aceite_legal_versions (
 id uuid primary key default gen_random_uuid(),
 version text not null,
 content_sha256 text not null check(content_sha256 ~ '^[a-f0-9]{64}$'),
 status text not null default 'pendente' check(status in ('pendente','homologado','revogado')),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 justification text,
 created_at timestamptz not null default now(),
 unique(version,content_sha256),
 constraint legal_version_approval_consistency check (
   status <> 'homologado' or
   (approved_by is not null and approved_at is not null and length(trim(coalesce(justification,'')))>=30)
 )
);
create unique index if not exists aceite_legal_versions_one_approved_per_version
 on public.aceite_legal_versions(version) where status='homologado';
alter table public.aceite_legal_versions enable row level security;
revoke all on public.aceite_legal_versions from anon,authenticated;
create or replace function public.aceite_confirmar_assinatura(
 p_token_hash text,p_signer_name text,p_signature_path text,p_signature_sha256 text,
 p_legal_sha256 text,p_legal_version text,p_checklist jsonb,p_user_agent text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
 t public.aceite_tokens%rowtype;
 o public.aceite_orders%rowtype;
 a uuid;
 accepted timestamptz := clock_timestamp();
begin
 if p_token_hash !~ '^[a-f0-9]{64}$' or p_signature_sha256 !~ '^[a-f0-9]{64}$'
 or p_legal_sha256 !~ '^[a-f0-9]{64}$'
 or length(trim(coalesce(p_signer_name,''))) not between 5 and 160
 or p_checklist is null or jsonb_typeof(p_checklist)<>'object'
 or p_checklist->'conferenciaPedido'<>'true'::jsonb
 or p_checklist->'condicoesFornecimentoGarantia'<>'true'::jsonb
 or p_checklist->'concordanciaAutorizacao'<>'true'::jsonb
 then raise exception 'Assinatura invalida'; end if;
 select * into t from public.aceite_tokens where token_hash=p_token_hash for update;
 if not found or t.level<>1 or t.used_at is not null or t.revoked_at is not null
 or t.expires_at<=accepted then raise exception 'Token invalido'; end if;
 if p_signature_path <> 'signatures/'||t.order_id::text||'/'||t.id::text||'.png'
 then raise exception 'Caminho da assinatura invalido'; end if;
 select * into o from public.aceite_orders where id=t.order_id for update;
 if not found or o.origin<>'SIC_SUPRASYS' or o.status<>'aguardando_aceite_pedido'
 or o.details->>'legalDocumentApproved'<>'true'
 or o.details->>'eligibilityApproved'<>'true'
 or o.details->>'mirrorComplete'<>'true'
 or o.order_snapshot->'validacao'->>'valido'<>'true'
 or o.order_snapshot->'pedidoCompleto'->>'numero'<>o.sic_order_number::text
 or o.order_snapshot->'pedidoCompleto'->>'empresa'<>o.sic_company_id::text
 or jsonb_typeof(o.order_snapshot->'itens')<>'array'
 or jsonb_array_length(o.order_snapshot->'itens')=0
 then raise exception 'Pedido nao homologado'; end if;
 if not exists (select 1 from public.aceite_legal_versions
 where version=p_legal_version and content_sha256=p_legal_sha256 and status='homologado')
 then raise exception 'Termo nao homologado'; end if;
 insert into public.aceite_acceptances (
 order_id,level,signer_name,signature_storage_path,signature_sha256,
 legal_text_sha256,accepted_at,user_agent,checklist
 ) values (
 o.id,1,trim(p_signer_name),p_signature_path,p_signature_sha256,
 p_legal_sha256,accepted,left(p_user_agent,500),p_checklist
 ) returning id into a;
 update public.aceite_tokens set used_at=accepted where id=t.id;
 update public.aceite_orders set status='aceite_recebido',updated_at=accepted
 where id=o.id;
 insert into public.aceite_audit_events(order_id,actor_type,action,metadata,user_agent)
 values(o.id,'cliente','acceptance_signed',
 jsonb_build_object('acceptanceId',a,'legalVersion',p_legal_version,
 'legalSha256',p_legal_sha256,'signatureSha256',p_signature_sha256),
 left(p_user_agent,500));
 return jsonb_build_object('acceptance_id',a,'accepted_at',accepted);
end $$;
revoke all on function public.aceite_confirmar_assinatura(text,text,text,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.aceite_confirmar_assinatura(text,text,text,text,text,text,jsonb,text) to service_role;
