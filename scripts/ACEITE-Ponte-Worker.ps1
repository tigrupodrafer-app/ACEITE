# DRAFER ACEITE - Worker da ponte SIC. Executado SOMENTE pelo inicializador.
# Decripta token protegido por DPAPI no contexto do mesmo usuario Windows.
param(
 [string]$Base='C:\DRAFER\ACEITE-API',
 [string]$ConfigPath=''
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if(-not $ConfigPath){$ConfigPath=Join-Path $env:LOCALAPPDATA 'DRAFER\ACEITE\ponte-token.dpapi'}
$bridge=Join-Path $Base 'SIC-Bridge.ps1'
$logs=Join-Path $Base 'relatorios'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$log=Join-Path $logs ('sic-bridge-'+(Get-Date -Format 'yyyyMMdd')+'.log')
function Log([string]$message){
 Add-Content -LiteralPath $log -Value ('['+(Get-Date -Format s)+'] '+$message) -Encoding UTF8
}
try{
 if(-not (Test-Path -LiteralPath $ConfigPath)){throw 'Token protegido ausente. Reconfigure pelo BAT.'}
 if(-not (Test-Path -LiteralPath $bridge)){throw 'Script SIC-Bridge.ps1 ausente.'}
 $sec=Get-Content -LiteralPath $ConfigPath -Raw | ConvertTo-SecureString
 $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
 try{$token=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
 finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
 $sec.Dispose()
 if($token.Length -lt 32){throw 'Token de ponte invalido.'}
 [Environment]::SetEnvironmentVariable('SIC_BRIDGE_TOKEN',$token,'Process')
 $token=$null
 Log 'Ponte iniciada. Loop de consultas HTTPS ativo.'
 # A ponte nunca recebe senha por argumento ou arquivo plaintext.
 # O transcript grava apenas as mensagens do worker, nunca o token.
 & $bridge *>> $log
 Log 'Ponte encerrada.'
}catch{
 # Nao registrar mensagem bruta de erro potencialmente contendo dados de transporte.
 Log 'ERRO no worker da ponte; verificar token, rede e acesso ao script.'
 exit 1
}finally{
 [Environment]::SetEnvironmentVariable('SIC_BRIDGE_TOKEN',$null,'Process')
}
