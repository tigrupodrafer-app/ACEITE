# DRAFER ACEITE - DIAGNOSTICO PROFUNDO DA PONTE SIC - SOMENTE LEITURA
# Sem autenticar no endpoint de fila: GET autenticado reivindicaria um pedido.
# Nao inicia, reinicia, encerra, apaga ou edita servicos/arquivos da aplicacao.
# Mostra SOMENTE classificacoes dos logs, nunca conteudos ou segredos.
Set-StrictMode -Version Latest
$ErrorActionPreference='Continue'
$base='C:\DRAFER\ACEITE-API'
$dir=Join-Path $base 'relatorios'
if(-not(Test-Path $dir)){ New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$out=Join-Path $dir ('DIAGNOSTICO-PONTE-DETALHADO-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$report=New-Object System.Collections.Generic.List[string]
function Add([string]$value){$report.Add($value)}
function Flag([bool]$value){if($value){'SIM'}else{'NAO'}}
Add '=== DRAFER ACEITE - DIAGNOSTICO PROFUNDO DA PONTE ==='
Add ('Data: '+(Get-Date -Format s))
Add ('Usuario Windows atual: '+[Environment]::UserName)
Add ('Sessao PowerShell PID: '+$PID)
Add ''
Add '=== 1. API LOCAL ==='
try{
 $port=@(Get-NetTCPConnection -LocalPort 3101 -State Listen -ErrorAction Stop)
 Add ('Porta 3101 ouvindo: '+(Flag ($port.Count -gt 0)))
 if($port.Count -gt 0){Add ('PID API: '+$port[0].OwningProcess)}
}catch{Add 'Porta 3101: consulta indisponivel ou nao ativa'}
try{
 $h=Invoke-RestMethod -Uri 'http://127.0.0.1:3101/api/health' -TimeoutSec 6
 Add ('Health status: '+[string]$h.status)
}catch{Add 'Health status: SEM RESPOSTA'}
Add ''
Add '=== 2. PROCESSOS DA PONTE ==='
$workers=@()
try{
 $ps=@(Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction Stop)
 $workers=@($ps | Where-Object { $_.CommandLine -match '(?i)(?:ACEITE-Ponte-Worker|SIC-Bridge)\.ps1' })
 Add ('Workers identificados: '+$workers.Count)
 foreach($w in $workers){ Add ('Worker PID: '+$w.ProcessId+' | Pai: '+$w.ParentProcessId) }
 if($workers.Count -eq 0){Add 'ALERTA: nenhuma ponte SIC ativa identificada por linha de comando.'}
 if($workers.Count -gt 1){Add 'ALERTA: ponte duplicada (nao iniciar outra instancia).'}
}catch{Add 'Nao foi possivel consultar os processos PowerShell com as permissoes atuais.'}
Add ''
Add '=== 3. ARQUIVOS DE INICIALIZACAO ==='
foreach($name in @('SIC-Bridge.ps1','ACEITE-Ponte-Worker.ps1','INICIAR-PONTE-ACEITE.ps1','INICIAR-PONTE-ACEITE.bat')){
 Add ($name+': '+(Flag (Test-Path -LiteralPath (Join-Path $base $name))))
}
Add ''
Add '=== 4. TOKEN PROTEGIDO (SEM EXIBIR VALOR) ==='
$cfg=Join-Path $env:LOCALAPPDATA 'DRAFER\ACEITE\ponte-token.dpapi'
$secretExists=Test-Path -LiteralPath $cfg
Add ('Arquivo DPAPI da conta atual existe: '+(Flag $secretExists))
if($secretExists){
 try{
  $sec=Get-Content -LiteralPath $cfg -Raw -ErrorAction Stop | ConvertTo-SecureString -ErrorAction Stop
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try {
   $size=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Length
  }finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
  Add ('DPAPI pode ser descriptografado nesta conta: SIM')
  Add ('Token atende ao comprimento minimo de 32 caracteres: '+(Flag ($size -ge 32)))
  $sec.Dispose()
  $size=0
 }catch{
  Add 'DPAPI pode ser descriptografado nesta conta: NAO'
  Add 'INDICIO: arquivo gerado em outra conta Windows, perfil diferente ou corrompido.'
 }
}else{
 Add 'INDICIO: ponte nao foi configurada nesta conta ou arquivo esta em outro perfil.'
}
Add 'NOTA: token correto na maquina NAO comprova coincidencia com a variavel da Netlify.'
Add ''
Add '=== 5. REDE E ENDPOINT PUBLICO (SEM TOKEN) ==='
try{
 $u='https://dainty-fairy-2234e1.netlify.app/.netlify/functions/sic-bridge'
 $r=Invoke-WebRequest -Uri $u -Method Get -UseBasicParsing -TimeoutSec 12 -ErrorAction Stop
 Add ('HTTP ponte sem token: '+[int]$r.StatusCode)
}catch{
 $code=$null
 try { $code=[int]$_.Exception.Response.StatusCode }catch{}
 if($code){
  Add ('HTTP ponte sem token: '+$code)
  if($code -eq 403){Add 'HTTP 403 sem token: esperado (endpoint acessivel e protegido).'}
  if($code -eq 503){Add 'HTTP 503: configuracao SIC_BRIDGE_TOKEN possivelmente ausente no ambiente Netlify.'}
 }else{Add 'Nao foi possivel acessar a Netlify via HTTPS nesta sessao.'}
}
Add 'IMPORTANTE: NENHUMA chamada autenticada foi feita; fila nao foi consumida.'
Add ''
Add '=== 6. LOGS DO WORKER - APENAS CONTAGENS E CATEGORIAS ==='
$logs=@()
try{
 $logs=@(Get-ChildItem -LiteralPath $dir -File -Filter 'sic-bridge-*.log' -ErrorAction SilentlyContinue |
   Sort-Object LastWriteTime -Descending | Select-Object -First 3)
 Add ('Arquivos de log localizados: '+$logs.Count)
 foreach($file in $logs){
  Add ('Log: '+$file.Name)
  Add ('Ultima modificacao: '+$file.LastWriteTime.ToString('s'))
  $tail=@(Get-Content -LiteralPath $file.FullName -Tail 250 -ErrorAction SilentlyContinue)
  $categories=[ordered]@{
   'Ponte iniciada'='Ponte iniciada'
   'Ponte encerrada'='Ponte encerrada'
   'Erro interno do worker'='ERRO no worker'
   'Falhas de polling da Netlify'='Bridge polling failed'
   'HTTP 403 no envio'='Netlify upload failed:.*HTTP=403'
   'HTTP 409 no envio'='Netlify upload failed:.*HTTP=409'
   'Outras falhas de upload'='Netlify upload failed'
   'Leituras locais OK'='SIC local HTTP read OK'
   'Pedidos enviados a Netlify'='SIC order sent to Netlify'
   'Falhas de leitura SIC local'='SIC local HTTP read failed'
  }
  foreach($name in $categories.Keys){
   $matches=@($tail | Where-Object {$_ -match $categories[$name]}).Count
   Add ('  '+$name+': '+$matches)
  }
 }
 if($logs.Count -eq 0){Add 'Nenhum log de worker encontrado no diretorio da API.'}
}catch{Add 'Nao foi possivel ler a situacao dos logs (conteudo nao foi copiado).'}
Add ''
Add '=== 7. ULTIMOS RELATORIOS DE INICIALIZACAO (SOMENTE SITUACOES) ==='
try{
 $startup=@(Get-ChildItem -LiteralPath $dir -Filter 'inicio-ponte-*.txt' -File -ErrorAction SilentlyContinue |
   Sort-Object LastWriteTime -Descending | Select-Object -First 3)
 Add ('Relatorios de inicializacao encontrados: '+$startup.Count)
 foreach($f in $startup){
  Add ('Relatorio: '+$f.Name)
  $lines=@(Get-Content -LiteralPath $f.FullName -ErrorAction SilentlyContinue)
  foreach($label in @('FALHA','Ponte JA INICIADA','Worker SIC Bridge criado','Token protegido existente','Token protegido por DPAPI')){
   Add ('  '+$label+': '+(Flag (@($lines | Where-Object {$_ -like ('*'+$label+'*')}).Count -gt 0)))
  }
 }
}catch{Add 'Falha ao ler relatorios de inicializacao.'}
Add ''
Add '=== CONCLUSAO AUTOMATICA ==='
if($workers.Count -eq 0){Add 'PRIORIDADE: verificar por que o worker foi encerrado ou nao iniciou.'}
elseif($logs.Count -gt 0){Add 'Worker identificado. Correlacionar horario do log e contagens de falhas.'}
else{Add 'Worker identificado sem log: verificar permissao de escrita no diretorio de relatorios.'}
Add 'STATUS FILA REMOTA: verificar por consulta separada ao Supabase; este script nao retira itens da fila.'
Add ''
Add '=== SEGURANCA ==='
Add 'Somente leitura operacional; nenhum token, senha, nome de cliente ou corpo de resposta foi impresso.'
Add 'Nenhum processo reiniciado, nenhuma requisicao autenticada de retirada de pedidos.'
$report | Set-Content -LiteralPath $out -Encoding UTF8
Write-Host ('Relatorio salvo: '+$out) -ForegroundColor Cyan
Start-Process -FilePath notepad.exe -ArgumentList @($out)
