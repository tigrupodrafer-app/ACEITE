# DRAFER ACEITE - conferir campos de espelho SEM divulgar dados de clientes.
# Le apenas GET da API local. Resultado: campo presente/ausente e tipo, nao seu valor.
$ErrorActionPreference='Stop'
$base='C:\DRAFER\ACEITE-API\relatorios'
New-Item -Path $base -ItemType Directory -Force | Out-Null
$out=Join-Path $base ('campos-faltantes-espelho-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$report=New-Object System.Collections.Generic.List[string]
$report.Add('=== DRAFER ACEITE - CONFERENCIA DE CAMPOS DO ESPELHO ===')
$report.Add('Data: '+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
$report.Add('Escopo: GET pedidos 352488, 352688. Sem PII, sem valores comerciais.')
function Present($obj,$key){
 if($null -eq $obj){return 'OBJETO AUSENTE'}
 $property=$obj.PSObject.Properties[$key]
 if($null -eq $property){return 'CAMPO NAO RETORNADO'}
 $value=$property.Value
 if($null -eq $value){return 'NULO'}
 if($value -is [string] -and [string]::IsNullOrWhiteSpace($value)){return 'VAZIO'}
 return 'PRESENTE'
}
$fields=@(
 'nomeEmpresa','razaoSocialEmpresa','telefoneEmpresa','tipoVenda','tipoVendaCodigo',
 'numero','numeroVenda','venda','tabelaPreco','dataPedido','dataEntrega',
 'codigoVendedor','vendedor','usuario','formaCobranca','formaPagamento',
 'condicaoPagamento','condicoesPagamento','codigoCondicaoPagamentoCadastral',
 'localEntrega','enderecoEntrega','codigoEnderecoEntrega','observacoes','obs',
 'codigoCidadeCliente','codigoRegiaoCliente',
 'cnpjCpf','emailCliente','comprador'
)
$clientFields=@(
 'codigo','nome','cnpj','cpf','cnpjCpf','telefone','email','comprador','endereco',
 'numeroEndereco','complemento','bairro','cep','cidade','estado','uf'
)
$itemFields=@('codigoProduto','codigoProdutoInterno','codigoProdutoComercial',
 'codigoProdutoImpressao','codigoImpressao','referenciaFornecedor',
 'unidade','quantidade','pesoLiquidoKg','quantidadePecas','valorUnitario','valorUnitarioPeca','valorTotal')
foreach($number in @(352488,352688)){
 $report.Add('')
 $report.Add('--- PEDIDO '+$number+' ---')
 try{
  $result=Invoke-RestMethod -Uri ('http://127.0.0.1:3101/api/pedidos/'+$number) -TimeoutSec 30
  if($result.sucesso -ne $true){throw 'API retornou sucesso diferente de true'}
  $order=$result.pedido
  if($null -eq $order){throw 'Objeto pedido nao retornado'}
  $report.Add('API: OK')
  $report.Add('[Pedido - presenca dos campos]')
  foreach($k in $fields){$report.Add(('  {0,-39} {1}' -f $k,(Present $order $k)))}
  $report.Add('[Cliente - presenca dos campos]')
  foreach($k in $clientFields){$report.Add(('  {0,-39} {1}' -f $k,(Present $order.cliente $k)))}
  $items=@($order.itens)
  $report.Add('[Itens - quantidade de itens: '+$items.Count+']')
  for($i=0;$i -lt [Math]::Min($items.Count,3);$i++){
   $report.Add('  Item indice '+$i)
   foreach($k in $itemFields){$report.Add(('    {0,-37} {1}' -f $k,(Present $items[$i] $k)))}
  }
  $report.Add('Validacao financeira presente: '+($null -ne $result.validacao))
 }catch{
  $report.Add('FALHA AO CONSULTAR API. Nenhum dado pessoal incluido.')
 }
}
$report.Add('')
$report.Add('=== INTERPRETACAO ===')
$report.Add('CAMPO NAO RETORNADO: backend ainda nao expõe essa chave.')
$report.Add('NULO/VAZIO: campo exposto mas sem valor neste pedido.')
$report.Add('PRESENTE: frontend pode estar ignorando a chave ou dado necessita homologacao semantica.')
$report.Add('Esse teste nao verifica dados brutos ausentes no SIC nem interpreta identificadores.')
$report.Add('Sem alteracoes no Firebird, processo Node, Netlify ou Supabase.')
$report|Set-Content -LiteralPath $out -Encoding UTF8
Write-Host ('Relatorio: '+$out) -ForegroundColor Cyan
Start-Process notepad.exe -ArgumentList @($out)
