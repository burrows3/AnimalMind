#!/usr/bin/env node
/**
 * After ingest: commit and push ingest artifacts (DB + JSON) to GitHub.
 * Run from repo root: node scripts/push-ingest-to-github.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(REPO_ROOT, 'memory', 'animalmind.db');
const DATA_DIR = path.join(REPO_ROOT, 'memory', 'data-sources');

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', cwd: REPO_ROOT, ...opts });
}

function hasStagedChanges() {
  try {
    run('git diff --cached --quiet', { stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No database yet; run npm run ingest first.');
    return;
  }

  run('git add memory/animalmind.db memory/data-sources/');
  if (!hasStagedChanges()) {
    console.log('No ingest changes to commit.');
    return;
  }

  const when = new Date().toISOString().replace(/T/, ' ').slice(0, 16);
  run(`git commit -m "Ingest: ${when}"`);
  run('git push origin main');
  console.log('Pushed ingest to GitHub.');
}

main();
