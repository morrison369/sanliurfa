param(
  [int]$Port = 4321
)

$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.ToLowerInvariant()

$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq $Port } |
  Select-Object -ExpandProperty OwningProcess -Unique

if (-not $listeners) {
  Write-Host "No process is listening on port $Port."
  exit 0
}

foreach ($pid in $listeners) {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pid" -ErrorAction SilentlyContinue
  if (-not $proc) {
    continue
  }

  $commandLine = ''
  if ($null -ne $proc.CommandLine) {
    $commandLine = $proc.CommandLine.ToLowerInvariant()
  }

  $isWorkspaceProcess = $commandLine.Contains($workspace)
  $isAstroPortProcess = $commandLine.Contains('astro') -and $commandLine.Contains("--port $Port")
  $isNodeEntryProcess = $commandLine.Contains('dist/server/entry.mjs')

  if ($isWorkspaceProcess -or $isAstroPortProcess -or $isNodeEntryProcess) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped process $pid on port $Port."
  } else {
    Write-Warning "Port $Port is used by external process $pid. Not stopped."
  }
}
