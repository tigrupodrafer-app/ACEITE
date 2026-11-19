# DRAFER ACEITE - validacao segura do espelho complementar no SRV-DRAFER.
# Nao instala, nao reinicia, nao escreve no Firebird e nao exibe dados pessoais.
param([string[]]$Pedidos=@('352488','352688'))
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$base='C:\DRAFER\ACEITE-API'
$service=Join-Path $base 'src\services\espelhoService.js'
$validator=Join-Path $base 'validar-espelho-local.cjs'
$reportDir=Join-Path $base 'relatorios'
if($Pedidos.Count -lt 1 -or $Pedidos.Count -gt 3 -or @($Pedidos | Where-Object { $_ -notmatch '^[1-9]\d{0,11}$' }).Count -gt 0){throw 'Lista de pedidos invalida.'}
if(-not(Test-Path $service)){throw 'Modulo local ausente. Nenhuma instalacao automatica sera feita.'}
if(-not(Test-Path (Join-Path $base 'src\config\firebird.js'))){throw 'Configuracao Firebird ausente.'}
if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node indisponivel.'}
if(-not(Get-Command git -ErrorAction SilentlyContinue)){throw 'Git indisponivel.'}
$expected='b4d8fbc99e755619fb918f6bd430b4a2775a5fcf'
$actual=(& git hash-object -- $service).Trim()
if($LASTEXITCODE -ne 0 -or $actual -ne $expected){throw 'Modulo local nao corresponde ao corrigido. Execute a instalacao controlada antes da validacao.'}
& node --check $service
if($LASTEXITCODE -ne 0){throw 'Sintaxe invalida.'}
$sourceUrl='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/04078af02a52b54d242aac8dd18d6c3999c092cb/scripts/validar-espelho-local.cjs'
$validatorHash='4a5cc8fadacb22f0843ff3039ea6e06c600b1ee1'
$tmp=Join-Path $env:TEMP ('drafer-validador-'+[guid]::NewGuid().ToString('N')+'.cjs')
try{
 Invoke-WebRequest -Uri $sourceUrl -UseBasicParsing -OutFile $tmp -TimeoutSec 30
 $got=(& git hash-object -- $tmp).Trim()
 if($LASTEXITCODE -ne 0 -or $got -ne $validatorHash){throw 'Validador remoto com hash inesperado.'}
 if(Test-Path $validator){
  $local=(& git hash-object -- $validator).Trim()
  if($local -ne $validatorHash){throw 'Validador local divergente; nao sobrescrevo.'}
 }else{
  Copy-Item -LiteralPath $tmp -Destination $validator
 }
 & node --check $validator
 if($LASTEXITCODE -ne 0){throw 'Validador com sintaxe invalida.'}
 New-Item -ItemType Directory -Path $reportDir -Force|Out-Null
 $report=Join-Path $reportDir ('espelho-corrigido-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.json')
 Push-Location $base
 try {
  & node $validator @Pedidos | Out-File -LiteralPath $report -Encoding utf8
  if($LASTEXITCODE -ne 0){throw 'Falha na validacao; nao considerar relatorio aprovado.'}
 }finally{Pop-Location}
 $result=Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
 if(@($result.pedidos).Count -ne $Pedidos.Count -or @($result.pedidos | Where-Object { $_.ok -ne $true }).Count -gt 0){
  Write-Warning 'Um ou mais pedidos nao passaram na consulta. Revisar relatorio.'
 }
 Write-Host ('Relatorio sem PII: '+$report) -ForegroundColor Cyan
 Start-Process notepad.exe -ArgumentList @($report)
}finally{Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue}
