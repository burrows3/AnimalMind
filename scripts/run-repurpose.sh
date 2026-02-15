#!/bin/bash
# Run repurpose engine from repo root. Use with cron for scheduled runs.
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if node scripts/repurpose-run.js; then
  echo "$(date -Iseconds) ok" >> memory/repurpose.log
  node scripts/push-repurpose-to-github.js
else
  echo "$(date -Iseconds) FAIL" >> memory/repurpose.log
  exit 1
fi
