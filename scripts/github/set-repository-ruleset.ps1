Param(
  [string]$Owner = "morrison369",
  [string]$Repo = "sanliurfa",
  [string]$RulesetName = "Sanliurfa Master Protection"
)

$ErrorActionPreference = "Stop"

$payload = @{
  name = $RulesetName
  target = "branch"
  enforcement = "active"
  conditions = @{
    ref_name = @{
      include = @("refs/heads/master")
      exclude = @()
    }
  }
  rules = @(
    @{ type = "deletion" },
    @{ type = "non_fast_forward" },
    @{
      type = "pull_request"
      parameters = @{
        required_approving_review_count = 1
        dismiss_stale_reviews_on_push = $true
        require_code_owner_review = $true
        require_last_push_approval = $false
        required_review_thread_resolution = $true
        allowed_merge_methods = @("squash")
      }
    },
    @{
      type = "required_status_checks"
      parameters = @{
        strict_required_status_checks_policy = $true
        required_status_checks = @(
          @{ context = "Public City Acceptance" },
          @{ context = "Security Audit / security" }
        )
      }
    }
  )
}

$tmp = New-TemporaryFile
try {
  $json = $payload | ConvertTo-Json -Depth 50
  [System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))
  $response = gh api -X POST "repos/$Owner/$Repo/rulesets" --input $tmp 2>&1
  if ($LASTEXITCODE -ne 0) {
    if ($response -match "Upgrade to GitHub Pro or make this repository public") {
      Write-Error "Repository rulesets are not available for ${Owner}/${Repo} with the current plan/repo ownership. If Team was purchased for an organization, transfer this repository into that organization or wait until the plan is active for this owner.`n$response"
      exit $LASTEXITCODE
    }
    Write-Error "Failed to create ruleset for ${Owner}/${Repo}.`n$response"
    exit $LASTEXITCODE
  }

  Write-Host "Repository ruleset created for ${Owner}/${Repo}: $RulesetName"
  Write-Host $response
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
