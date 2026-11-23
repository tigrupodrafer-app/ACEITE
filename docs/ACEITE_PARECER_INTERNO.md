# ACEITE DRAFER — Etapa: parecer interno do termo

Implementado em homologação (branch `feat/migracao-supabase-netlify-20261113`). **Não é emissão jurídica definitiva, nem assinatura eletrônica.**

## Objetivo
Analisar a minuta de revisão integral, incluindo as 11 seções, diagramas e avisos legais, antes da aprovação jurídica real.

## Fluxo
1. Consultar pedido SIC e obter o rascunho interno já cadastrado.
2. Gerar ou recuperar o PDF versionado com SHA-256 no bucket privado.
3. Na caixa "Parecer interno sobre o documento", conferir oito áreas: garantia, direitos do consumidor, responsabilidades, regras SIC, empresa emitente, diagramas, dados do pedido e evidências de assinatura.
4. Selecionar "Solicitar ajustes" ou "Registrar parecer de conferência (sem aprovação jurídica)", informar observações e salvar.
5. Exibir histórico vinculado ao documento, versão e hash; nova versão não apaga pareceres anteriores.

## Segurança
- Endpoint `/.netlify/functions/document-review` exige bearer token Supabase válido e `aceite_members.active=true` com papel `admin`, no backend.
- O cliente envia apenas o ID do rascunho, versão selecionada, campos de parecer. Documento, SHA e versão são obtidos novamente pelo backend nas tabelas privadas.
- Parecer se aplica exclusivamente à **minuta mais recente** do pedido ainda em `rascunho`.
- Tabela `public.aceite_document_reviews` com RLS ativo, sem policies de acesso direto para `anon` ou `authenticated`; `service_role` possui exclusivamente `SELECT` e `INSERT`.
- O endpoint não modifica `aceite_orders`, não marca `legalDocumentApproved`, não gera `aceite_tokens`, não envia link e não registra `aceite_acceptances`.
- O campo `assessment='parecer_registrado'` é apenas uma anotação; **não significa aprovação formal da área jurídica**.
- Solicitações precisam de observações de 15 a 2000 caracteres e checklist de tópicos controlados.

## Antes da assinatura
- Instituir responsáveis autorizados por empresa emitente e fluxo de aprovação jurídica formal; comprovar base legal e validação técnica.
- Aprovar texto **definitivo**, produzir versão final distinta de `review_draft` e vincular seu hash a evidências de consentimento.
- Homologar status fiscais/comerciais SIC, condições de fabricação sob medida, devolução, garantia e privacidade.
- Criar teste de ponta a ponta de consumo atômico de token, assinatura, auditoria, reenvio/revogação.
- Rotacionar segredo da ponte SIC antes da produção e automatizar o serviço.
