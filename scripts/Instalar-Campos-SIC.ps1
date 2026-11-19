# Aplicar patch SOMENTE no servico local de itens da API SIC (SRV-DRAFER).
# Faz backup, valida sintaxe e nao reinicia Node / SIC nem altera dados Firebird.
$ErrorActionPreference = 'Stop'
$raiz = 'C:\DRAFER\ACEITE-API'
$destino = Join-Path $raiz 'src\services\itensService.js'
$url = 'https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/feat/migracao-supabase-netlify-20261113/server-patches/itensService.js'
if (-not (Test-Path $destino)) { throw "Arquivo nao encontrado: $destino" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js indisponivel.' }
$atual = Get-Content $destino -Raw
if ($atual -notmatch "function buscarItensPedido" -or $atual -notmatch "ARQES15") {
  throw 'Servico atual inesperado. Nenhuma alteracao foi feita.'
}
$tmp = Join-Path $env:TEMP ('aceite-itens-' + [guid]::NewGuid().ToString('N') + '.js')
try {
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
  $novo = Get-Content $tmp -Raw
  if ($novo -notmatch "PESO_LIQUIDO" -or $novo -notmatch "QTDE_PC" -or $novo -notmatch "module.exports = \{ buscarItensPedido \}") {
    throw 'Conteudo de download inesperado.'
  }
  # --check only parses file; no database connection and no JavaScript execution.
  & node --check $tmp
  if ($LASTEXITCODE -ne 0) { throw 'Sintaxe do JS invalida.' }
  $backup = "$destino.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Copy-Item $destino $backup -ErrorAction Stop
  Copy-Item $tmp $destino -Force
  Write-Host "Arquivo atualizado com sucesso." -ForegroundColor Green
  Write-Host "Backup: $backup" -ForegroundColor Yellow
  Write-Host 'PROXIMO PASSO: reinicie SOMENTE a API Node (na janela com FB_* carregadas).'
  Write-Host 'O SIC-Bridge pode continuar rodando, mas somente novas consultas terao os campos adicionais.'
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
