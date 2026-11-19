# Integração SIC → ACEITE — etapa GitHub

## Estado
Implementação inicial de consulta e adaptação **somente leitura**. Não modifica as funções de aceite N1/N2/N3, os tokens, o armazenamento de evidências, o gerador jurídico jsPDF ou a entidade Order.

## Origem homologada
A API Node/Express on-premise já foi testada em `127.0.0.1:3101` para `GET /api/pedidos/:numero`. Seu código-fonte e os serviços Firebird locais **não estão neste repositório**. O navegador não pode acessar `127.0.0.1` do servidor nem o Firebird diretamente.

## Arquivos adicionados
- `src/lib/sicPedidoAdapter.js`: mapeia `pedido`, `cliente`, `itens[]`, `valores`, empresa e endereço cadastral; preserva múltiplas unidades e aplica pré-validação de CPF/CNPJ e finanças.
- `src/lib/sicPedidoApi.js`: cliente HTTP HTTPS, sem segredos embutidos.
- `src/components/order/SicOrderLookup.jsx`: interface de consulta isolada, sem efeitos colaterais.

## Requisitos antes de conectar ao fluxo produtivo
1. Disponibilizar endpoint HTTPS autenticado com autorização por usuário e pedido, sem expor o Firebird ou a porta interna 3101.
2. Configurar `VITE_ACEITE_API_URL` no ambiente de deploy com a origem pública autorizada. Essa variável é pública; **nunca** inserir senha do banco, chave privada ou token de serviço.
3. Configurar CORS com origem exata, proteção CSRF se autenticação por cookie, rate limiting, logs sem PII e validação de acesso.
4. Integrar o componente numa página autenticada após confirmar as regras de roteamento geradas pelo Base44. Não modificar `src/pages.config.js` manualmente, pois é gerado automaticamente.
5. Definir e implementar persistência idempotente do pedido SIC e seus itens na estrutura jurídica, com validação de situação/liberação e revisão de garantia.
6. Homologar com pedidos reais anonimizados. Documento ausente no SIC deve bloquear emissão, não ser preenchido artificialmente.

## Limites
O campo `enderecoPrincipalCadastrado` não comprova endereço de entrega. `validacao.valido` é financeira, não é autorização jurídica. A pré-validação local não substitui autorização de negócio. Nenhuma publicação ou integração operacional é presumida.
