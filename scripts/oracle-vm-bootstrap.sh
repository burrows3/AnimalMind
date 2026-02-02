#!/bin/bash
# Oracle VM one-time setup: Node, clone repo, npm install, Git push (HTTPS token), every-6h cron, optional PM2.
# Run on a fresh Ubuntu VM after SSH. Usage: see ORACLE-CLOUD-VM-SETUP.md "Minimal steps".
set -e

# Set REPO_URL when running if different (e.g. export REPO_URL=https://github.com/YOUR_ORG/AnimalMind.git)
REPO_URL="${REPO_URL:-https://github.com/YOUR_GITHUB_USERNAME/AnimalMind.git}"
REPO_DIR="${HOME}/AnimalMind"
CRON_LOG="${REPO_DIR}/memory/cron.log"

echo "=== AnimalMind Oracle VM bootstrap ==="

# Install git + curl if needed
if ! command -v git &>/dev/null || ! command -v curl &>/dev/null; then
  echo "Installing git and curl..."
  sudo apt-get update -qq
  sudo apt-get install -y git curl
fi

# Clone repo if not already there
if [ ! -d "${REPO_DIR}/.git" ]; then
  echo "Cloning repo to ${REPO_DIR}..."
  git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"

# Node.js 20 if not present
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node: $(node -v)  npm: $(npm -v)"

# Dependencies
npm install

# Git remote for push (HTTPS + token)
echo ""
echo "To allow this VM to push to GitHub, we need a Personal Access Token (repo scope)."
echo "Create one at: https://github.com/settings/tokens"
read -r -p "Paste your GitHub token (or press Enter to skip and set later): " GITHUB_TOKEN
if [ -n "$GITHUB_TOKEN" ]; then
  ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
  if [[ "$ORIGIN_URL" == https://* ]]; then
    # Replace or add token into URL
    if [[ "$ORIGIN_URL" == *@* ]]; then
      ORIGIN_URL="https://${GITHUB_TOKEN}@${ORIGIN_URL#*@}"
    else
      ORIGIN_URL="https://${GITHUB_TOKEN}@${ORIGIN_URL#https://}"
    fi
    git remote set-url origin "$ORIGIN_URL"
    echo "Remote origin updated (token stored in URL)."
  fi
fi

# Ensure memory dir for logs
mkdir -p "$REPO_DIR/memory"

# Run ingest once
echo ""
echo "Running ingest + think + push once..."
if node scripts/ingest-data-sources.js && node scripts/think-autonomous.js && node scripts/push-ingest-to-github.js; then
  echo "First run succeeded. Check GitHub for new commit."
else
  echo "First run had issues (e.g. push needs token). Fix and re-run: node scripts/push-ingest-to-github.js"
fi

# Cron: every 6 hours
CRON_LINE="0 */6 * * * ${REPO_DIR}/scripts/run-ingest.sh >> ${CRON_LOG} 2>&1"
if crontab -l 2>/dev/null | grep -q "run-ingest.sh"; then
  echo "Cron already has ingest (every 6h)."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "Added cron every 6 hours. Verify: crontab -l"
fi

# Optional PM2 for dashboard
echo ""
read -r -p "Start dashboard 24/7 with PM2? [y/N]: " DO_PM2
if [[ "$DO_PM2" =~ ^[yY] ]]; then
  if ! command -v pm2 &>/dev/null; then
    sudo npm install -g pm2
  fi
  pm2 delete animalmind 2>/dev/null || true
  pm2 start server.js --name animalmind
  pm2 save
  echo "Run the command below to start dashboard after reboot:"
  pm2 startup
  echo "Dashboard: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VM_IP'):3000"
else
  echo "Skip PM2. To start dashboard later: cd ${REPO_DIR} && node server.js"
fi

echo ""
echo "=== Done. Ingest is scheduled every 6 hours. ==="
