# DRAFER ACEITE — Documento versionado de revisão (2026-11-17)

## Objetivo e limite de segurança

O módulo `review-document` **não é o aceite eletrônico**. Ele permite a um administrador autenticado preparar um PDF preliminar de um pedido SIC já salvo como `rascunho`, arquivá-lo e baixá-lo de forma controlada. O PDF contém marcas explícitas "MINUTA INTERNA — NÃO ASSINAR / NÃO ENVIAR AO CLIENTE". Não gera `aceite_tokens`, `aceite_acceptances` nem transições para `aguardando_aceite_pedido`.

A liberação do termo definitivo depende da aprovação formal do texto jurídico, identificação da empresa emitente, elegibilidade SIC e implementação de um endpoint transacional de assinatura com comprovante.

## Estrutura confirmada

- Banco Supabase `jgdacjhjbqrtlklghcev`, bucket `aceite-privado` com `public=false`.
- A tabela `aceite_generated_documents` recebeu por migration `aceite_add_separate_review_draft_document_type` o `document_type='review_draft'`, distinto de `level1_acceptance`, `level2_delivery`, `level3_installation`, `warranty`.
- Versionamento via `(order_id,document_type,version)` único; versões possuem caminhos aleatórios próprios (sem sobrescrita), `file_sha256` calculado sobre os bytes do PDF.
- `aceite_audit_events` registra `review_draft_document_generated` com administrador, versão, documento e SHA-256.
- RLS sem policies nas tabelas `aceite_*` permanece bloqueando acesso direto anônimo e autenticado. A Function usa chave de serviço **somente no servidor** e valida `requireStaff` mais papel `admin`.
- A API consulta `aceite_orders.order_snapshot` já persistido, não pede nova conexão ao SIC nem expõe banco Firebird na internet.
- O documento pode ser baixado somente por Function autenticada; ela confere SHA-256 dos bytes após ler o arquivo privado, antes de enviá-lo.

## Como testar após deploy Netlify

1. Atualizar a branch de homologação e conferir que os testes GitHub Actions estão verdes. Não alterar `main` nem outros sites Netlify.
2. Login de administrador no Dashboard `dainty-fairy-2234e1.netlify.app`.
3. Consultar pedido 352488 pelo SIC-Bridge e clicar **Registrar rascunho interno** (já existe: deverá ser identificado como registro existente, sem duplicar).
4. Clicar **Gerar PDF versionado para revisão**.
5. Confirmar **Versão 1**, hash SHA-256 (64 caracteres hexadecimais) e estado "**somente revisão interna**".
6. Clicar **Baixar PDF arquivado** e inspecionar conteúdo: código comercial 2506, sequência 1379, peso 16,555kg, 5,5 peças, total R$240,05 e advertências de revisão.
7. Validar no Supabase uma linha `aceite_generated_documents` do tipo `review_draft`, arquivo privado em `reviews/<uuid>/v1-<uuid>.pdf`, registro de auditoria; **zero** novas linhas de `aceite_tokens` e `aceite_acceptances`.
8. Repetir o pedido: não deve criar nova versão por padrão nem enviar link público.

## Antes da emissão final

- Confirmar CNPJ, razão social e endereço da empresa do pedido conforme SIC.
- Aprovação jurídica expressa do texto completo, garantia e direitos do consumidor. Não presumir validade do texto legado.
- Homologação dos códigos de situação fiscal/comercial e da política de fabricação por empresa/família de produto.
- Documento final de assinatura gerado no servidor e imutável; vincular hash ao consentimento e às evidências (data, hora, IP com política LGPD, user-agent, assinatura, checklist, aceite do texto exibido).
- Tokens expiráveis, aleatórios, hash armazenado, uso único e consumo atômico, antirreplay; autenticação e autorização do administrador antes de emitir link; etapa pública limitada ao pedido vinculado.
- Revisar prevenção de alterações do pedido e regras de reemissão/revogação de documento.
- Antes da exposição pública/produção, **rotacionar `SIC_BRIDGE_TOKEN`**, que esteve visível em capturas anteriores; instalar API/Bridge como serviços controlados e monitorar falhas.

## Rollback

A Function nova não altera o serviço SIC. Para desabilitar o módulo, retirar o botão/Function de revisão do deploy. Documentos preliminares já registrados permanecem privados e devem ser preservados conforme a política de retenção; a migration é aditiva e não precisa ser revertida para desabilitar o fluxo.
