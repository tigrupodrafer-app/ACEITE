# Retirada integral do Base44 — DRAFER ACEITE

**Situação: migração em andamento, NÃO concluída.** Não publicar a branch como produção antes dos testes de autenticação e assinatura.

## Arquitetura alvo
- Netlify: React/Vite estático e roteamento SPA.
- GitHub: código, revisão, CI e deploy.
- API DRAFER (HTTPS): autenticação/sessões, autorização por vendedor, leitura SIC, persistência de snapshots, emissão de links, assinatura e auditoria.
- SIC/Firebird: acessível **somente** pela API no servidor; nunca pelo navegador.
- Persistência de aceites: deve ser definida e operada pela API DRAFER (não pressupor que GitHub ou Netlify sejam banco de dados).

## Vestígios confirmados no código
1. `vite.config.js`: `@base44/vite-plugin` ativo, incluindo analytics e visual edit.
2. `package.json`: `@base44/sdk` e `@base44/vite-plugin`.
3. `src/api/base44Client.js`: inicialização do SDK.
4. `src/lib/AuthContext.jsx`: consulta `/api/apps/public`, autenticação `base44.auth.me()`, logout e `redirectToLogin()` externos.
5. `src/lib/app-params.js`: tokens e parâmetros `base44_*` no localStorage/URL.
6. `src/pages/NewOrder.jsx`: formulário legado e `base44.entities.Order.create` ainda presentes.
7. `src/pages/AssinarAceite.jsx`: `getOrderByToken` e `signOrderByToken` do Base44.
8. `src/Layout.jsx`: logo carregado de caminho `base44-prod` (substituído provisoriamente por texto local) e link legado para `SubmeterPedido` (corrigido para `NewOrder`).
9. `src/pages.config.js`: rotas legadas `AuthTest` e `SubmeterPedido`; revisar antes de excluir.
10. Demais páginas e funções devem passar por auditoria de imports/referências antes da remoção do SDK.

## Sequência segura
1. Criar API de sessão DRAFER com endpoints `GET /api/auth/me`, `POST /api/auth/login`, `POST /api/auth/logout`; cookies HttpOnly/Secure/SameSite, CSRF, limitação de tentativas, controle de usuários e filiais. Não permitir acesso administrativo anônimo.
2. Substituir AuthContext e a tela de login por rotas da API DRAFER, sem redirects externos.
3. Migrar Dashboard, Perfil, NewOrder, OrderDetail e funções de assinatura para endpoints da API. Não gerar pedidos fictícios `PED-*`.
4. Implementar API pública de token opaco para leitura do snapshot imutável e assinatura; não expor Firebird nem credenciais.
5. Remover imports do SDK, app-params, páginas legadas, plugin e pacotes; configurar Vite com alias `@` e roteamento SPA na Netlify.
6. Hospedar logotipo corporativo aprovado no repositório local, sem usar armazenamento legado.
7. Fazer busca final por `base44`, `metal-shield-sync`, `/api/apps`, `from_url` e domínios antigos; corrigir todas as ocorrências executáveis.
8. Testar login, consulta SIC, isolamento por vendedor, link público, assinatura, PDF, logout, refresh de SPA, deploy e ausência de chamadas ao Base44 no DevTools.

## Bloqueios conhecidos
A API atual no SRV-DRAFER foi verificada anteriormente para leitura de pedidos, mas não há comprovação de endpoints de sessão/assinatura independentes do Base44. Retirar o SDK antes de substituí-los quebraria o login e o aceite. A migração SQL proposta no PR ainda não foi aplicada.

**Regra de liberação:** zero chamadas ou redirects Base44 no navegador, testes automatizados verdes, homologação com API DRAFER, e publicação apenas após validação.
