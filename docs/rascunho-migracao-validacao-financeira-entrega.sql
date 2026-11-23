-- DRAFER ACEITE: revisao de seguranca pendente de homologacao.
-- NAO EXECUTAR antes de validar esquema, grants e ambiente de teste.
-- A comparacao financeira considera subtotal dos itens, desconto e frete.
create or replace function public.aceite_financeiro_consistente(p jsonb, v jsonb)
returns boolean language sql immutable set search_path = '' as $$
 select coalesce(
  (p->'valores'->>'subtotal')::numeric >= 0
  and coalesce((p->'valores'->>'desconto')::numeric,0)>=0
  and coalesce((p->'valores'->>'desconto')::numeric,0)<=(p->'valores'->>'subtotal')::numeric
  and coalesce((p->>'frete')::numeric,0)>=0
  and (p->'valores'->>'total')::numeric>0
  and abs((p->'valores'->>'subtotal')::numeric-(v->>'somaItens')::numeric)<=0.02
  and abs((p->'valores'->>'total')::numeric -
    ((p->'valores'->>'subtotal')::numeric-coalesce((p->'valores'->>'desconto')::numeric,0)+coalesce((p->>'frete')::numeric,0)))<=0.02,
  false);
$$;
revoke all on function public.aceite_financeiro_consistente(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.aceite_financeiro_consistente(jsonb,jsonb) to service_role;
-- ATENCAO: a funcao acima pode gerar erro para valores nao numericos.
-- As RPCs devem verificar formato e elegibilidade ANTES da conversao.
-- A RPC de ativacao tambem deve exigir, sob FOR UPDATE, evento com:
-- order_id, actor_id::text, action='sic_delivery_address_reviewed',
-- metadata.sourceRequestId = order_snapshot.sourceRequestId,
-- metadata.snapshotRevision = details.snapshotRevision,
-- metadata.deliveryAddress = pedidoCompleto.localEntrega/enderecoEntrega,
-- metadata.companyId e metadata.orderNumber consistentes.
-- O hash SHA-256 do JSON gerado no Node NAO e necessariamente igual
-- ao digest da representacao jsonb do PostgreSQL: nao comparar os dois.
-- Sem essa validacao atomica, manter ativacao bloqueada.
