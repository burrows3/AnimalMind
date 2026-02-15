# Fix git lock and sync local repo with production (origin/main).
# Does not change any of your app code—only removes .git/index.lock and resets to origin/main.
#
# If the lock file is "in use": close Cursor/VS Code (or at least the Source Control panel),
# any Git GUI, and any other app that might be using this repo. Then run this script again.

$ErrorActionPreference = "Stop"
$repoRoot = Join-Path $PSScriptRoot ".."
Set-Location $repoRoot

$lockFile = Join-Path (Join-Path $repoRoot ".git") "index.lock"
$lockRemoved = $false
if (Test-Path $lockFile) {
  try {
    Remove-Item -Force -LiteralPath $lockFile
    Write-Host "Removed .git/index.lock"
    $lockRemoved = $true
  } catch {
    Write-Host ""
    Write-Host "The lock file is in use by another process. Please:"
    Write-Host "  1. Close Cursor/VS Code Source Control (or the whole IDE), and any Git GUI."
    Write-Host "  2. Run this script again:  powershell -ExecutionPolicy Bypass -File scripts\fix-git-and-sync.ps1"
    Write-Host ""
    exit 1
  }
} else {
  Write-Host "No lock file found."
}

Write-Host "Fetching origin..."
git fetch origin

Write-Host "Resetting main to origin/main (local repo will match production)..."
git reset --hard origin/main

Write-Host "Done. Your local repo now matches production (AnimalMind / Pro / Pet brand)."
