param(
  [int]$Port = 4321,
  [string]$BaseUrl = 'http://127.0.0.1:4321',
  [switch]$KeepServer
)

$ErrorActionPreference = 'Stop'

$workspace = Resolve-Path (Join-Path $PSScriptRoot '..')
$stopScript = Join-Path $PSScriptRoot 'dev-stop-4321.ps1'
$logDir = Join-Path $workspace '.tmp'
$stdoutLog = Join-Path $logDir 'social-smoke-dev.out.log'
$stderrLog = Join-Path $logDir 'social-smoke-dev.err.log'
$healthUrl = "$BaseUrl/api/health"

$startedByScript = $false
$devProcess = $null

function Test-PortListener {
  param([int]$LocalPort)

  $listener = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -eq $LocalPort } |
    Select-Object -First 1

  return $null -ne $listener
}

function Wait-ForHealth {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 600) {
        return $true
      }
    } catch {
      # wait and retry
    }

    Start-Sleep -Seconds 2
  }

  return $false
}

function Show-LogTail {
  param([string]$Path)

  if (Test-Path $Path) {
    Write-Host "---- $Path (tail) ----"
    Get-Content -Path $Path -Tail 80
    Write-Host "---- end ----"
  }
}

if (-not (Test-PortListener -LocalPort $Port)) {
  if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa'
    Write-Host 'DATABASE_URL set to local default for smoke run.'
  }

  New-Item -Path $logDir -ItemType Directory -Force | Out-Null
  Remove-Item -LiteralPath $stdoutLog -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $stderrLog -Force -ErrorAction SilentlyContinue

  Write-Host "No server on port $Port. Starting Astro dev (single-port mode)..."

  $devProcess = Start-Process -FilePath 'npm.cmd' `
    -ArgumentList @('run', 'dev:raw') `
    -WorkingDirectory $workspace `
    -PassThru `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog

  $startedByScript = $true
} else {
  Write-Host "Server already listening on port $Port. Using existing server."
}

$smokeExit = 0
$failureMessage = $null

try {
  if (-not (Wait-ForHealth -Url $healthUrl -TimeoutSeconds 90)) {
    Show-LogTail -Path $stdoutLog
    Show-LogTail -Path $stderrLog
    throw "Health check timeout: $healthUrl"
  }

  Push-Location $workspace
  try {
    & npx.cmd tsx scripts/social-messaging-smoke.ts
    $smokeExit = $LASTEXITCODE
  } finally {
    Pop-Location
  }

  if ($smokeExit -ne 0) {
    throw "social-messaging-smoke exited with code $smokeExit"
  }
} catch {
  $failureMessage = $_.Exception.Message
} finally {
  if ($startedByScript -and -not $KeepServer) {
    if ($devProcess -and -not $devProcess.HasExited) {
      taskkill /PID $devProcess.Id /F /T | Out-Null
    }

    & $stopScript -Port $Port
    Write-Host "Stopped local dev server on port $Port."
  }
}

if ($null -ne $failureMessage) {
  Write-Host "social-smoke failed: $failureMessage"
  if ($smokeExit -eq 0) {
    exit 1
  }
  exit $smokeExit
}

Write-Host "Social smoke finished successfully."
