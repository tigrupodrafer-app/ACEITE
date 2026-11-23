# DRAFER ACEITE - somente leitura, verifica API, ponte SIC e conectividade da Netlify.
# Nao consulta pedidos, nao envia token, nao reinicia processos.
$ErrorActionPreference='Continue'
$dir='C:\DRAFER\ACEITE-API\relatorios'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$report=Join-Path $dir ('diagnostico-ponte-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$lines=New-Object System.Collections.Generic.List[string]
$lines.Add('=== DRAFER ACEITE - PONTE SIC / NETLIFY ===')
$lines.Add('Data local: '+(Get-Date -Format s))
$lines.Add('')
try {
 $port=Get-NetTCPConnection -LocalPort 3101 -State Listen -ErrorAction SilentlyContinue
 $lines.Add('API porta 3101: '+$(if($port){'ESCUTANDO'}else{'PARADA'}))
 try {
  $h=Invoke-RestMethod -Uri 'http://127.0.0.1:3101/api/health' -TimeoutSec 5
  $lines.Add('API health: '+[string]$h.status)
 } catch { $lines.Add('API health: SEM RESPOSTA') }
 $lines.Add('')
 $processes=@(Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue)
 $workers=@($processes|Where-Object {$_.CommandLine -match '(?i)(SIC-Bridge\.ps1|INICIAR-PONTE-ACEITE|Iniciar-ACEITE-Bridge)'})
 $lines.Add('Ponte SIC Bridge (processos identificados): '+$workers.Count)
 foreach($p in $workers){$lines.Add('  PID '+$p.ProcessId+' | Inicio por PowerShell | caminho/comando omitidos')}
 if($workers.Count -eq 0){$lines.Add('INDICIO: nao foi identificado um worker SIC-Bridge ativo.')}
 if($workers.Count -gt 1){$lines.Add('ATENCAO: varios workers; verificar duplicidade antes de iniciar outro.')}
 $lines.Add('')
 $var=[Environment]::GetEnvironmentVariable('SIC_BRIDGE_TOKEN','Process')
 if([string]::IsNullOrWhiteSpace($var)){$var=[Environment]::GetEnvironmentVariable('SIC_BRIDGE_TOKEN','User')}
 if([string]::IsNullOrWhiteSpace($var)){$var=[Environment]::GetEnvironmentVariable('SIC_BRIDGE_TOKEN','Machine')}
 $lines.Add('Token ponte acessivel a ESTA sessao/usuario: '+$(if($var -and $var.Length -ge 32){'CONFIGURADO'}else{'NAO LOCALIZADO'}))
 $var=$null
 $lines.Add('Observacao: outras sessoes podem possuir token sem que esta sessao tenha acesso.')
 $lines.Add('')
 try {
  $response=Invoke-WebRequest -Uri 'https://dainty-fairy-2234e1.netlify.app/.netlify/functions/sic-bridge' -Method Get -UseBasicParsing -TimeoutSec 15
  $lines.Add('Netlify endpoint ponte: HTTP '+[int]$response.StatusCode)
  $lines.Add('IMPORTANTE: endpoint so deve retornar trabalho com token valido; esta verificacao nao envia token.')
 }catch{
  $code=$null
  try{$code=[int]$_.Exception.Response.StatusCode}catch{}
  if($code){$lines.Add('Netlify endpoint ponte: HTTP '+$code)}
  else{$lines.Add('Netlify endpoint ponte: INACESSIVEL (rede/DNS/TLS)')}
  if($code -eq 403){$lines.Add('HTTP 403 SEM TOKEN e esperado e confirma que a funcao responde.')}
  if($code -eq 503){$lines.Add('HTTP 503 pode indicar que SIC_BRIDGE_TOKEN nao foi configurado na Netlify.')}
 }
} catch {
 $lines.Add('Falha parcial ao executar diagnostico. Revise permissoes de processo.')
}
$lines.Add('')
$lines.Add('Nao reiniciou API/ponte, nao incluiu credenciais ou dados de clientes.')
$lines.Add('Se o modal estiver pendente, verifique primeiro se o worker SIC-Bridge esta ativo.')
$lines|Set-Content -LiteralPath $report -Encoding UTF8
Write-Host ('Relatorio: '+$report) -ForegroundColor Cyan
Start-Process notepad.exe -ArgumentList @($report)
