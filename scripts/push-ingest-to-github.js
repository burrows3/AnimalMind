#!/usr/bin/env node
/**
 * After ingest: commit and push ingest artifacts (DB + JSON) to GitHub.
 * Run from repo root: node scripts/push-ingest-to-github.js
 */

const { execSync } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(REPO_ROOT, 'memory', 'animalmind.db');
const DATA_DIR = path.join(REPO_ROOT, 'memory', 'data-sources');
const DOCS_SUMMARY = path.join(REPO_ROOT, 'docs', 'data-summary.json');
const DOCS_DATA_DIR = path.join(REPO_ROOT, 'docs', 'data');
const DOCS_INGESTED_JSON = path.join(DOCS_DATA_DIR, 'ingested.json');
const DOCS_SOURCE_HEALTH_JSON = path.join(REPO_ROOT, 'docs', 'source-health.json');
const INGESTED_EXPORT_LIMIT = 200;
const INGESTED_PER_TYPE_LIMIT = 40;

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

function buildPubMedSummaryUrl(ids) {
  const q = encodeURIComponent(ids.join(','));
  return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${q}&retmode=json`;
}

function fetchPubMedSummary(ids) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      resolve({});
      return;
    }
    https
      .get(buildPubMedSummaryUrl(ids), (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const result = data?.result || {};
            const uids = Array.isArray(result.uids) ? result.uids : [];
            const map = {};
            for (const id of uids) {
              const key = String(id);
              const title = (result[key]?.title || '').trim();
              if (title) map[key] = title;
            }
            resolve(map);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function fetchPubMedTitles(ids) {
  const unique = Array.from(new Set((ids || []).map((id) => String(id)).filter(Boolean)));
  const titleMap = {};
  const batchSize = 200;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const batchMap = await fetchPubMedSummary(batch);
    Object.assign(titleMap, batchMap);
  }
  return titleMap;
}

function extractPubMedId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)\//i);
  return match ? match[1] : null;
}

function selectDashboardRows(rows, perTypeLimit = INGESTED_PER_TYPE_LIMIT, totalLimit = INGESTED_EXPORT_LIMIT) {
  const selected = [];
  const byTypeCount = {};
  for (const row of rows) {
    const type = row.data_type || 'other';
    byTypeCount[type] = byTypeCount[type] || 0;
    if (byTypeCount[type] >= perTypeLimit) continue;
    selected.push(row);
    byTypeCount[type] += 1;
    if (selected.length >= totalLimit) break;
  }
  return selected;
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No database yet; run npm run ingest first.');
    return;
  }

  // Write docs data for landing page (GitHub Pages)
  try {
    const { getIngestedMeta, getIngestedSorted } = require(path.join(REPO_ROOT, 'lib', 'db.js'));
    const { summarizeSourceHealth } = require(path.join(REPO_ROOT, 'lib', 'dataFreshness.js'));
    const meta = getIngestedMeta();
    const sourceHealth = summarizeSourceHealth();
    const summary = {
      lastUpdated: meta.lastFetched || null,
      counts: {
        surveillance: meta.counts.surveillance || 0,
        literature: meta.counts.literature || 0,
        cancer: meta.counts.cancer || 0,
        case_data: meta.counts.case_data || 0,
        clinical: meta.counts.clinical || 0,
        pet_owner: meta.counts.pet_owner || 0,
        imaging: meta.counts.imaging || 0,
        vet_practice: meta.counts.vet_practice || 0,
      },
      sourceHealthSummary: sourceHealth.summary,
      sourceHealthDetails: sourceHealth.details,
      intelligenceGaps: sourceHealth.intelligenceGaps,
    };
    const docsDir = path.join(REPO_ROOT, 'docs');
    const publicDir = path.join(REPO_ROOT, 'public');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(DOCS_SUMMARY, JSON.stringify(summary, null, 2), 'utf8');
    fs.writeFileSync(DOCS_SOURCE_HEALTH_JSON, JSON.stringify(sourceHealth, null, 2), 'utf8');
    // Export ingested rows for landing page "Browse data" (embed memory)
    const rows = selectDashboardRows(getIngestedSorted());
    const missingPubMedIds = new Set();
    for (const row of rows) {
      if (row.title) continue;
      const pmid = extractPubMedId(row.url);
      if (pmid) missingPubMedIds.add(pmid);
    }
    const pubmedTitleMap = await fetchPubMedTitles(Array.from(missingPubMedIds));
    const mappedRows = rows.map((r) => {
      const pmid = extractPubMedId(r.url);
      const fallbackTitle =
        (pmid && pubmedTitleMap[pmid]) ||
        r.condition_or_topic ||
        r.external_id ||
        '';
      return {
        data_type: r.data_type,
        condition_or_topic: r.condition_or_topic,
        title: r.title || fallbackTitle,
        url: r.url || '',
      };
    });
    if (!fs.existsSync(DOCS_DATA_DIR)) fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });
    if (!fs.existsSync(PUBLIC_DATA_DIR)) fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
    fs.writeFileSync(DOCS_INGESTED_JSON, JSON.stringify(mappedRows), 'utf8');
    fs.writeFileSync(PUBLIC_INGESTED_JSON, JSON.stringify(mappedRows), 'utf8');
    const reasoning = getAgentReasoning();
    fs.writeFileSync(DOCS_REASONING_JSON, JSON.stringify(reasoning, null, 2), 'utf8');
    fs.writeFileSync(PUBLIC_REASONING_JSON, JSON.stringify(reasoning, null, 2), 'utf8');
    const topicSummary = getTopicSummary();
    fs.writeFileSync(DOCS_TOPIC_SUMMARY, JSON.stringify(topicSummary, null, 2), 'utf8');
    fs.writeFileSync(PUBLIC_TOPIC_SUMMARY, JSON.stringify(topicSummary, null, 2), 'utf8');

    // Inline fallback in index.html so data shows even if fetch path fails.
    function writeInlineSummary(indexPath, gitAddPath) {
      if (!fs.existsSync(indexPath)) return;
      let html = fs.readFileSync(indexPath, 'utf8');
      if (!html.includes('window.__DATA_SUMMARY__')) return;
      html = html.replace(/window\.__DATA_SUMMARY__\s*=\s*[^;]+;/, 'window.__DATA_SUMMARY__ = ' + JSON.stringify(summary) + ';');
      fs.writeFileSync(indexPath, html, 'utf8');
      run(`git add ${gitAddPath}`);
    }
    writeInlineSummary(path.join(REPO_ROOT, 'docs', 'index.html'), 'docs/index.html');
    writeInlineSummary(path.join(REPO_ROOT, 'public', 'index.html'), 'public/index.html');
  } catch (e) {
    console.warn('Could not write static dashboard data files:', e.message);
  }

  run('git add memory/animalmind.db memory/data-sources/ memory/autonomous-insights.md memory/agent-outputs/ memory/opportunities.md');
  if (fs.existsSync(DOCS_SUMMARY)) run('git add docs/data-summary.json');
  if (fs.existsSync(DOCS_SOURCE_HEALTH_JSON)) run('git add docs/source-health.json');
  if (fs.existsSync(DOCS_INGESTED_JSON)) run('git add docs/data/ingested.json');
  if (fs.existsSync(DOCS_REASONING_JSON)) run('git add docs/agent-reasoning.json');
  if (fs.existsSync(DOCS_TOPIC_SUMMARY)) run('git add docs/topic-summary.json');
  if (fs.existsSync(PUBLIC_SUMMARY)) run('git add public/data-summary.json');
  if (fs.existsSync(PUBLIC_INGESTED_JSON)) run('git add public/data/ingested.json');
  if (fs.existsSync(PUBLIC_REASONING_JSON)) run('git add public/agent-reasoning.json');
  if (fs.existsSync(PUBLIC_TOPIC_SUMMARY)) run('git add public/topic-summary.json');
  if (fs.existsSync(path.join(REPO_ROOT, 'docs', 'index.html'))) run('git add docs/index.html');
  if (fs.existsSync(path.join(REPO_ROOT, 'public', 'index.html'))) run('git add public/index.html');
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

main().catch((err) => {
  console.error('push-ingest-to-github failed:', err.message);
  process.exit(1);
});
