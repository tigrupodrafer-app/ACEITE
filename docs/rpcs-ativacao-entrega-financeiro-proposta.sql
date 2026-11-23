-- DRAFER ACEITE - SQL PROPOSTO, NAO EXECUTADO.
-- Homologar endereco SIC e mapeamento financeiro antes da aplicacao.
BEGIN;
CREATE OR REPLACE FUNCTION public.aceite_ativar_pedido_atomico(p_order_id uuid, p_actor_id uuid, p_legal_version text, p_legal_sha256 text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare o public.aceite_orders%rowtype; p jsonb; items jsonb; total numeric; sum_items numeric; subtotal numeric; discount numeric; freight numeric; delivery text;
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
 delivery:=trim(coalesce(p->>'localEntrega',p->>'enderecoEntrega',''));
 if not exists (
  select 1 from public.aceite_audit_events e
  where e.order_id=o.id and e.action='sic_delivery_address_reviewed'
  and e.actor_type='usuario' and e.actor_id=p_actor_id::text
  and e.metadata->>'manualReview'='true'
  and e.metadata->>'sourceRequestId'=o.order_snapshot->>'sourceRequestId'
  and e.metadata->>'snapshotRevision'=coalesce(o.details->>'snapshotRevision','1')
  and e.metadata->>'deliveryAddress'=delivery
  and e.metadata->>'companyId'=o.sic_company_id::text
  and e.metadata->>'orderNumber'=o.sic_order_number::text
 ) then raise exception 'Entrega nao confirmada para esta revisao'; end if;
 if not exists(select 1 from public.aceite_legal_versions
 where version=p_legal_version and content_sha256=p_legal_sha256 and status='homologado')
 then raise exception 'Versao juridica nao homologada'; end if;
 if not (
  coalesce(p->'valores'->>'subtotal','') ~ '^[0-9]+([.][0-9]+)?$'
  and coalesce(p->'valores'->>'total','') ~ '^[0-9]+([.][0-9]+)?$'
  and coalesce(o.order_snapshot->'validacao'->>'somaItens','') ~ '^[0-9]+([.][0-9]+)?$'
  and coalesce(p->'valores'->>'desconto','0') ~ '^[0-9]+([.][0-9]+)?$'
  and coalesce(p->>'frete','0') ~ '^[0-9]+([.][0-9]+)?$'
 ) then raise exception 'Totais invalidos'; end if;
 subtotal:=(p->'valores'->>'subtotal')::numeric;
 discount:=coalesce((p->'valores'->>'desconto')::numeric,0);
 freight:=coalesce((p->>'frete')::numeric,0);
 total:=(p->'valores'->>'total')::numeric;
 sum_items:=(o.order_snapshot->'validacao'->>'somaItens')::numeric;
 if total<=0 or discount>subtotal or abs(subtotal-sum_items)>0.02
 or abs(total-(subtotal-discount+freight))>0.02
 or exists(select 1 from jsonb_array_elements(items) as i
 where length(trim(coalesce(i->>'descricao','')))=0
 or coalesce(i->>'valorTotal','') !~ '^[0-9]+([.][0-9]+)?$')
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
end $function$
;
CREATE OR REPLACE FUNCTION public.aceite_atualizar_rascunho_sic(p_order_id uuid, p_request_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare o public.aceite_orders%rowtype; q public.aceite_sic_requests%rowtype; p jsonb; i jsonb; v jsonb; n numeric; total numeric; soma numeric; subtotal numeric; desconto numeric; frete numeric;
begin
 select * into o from public.aceite_orders where id=p_order_id for update;
 if not found or o.origin<>'SIC_SUPRASYS' or o.status<>'rascunho' or o.details->>'draftOnly'<>'true' then raise exception 'Rascunho nao elegivel para atualizacao'; end if;
 if exists(select 1 from public.aceite_tokens where order_id=o.id) or exists(select 1 from public.aceite_acceptances where order_id=o.id) then raise exception 'Pedido possui vinculos de assinatura'; end if;
 select * into q from public.aceite_sic_requests where id=p_request_id and requested_by=p_actor_id and status='completed';
 if not found or q.finished_at is null or q.finished_at < now()-interval '30 minutes' or q.finished_at>now()+interval '1 minute' then raise exception 'Consulta SIC nao autorizada ou expirada'; end if;
 p:=q.result->'pedidoCompleto';i:=q.result->'itens';v:=q.result->'validacao';
 if p is null or jsonb_typeof(i)<>'array' or jsonb_array_length(i) not between 1 and 200 or
 (p->>'numero')::bigint<>o.sic_order_number or (p->>'empresa')::integer<>o.sic_company_id or q.order_number<>o.sic_order_number or
 upper(trim(p->>'liberado'))<>'S' or v->>'valido'<>'true' or
 nullif(p->'cliente'->>'nome','') is null or nullif(p->'valores'->>'total','') is null or nullif(v->>'somaItens','') is null
 then raise exception 'Consulta SIC inconsistente'; end if;
 if not (
  coalesce(p->'valores'->>'subtotal','') ~ '^[0-9]+([.][0-9]+)?$'
  and coalesce(p->'valores'->>'total','') ~ '^[0-9]+([.][0-9]+)?$'
  and coalesce(v->>'somaItens','') ~ '^[0-9]+([.][0-9]+)?$'
  and coalesce(p->'valores'->>'desconto','0') ~ '^[0-9]+([.][0-9]+)?$'
  and coalesce(p->>'frete','0') ~ '^[0-9]+([.][0-9]+)?$'
 ) then raise exception 'Totais invalidos'; end if;
 subtotal:=(p->'valores'->>'subtotal')::numeric;
 desconto:=coalesce((p->'valores'->>'desconto')::numeric,0);
 frete:=coalesce((p->>'frete')::numeric,0);
 total:=(p->'valores'->>'total')::numeric;
 soma:=(v->>'somaItens')::numeric;
 if total<=0 or desconto>subtotal or abs(subtotal-soma)>0.02
 or abs(total-(subtotal-desconto+frete))>0.02
 or exists(select 1 from jsonb_array_elements(i) as i
 where length(trim(coalesce(i->>'descricao','')))=0
 or coalesce(i->>'valorTotal','') !~ '^[0-9]+([.][0-9]+)?$')
 then raise exception 'Itens ou totais inconsistentes'; end if;
 if o.order_snapshot->>'sourceRequestId'=q.id::text then return jsonb_build_object('updated',false,'orderId',o.id);end if;
 update public.aceite_orders set order_snapshot=jsonb_build_object('pedidoCompleto',p,'itens',i,'validacao',v,'sourceRequestId',q.id,'refreshedAt',now()),
 details=jsonb_set(coalesce(o.details,'{}'::jsonb),'{snapshotRevision}',to_jsonb(coalesce((o.details->>'snapshotRevision')::integer,1)+1),true),
 updated_at=now() where id=o.id;
 return jsonb_build_object('updated',true,'orderId',o.id);
end $function$
;
COMMIT;
