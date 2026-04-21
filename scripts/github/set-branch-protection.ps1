Param(
  [string]$Owner = "morrison369",
  [string]$Repo = "sanliurfa",
  [string]$Branch = "master"
)

$ErrorActionPreference = "Stop"

$payload = @{
  required_status_checks = @{
    strict = $true
    contexts = @(
      "Public City Acceptance",
      "Security Audit / security",
      "Security Audit / dependency-review"
    )
  }
  enforce_admins = $true
  required_pull_request_reviews = @{
    required_approving_review_count = 1
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $true
    require_last_push_approval = $false
  }
  restrictions = $null
  required_linear_history = $false
  allow_force_pushes = $false
  allow_deletions = $false
  block_creations = $false
  required_conversation_resolution = $true
  lock_branch = $false
  allow_fork_syncing = $true
}

$json = $payload | ConvertTo-Json -Depth 20
$tmp = New-TemporaryFile
[System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))

$response = gh api -X PUT "repos/$Owner/$Repo/branches/$Branch/protection" --input $tmp 2>&1
$exitCode = $LASTEXITCODE

Remove-Item -LiteralPath $tmp -Force
if ($exitCode -ne 0) {
  if ($response -match "Upgrade to GitHub Pro or make this repository public") {
    Write-Error "Branch protection is not available for ${Owner}/${Repo}:${Branch} with the current GitHub plan/repo ownership. If Team was purchased, move the repository into the Team organization or wait until the plan is active for this owner. Do not make the repo public until npm run security:public-readiness is clean.`n$response"
    exit $exitCode
  }
  Write-Error "Failed to update branch protection for ${Owner}/${Repo}:${Branch}.`n$response"
  exit $exitCode
}

Write-Host "Branch protection updated for ${Owner}/${Repo}:${Branch}"
