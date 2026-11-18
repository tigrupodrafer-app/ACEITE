# DRAFER ACEITE - Iniciar somente a ponte SIC (API Node permanece intacta).
# Execute pelo INICIAR-PONTE-ACEITE.bat. Inicializacao interativa uma vez.
param([switch]$Reconfigurar)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$base='C:\DRAFER\ACEITE-API'
$logs=Join-Path $base 'relatorios'
$cfgDir=Join-Path $env:LOCALAPPDATA 'DRAFER\ACEITE'
$secretFile=Join-Path $cfgDir 'ponte-token.dpapi'
$report=Join-Path $logs ('inicio-ponte-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
New-Item -ItemType Directory -Path $logs -Force | Out-Null
New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
$lines=New-Object System.Collections.Generic.List[string]
$lines.Add('=== DRAFER ACEITE - INICIALIZACAO PONTE ===')
$lines.Add('Data: '+(Get-Date -Format s))
$lines.Add('Conta Windows: '+[Environment]::UserName)
$lines.Add('')
try{
 $h=Invoke-RestMethod -Uri 'http://127.0.0.1:3101/api/health' -TimeoutSec 5
 if($h.status -ne 'ok'){throw 'A API local nao retornou health ok.'}
 $lines.Add('API local porta 3101: OK (nao sera reiniciada).')
 $live=@(Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue |
   Where-Object {$_.CommandLine -match 'ACEITE-Ponte-Worker\.ps1|SIC-Bridge\.ps1'})
 if($live.Count -gt 0){
  $lines.Add('Ponte JA INICIADA. PIDs: '+(($live | ForEach-Object {$_.ProcessId}) -join ','))
  $lines.Add('Nenhum segundo worker foi iniciado.')
 }else{
  $files=@(
   @{Name='SIC-Bridge.ps1'; Commit='0680038e9a7c6886040343d41e9b8cf536aef8d2'; Hash='ed8f88b195208cdad0bfef8f3543cde0065c12f9'},
   @{Name='ACEITE-Ponte-Worker.ps1'; Commit='0680038e9a7c6886040343d41e9b8cf536aef8d2'; Hash='abc231b60c953259a8818c1c7bb6bd7f5f958462'}
  )
  foreach($f in $files){
   $dest=Join-Path $base $f.Name
   $url='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/'+$f.Commit+'/scripts/'+$f.Name
   $tmp=Join-Path $env:TEMP ('aceite-ponte-'+[guid]::NewGuid().ToString('N')+'.ps1')
   try{
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 30
    $hash=(& git hash-object -- $tmp).Trim()
    if($LASTEXITCODE -ne 0 -or $hash -ne $f.Hash){throw ('Falha na integridade de '+$f.Name)}
    if(Test-Path -LiteralPath $dest){
     $installedHash=(& git hash-object -- $dest).Trim()
     if($installedHash -ne $f.Hash){
      throw ('Arquivo local divergente; nao substituir: '+$dest)
     }
    }else{Copy-Item -LiteralPath $tmp -Destination $dest}
   }finally{Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue}
  }
  if($Reconfigurar -or -not(Test-Path -LiteralPath $secretFile)){
   Write-Host ''
   Write-Host 'PRIMEIRA CONFIGURACAO DA PONTE SIC' -ForegroundColor Yellow
   Write-Host 'Use o MESMO SIC_BRIDGE_TOKEN configurado nas variaveis do site Netlify.' -ForegroundColor Yellow
   Write-Host 'Se voce nao conhece o token, pare aqui e configure um novo nos DOIS lados.' -ForegroundColor Yellow
   $secure=Read-Host 'Cole o SIC_BRIDGE_TOKEN (entrada oculta)' -AsSecureString
   $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
   try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
   finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
   try{
    if($plain.Length -lt 32){throw 'Token muito curto; exige pelo menos 32 caracteres.'}
    $encoded=$secure | ConvertFrom-SecureString
    [IO.File]::WriteAllText($secretFile,$encoded,(New-Object Text.UTF8Encoding($false)))
   }finally{
    $plain=$null
    $encoded=$null
    $secure.Dispose()
   }
   $lines.Add('Token protegido por DPAPI no perfil da conta Windows (valor omitido).')
  }else{$lines.Add('Token protegido existente foi reutilizado (valor omitido).')}
  # Start-Process herda apenas variaveis nao sensiveis da sessao. O worker decripta o arquivo DPAPI.
  $worker=Join-Path $base 'ACEITE-Ponte-Worker.ps1'
  $psExe=Join-Path $PSHOME 'powershell.exe'
  $args=@('-NoProfile','-ExecutionPolicy','Bypass','-File',$worker,'-Base',$base,'-ConfigPath',$secretFile)
  $process=Start-Process -FilePath $psExe -ArgumentList $args -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 3
  $process.Refresh()
  if($process.HasExited){
   throw 'O worker encerrou ao iniciar. Verifique o log sic-bridge-AAAAmmdd.log em relatorios.'
  }
  $lines.Add('Worker SIC Bridge criado: PID '+$process.Id)
  $lines.Add('Ponte rodando em processo separado. Ela le consultas da Netlify por HTTPS.')
  $lines.Add('Aguarde alguns segundos e consulte novamente o pedido no Dashboard.')
 }
}catch{
 $lines.Add('FALHA: '+$_.Exception.Message)
 $lines.Add('Nenhum processo API/SIC foi encerrado ou reiniciado.')
}finally{
 $lines.Add('')
 $lines.Add('NUNCA divulgue token ou conteudo do arquivo ponte-token.dpapi.')
 $lines.Add('Relatorio de operacao: sem senhas nem dados de clientes.')
 $lines | Set-Content -LiteralPath $report -Encoding UTF8
 Write-Host ('Relatorio: '+$report) -ForegroundColor Cyan
 Start-Process -FilePath notepad.exe -ArgumentList @($report)
}
