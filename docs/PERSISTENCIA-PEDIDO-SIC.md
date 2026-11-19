# Contrato de persistência — Pedido SIC / ACEITE (proposta, não implantada)

## Objetivo
O vendedor pesquisa **número do pedido comercial** (não número da venda), confere a folha, gera o aceite, compartilha o link e recebe o resultado assinado. O cliente visualiza a **mesma versão congelada** do pedido antes de assinar. Faturamento não é requisito.

## Banco (migração ainda não executada)
`supabase/migrations/202611190001_sic_pedido_versao.sql` define uma tabela de snapshots comerciais:
- Identificador UUID, número do pedido comercial, empresa, vendedor proprietário, conteúdo JSONB e SHA-256 **calculado no banco**.
- RLS permite SELECT apenas ao vendedor autenticado proprietário.
- Nenhum INSERT/UPDATE/DELETE é concedido ao navegador autenticado.
- Trigger rejeita UPDATE/DELETE de versões existentes.
- A chave de serviço do Supabase **nunca** entra no frontend.

## Backend obrigatório antes de habilitar "Gerar aceite"
1. Autenticar vendedor e verificar permissão para empresa/pedido.
2. Consultar o SIC por número do pedido (nunca confiar em conteúdo comercial enviado pelo navegador).
3. Revalidar CPF/CNPJ, itens, valores, liberação comercial e regras de emissão.
4. Capturar o conteúdo comercial **completo**, inclusive campos necessários à folha de impressão homologada; não gerar documento incompleto.
5. Gravar snapshot via backend confiável, vinculando vendedor_id ao usuário autenticado.
6. Em transação, criar um registro de aceite apontando para `sic_pedido_versao.id`, com estado `aguardando_assinatura`; impor unicidade/idempotência conforme regra de negócio.
7. Gerar token aleatório de alta entropia; guardar apenas hash do token no backend. A URL pública usa o token opaco e não expõe UUID, CPF/CNPJ ou dados do SIC.
8. Ao abrir o link, backend valida token, expiração, revogação e status; devolve apenas os dados da versão vinculada, junto com o termo jurídico correto.
9. Antes de registrar a assinatura, validar novamente token e estado, registrar evidências e hash do documento efetivamente apresentado. Tornar a assinatura idempotente.
10. O vendedor consulta status e documento assinado com autorização por proprietário; cliente não precisa login.

## Integridade e limitações
O hash `sha256_servidor` é sobre a serialização JSONB do PostgreSQL. O SHA-256 informativo de `sicPedidoSnapshot.js` usa JSON ordenado no JavaScript; **não comparar os dois hashes diretamente** sem normalização idêntica. O banco é a autoridade do hash persistido.

A tabela de versões **não** implementa assinatura, autorização jurídica, emissão de link nem armazenamento de evidências. Esses serviços exigem implementação e homologação separadas. A página pública atual ainda usa Base44 e não deve receber dados SIC sem a nova API autenticada e sem isolamento dos tokens.

## Homologação
- Testar RLS com dois vendedores diferentes; impedir leitura cruzada.
- Testar tentativas de INSERT, UPDATE e DELETE pelo navegador.
- Verificar que mudança posterior no SIC não altera a versão assinada.
- Conferir layout com o modelo oficial do pedido; endereço de entrega não pode ser inferido do endereço cadastral.
- Verificar que número da venda e faturamento são opcionais.
- Executar migração primeiro em ambiente de homologação com backup e plano de rollback.
