# DRAFER ACEITE: aplica integracao do espelho com backup e validacao. NAO reinicia API.
# Relatorio abre automaticamente no Bloco de Notas.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$base='C:\DRAFER\ACEITE-API'
$route=Join-Path $base 'src\routes\pedidos.js'
$service=Join-Path $base 'src\services\espelhoService.js'
$merge=Join-Path $base 'src\services\espelhoMerge.js'
$folder=Join-Path $base 'relatorios'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$report=Join-Path $folder ('integracao-espelho-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$messages=New-Object System.Collections.Generic.List[string]
$backup=$null
$changed=$false
try {
 if(-not(Test-Path $route)){throw 'Rota de pedidos nao encontrada.'}
 if(-not(Test-Path $service)){throw 'Modulo espelhoService.js nao encontrado. Executar validacao anterior primeiro.'}
 $url='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/6e934774fd3a42795d60c28fd6f80a5c14b54654/server-patches/espelhoMerge.js'
 $expected='8833acef7e8c470d9006a97444b6caf27f7e199c'
 $temp=Join-Path $env:TEMP ('drafer-merge-'+[guid]::NewGuid().ToString('N')+'.js')
 try{
  Invoke-WebRequest -Uri $url -OutFile $temp -UseBasicParsing -TimeoutSec 30
  $hash=(& git hash-object -- $temp).Trim()
  if($LASTEXITCODE -ne 0 -or $hash -ne $expected){throw 'Modulo merge com integridade divergente.'}
  & node --check $temp
  if($LASTEXITCODE -ne 0){throw 'Modulo merge com sintaxe invalida.'}
  if(Test-Path $merge){
   $old=(& git hash-object -- $merge).Trim()
   if($old -ne $expected){throw 'Modulo espelhoMerge.js diferente ja instalado.'}
  }else{Copy-Item -LiteralPath $temp -Destination $merge}
 }finally{Remove-Item $temp -Force -ErrorAction SilentlyContinue}
 $source=[IO.File]::ReadAllText($route)
 if($source.Contains('mergePedidoEspelho') -and $source.Contains('buscarEspelhoComplementar')){
  $messages.Add('A integracao ja existe; nenhuma alteracao na rota.')
 }else{
  $anchor="const { buscarItensPedido } = require('../services/itensService');"
  $point="        const pedidoCompleto = {"
  $oldMerge="            ...pedido,"
  if(-not $source.Contains($anchor) -or -not $source.Contains($point) -or -not $source.Contains($oldMerge)){
   throw 'Rota atual difere da versao auditada; nenhuma substituicao automatica realizada.'
  }
  if($source.Split($anchor).Count -ne 2 -or $source.Split($point).Count -ne 2){
   throw 'Marcadores da rota duplicados; nenhuma alteracao realizada.'
  }
  $nl=[Environment]::NewLine
  $newImports=$anchor+$nl+"const { buscarEspelhoComplementar } = require('../services/espelhoService');"+$nl+"const { mergePedidoEspelho } = require('../services/espelhoMerge');"
  $source=$source.Replace($anchor,$newImports)
  $block=@'
        let pedidoEnriquecido = pedido;
        try {
            const complemento = await buscarEspelhoComplementar(numero);
            pedidoEnriquecido = mergePedidoEspelho(pedido, complemento);
        } catch (erroEspelho) {
            console.warn('Complemento do espelho indisponivel; pedido original preservado.');
        }

'@
  $source=$source.Replace($point,$block+$point)
  $source=$source.Replace($oldMerge,"            ...pedidoEnriquecido,")
  if(-not $source.Contains('...pedidoEnriquecido')){throw 'Falha ao compor novo retorno.'}
  $candidate=Join-Path $env:TEMP ('drafer-route-'+[guid]::NewGuid().ToString('N')+'.js')
  try{
   [IO.File]::WriteAllText($candidate,$source,(New-Object System.Text.UTF8Encoding($false)))
   & node --check $candidate
   if($LASTEXITCODE -ne 0){throw 'Falha na verificacao sintatica da rota nova.'}
   $backup=$route+'.bak-espelho-'+(Get-Date -Format 'yyyyMMdd-HHmmss')
   Copy-Item -LiteralPath $route -Destination $backup
   Copy-Item -LiteralPath $candidate -Destination $route
   $changed=$true
   $messages.Add('Rota integrada ao espelho complementar.')
   $messages.Add('Backup original: '+$backup)
  }finally{Remove-Item $candidate -Force -ErrorAction SilentlyContinue}
 }
 & node --check $route
 if($LASTEXITCODE -ne 0){throw 'Verificacao final da rota falhou.'}
 $messages.Add('SINTAXE: OK.')
 $messages.Add('A API Node NAO foi reiniciada; a integracao so entra em vigor apos reinicio controlado da API.')
 $messages.Add('Firebird e SIC nao foram modificados.')
 $messages.Add('Os codigos de impressao permanecem pendentes de homologacao.')
}catch{
 $messages.Add('ERRO: '+$_.Exception.Message)
 if($changed -and $backup -and (Test-Path $backup)){
  Copy-Item -LiteralPath $backup -Destination $route -Force
  $messages.Add('Rota original restaurada.')
 }
}finally{
 $messages | Set-Content -LiteralPath $report -Encoding UTF8
 Write-Host "Relatorio: $report" -ForegroundColor Cyan
 Start-Process -FilePath notepad.exe -ArgumentList @($report)
}
