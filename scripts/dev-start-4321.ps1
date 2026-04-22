param(
  [switch]$NoStop
)

$ErrorActionPreference = 'Stop'
$workspace = Resolve-Path (Join-Path $PSScriptRoot '..')
$stopScript = Join-Path $PSScriptRoot 'dev-stop-4321.ps1'

function Import-EnvFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) {
      return
    }

    $parts = $line.Split('=', 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($key) {
      Set-Item -Path "Env:$key" -Value $value
    }
  }
}

Import-EnvFile (Join-Path $workspace '.env')
Import-EnvFile (Join-Path $workspace '.env.local')
$env:PORT = '4321'

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
