# ACEITE DRAFER — Homologação das duas funcionalidades finais

## O que foi instalado

Esta etapa implementa um **sandbox funcional**, totalmente separado de pedidos e contratos reais:

1. Assinatura/aceite **simulado** do cliente com link aleatório exclusivo de 256 bits, validade de 30 minutos, hash SHA-256 do token no Supabase, texto fictício com hash e aceite de uso único.
2. Liberação de fabricação **simulada**, somente após o aceite de teste, executada por conta administrativa e consumida uma única vez.

A apresentação é uma **prova técnica de experiência e fluxo**, não um documento juridicamente válido. O pedido é sempre `DEMO-001`, empresa DEMONSTRAÇÃO, cliente fictício, 10 peças, R$ 1.000,00. Não há conexão SIC nesta etapa.

## URLs para homologação

- Dashboard (admin): `https://dainty-fairy-2234e1.netlify.app/Dashboard`
- Laboratório (admin): `https://dainty-fairy-2234e1.netlify.app/Laboratorio`
- Link público temporário: `/AssinarDemo?token=<token_gerado>`, no mesmo domínio do laboratório

## Passo a passo

1. Conferir que a branch `feat/migracao-supabase-netlify-20261113` foi publicada no Netlify.
2. Entrar no Dashboard com a conta TI, clicar **Testar assinatura e fabricação**.
3. Selecionar **Criar nova demonstração**. O sistema retorna link temporário. Não compartilhar com clientes reais.
4. Abrir em aba anônima ou outro celular; ver pedido fictício, texto de demonstração e hash SHA-256.
5. Informar um **nome fictício**, marcar a ciência de teste e clicar **Confirmar aceite de TESTE**.
6. Verificar identificador e horário da operação; tentar clicar de novo: não deverá registrar segundo aceite.
7. No laboratório administrativo, clicar **Atualizar situação**, conferir `aceite_simulado`.
8. Clicar **Simular liberação de fabricação**; conferir `fabricacao_simulada`. Nova tentativa deve ser recusada.
9. Consultar Supabase: `aceite_demo_flows` contém apenas dados simulados; `aceite_orders`, `aceite_tokens` e `aceite_acceptances` não recebem registros desse teste.

## Controles

- Tabela `public.aceite_demo_flows` com RLS e sem políticas públicas.
- Funções RPC `aceite_demo_accept_atomic` e `aceite_demo_release_atomic` com uso somente por `service_role`.
- O token original nunca é persistido em texto claro; apenas o hash SHA-256.
- Limite de até 20 links de teste por administrador em 24 horas.
- Nenhum endpoint do laboratório escreve no SIC, ativa garantia, altera `aceite_orders` ou cria `aceite_tokens`/`aceite_acceptances`.
- O nome de teste é armazenado somente na tabela de homologação; **não usar nomes reais, CPF ou dados pessoais de clientes**.
- O link deve ser tratado como informação sensível e não publicado em canais abertos.

## Produção — trabalho ainda necessário

A assinatura **real** e a liberação **real de fabricação** permanecem bloqueadas até:

- Parecer jurídico favorável sobre um texto definitivo sem cláusulas pendentes, com versão/documento hash imutável;
- validação da empresa emissora, identificação do cliente e regras de assinatura eletrônica;
- regras comerciais SIC explícitas e homologadas para `SITU`, `LIBERADO`, `FATURADO` e operação por família de produto;
- tokens reais de uso único, vínculo ao termo final, registro de consentimento e evidências aptas à política de retenção/LGPD;
- desenho da autorização final de fabricação e definição de integração de **escrita** no SIC, se realmente desejada (sem modificar Firebird antes de aprovação);
- auditoria de segurança com testagem em homologação e estratégia de recuperação de falhas.

## Diagnóstico

Se não aparecer o botão, confira o commit publicado no Netlify, atualize com Ctrl+F5 e confirme que a sessão é `admin`.

Se o link público falhar, conferir o painel Functions/Logs do Netlify para `demo-public` e `demo-flow`; as Functions precisam das variáveis atuais `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` do projeto correto.

Não enviar segredos no chat.
