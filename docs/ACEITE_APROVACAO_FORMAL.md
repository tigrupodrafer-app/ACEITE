# ACEITE DRAFER — Homologação formal jurídica e comercial

## O que foi implementado

- `public.aceite_approval_authorizers`: designação explícita de aprovadores por `user_id`, empresa SIC e escopo (`juridico` ou `comercial`). Criada sem designações ativas.
- `public.aceite_formal_approvals`: decisão imutável (`aprovado` ou `reprovado`), com justificativa e declaração de responsabilidade, vinculada a `document_id`, versão, SHA-256, empresa e responsável.
- `netlify/functions/formal-approval.cjs`: exige identidade Supabase válida, papel `admin` na tabela `aceite_members`, e vínculo ativo em `aceite_approval_authorizers` para a empresa.
- `src/components/FormalApproval.jsx`: apresenta pendências jurídica/comercial e formulário somente quando a conta tem designação ativa.
- Duas pessoas diferentes por documento: UNIQUE `(document_id,approver_id)`. Uma decisão por área e versão: UNIQUE `(document_id,scope)`. Decisão negativa exige nova versão para nova deliberação.
- `anon` e `authenticated` sem acesso direto às tabelas novas. `service_role` somente SELECT na tabela de autoridades; somente SELECT+INSERT em aprovações (sem UPDATE/DELETE).
- A aprovação refere-se **à minuta de revisão**, e **não** constitui termo jurídico final, aceite pelo cliente, autorização de fabricação ou liberação automática da garantia.

## Nomeação de aprovadores (ação administrativa FUTURA, não executar sem autorização expressa)

É necessário identificar responsável jurídico e responsável comercial da empresa SIC. Ambos precisam ter usuário ativo no `aceite_members` com papel `admin`, ter conta Auth Google/Supabase, e receber nomeação específica assinada/aprovada pela direção.

Depois de receber os IDs UUID corretos e a referência documental da nomeação, o administrador de banco poderá usar **em operação controlada**:

```sql
-- MODELO: substituir campos e executar SOMENTE apos nomeacao formal.
insert into public.aceite_approval_authorizers
  (user_id, sic_company_id, scope, active, appointed_by, appointment_reference)
values
  ('<UUID_RESPONSAVEL_JURIDICO>'::uuid, 1, 'juridico', true,
   '<UUID_NOMEANTE>'::uuid, 'Ato de nomeacao n. ...'),
  ('<UUID_RESPONSAVEL_COMERCIAL>'::uuid, 1, 'comercial', true,
   '<UUID_NOMEANTE>'::uuid, 'Ato de nomeacao n. ...');
```

NUNCA usar o mesmo usuário para ambas as decisões no mesmo documento. Se for necessário revogar a nomeação, alterar `active=false` pelo administrador do banco, mantendo auditoria de quem realizou a revogação.

## Fluxo de testes

1. Publicar na homologação Netlify a branch `feat/migracao-supabase-netlify-20261113`.
2. Consultar pedido 352488 no Dashboard e recuperar o rascunho.
3. Abrir o PDF integral versionado e a seção **Aprovação formal — jurídico e comercial**.
4. Antes de qualquer nomeação, a seção deve indicar que a conta não está designada, e não mostrar o comando de aprovar.
5. Depois das nomeações, cada responsável poderá registrar decisão para a versão exata, justificativa de 30 a 3000 caracteres e confirmação explícita.
6. O painel exibirá ambas as decisões, sem alterar o `aceite_orders.status` e sem gerar tokens/assinaturas.
7. Repetir decisão para o mesmo escopo deve falhar. Trocar a versão invalida a aprovação antiga para os fins de duas decisões atuais.

## Bloqueio de produção

Mesmo que ambas as decisões sejam favoráveis, **a assinatura pública permanece desabilitada** e os documentos `review_draft` continuam marcados "NÃO ASSINAR / NÃO ENVIAR AO CLIENTE". Próxima etapa: produzir PDF jurídico final a partir do texto formalmente aprovado e criar mecanismo transacional de assinatura de uso único, com trilha de evidências, prevenção de replay e vínculo ao hash do texto definitivo.

**Segurança antes de produção:** rotacionar `SIC_BRIDGE_TOKEN` previamente exposto em testes, e revisar direitos do consumidor e validade jurídica do documento final com profissional habilitado.
