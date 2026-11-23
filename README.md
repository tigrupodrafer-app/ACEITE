# DRAFER ACEITE

Sistema de aceite jurídico de pedidos do SIC SupraSYS.

## Arquitetura
- Frontend React/Vite publicado manualmente no Netlify
- API Netlify Functions autenticada com Supabase
- PostgreSQL, autenticação e arquivos privados no Supabase
- Ponte SIC de leitura no servidor interno, com comunicação HTTPS de saída

## Fluxo
Vendedor consulta o pedido SIC, confere o espelho, prepara o documento, ativa o aceite, emite o link pessoal e o envia ao cliente. O cliente confere o pedido, confirma três declarações e assina. O vendedor verifica as evidências, baixa o PDF assinado e registra o encaminhamento à produção.

## Desenvolvimento
```sh
npm ci
npm run build
```
Configuração pública: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
Credenciais de serviço e da ponte SIC pertencem exclusivamente ao ambiente de execução; nunca as coloque no frontend ou repositório.

## Publicação
A publicação é manual, após aprovação dos testes e conferência das variáveis do Netlify. Não execute migrações destrutivas nem substitua os arquivos ativos da ponte SIC sem validação do servidor.

## Segurança
A assinatura depende de versão jurídica homologada, espelho SIC elegível, link temporário, três consentimentos e transação atômica. A integração SIC é somente leitura; o encaminhamento não inicia fabricação automaticamente.
