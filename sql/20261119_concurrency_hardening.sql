-- Security hardening: serialize issuance, activation and handoff inside PostgreSQL.
-- No modification to SIC. All RPCs service_role-only and security invoker.
create unique index if not exists aceite_tokens_one_unconsumed
 on public.aceite_tokens(order_id,level)
 where used_at is null and revoked_at is null;
create unique index if not exists aceite_handoff_once
 on public.aceite_audit_events(order_id,action)
 where action='signed_acceptance_handed_to_production';
create or replace function public.aceite_emitir_token_atomico(
 p_order_id uuid,p_token_hash text,p_expires_at timestamptz,
 p_legal_version text,p_legal_sha256 text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.aceite_orders%rowtype; t uuid;
begin
 if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at<=clock_timestamp()
 or p_expires_at>clock_timestamp()+interval '49 hours'
 then raise exception 'Token invalido'; end if;
 select * into o from public.aceite_orders where id=p_order_id for update;
 if not found or o.origin<>'SIC_SUPRASYS' or o.status<>'aguardando_aceite_pedido'
 or o.details->>'draftOnly' is distinct from 'false'
 or o.details->>'legalDocumentApproved' is distinct from 'true'
 or o.details->>'eligibilityApproved' is distinct from 'true'
 or o.details->>'mirrorComplete' is distinct from 'true'
 or o.details->>'legalVersion' is distinct from p_legal_version
 or o.details->>'legalSha256' is distinct from p_legal_sha256
 or o.order_snapshot->'validacao'->>'valido' is distinct from 'true'
 or o.order_snapshot->'pedidoCompleto'->>'numero' is distinct from o.sic_order_number::text
 or o.order_snapshot->'pedidoCompleto'->>'empresa' is distinct from o.sic_company_id::text
 then raise exception 'Pedido nao homologado'; end if;
 if not exists(select 1 from public.aceite_legal_versions
 where version=p_legal_version and content_sha256=p_legal_sha256 and status='homologado')
 then raise exception 'Versao juridica nao homologada'; end if;
 if exists(select 1 from public.aceite_acceptances where order_id=p_order_id and level=1)
 then raise exception 'Pedido ja assinado'; end if;
 -- Expired tokens are revoked while holding the order lock.
 update public.aceite_tokens set revoked_at=clock_timestamp()
 where order_id=p_order_id and level=1 and used_at is null and revoked_at is null
 and expires_at<=clock_timestamp();
 if exists(select 1 from public.aceite_tokens where order_id=p_order_id
 and level=1 and used_at is null and revoked_at is null)
 then raise exception 'Ja existe link ativo'; end if;
 insert into public.aceite_tokens(order_id,level,token_hash,expires_at)
 values(p_order_id,1,p_token_hash,p_expires_at) returning id into t;
 return jsonb_build_object('issued',true,'tokenId',t);
end $$;
revoke all on function public.aceite_emitir_token_atomico(uuid,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.aceite_emitir_token_atomico(uuid,text,timestamptz,text,text) to service_role;

create or replace function public.aceite_ativar_pedido_atomico(
 p_order_id uuid,p_actor_id uuid,p_legal_version text,p_legal_sha256 text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.aceite_orders%rowtype; p jsonb; items jsonb; total numeric; sum_items numeric;
begin
 select * into o from public.aceite_orders where id=p_order_id for update;
 p:=o.order_snapshot->'pedidoCompleto'; items:=o.order_snapshot->'itens';
 if not found or o.origin<>'SIC_SUPRASYS' or o.status<>'rascunho'
 or o.details->>'draftOnly' is distinct from 'true'
 or p->>'numero' is distinct from o.sic_order_number::text
 or p->>'empresa' is distinct from o.sic_company_id::text
 or upper(trim(coalesce(p->>'liberado','')))<>'S'
 or o.order_snapshot->'validacao'->>'valido' is distinct from 'true'
 or jsonb_typeof(items) is distinct from 'array'
 or jsonb_array_length(items)=0 or jsonb_array_length(items)>200
 or length(trim(coalesce(p->'cliente'->>'nome','')))<2
 or length(trim(coalesce(p->>'nomeEmpresa',p->>'razaoSocialEmpresa','')))=0
 or length(trim(coalesce(p->>'tipoVenda',p->>'tipoVendaDescricao',p->>'tipoVendaCodigo','')))=0
 or length(trim(coalesce(p->>'localEntrega',p->>'enderecoEntrega','')))=0
 then raise exception 'Espelho SIC invalido'; end if;
 if not exists(select 1 from public.aceite_legal_versions
 where version=p_legal_version and content_sha256=p_legal_sha256 and status='homologado')
 then raise exception 'Versao juridica nao homologada'; end if;
 if not (p->'valores'->>'total' ~ '^[0-9]+(\.[0-9]+)?$'
 and o.order_snapshot->'validacao'->>'somaItens' ~ '^[0-9]+(\.[0-9]+)?$')
 then raise exception 'Totais invalidos'; end if;
 total:=(p->'valores'->>'total')::numeric;
 sum_items:=(o.order_snapshot->'validacao'->>'somaItens')::numeric;
 if total<=0 or abs(total-sum_items)>0.02 or exists(
 select 1 from jsonb_array_elements(items) as i
 where length(trim(coalesce(i->>'descricao','')))=0
 or coalesce(i->>'valorTotal','') !~ '^-?[0-9]+(\.[0-9]+)?$')
 then raise exception 'Itens ou totais inconsistentes'; end if;
 update public.aceite_orders set status='aguardando_aceite_pedido',
 details=o.details||jsonb_build_object('draftOnly',false,'eligibilityApproved',true,
 'legalDocumentApproved',true,'mirrorComplete',true,'legalVersion',p_legal_version,
 'legalSha256',p_legal_sha256,'verifiedBy',p_actor_id,'verifiedAt',clock_timestamp()),
 updated_at=clock_timestamp() where id=p_order_id;
 insert into public.aceite_audit_events(order_id,actor_type,actor_id,action,metadata)
 values(p_order_id,'usuario',p_actor_id::text,'sic_mirror_verified_for_acceptance',
 jsonb_build_object('legalVersion',p_legal_version,'legalSha256',p_legal_sha256,
 'sourceRequestId',o.order_snapshot->>'sourceRequestId',
 'manualReview',true,'externalERPWrite',false));
 return jsonb_build_object('activated',true,'orderId',p_order_id);
end $$;
revoke all on function public.aceite_ativar_pedido_atomico(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.aceite_ativar_pedido_atomico(uuid,uuid,text,text) to service_role;
