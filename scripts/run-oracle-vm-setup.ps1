# One-click Oracle VM setup: SSH in and run bootstrap. Run from repo root or scripts folder.
# You need: (1) Firewall open (TCP 22, 3000) in Oracle Console. (2) Private key and VM public IP.
#
# Usage (avoids paste issues):
#   .\scripts\run-oracle-vm-setup.ps1 -KeyPath "C:\Users\You\Downloads\oracle.key" -VmIp "147.224.216.170"
# Or run without args and type (not paste) when prompted.

param(
    [string]$KeyPath,
    [string]$VmIp,
    [string]$GhUser
)

$ErrorActionPreference = "Stop"

# Remove control chars that paste can insert (e.g. ^V)
function Clean-Input { param([string]$s)
    if ([string]::IsNullOrWhiteSpace($s)) { return $s }
    -join ($s -replace '\p{C}', '').Trim()
}

Write-Host ""
Write-Host "AnimalMind Oracle VM setup" -ForegroundColor Cyan
Write-Host ""

# Key path: param, prompt, or auto from Downloads
if ([string]::IsNullOrWhiteSpace($KeyPath)) {
    $keyPath = Clean-Input (Read-Host "Path to your Oracle private key (e.g. C:\Users\You\Downloads\oracle-animalmind.key)")
}
else { $keyPath = Clean-Input $KeyPath }
if ([string]::IsNullOrWhiteSpace($keyPath)) {
    $keyPath = (Get-ChildItem $env:USERPROFILE\Downloads\*.key -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
    if (-not $keyPath) { Write-Host "No key path. Run with -KeyPath 'C:\path\to\key.key' or type the path (don't paste)."; exit 1 }
}
if (-not (Test-Path -LiteralPath $keyPath)) { Write-Host "Key file not found: $keyPath"; exit 1 }
Write-Host "Using key: $keyPath"

# VM IP: param or prompt
if ([string]::IsNullOrWhiteSpace($VmIp)) {
    $vmIp = Clean-Input (Read-Host "VM public IP (e.g. 147.224.216.170)")
}
else { $vmIp = Clean-Input $VmIp }
if ([string]::IsNullOrWhiteSpace($vmIp)) { Write-Host "Need VM IP. Run with -VmIp '147.224.216.170' or type the IP (don't paste)."; exit 1 }
# Reject if it looks like garbage (e.g. control char)
if ($vmIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') { Write-Host "VM IP should look like 147.224.216.170. Got: $vmIp"; exit 1 }
Write-Host "Using VM: $vmIp"

# GitHub username
if ([string]::IsNullOrWhiteSpace($GhUser)) {
    $ghUser = Clean-Input (Read-Host "Your GitHub username (e.g. burrows3)")
}
else { $ghUser = Clean-Input $GhUser }
if ([string]::IsNullOrWhiteSpace($ghUser)) { Write-Host "Need GitHub username. Run with -GhUser 'your-username' or type when prompted."; exit 1 }

$oneLiner = "sudo apt-get update -qq && sudo apt-get install -y git curl && git clone https://github.com/$ghUser/AnimalMind.git ~/AnimalMind && bash ~/AnimalMind/scripts/oracle-vm-bootstrap.sh"

Write-Host ""
Write-Host "Connecting to ubuntu@$vmIp and running setup..." -ForegroundColor Yellow
Write-Host "When it asks for your GitHub token, paste it and press Enter. For PM2, type y or n." -ForegroundColor Yellow
Write-Host ""

& ssh -o StrictHostKeyChecking=accept-new -i $keyPath "ubuntu@$vmIp" "$oneLiner"
