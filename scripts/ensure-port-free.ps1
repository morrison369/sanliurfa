param(
  [Parameter(Mandatory = $false)]
  [int]$Port = 1111
)

$listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $listeners) {
  Write-Output "ensure-port-free: port $Port already free"
  exit 0
}

$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
  if ($procId -le 0) {
    continue
  }
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
    Write-Output "ensure-port-free: killed pid=$procId on port $Port"
  } catch {
    Write-Output "ensure-port-free: failed pid=$procId on port $Port ($($_.Exception.Message))"
    exit 1
  }
}
