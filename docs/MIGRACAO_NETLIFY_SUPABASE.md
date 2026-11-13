# DRAFER ACEITE — Migração Base44 para Supabase + Netlify

**Em homologação. NÃO fazer merge nem publicar em produção antes de liberar os fluxos jurídicos.**

## Ambientes confirmados
- Repositório: https://github.com/tigrupodrafer-app/ACEITE
- Branch: feat/migracao-supabase-netlify-20261113
- Supabase: https://jgdacjhjbqrtlklghcev.supabase.co
- Netlify anteriormente informado: https://aceitegrupodrafer.netlify.app/ (ainda conectado ao repositório antigo)
- Domínio definitivo planejado: aceite.grupodrafer.com (DNS ainda não alterado)

## O que já foi implementado na branch
- Banco Supabase com 7 tabelas, RLS ativa e storage privado.
- Login Google usando Supabase Auth, fluxo PKCE, autorização real verificada no backend.
- SDK/plugin Base44 removidos das dependências de build.
- Dashboard lendo pedidos pelo endpoint protegido Netlify Functions.
- Endpoint de perfil autenticado; endpoint de consulta pública por hash de token.
- Assinatura jurídica intencionalmente desabilitada até backend transacional e texto aprovado.
- Módulos ainda não migrados isolados: arquivos legados preservados no repositório, mas não importados pela aplicação ativa.
- GitHub Actions: npm ci, build e validação sintática das funções.

## Configure no Supabase Auth do projeto Aceite
1. Authentication > URL Configuration: defina Site URL como a origem do novo site de homologação (por exemplo https://aceitegrupodrafer.netlify.app), somente quando esse site já publicar a nova branch.
2. Authentication > Sign In / Providers > Google: habilite Google e informe Client ID e Client Secret do Google Cloud.
3. No Google Cloud, o Authorized redirect URI é exatamente:
   https://jgdacjhjbqrtlklghcev.supabase.co/auth/v1/callback
4. Cadastre também a origem HTTPS do frontend em Authorized JavaScript origins.
5. O login Google criará auth.users; a equipe de TI deve autorizar explicitamente cada colaborador em public.aceite_members. Inicialmente não há membros aprovados. Primeiro admin deve ser provisionado somente após confirmar o UUID e identidade da conta Google correta.

## Configure no Netlify
- Preferir NOVO site de homologação para esse repositório antes de substituir o site antigo.
- Repositório: tigrupodrafer-app/ACEITE; branch para preview: feat/migracao-supabase-netlify-20261113.
- Build command: npm run build; publish directory: dist; Node 22.
- Frontend: .env.production inclui URL e chave PUBLICÁVEL do Supabase (não são segredo).
- Em Environment variables (escopo Functions): SUPABASE_SERVICE_ROLE_KEY (somente backend).
- SUPABASE_URL opcional: https://jgdacjhjbqrtlklghcev.supabase.co
- NUNCA criar chave service_role com prefixo VITE_ nem colocá-la no repositório.
- Não publicar FB_*, senha do SIC, banco Firebird, ou porta 3101.

## Endpoints já criados
- GET /.netlify/functions/health
- GET /.netlify/functions/me — Bearer JWT + membership active true
- GET /.netlify/functions/orders?limit=100 — Bearer JWT + membership
- GET /.netlify/functions/public-order?token=(64 dígitos hex) — token válido, não usado, não expirado, estágio adequado

## Faltam obrigatoriamente
1. Migrar registros, anexos, PDFs, tokens e evidências existentes no Base44 sem perda histórica.
2. Integrar SIC por sincronização segura a partir da rede interna; Firebird e API 3101 jamais expostos na Internet.
3. Validar elegibilidade: SIC SITU=0 DIGITADO, 1 FATURADO TOTAL, 2 FATURADO PARCIAL, 3 CANCELADO, 4 SALDO CANCELADO. LIBERADO=S não é autorização suficiente.
4. Criar e revogar links de aceite; assinatura segura com arquivo em Storage privado, registro do termo legal aprovado, IP/user-agent e transação única.
5. Implementar PDFs N1/N2/N3, evidências de entrega/instalação e versão dos documentos.
6. Migrar detalhes de pedidos, formulário, perfil, comunicação e notificações do sistema legado.
7. Revisão jurídica do texto de garantia antes de habilitar assinatura externa.
8. Testes ponta a ponta, controles de acesso, revisão de segurança, domínio e backups.
9. Somente após tudo aprovado, publicar a nova branch no site definitivo.

**O novo login e dashboard já foram codificados, mas ainda não foram testados contra um Netlify implantado com configurações reais. A main permanece preservada.**
