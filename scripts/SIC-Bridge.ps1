# DRAFER ACEITE - outbound-only PowerShell bridge for SRV-DRAFER
# No new inbound ports. Reads SIC only via existing loopback Node API.
# Before starting, set SIC_BRIDGE_TOKEN in the worker environment (>=32 chars).
param(
  [string]$PublicBaseUrl = 'https://aceitedrafer.netlify.app',
  [string]$LocalApi = 'http://127.0.0.1:3101',
  [switch]$Once
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if ($PublicBaseUrl -ne 'https://aceitedrafer.netlify.app') { throw 'Public URL is not allowed.' }
if ($LocalApi -ne 'http://127.0.0.1:3101') { throw 'Local API must be loopback on port 3101.' }
$token = [Environment]::GetEnvironmentVariable('SIC_BRIDGE_TOKEN')
if ([string]::IsNullOrEmpty($token) -or $token.Length -lt 32) { throw 'SIC_BRIDGE_TOKEN is missing.' }
$bridge = "$PublicBaseUrl/.netlify/functions/sic-bridge"
$headers = @{ 'X-Sic-Bridge-Token' = $token }
$token = $null

function Complete-Job([object]$job, [bool]$ok, [object]$payload, [string]$errorCode) {
  $body = @{
    requestId = [string]$job.requestId
    lease = [string]$job.lease
    ok = $ok
    data = $payload
    errorCode = $errorCode
  } | ConvertTo-Json -Depth 32 -Compress
  $null = Invoke-RestMethod -Method Post -Uri $bridge -Headers $headers -Body $body -ContentType 'application/json; charset=utf-8' -TimeoutSec 25
}
Write-Host 'DRAFER SIC Bridge: outbound HTTPS, read-only.'
while ($true) {
  try {
    $job = Invoke-RestMethod -Method Get -Uri $bridge -Headers $headers -TimeoutSec 20
    if ($null -ne $job -and $job.requestId) {
      $number = [string]$job.orderNumber
      if ($number -notmatch '^[1-9]\d{0,11}$') {
        Complete-Job $job $false $null 'INVALID_DATA'
      } else {
        $localOk = $false
        $normalized = $null
        $errorCode = 'SIC_ERROR'
        try {
          $url = "$LocalApi/api/pedidos/$number"
          $data = Invoke-RestMethod -Method Get -Uri $url -TimeoutSec 25
          # Local Node API returns { sucesso, pedido: { ..., itens }, validacao }.
          if ($null -eq $data -or $data.sucesso -ne $true -or
              $null -eq $data.pedido -or $null -eq $data.pedido.itens -or
              $null -eq $data.validacao) {
            $errorCode = 'INVALID_DATA'
            Write-Warning ("SIC local returned an unexpected JSON shape for order " + $number)
          } else {
            $normalized = @{
              pedidoCompleto = $data.pedido
              itens = @($data.pedido.itens)
              validacao = $data.validacao
            }
            $localOk = $true
            Write-Host ("SIC local HTTP read OK for order " + $number)
          }
        } catch {
          Write-Warning ("SIC local HTTP read failed: " + $_.Exception.Message)
        }
        # Keep upload failures separate: never mark a successful local read
        # as a failed SIC query when only the Netlify response upload failed.
        try {
          Complete-Job $job $localOk $normalized $errorCode
          if ($localOk) { Write-Host ("SIC order sent to Netlify: " + $number) }
          else { Write-Warning ("SIC query failure reported to Netlify: " + $errorCode) }
        } catch {
          $http = ''
          if ($_.Exception.Response) {
            $http = " HTTP=" + [int]$_.Exception.Response.StatusCode
          }
          Write-Warning ("Netlify upload failed:" + $http + " - " + $_.Exception.Message)
          Write-Warning "Check Netlify Functions sic-bridge logs; do not retry an expired lease."
        }
      }
    }
  } catch {
    Write-Warning 'Bridge polling failed. Verify HTTPS, credentials and site deployment.'
  }
  if ($Once) { break }
  Start-Sleep -Seconds 5
}
