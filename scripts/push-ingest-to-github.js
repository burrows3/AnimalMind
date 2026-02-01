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
const DOCS_SUMMARY = path.join(REPO_ROOT, 'docs', 'data-summary.json');

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

  // Write docs/data-summary.json for landing page (GitHub Pages)
  try {
    const { getIngestedMeta } = require(path.join(REPO_ROOT, 'lib', 'db.js'));
    const meta = getIngestedMeta();
    const summary = {
      lastUpdated: meta.lastFetched || null,
      counts: {
        surveillance: meta.counts.surveillance || 0,
        literature: meta.counts.literature || 0,
        cancer: meta.counts.cancer || 0,
        case_data: meta.counts.case_data || 0,
        imaging: meta.counts.imaging || 0,
      },
    };
    const docsDir = path.join(REPO_ROOT, 'docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(DOCS_SUMMARY, JSON.stringify(summary, null, 2), 'utf8');
    // Inline fallback in index.html so data shows even if fetch path fails
    const indexPath = path.join(REPO_ROOT, 'docs', 'index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      if (html.includes('window.__DATA_SUMMARY__')) {
        html = html.replace(/window\.__DATA_SUMMARY__\s*=\s*[^;]+;/, 'window.__DATA_SUMMARY__ = ' + JSON.stringify(summary) + ';');
        fs.writeFileSync(indexPath, html, 'utf8');
      }
    }
  } catch (e) {
    console.warn('Could not write docs/data-summary.json:', e.message);
  }

  run('git add memory/animalmind.db memory/data-sources/ memory/autonomous-insights.md');
  if (fs.existsSync(DOCS_SUMMARY)) run('git add docs/data-summary.json');
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
