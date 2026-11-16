# DRAFER ACEITE - outbound-only PowerShell bridge for SRV-DRAFER
# No new inbound ports. Reads SIC only via existing loopback Node API.
# Before starting, set SIC_BRIDGE_TOKEN in the worker environment (>=32 chars).
param(
  [string]$PublicBaseUrl = 'https://dainty-fairy-2234e1.netlify.app',
  [string]$LocalApi = 'http://127.0.0.1:3101',
  [switch]$Once
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if ($PublicBaseUrl -ne 'https://dainty-fairy-2234e1.netlify.app') { throw 'Public URL is not allowed.' }
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
        try {
          $url = "$LocalApi/api/pedidos/$number"
          $data = Invoke-RestMethod -Method Get -Uri $url -TimeoutSec 25
          if ($null -eq $data -or $null -eq $data.pedidoCompleto -or $null -eq $data.itens -or $null -eq $data.validacao) {
            Complete-Job $job $false $null 'INVALID_DATA'
          } else {
            Complete-Job $job $true $data ''
            Write-Host ("SIC order queried: " + $number)
          }
        } catch {
          try { Complete-Job $job $false $null 'SIC_ERROR' }
          catch { Write-Warning 'Could not finish job; it may expire.' }
          Write-Warning ("Local SIC query failed: " + $number)
        }
      }
    }
  } catch {
    Write-Warning 'Bridge polling failed. Verify HTTPS, credentials and site deployment.'
  }
  if ($Once) { break }
  Start-Sleep -Seconds 5
}
