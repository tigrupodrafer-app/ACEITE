# DRAFER ACEITE — Consulta SIC segura sem exposição do Firebird

## Fluxo implementado

1. Admin autenticado por Google informa pedido `344137` no Dashboard Netlify.
2. `POST /.netlify/functions/sic-request` valida sessão e vínculo ativo em `aceite_members`. Grava uma solicitação privada na tabela `aceite_sic_requests`.
3. Script `scripts/SIC-Bridge.ps1`, executado no SRV-DRAFER, **consulta a fila por HTTPS de saída** a cada 5 segundos.
4. Script consulta **somente** `http://127.0.0.1:3101/api/pedidos/344137`, que já se conecta ao banco Firebird pela rede interna.
5. Script envia resposta pela função `sic-bridge` com segredo de máquina e identificação temporária de concessão.
6. `GET /.netlify/functions/sic-request?id=...` devolve o resultado **somente ao usuário que solicitou**; Dashboard exibe pedido, itens e validação financeira gerada pela API existente.

Nenhuma nova porta no firewall e nenhuma conexão de entrada da Internet ao SIC/Firebird são necessárias. Não abrir a porta 3101 nem 3050 publicamente.

## Variáveis necessárias no Netlify — projeto de homologação

- `SUPABASE_SERVICE_ROLE_KEY`: já utilizada pelas Functions atuais; nunca no Vite.
- `SIC_BRIDGE_TOKEN`: segredo aleatório gerado pela equipe de TI, com ao menos 32 caracteres. Marcar como secreto e disponível para Netlify Functions. **Não usar** senha do Firebird nem chave service_role como esse token.
- Escopo: Functions (ou All). Contexto: deploy de homologação da branch.
- Fazer novo deploy após a configuração. Somente a variável nova é necessária nesta etapa.

## Instalação no SRV-DRAFER

Na branch `feat/migracao-supabase-netlify-20261113` do GitHub:
- Baixar o arquivo `scripts/SIC-Bridge.ps1`, colocar em `C:\DRAFER\ACEITE-API\SIC-Bridge.ps1`.
- Conferir que a API já existente está executando: `Invoke-RestMethod http://127.0.0.1:3101/api/health`.
- Verificar pedido já conhecido: `Invoke-RestMethod http://127.0.0.1:3101/api/pedidos/344137`.
- Nunca gravar senhas do SIC em código, GitHub ou variáveis de ambiente do navegador.
- Definir no contexto da sessão PowerShell do worker a **mesma** variável `SIC_BRIDGE_TOKEN` colocada no Netlify, por exemplo usando `Read-Host` em sessão administrativa protegida.
- Executar `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File C:\DRAFER\ACEITE-API\SIC-Bridge.ps1` para iniciar o polling. É um processo de execução contínua, que precisa permanecer aberto ou ser gerenciado por serviço/agendador autorizado.

Exemplo de geração de segredo local, no servidor, sem publicá-lo no GitHub:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$token = [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant()
# Cole SOMENTE no Netlify seguro. Não envie por chat e não salve em arquivos públicos.
```

Para teste no mesmo PowerShell, use `$env:SIC_BRIDGE_TOKEN = $token`; execute o script com `-Once` para uma única verificação. Para execução contínua, omita `-Once`. Para serviço automático, providenciar segredo armazenado de forma protegida para a conta dedicada do serviço, sem expor no argumento da linha de comando.

## Teste funcional

1. Confirmar um deploy da nova branch no Netlify.
2. Confirmar que `SUPABASE_SERVICE_ROLE_KEY` e `SIC_BRIDGE_TOKEN` estão presentes no contexto Functions.
3. Iniciar script no SRV-DRAFER (somente conexões de saída).
4. Abrir `/Dashboard` como Administrador TI no Netlify; informar `344137`; clicar **Consultar SIC**.
5. Deve aparecer primeiro "Aguardando o conector interno SIC", depois "Conector interno consultando", depois pedido, itens e `validacao`.
6. Se a API interna não responder, o front informará falha/expiração; verificar processo Node/Express local e logs restritos.

## Regra de negócio nesta fase

**Não existe** criação automática de aceite, liberação de assinatura, geração de PDF ou importação definitiva de pedidos ao clicar consultar. A fila é para consulta. A situação do pedido `344137` foi observada anteriormente como `SITU=1` (faturado total). Esse pedido não está homologado para geração de novo aceite e não será aprovado automaticamente.

A validação financeira atual é retornada pela API local. Como ainda não temos um payload SIC recente validado neste deploy, os valores são exibidos integralmente para conferência, sem reinterpretar campos arbitrários. Somente após definir regras definitivas de elegibilidade e confrontar com a saída real será implementado `Gerar aceite`.

## Segurança

- Frontend nunca recebe o segredo do conector nem a chave administrativa Supabase.
- Tabela `aceite_sic_requests` tem RLS ativa e sem GRANT a `anon`/`authenticated`.
- A consulta requer JWT do Google validado pelo Supabase Auth + membership ativo.
- O worker usa segredo diferente do JWT de usuário; resposta da fila usa concessão de uso temporário.
- Resposta armazenada apenas na fila privada e lida pelo solicitante, sem URL pública para dados financeiros.
- Revisar retenção e descarte periódico dos resultados conforme política interna antes de produção.
