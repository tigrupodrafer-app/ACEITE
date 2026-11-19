# ACEITE DRAFER — Login institucional por código de e-mail (OTP)

Implementado na branch `feat/migracao-supabase-netlify-20261113` com Google como alternativa.

## Contas previstas (piloto)

| Pessoa | Email | Responsabilidade |
|---|---|---|
| Heitor Lopes | heitor.lopes@grupodrafer.com | Jurídico |
| Jaime Lopes Junior | diretoria@grupodrafer.com | Comercial |

**Importante:** e-mail e responsabilidade designados são informações de negócio. Isso não constitui uma conta Auth criada nem nomeação formal ativa; ambas exigem provisionamento administrativo controlado.

## Segurança

- Na tela de login, `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`.
- A tela de validação utiliza `supabase.auth.verifyOtp({email,token,type:'email'})`.
- A lista de dois e-mails está no frontend somente para delimitar o piloto; **não serve como controle de acesso confiável**.
- O backend continua exigindo `aceite_members.active=true` e papel permitido, via `requireStaff()`.
- Os responsáveis **não podem registrar decisões formais** até existir vínculo em `aceite_approval_authorizers`, conforme designação expressa por empresa SIC e área; ainda são necessárias contas pessoais distintas e autoridade formal.
- Cadastro de usuário não é feito pelo cliente, nenhuma chave `service_role` é incluída no frontend.

## Preparação administrativa necessária antes do primeiro OTP real

1. **Supabase Auth — usuários:** autenticar no Dashboard Supabase do projeto `jgdacjhjbqrtlklghcev`, acessar Authentication > Users e criar previamente as duas contas com e-mail institucional correto, via interface administrativa de criação. Não registrar usuários diretamente por SQL nas tabelas internas do GoTrue. Não ativar acesso de aprovação nesta etapa.
2. **E-mails:** configurar SMTP autenticado de um serviço autorizado pelo Grupo Drafer em Authentication > SMTP Settings. O SMTP padrão do Supabase não é adequado para entrega de OTP em produção e, sem SMTP próprio, restringe destinatários.
3. **Email Templates:** em Authentication > Email Templates > Magic Link, substituir o link pelo código OTP: `<p>Seu código de acesso ACEITE DRAFER: <strong>{{ .Token }}</strong></p>`. Essa alteração é do projeto Auth e também afeta mensagens passwordless de outros aplicativos que compartilhem o mesmo Supabase (se houver).
4. **Configuração de URLs:** confirmar Site URL e Redirect URLs com o domínio de homologação Netlify; Google OAuth permanece configurado.
5. **Permissão no aplicativo:** depois de criar usuários, revisar `aceite_members` e autorizar somente acesso apropriado. O backend atual usa as funções que exigem papel `admin` para homologar documentos; antes da nomeação final, avaliar papel separado para aprovadores e escopo por empresa para evitar privilégios além do necessário.
6. **Nomeação de aprovadores:** cadastrar vínculos em `aceite_approval_authorizers` somente quando autorização corporativa estiver documentada, individualizada, e ambas as contas tiverem sido verificadas. Nunca usar o mesmo usuário para jurídico e comercial no mesmo documento.

## Teste

1. Confirme o deploy da branch no Netlify `dainty-fairy-2234e1`.
2. Abra /Login; veja "E-mail institucional" e a alternativa "Entrar com Google".
3. Tente endereço diferente dos dois do piloto: o frontend deve recusar (isso não substitui o backend).
4. Antes de criar usuário Auth, a solicitação institucional não deverá permitir cadastro automático.
5. Depois de configurar usuários, SMTP e template, envie OTP e confira recebimento do código de seis dígitos.
6. Digite código; o Supabase verifica a sessão e o backend valida `aceite_members`. Se a conta não for membro ativo, o acesso ao app é negado.
7. Verifique que o fluxo antigo do Google não foi afetado.

Referências:
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/reference/javascript/auth-signinwithotp
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
