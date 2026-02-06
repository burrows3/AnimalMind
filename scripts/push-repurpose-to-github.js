#!/usr/bin/env node
/**
 * Commit and push repurpose artifacts (signals + logs).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '..');
const MEMORY_REPURPOSE = path.join(REPO_ROOT, 'memory', 'repurpose');
const DOCS_REPURPOSE = path.join(REPO_ROOT, 'docs', 'repurpose');
const PUBLIC_REPURPOSE = path.join(REPO_ROOT, 'public', 'repurpose');

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

function resolvePushBranch() {
  if (process.env.INGEST_PUSH_BRANCH) return process.env.INGEST_PUSH_BRANCH;
  try {
    const current = run('git branch --show-current').trim();
    if (current) return current;
  } catch {
    // ignore and fall back
  }
  return 'main';
}

function maybeAdd(dir) {
  if (fs.existsSync(dir)) run(`git add ${dir}`);
}

function main() {
  maybeAdd(MEMORY_REPURPOSE);
  maybeAdd(DOCS_REPURPOSE);
  maybeAdd(PUBLIC_REPURPOSE);

  if (!hasStagedChanges()) {
    console.log('No repurpose changes to commit.');
    return;
  }

  const when = new Date().toISOString().replace(/T/, ' ').slice(0, 16);
  run(`git commit -m "Repurpose: ${when}"`);
  const pushBranch = resolvePushBranch();
  run(`git push origin ${pushBranch}`);
  console.log('Pushed repurpose to GitHub.');
}

main();
