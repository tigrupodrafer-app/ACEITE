-- Explicit seller verification and handoff; never writes to SIC or initiates manufacturing.
-- The service-role-only function enforces single handoff per signed document.
create or replace function public.aceite_registrar_encaminhamento(
 p_order_id uuid,p_acceptance_id uuid,p_document_id uuid,p_actor_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 o public.aceite_orders%rowtype;
 a public.aceite_acceptances%rowtype;
 d public.aceite_generated_documents%rowtype;
 ts timestamptz:=clock_timestamp();
begin
 select * into o from public.aceite_orders where id=p_order_id for update;
 if not found or o.origin<>'SIC_SUPRASYS' or o.status<>'aguardando_aceite_pedido'
 then raise exception 'Pedido indisponivel para encaminhamento'; end if;
 select * into a from public.aceite_acceptances
 where id=p_acceptance_id and order_id=p_order_id and level=1;
 if not found then raise exception 'Aceite nao encontrado'; end if;
 select * into d from public.aceite_generated_documents
 where id=p_document_id and order_id=p_order_id and acceptance_id=p_acceptance_id
 and document_type='level1_acceptance';
 if not found or length(trim(d.file_sha256))<>64
 then raise exception 'Documento assinado nao encontrado'; end if;
 if exists(select 1 from public.aceite_audit_events
 where order_id=p_order_id and action='signed_acceptance_handed_to_production')
 then raise exception 'Encaminhamento ja registrado'; end if;
 insert into public.aceite_audit_events(order_id,actor_type,actor_id,action,metadata)
 values(p_order_id,'usuario',p_actor_id::text,'signed_acceptance_handed_to_production',
 jsonb_build_object('acceptanceId',a.id,'documentId',d.id,'pdfSha256',trim(d.file_sha256),
 'verifiedAt',ts,'externalERPWrite',false,'productionStarted',false));
 return jsonb_build_object('registered',true,'registeredAt',ts,
 'orderId',p_order_id,'documentId',d.id,'pdfSha256',trim(d.file_sha256),
 'externalERPWrite',false,'productionStarted',false);
end $$;
revoke all on function public.aceite_registrar_encaminhamento(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.aceite_registrar_encaminhamento(uuid,uuid,uuid,uuid) to service_role;
