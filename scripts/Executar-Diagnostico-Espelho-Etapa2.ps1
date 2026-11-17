# DRAFER ACEITE: Etapa 2 - somente leitura. Nao interrompe SIC ou API.
# Execute em PowerShell com conectividade Firebird FB_* ja configurada.
param([string[]]$Pedidos=@('352488','352688'))
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$base='C:\DRAFER\ACEITE-API'
$url='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/ad9a793cd2fa1007c68a6aea3144159aec7c5908/scripts/diagnostico-espelho-etapa2.cjs'
$blobExpected='920679d7ddbab7380b1084a1446d6df16ebe3685'
$dest=Join-Path $base 'diagnostico-espelho-etapa2.cjs'
$temp=Join-Path $env:TEMP ('aceite-diagnostico-etapa2-'+[guid]::NewGuid().ToString('N')+'.cjs')
if(-not(Test-Path (Join-Path $base 'src\config\firebird.js'))){throw 'A configuracao Firebird nao foi encontrada no ACEITE-API.'}
foreach($n in $Pedidos){if($n -notmatch '^[1-9]\d{0,11}$'){throw "Numero de pedido invalido: $n"}}
if($Pedidos.Count -gt 3){throw 'Numero maximo de pedidos excedido.'}
try {
 Invoke-WebRequest -Uri $url -OutFile $temp -UseBasicParsing -TimeoutSec 30
 $hash=(& git hash-object -- $temp).Trim()
 if($LASTEXITCODE -ne 0 -or $hash -ne $blobExpected){throw 'Arquivo remoto nao passou na verificacao de integridade.'}
 & node --check $temp
 if($LASTEXITCODE -ne 0){throw 'Arquivo JS nao passou na analise sintatica.'}
 if(Test-Path $dest){
  $current=(& git hash-object -- $dest).Trim()
  if($current -ne $blobExpected){throw "Ja existe um arquivo diferente em $dest; revisar antes de substituir."}
 } else { Copy-Item $temp $dest }
 $folder=Join-Path $base 'relatorios'
 if(-not(Test-Path $folder)){New-Item -ItemType Directory -Path $folder|Out-Null}
 $output=Join-Path $folder ('espelho-sic-etapa2-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.json')
 Push-Location $base
 try {
  & node $dest @Pedidos > $output
  if($LASTEXITCODE -ne 0){Remove-Item $output -Force -ErrorAction SilentlyContinue;throw 'Falha no diagnostico etapa 2.'}
 } finally {Pop-Location}
 Write-Host 'DIAGNOSTICO ETAPA 2 CONCLUIDO - SOMENTE LEITURA.' -ForegroundColor Green
 Write-Host "Arquivo: $output" -ForegroundColor Cyan
 Write-Host 'Antes de compartilhar, revise identificadores internos. Nenhum dado de contato foi solicitado.'
}finally{Remove-Item $temp -Force -ErrorAction SilentlyContinue}
