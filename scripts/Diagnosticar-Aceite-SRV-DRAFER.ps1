#requires -Version 5.1
# DRAFER ACEITE - auditoria local SOMENTE LEITURA. Nao inicia nem reinicia servicos.
$ErrorActionPreference='Stop'
$api='C:\DRAFER\ACEITE-API'
$web='C:\DRAFER\ACEITE-WEB-HML'
$launcher=Join-Path $api 'ACEITE-DRAFER-Inicializador\ACEITE-Launcher.ps1'
Write-Host '=== DRAFER ACEITE - DIAGNOSTICO SEM ALTERACOES ==='
Write-Host ('Data local: '+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Host ('Servidor: '+$env:COMPUTERNAME)
foreach($path in @($api,$web,$launcher,(Join-Path $api '.aceite-launcher\config.json'),(Join-Path $api '.aceite-launcher\firebird-credential.xml'))) {
 Write-Host ('EXISTE '+(Test-Path -LiteralPath $path)+' : '+$path)
}
try {
 $health=Invoke-RestMethod -Uri 'http://127.0.0.1:3101/api/health' -TimeoutSec 8
 Write-Host ('HEALTH: '+($health|ConvertTo-Json -Compress -Depth 5))
} catch { Write-Host ('HEALTH FALHOU: '+$_.Exception.Message) }
foreach($n in @(352488,352688)) {
 try {
  $r=Invoke-RestMethod -Uri ('http://127.0.0.1:3101/api/pedidos/'+$n) -TimeoutSec 25
  $s=$r
  if($r.PSObject.Properties['result'] -and $null -ne $r.result){$s=$r.result}
  $enderecos=@()
  if($s.PSObject.Properties['enderecosEntrega']){$enderecos=@($s.enderecosEntrega|Where-Object { $null -ne $_ })}
  $cad=$false
  if($s.PSObject.Properties['enderecoCadastralEntrega']){$cad=$null -ne $s.enderecoCadastralEntrega}
  $itens=0
  if($s.PSObject.Properties['itens']){$itens=@($s.itens|Where-Object { $null -ne $_ }).Count}
  $keys=@($s.PSObject.Properties.Name) -join ','
  Write-Host ('PEDIDO '+$n+' | ENDERECOS '+$enderecos.Count+' | CADASTRAL '+$cad+' | ITENS '+$itens+' | CAMPOS '+$keys)
 } catch { Write-Host ('PEDIDO '+$n+' FALHOU: '+$_.Exception.Message) }
}
Write-Host '=== FIM: NENHUMA ALTERACAO EFETUADA ==='
