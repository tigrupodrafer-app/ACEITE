# ACEITE DRAFER - Diagnostico SIC V4: salva relatorio e abre no Bloco de Notas automaticamente.
# Somente leitura. Nao reinicia servicos nem altera Firebird.
param([string[]]$Pedidos=@('352488','352688'))
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$base='C:\DRAFER\ACEITE-API'
$url='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/7356ada6cdd29c96e07759d66add0f17f0458fb3/scripts/diagnostico-espelho-v4.cjs'
$expected='1bc43d717296dcb6a9829fcc33836af009aed2a2'
$temp=Join-Path $env:TEMP ('espelho-v4-'+[guid]::NewGuid().ToString('N')+'.cjs')
$script=Join-Path $base 'diagnostico-espelho-v4.cjs'
if(-not(Test-Path (Join-Path $base 'src\config\firebird.js'))){throw 'Conector Firebird nao encontrado.'}
foreach($n in $Pedidos){if($n -notmatch '^[1-9]\d{0,11}$'){throw "Pedido invalido: $n"}}
if($Pedidos.Count -gt 3){throw 'Maximo de tres pedidos.'}
try{
 Invoke-WebRequest -Uri $url -OutFile $temp -UseBasicParsing -TimeoutSec 30
 $actual=(& git hash-object -- $temp).Trim()
 if($LASTEXITCODE -ne 0 -or $actual -ne $expected){throw 'Hash Git invalido. Download nao executado.'}
 & node --check $temp
 if($LASTEXITCODE -ne 0){throw 'Erro de sintaxe no diagnostico V4.'}
 if(Test-Path $script){
  $old=(& git hash-object -- $script).Trim()
  if($old -ne $expected){throw "Arquivo ja existe com conteudo diferente: $script"}
 }else{Copy-Item $temp $script}
 $folder=Join-Path $base 'relatorios'
 New-Item -ItemType Directory -Force -Path $folder | Out-Null
 $report=Join-Path $folder ('espelho-sic-v4-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.json')
 Push-Location $base
 try{
  & node $script @Pedidos | Out-File -LiteralPath $report -Encoding UTF8
  if($LASTEXITCODE -ne 0){Write-Warning 'O diagnostico encontrou erro; veja as etapas no JSON gerado.'}
 }finally{Pop-Location}
 Write-Host "Relatorio gravado: $report" -ForegroundColor Green
 Write-Host 'Abrindo o Bloco de Notas: Ctrl+A, Ctrl+C e cole na conversa.' -ForegroundColor Cyan
 Start-Process -FilePath 'notepad.exe' -ArgumentList @($report)
}finally{
 Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
