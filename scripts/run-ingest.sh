#!/bin/bash
# Run data ingest from repo root. Use with cron for 6-hour autonomous runs on Linux/VM.
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if node scripts/ingest-data-sources.js; then
  if node scripts/think-autonomous.js \
    && node scripts/agent-surveillance-review.js \
    && node scripts/agent-literature-review.js \
    && node scripts/agent-synthesize-opportunities.js \
    && node scripts/push-ingest-to-github.js; then
    node scripts/post-to-zapier.js || true
    echo "$(date -Iseconds) ok" >> memory/ingest.log
  else
    echo "$(date -Iseconds) FAIL" >> memory/ingest.log
    exit 1
  fi
else
  echo "$(date -Iseconds) FAIL" >> memory/ingest.log
  exit 1
fi
