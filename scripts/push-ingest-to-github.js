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
const DOCS_DATA_DIR = path.join(REPO_ROOT, 'docs', 'data');
const DOCS_INGESTED_JSON = path.join(DOCS_DATA_DIR, 'ingested.json');
const DOCS_REASONING_JSON = path.join(REPO_ROOT, 'docs', 'agent-reasoning.json');
const INGESTED_EXPORT_LIMIT = 200;

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', cwd: REPO_ROOT, ...opts });
}

/** Run git with args (no shell interpolation). Use for commit message to avoid injection. */
function runGit(args, opts = {}) {
  return execSync('git', args, { encoding: 'utf8', cwd: REPO_ROOT, ...opts });
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

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No database yet; run npm run ingest first.');
    return;
  }

  // Write docs data for landing page (GitHub Pages)
  try {
    const { getIngestedMeta, getIngestedSorted } = require(path.join(REPO_ROOT, 'lib', 'db.js'));
    const { getAgentReasoning } = require(path.join(REPO_ROOT, 'lib', 'agentReasoning.js'));
    const meta = getIngestedMeta();
    const summary = {
      lastUpdated: meta.lastFetched || null,
      counts: {
        surveillance: meta.counts.surveillance || 0,
        literature: meta.counts.literature || 0,
        cancer: meta.counts.cancer || 0,
        case_data: meta.counts.case_data || 0,
        clinical: meta.counts.clinical || 0,
        imaging: meta.counts.imaging || 0,
        vet_practice: meta.counts.vet_practice || 0,
      },
    };
    const docsDir = path.join(REPO_ROOT, 'docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(DOCS_SUMMARY, JSON.stringify(summary, null, 2), 'utf8');
    // Export ingested rows for landing page "Browse data" (embed memory)
    const rows = getIngestedSorted()
      .slice(0, INGESTED_EXPORT_LIMIT)
      .map((r) => ({ data_type: r.data_type, condition_or_topic: r.condition_or_topic, title: r.title || '', url: r.url || '' }));
    if (!fs.existsSync(DOCS_DATA_DIR)) fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });
    fs.writeFileSync(DOCS_INGESTED_JSON, JSON.stringify(rows), 'utf8');
    const reasoning = getAgentReasoning();
    fs.writeFileSync(DOCS_REASONING_JSON, JSON.stringify(reasoning, null, 2), 'utf8');
    // Inline fallback in index.html so data shows even if fetch path fails
    const indexPath = path.join(REPO_ROOT, 'docs', 'index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      if (html.includes('window.__DATA_SUMMARY__')) {
        html = html.replace(/window\.__DATA_SUMMARY__\s*=\s*[^;]+;/, 'window.__DATA_SUMMARY__ = ' + JSON.stringify(summary) + ';');
        fs.writeFileSync(indexPath, html, 'utf8');
        run('git add docs/index.html');
      }
    }
  } catch (e) {
    console.warn('Could not write docs/data-summary.json:', e.message);
  }

  run('git add memory/animalmind.db memory/data-sources/ memory/autonomous-insights.md memory/agent-outputs/ memory/opportunities.md');
  if (fs.existsSync(DOCS_SUMMARY)) run('git add docs/data-summary.json');
  if (fs.existsSync(DOCS_INGESTED_JSON)) run('git add docs/data/ingested.json');
  if (fs.existsSync(DOCS_REASONING_JSON)) run('git add docs/agent-reasoning.json');
  if (fs.existsSync(path.join(REPO_ROOT, 'docs', 'index.html'))) run('git add docs/index.html');
  if (!hasStagedChanges()) {
    console.log('No ingest changes to commit.');
    return;
  }

  const when = new Date().toISOString().replace(/T/, ' ').slice(0, 16);
  // Use run() for commit so Windows git receives args correctly; when is safe (no quotes)
  run('git commit -m "Ingest: ' + when + '"');
  const pushBranch = resolvePushBranch();
  run('git push origin ' + pushBranch);
  console.log('Pushed ingest to GitHub.');
}

main();
