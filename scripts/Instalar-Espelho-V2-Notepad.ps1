# DRAFER ACEITE - aplica somente os modulos de enriquecimento validados no SIC.
# Faz backup dos modulos originais. NAO reinicia API, ponte ou Firebird.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$base='C:\DRAFER\ACEITE-API'
$folder=Join-Path $base 'relatorios'
New-Item -Path $folder -ItemType Directory -Force|Out-Null
$report=Join-Path $folder ('instalacao-espelho-v2-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$lines=New-Object System.Collections.Generic.List[string]
$lines.Add('=== DRAFER ACEITE - INSTALACAO CAMPOS COMPLEMENTARES V2 ===')
$lines.Add('Data: '+(Get-Date -Format s))
$lines.Add('Sem reinicio automatico, sem alteracao no SIC/Firebird.')
$lines.Add('')
$targets=@(
 @{
  Path='src\services\espelhoService.js'
  Source='server-patches/espelhoService.js'
  Commit='12d978de6843d0a3f600d9a77069e4a035e4feda'
  Hash='b4d8fbc99e755619fb918f6bd430b4a2775a5fcf'
  AllowedPrevious='b50c5fbfe02112df837ee419076f46d324dd0d34'
 },
 @{
  Path='src\services\espelhoMerge.js'
  Source='server-patches/espelhoMerge.js'
  Commit='30d20a689a4047fdd0f2126407207f5181de982b'
  Hash='6b9ef352a98ab5ae2130787d1260b57ab9ee0471'
  AllowedPrevious='8833acef7e8c470d9006a97444b6caf27f7e199c'
 }
)
$downloaded=@()
$backupFiles=@()
$installed=@()
try{
 if(-not(Get-Command git -ErrorAction SilentlyContinue)){throw 'Git indisponivel.'}
 if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node indisponivel.'}
 $health=Invoke-RestMethod -Uri 'http://127.0.0.1:3101/api/health' -TimeoutSec 6
 if($health.status -ne 'ok'){throw 'API local nao respondeu health ok.'}
 $lines.Add('API local: HEALTH OK.')
 foreach($t in $targets){
  $dest=Join-Path $base $t.Path
  if(-not(Test-Path -LiteralPath $dest)){throw ('Arquivo existente ausente: '+$t.Path)}
  $oldHash=(& git hash-object -- $dest).Trim()
  if($LASTEXITCODE -ne 0){throw ('Nao foi possivel calcular hash: '+$t.Path)}
  if($oldHash -ne $t.AllowedPrevious -and $oldHash -ne $t.Hash){
   throw ('Modulo divergente do auditado; nao sobrescrevo: '+$t.Path)
  }
  $tmp=Join-Path $env:TEMP ('aceite-espelho-stage-'+[guid]::NewGuid().ToString('N')+'.js')
  $downloaded+= $tmp
  $url='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/'+$t.Commit+'/'+$t.Source
  Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $tmp -TimeoutSec 30
  $actual=(& git hash-object -- $tmp).Trim()
  if($LASTEXITCODE -ne 0 -or $actual -ne $t.Hash){throw ('Integridade incorreta: '+$t.Path)}
  & node --check $tmp
  if($LASTEXITCODE -ne 0){throw ('Sintaxe incorreta: '+$t.Path)}
  $t.CurrentHash=$oldHash
  $t.Temp=$tmp
  $t.Dest=$dest
  $lines.Add(('Verificado: '+$t.Path))
 }
 # Todos os modulos validados antes da primeira alteracao.
 foreach($t in $targets){
  if($t.CurrentHash -eq $t.Hash){$lines.Add(('Ja atualizado: '+$t.Path));continue}
  $backup=$t.Dest+'.bak-v2-'+(Get-Date -Format 'yyyyMMdd-HHmmss')
  Copy-Item -LiteralPath $t.Dest -Destination $backup -ErrorAction Stop
  $backupFiles+=@{Original=$t.Dest;Backup=$backup}
  Copy-Item -LiteralPath $t.Temp -Destination $t.Dest -Force -ErrorAction Stop
  $installed+= $t.Dest
  $lines.Add(('Atualizado: '+$t.Path))
  $lines.Add(('Backup: '+$backup))
 }
 foreach($t in $targets){
  & node --check $t.Dest
  if($LASTEXITCODE -ne 0){throw 'Verificacao de sintaxe pos-instalacao falhou.'}
 }
 $lines.Add('')
 $lines.Add('STATUS: INSTALACAO CONCLUIDA.')
 $lines.Add('IMPORTANTE: API Node NAO foi reiniciada. Mudancas entram em vigor apenas em proximo reinicio controlado.')
 $lines.Add('Novos campos: nomeEmpresa, cliente.cidade, cliente.estado, cliente.complemento, cliente.contato, comprador quando cadastrado, documento cadastral quando preenchido.')
 $lines.Add('Os valores reais de empresa e cidade dependem do registro unico no Firebird.')
 $lines.Add('Nenhuma chave, senha ou dado pessoal incluido neste relatorio.')
}catch{
 [array]::Reverse($backupFiles)
 foreach($b in $backupFiles){
  if(Test-Path -LiteralPath $b.Backup){Copy-Item -LiteralPath $b.Backup -Destination $b.Original -Force -ErrorAction SilentlyContinue}
 }
 $lines.Add('STATUS: INSTALACAO INTERROMPIDA. Backups restaurados quando necessarios.')
 $lines.Add('Classe do erro: '+$_.Exception.GetType().Name)
 $lines.Add('Arquivos locais divergentes exigem verificacao antes de sobrescrever.')
}finally{
 foreach($t in $downloaded){Remove-Item -LiteralPath $t -Force -ErrorAction SilentlyContinue}
 $lines|Set-Content -LiteralPath $report -Encoding UTF8
 Write-Host ('Relatorio: '+$report) -ForegroundColor Cyan
 Start-Process notepad.exe -ArgumentList @($report)
}
