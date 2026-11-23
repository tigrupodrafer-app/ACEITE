# ACEITE DRAFER - validar modulo de complemento do espelho sem alterar servico ativo
# Faz backup se necessario, nunca sobrescreve arquivo divergente e nao reinicia processos.
# Gera JSON tecnico e abre automaticamente em Bloco de Notas.
param([string[]]$Pedidos=@('352488','352688'))
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$base='C:\DRAFER\ACEITE-API'
if(-not(Test-Path (Join-Path $base 'src\config\firebird.js'))){throw 'Configuracao Firebird local nao encontrada.'}
if(-not(Get-Command git -ErrorAction SilentlyContinue)){throw 'Git nao encontrado.'}
if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js nao encontrado.'}
if($Pedidos.Count -gt 3 -or @($Pedidos | Where-Object {$_ -notmatch '^[1-9]\d{0,11}$'}).Count -gt 0){throw 'Pedidos invalidos.'}
$files=@(
 @{
   Uri='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/c97fd03aba51b565b55207656a449a6cdfd4e83f/server-patches/espelhoService.js'
   Dest=(Join-Path $base 'src\services\espelhoService.js')
   Hash='fa07411477be9999102713430ee45405a24c940b'
 },
 @{
   Uri='https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/04078af02a52b54d242aac8dd18d6c3999c092cb/scripts/validar-espelho-local.cjs'
   Dest=(Join-Path $base 'validar-espelho-local.cjs')
   Hash='4a5cc8fadacb22f0843ff3039ea6e06c600b1ee1'
 }
)
$temp=@()
try{
 foreach($f in $files){
  $tmp=Join-Path $env:TEMP ('drafer-espelho-'+[guid]::NewGuid().ToString('N')+'.js')
  $temp+= $tmp
  Invoke-WebRequest -Uri $f.Uri -OutFile $tmp -UseBasicParsing -TimeoutSec 30
  $digest=(& git hash-object -- $tmp).Trim()
  if($LASTEXITCODE -ne 0 -or $digest -ne $f.Hash){throw 'Falha na integridade do arquivo baixado.'}
  & node --check $tmp
  if($LASTEXITCODE -ne 0){throw 'Arquivo JavaScript invalido.'}
  if(Test-Path $f.Dest){
   $existing=(& git hash-object -- $f.Dest).Trim()
   if($existing -ne $f.Hash){throw "Arquivo diferente ja existente, nenhuma substituicao: $($f.Dest)"}
  }
 }
 foreach($f in $files){
  if(-not(Test-Path $f.Dest)){
   $idx=[array]::IndexOf($files,$f)
   Copy-Item -LiteralPath $temp[$idx] -Destination $f.Dest
  }
 }
 $folder=Join-Path $base 'relatorios'
 New-Item -ItemType Directory -Force -Path $folder | Out-Null
 $report=Join-Path $folder ('espelho-validacao-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.json')
 Push-Location $base
 try{
  & node .\validar-espelho-local.cjs @Pedidos | Out-File -LiteralPath $report -Encoding utf8
  if($LASTEXITCODE -ne 0){Write-Warning 'Falha de execucao. Relatorio pode estar incompleto.'}
 }finally{Pop-Location}
 Write-Host "Resultado: $report" -ForegroundColor Green
 Write-Host 'Abrindo Bloco de Notas para copiar e colar.' -ForegroundColor Cyan
 Start-Process -FilePath notepad.exe -ArgumentList @($report)
 Write-Host 'O servico API e o Firebird nao foram alterados ou reiniciados.'
}finally{
 foreach($item in $temp){Remove-Item $item -Force -ErrorAction SilentlyContinue}
}
