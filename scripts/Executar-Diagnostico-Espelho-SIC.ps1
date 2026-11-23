# DRAFER ACEITE - executar diagnostico de espelho do SIC no SRV-DRAFER
# SOMENTE LEITURA. Nao reinicia servicos, nao altera Firebird.
# Abrir PowerShell na conta autorizada que ja usa o conector.
param(
 [string[]]$Pedidos = @('352488','352688')
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$base='C:\DRAFER\ACEITE-API'
$local=Join-Path $base 'diagnostico-espelho-sic.cjs'
$commit='149866a5267c56890b4e14ed1ed5b30559e16a6c'
$expectedGitBlob='a788ebf8f3a829f42c24996846688075507d2e16'
$url="https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/$commit/scripts/diagnostico-espelho-sic.cjs"
if(-not(Test-Path (Join-Path $base 'src\config\firebird.js'))){
 throw 'Nao foi localizado o conector local C:\DRAFER\ACEITE-API\src\config\firebird.js'
}
if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js nao esta disponivel.'}
if(-not(Get-Command git -ErrorAction SilentlyContinue)){throw 'Git nao esta disponivel para validar a integridade.'}
foreach($p in $Pedidos){
 if($p -notmatch '^[1-9]\d{0,11}$'){throw "Numero de pedido invalido: $p"}
}
if($Pedidos.Count -gt 3){throw 'No maximo 3 pedidos por diagnostico.'}
$download=Join-Path ([IO.Path]::GetTempPath()) ('diagnostico-sic-'+[guid]::NewGuid().ToString('N')+'.cjs')
$reportDir=Join-Path $base 'relatorios'
try {
 Invoke-WebRequest -Uri $url -OutFile $download -UseBasicParsing -TimeoutSec 30
 $blob=(& git hash-object -- $download).Trim().ToLowerInvariant()
 if($LASTEXITCODE -ne 0 -or $blob -ne $expectedGitBlob){
   throw 'Falha na verificacao de integridade do script; nenhuma execucao foi feita.'
 }
 & node --check $download
 if($LASTEXITCODE -ne 0){throw 'Script nao passou na verificacao de sintaxe.'}
 if(Test-Path $local){
   $existing=(& git hash-object -- $local).Trim().ToLowerInvariant()
   if($existing -ne $expectedGitBlob){
     throw "Ja existe um diagnostico diferente em $local. Revisar antes de substituir."
   }
 }else{
   Copy-Item -LiteralPath $download -Destination $local -ErrorAction Stop
 }
 if(-not(Test-Path $reportDir)){New-Item -Path $reportDir -ItemType Directory|Out-Null}
 $report=Join-Path $reportDir ('espelho-sic-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.json')
 $previous=Get-Location
 try {
   Set-Location $base
   & node $local @Pedidos > $report
   if($LASTEXITCODE -ne 0){throw 'A consulta de somente leitura falhou. Confira o conector Firebird.'}
 }finally{
   Set-Location $previous
 }
 Write-Host 'DIAGNOSTICO SOMENTE LEITURA CONCLUIDO.' -ForegroundColor Green
 Write-Host "Relatorio local: $report" -ForegroundColor Cyan
 Write-Host 'Confira o arquivo antes de compartilhar: embora filtrado para campos tecnicos, pode conter IDs internos.'
 Write-Host 'Nenhum servico SIC, banco Firebird ou API Node foi alterado.'
}finally {
 Remove-Item -LiteralPath $download -Force -ErrorAction SilentlyContinue
}
