# DRAFER ACEITE - mapear relacionamentos complementares do SIC, read-only, relatorio Notepad.
# Mantem API 3101 e SIC Bridge ativos. Pode usar credencial DPAPI do Launcher.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$base='C:\DRAFER\ACEITE-API'
$logs=Join-Path $base 'relatorios'
New-Item -ItemType Directory -Path $logs -Force|Out-Null
$report=Join-Path $logs ('mapeamento-relacionamentos-sic-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.json')
$nodeScript=Join-Path $base 'Mapear-Relacionamentos-Espelho-SIC.cjs'
$temp=Join-Path $env:TEMP ('aceite-relacionamentos-'+[guid]::NewGuid().ToString('N')+'.cjs')
$old=@{}
foreach($k in @('FB_HOST','FB_PORT','FB_DATABASE','FB_USER','FB_PASSWORD')){
 $old[$k]=[Environment]::GetEnvironmentVariable($k,'Process')
}
function Pick($object,[string[]]$names){
 foreach($name in $names){
  if($null -eq $object){continue}
  $p=$object.PSObject.Properties[$name]
  if($p -and $null -ne $p.Value -and [string]$p.Value -ne ''){return [string]$p.Value}
 }
 return $null
}
try{
 if(-not(Test-Path (Join-Path $base 'src\config\firebird.js'))){throw 'Conector Firebird local nao encontrado.'}
 if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js nao encontrado.'}
 if(-not(Get-Command git -ErrorAction SilentlyContinue)){throw 'Git nao encontrado.'}
 $url='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/2d3fa935f59cb1de3f02c47d7fb38f2e735b2a58/scripts/Mapear-Campos-Complementares-SIC.cjs'
 Invoke-WebRequest -Uri $url -OutFile $temp -UseBasicParsing -TimeoutSec 30
 $sha=(& git hash-object -- $temp).Trim()
 if($LASTEXITCODE -ne 0 -or $sha -ne 'f42135448dbd36a280c93578dee63c1ac477b241'){throw 'Falha na verificacao de integridade do diagnostico.'}
 & node --check $temp
 if($LASTEXITCODE -ne 0){throw 'Sintaxe JavaScript invalida.'}
 if(Test-Path $nodeScript){
  $present=(& git hash-object -- $nodeScript).Trim()
  if($present -ne $sha){throw 'Arquivo local com o mesmo nome possui conteudo divergente. Nao sobrescrito.'}
 }else{Copy-Item -LiteralPath $temp -Destination $nodeScript}
 # Procura configuracao persistida no launcher instalado; sem imprimir senha.
 $cfgPath=Join-Path $base '.aceite-launcher\config.json'
 $credentialPath=Join-Path $base '.aceite-launcher\firebird-credential.xml'
 $cfg=$null
 if(Test-Path $cfgPath){$cfg=Get-Content -LiteralPath $cfgPath -Raw|ConvertFrom-Json}
 if(-not $env:FB_HOST){$env:FB_HOST=Pick $cfg @('FB_HOST','host','fbHost','Host')}
 if(-not $env:FB_PORT){$env:FB_PORT=Pick $cfg @('FB_PORT','port','fbPort','Port')}
 if(-not $env:FB_DATABASE){$env:FB_DATABASE=Pick $cfg @('FB_DATABASE','database','fbDatabase','Database','databasePath')}
 if(Test-Path $credentialPath){
  try{
   $cred=Import-Clixml -LiteralPath $credentialPath
   if($cred -is [System.Management.Automation.PSCredential]){
    if(-not $env:FB_USER){$env:FB_USER=$cred.UserName}
    if(-not $env:FB_PASSWORD){$env:FB_PASSWORD=$cred.GetNetworkCredential().Password}
   }else{
    if(-not $env:FB_USER){$env:FB_USER=Pick $cred @('FB_USER','user','username','Usuario')}
    if(-not $env:FB_PASSWORD){
     foreach($key in @('Password','password','Senha','secret')){
      $val=$cred.PSObject.Properties[$key]
      if($val -and $val.Value -is [Security.SecureString]){
       $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($val.Value)
       try{$env:FB_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
       finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
       break
      }
     }
    }
   }
  }catch{Write-Warning 'Nao foi possivel abrir credencial do Launcher nesta conta Windows.'}
 }
 # Somente se faltarem configuracoes, solicitar na propria tela (sem as imprimir).
 if(-not $env:FB_HOST){$env:FB_HOST=Read-Host 'FB_HOST do servidor SIC'}
 if(-not $env:FB_PORT){$env:FB_PORT='3050'}
 if(-not $env:FB_DATABASE){$env:FB_DATABASE=Read-Host 'FB_DATABASE (caminho/alias SIC)'}
 if(-not $env:FB_USER){$env:FB_USER=Read-Host 'FB_USER (usuario Firebird)'}
 if(-not $env:FB_PASSWORD){
  $secure=Read-Host 'Senha Firebird (oculta, SOMENTE para este diagnostico)' -AsSecureString
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try{$env:FB_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
  finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
  $secure.Dispose()
 }
 if(-not $env:FB_HOST -or -not $env:FB_DATABASE -or -not $env:FB_USER -or -not $env:FB_PASSWORD){throw 'Configuracao Firebird incompleta.'}
 Write-Host 'Validando metadados e relacionamentos SIC em dois pedidos (sem valores pessoais)...' -ForegroundColor Cyan
 Push-Location $base
 try {
  & node $nodeScript | Out-File -LiteralPath $report -Encoding UTF8
  $exit=$LASTEXITCODE
 }finally{Pop-Location}
 if($exit -ne 0){Write-Warning 'Diagnostico com falha. Consulte a secao erro do JSON.'}
 Write-Host ('Relatorio: '+$report) -ForegroundColor Green
 Start-Process notepad.exe -ArgumentList @($report)
}catch{
 # Erros so do instalador; nunca imprime variaveis secretas.
 $errorReport=Join-Path $logs ('mapeamento-erro-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
 @('MAPEAMENTO SIC - FALHA DE INICIALIZACAO','Etapa nao concluida. Verifique arquivos, download e acesso Firebird.','Tipo de erro: '+$_.Exception.GetType().Name,'Nenhuma alteracao no banco ou nos processos.') |
  Set-Content -LiteralPath $errorReport -Encoding UTF8
 Start-Process notepad.exe -ArgumentList @($errorReport)
 Write-Warning 'Falha inicial. Relatorio de erro aberto no Notepad (sem credenciais).'
}finally{
 foreach($k in $old.Keys){[Environment]::SetEnvironmentVariable($k,$old[$k],'Process')}
 Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
