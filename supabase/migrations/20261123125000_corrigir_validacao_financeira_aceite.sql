-- Reconcile item subtotal, discount and freight before activation.
CREATE OR REPLACE FUNCTION public.aceite_ativar_pedido_atomico(p_order_id uuid, p_actor_id uuid, p_legal_version text, p_legal_sha256 text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare o public.aceite_orders%rowtype; p jsonb; items jsonb; total numeric; sum_items numeric; subtotal numeric; discount numeric; freight numeric; ev public.aceite_audit_events%rowtype; chosen jsonb; normalized text;
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

 select * into ev from public.aceite_audit_events
 where order_id=p_order_id and action='sic_delivery_address_reviewed'
 and actor_id=p_actor_id::text order by created_at desc,id desc limit 1;
 if ev.id is null or ev.metadata->>'manualReview' is distinct from 'true'
 or ev.metadata->>'sourceRequestId' is distinct from o.order_snapshot->>'sourceRequestId'
 or ev.metadata->>'snapshotRevision' is distinct from coalesce(o.details->>'snapshotRevision','1')
 or ev.metadata->>'companyId' is distinct from o.sic_company_id::text
 or ev.metadata->>'orderNumber' is distinct from o.sic_order_number::text
 or ev.metadata->>'deliveryAddress' is distinct from trim(coalesce(p->>'localEntrega',p->>'enderecoEntrega',''))
 then raise exception 'Conferencia de entrega ausente ou desatualizada'; end if;
 if ev.metadata->'deliverySelection'->>'origem'='ARQCADEND' then
 select x.value into chosen from jsonb_array_elements(coalesce(o.order_snapshot->'enderecosEntrega','[]'::jsonb)) x
 where x.value->>'origem'='ARQCADEND' and x.value->>'ativo'='true'
 and x.value->>'sequencia'=ev.metadata->'deliverySelection'->>'sequencia' limit 1;
 elsif ev.metadata->'deliverySelection'->>'origem'='ARQCAD'
 and not exists (select 1 from jsonb_array_elements(coalesce(o.order_snapshot->'enderecosEntrega','[]'::jsonb)) x
 where x.value->>'origem'='ARQCADEND' and x.value->>'ativo'='true')
 then chosen:=o.order_snapshot->'enderecoCadastralEntrega';
 else raise exception 'Selecao de entrega invalida'; end if;
 if chosen is null or nullif(trim(coalesce(chosen->>'endereco','')),'') is null
 or nullif(trim(coalesce(chosen->>'cidade','')),'') is null
 then raise exception 'Endereco SIC incompleto'; end if;
 select string_agg(trim(v),', ' order by n) into normalized
 from unnest(array[chosen->>'endereco',chosen->>'numero',chosen->>'bairro',chosen->>'cidade',chosen->>'uf',chosen->>'cep'])
 with ordinality as a(v,n) where nullif(trim(coalesce(v,'')),'') is not null;
 if normalized is distinct from ev.metadata->>'selectedAddress'
 then raise exception 'Endereco confirmado diverge do SIC'; end if;
 p:=jsonb_set(p,'{localEntregaSicOriginal}',to_jsonb(coalesce(p->>'localEntrega',p->>'enderecoEntrega','')),true);
 p:=jsonb_set(p,'{localEntrega}',to_jsonb(normalized),true);
 if not exists(select 1 from public.aceite_legal_versions
 where version=p_legal_version and content_sha256=p_legal_sha256 and status='homologado')
 then raise exception 'Versao juridica nao homologada'; end if;
 if not (coalesce(p->'valores'->>'total','') ~ '^[0-9]+(\.[0-9]+)?$'
 and coalesce(p->'valores'->>'subtotal','') ~ '^[0-9]+(\.[0-9]+)?$'
 and coalesce(p->'valores'->>'desconto','0') ~ '^[0-9]+(\.[0-9]+)?$'
 and coalesce(p->>'frete','0') ~ '^[0-9]+(\.[0-9]+)?$'
 and coalesce(o.order_snapshot->'validacao'->>'somaItens','') ~ '^[0-9]+(\.[0-9]+)?$')
 then raise exception 'Totais invalidos'; end if;
 total:=(p->'valores'->>'total')::numeric;
 sum_items:=(o.order_snapshot->'validacao'->>'somaItens')::numeric;
 subtotal:=(p->'valores'->>'subtotal')::numeric;
 discount:=coalesce((p->'valores'->>'desconto')::numeric,0);
 freight:=coalesce((p->>'frete')::numeric,0);
 if total<=0 or subtotal<0 or discount<0 or freight<0 or discount>subtotal or abs(subtotal-sum_items)>0.02 or abs(total-(subtotal-discount+freight))>0.02 or exists(
 select 1 from jsonb_array_elements(items) as i
 where length(trim(coalesce(i->>'descricao','')))=0
 or coalesce(i->>'valorTotal','') !~ '^-?[0-9]+(\.[0-9]+)?$')
 then raise exception 'Itens ou totais inconsistentes'; end if;
 update public.aceite_orders set status='aguardando_aceite_pedido',
 order_snapshot=jsonb_set(o.order_snapshot,'{pedidoCompleto}',p,true),
 details=o.details||jsonb_build_object('draftOnly',false,'eligibilityApproved',true,
 'legalDocumentApproved',true,'mirrorComplete',true,'legalVersion',p_legal_version,
 'legalSha256',p_legal_sha256,'deliveryAddress',normalized,'verifiedBy',p_actor_id,'verifiedAt',clock_timestamp()),
 updated_at=clock_timestamp() where id=p_order_id;
 insert into public.aceite_audit_events(order_id,actor_type,actor_id,action,metadata)
 values(p_order_id,'usuario',p_actor_id::text,'sic_mirror_verified_for_acceptance',
 jsonb_build_object('legalVersion',p_legal_version,'legalSha256',p_legal_sha256,
 'sourceRequestId',o.order_snapshot->>'sourceRequestId',
 'manualReview',true,'externalERPWrite',false));
 return jsonb_build_object('activated',true,'orderId',p_order_id);
end $function$
;
