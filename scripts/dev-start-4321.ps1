param(
  [switch]$NoStop
)

$ErrorActionPreference = 'Stop'
$workspace = Resolve-Path (Join-Path $PSScriptRoot '..')
$stopScript = Join-Path $PSScriptRoot 'dev-stop-4321.ps1'

if (-not $NoStop) {
  & $stopScript -Port 4321
}

$listener = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq 4321 } |
  Select-Object -First 1

if ($listener) {
  $pid = $listener.OwningProcess
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pid" -ErrorAction SilentlyContinue
  $cmd = if ($proc -and $proc.CommandLine) { $proc.CommandLine } else { 'unknown' }
  throw "Port 4321 is already in use by process $pid. Command: $cmd"
}

Push-Location $workspace
try {
  npm run dev:raw
} finally {
  Pop-Location
}
