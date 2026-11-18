# DRAFER ACEITE - Prova segura de autenticacao da ponte (somente diagnostico).
# POST "{}" autenticado e deliberadamente INVALIDO. Com token aceito a funcao responde HTTP 400
# antes de qualquer leitura/alteracao de fila. 403 = rejeicao do token; 503 = falta de configuracao.
# Nao executar GET autenticado: GET retira um pedido pendente da fila.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base='C:\DRAFER\ACEITE-API'
$logdir=Join-Path $base 'relatorios'
New-Item -Path $logdir -ItemType Directory -Force | Out-Null
$report=Join-Path $logdir ('prova-autenticacao-ponte-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$lines=New-Object System.Collections.Generic.List[string]
$lines.Add('=== DRAFER ACEITE - PROVA AUTENTICACAO SIC BRIDGE ===')
$lines.Add('Data: '+(Get-Date -Format s))
$lines.Add('Usuario: '+[Environment]::UserName)
$lines.Add('Metodo: POST invalido sem requestId e sem lease (nao consome fila)')
$lines.Add('')
$sec=$null
$token=$null
$ptr=[IntPtr]::Zero
try{
 $cfg=Join-Path $env:LOCALAPPDATA 'DRAFER\ACEITE\ponte-token.dpapi'
 if(-not(Test-Path -LiteralPath $cfg)){throw 'Arquivo de token DPAPI nao encontrado na conta Windows atual.'}
 $sec=Get-Content -LiteralPath $cfg -Raw -ErrorAction Stop | ConvertTo-SecureString -ErrorAction Stop
 $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
 $token=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 if([string]::IsNullOrWhiteSpace($token) -or $token.Length -lt 32){throw 'Token local ausente ou menor que 32 caracteres.'}
 $lines.Add('Token protegido lido: SIM (valor e tamanho omitidos)')
 $workers=@(Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue |
   Where-Object {$_.CommandLine -match '(?i)(ACEITE-Ponte-Worker|SIC-Bridge)\.ps1'})
 $lines.Add('Workers locais: '+$workers.Count)
 foreach($w in $workers){$lines.Add('Worker PID: '+$w.ProcessId)}
 $url='https://dainty-fairy-2234e1.netlify.app/.netlify/functions/sic-bridge'
 $headers=@{'X-Sic-Bridge-Token'=$token}
 $status=0
 try{
  $result=Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body '{}' -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
  $status=[int]$result.StatusCode
 }catch{
  try{$status=[int]$_.Exception.Response.StatusCode}catch{$status=0}
 }
 $lines.Add('HTTP retornado: '+$status)
 switch($status){
  400 {$lines.Add('RESULTADO: TOKEN ACEITO pela funcao. HTTP 400 esperado: corpo {} invalido, sem alterar a fila.')}
  403 {$lines.Add('RESULTADO: TOKEN REJEITADO. Comparar SIC_BRIDGE_TOKEN no ambiente Netlify e no DPAPI local (NAO compartilhar valor).')}
  503 {$lines.Add('RESULTADO: TOKEN NAO CONFIGURADO corretamente no ambiente da funcao Netlify.')}
  0 {$lines.Add('RESULTADO: Falha de transporte TLS/rede/timeout. Verificar acesso HTTPS, DNS e proxy.')}
  default {$lines.Add('RESULTADO: HTTP inesperado. Verificar implantacao da funcao e seus logs no Netlify.')}
 }
 $lines.Add('')
 $lines.Add('Nenhum pedido foi reivindicado. Nenhum dado do SIC foi alterado.')
}catch{
 # Nao incluir mensagens de excecao arbitrarias, que podem incluir dados do transporte.
 $lines.Add('ERRO LOCAL: nao foi possivel carregar a configuracao protegida ou concluir o teste.')
 $lines.Add('Verificar conta Windows, arquivo DPAPI e permissoes.')
}finally{
 $token=$null
 if($ptr -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
 if($sec){$sec.Dispose()}
 $lines.Add('Seguranca: nenhum token, segredo, payload de pedido ou corpo da resposta incluido.')
 $lines|Set-Content -LiteralPath $report -Encoding UTF8
 Write-Host ('Relatorio: '+$report) -ForegroundColor Cyan
 Start-Process -FilePath notepad.exe -ArgumentList @($report)
}
