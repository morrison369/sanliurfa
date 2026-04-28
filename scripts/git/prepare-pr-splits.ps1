Param(
  [string]$BaseBranch = "master"
)

$ErrorActionPreference = "Stop"

Write-Host "Preparing PR split branches from '$BaseBranch'..."

git fetch origin $BaseBranch | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to fetch origin/$BaseBranch"
  exit 1
}

$branches = @(
  "pr/api-contract",
  "pr/image-pipeline",
  "pr/infra-workflow"
)

foreach ($branch in $branches) {
  git show-ref --verify --quiet "refs/heads/$branch"
  if ($LASTEXITCODE -eq 0) {
    Write-Host " - Branch exists: $branch"
  } else {
    git branch $branch "origin/$BaseBranch" | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Failed creating branch: $branch from origin/$BaseBranch"
      exit 1
    }
    Write-Host " - Created branch: $branch"
  }
}

Write-Host ""
Write-Host "Branch split prepared. Use docs/pr-split-plan.md for path-based commits."
