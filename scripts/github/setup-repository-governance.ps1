Param(
  [string]$Owner = "morrison369",
  [string]$Repo = "sanliurfa",
  [string]$Branch = "master"
)

$ErrorActionPreference = "Stop"

function Invoke-GhJson {
  param(
    [string[]]$GhArgs,
    [object]$Payload = $null
  )

  $tmp = $null
  try {
    if ($null -ne $Payload) {
      $tmp = New-TemporaryFile
      $json = $Payload | ConvertTo-Json -Depth 50
      [System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))
      $result = gh api @GhArgs --input $tmp 2>&1
    } else {
      $result = gh api @GhArgs 2>&1
    }

    if ($LASTEXITCODE -ne 0) {
      throw "$result"
    }
    return $result
  } finally {
    if ($tmp -and (Test-Path -LiteralPath $tmp)) {
      Remove-Item -LiteralPath $tmp -Force
    }
  }
}

Write-Host "Configuring repository governance for ${Owner}/${Repo}:${Branch}"

Invoke-GhJson -GhArgs @(
  "-X", "PATCH",
  "repos/$Owner/$Repo",
  "-f", "allow_merge_commit=false",
  "-f", "allow_squash_merge=true",
  "-f", "allow_rebase_merge=false",
  "-f", "delete_branch_on_merge=true",
  "-f", "allow_update_branch=true"
) | Out-Null
Write-Host "Merge strategy configured: squash-only, delete branch on merge."

try {
  Invoke-GhJson -GhArgs @("-X", "PUT", "repos/$Owner/$Repo/vulnerability-alerts", "--silent") | Out-Null
  Write-Host "Dependabot vulnerability alerts enabled."
} catch {
  Write-Warning "Could not enable vulnerability alerts: $_"
}

$envPayload = @{
  deployment_branch_policy = @{
    protected_branches = $true
    custom_branch_policies = $false
  }
}

try {
  Invoke-GhJson -GhArgs @("-X", "PUT", "repos/$Owner/$Repo/environments/production") -Payload $envPayload | Out-Null
  Write-Host "Production environment configured for protected branches only."
} catch {
  Write-Warning "Could not configure production environment: $_"
}

try {
  & "$PSScriptRoot\set-branch-protection.ps1" -Owner $Owner -Repo $Repo -Branch $Branch
} catch {
  Write-Warning "Branch protection could not be applied yet: $_"
}

try {
  & "$PSScriptRoot\set-repository-ruleset.ps1" -Owner $Owner -Repo $Repo
} catch {
  Write-Warning "Repository ruleset could not be applied yet: $_"
}

Write-Host "Governance setup finished."
