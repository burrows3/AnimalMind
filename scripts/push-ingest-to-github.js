#!/usr/bin/env node
/**
 * After ingest: commit and push ingest artifacts (DB + JSON) to GitHub.
 * Run from repo root: node scripts/push-ingest-to-github.js
 */

const { execSync } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { getAgentReasoning } = require(path.join(__dirname, '..', 'lib', 'agentReasoning'));
const { getTopicSummary } = require(path.join(__dirname, '..', 'lib', 'topicSummary'));

const REPO_ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(REPO_ROOT, 'memory', 'animalmind.db');
const DATA_DIR = path.join(REPO_ROOT, 'memory', 'data-sources');
const DOCS_SUMMARY = path.join(REPO_ROOT, 'docs', 'data-summary.json');
const DOCS_DATA_DIR = path.join(REPO_ROOT, 'docs', 'data');
const DOCS_INGESTED_JSON = path.join(DOCS_DATA_DIR, 'ingested.json');
const DOCS_PET_RESEARCH_JSON = path.join(DOCS_DATA_DIR, 'pet-research.json');
const DOCS_PET_RECALLS_JSON = path.join(DOCS_DATA_DIR, 'pet-recalls.json');
const DOCS_SOURCE_HEALTH_JSON = path.join(REPO_ROOT, 'docs', 'source-health.json');
const DOCS_REASONING_JSON = path.join(REPO_ROOT, 'docs', 'agent-reasoning.json');
const DOCS_TOPIC_SUMMARY = path.join(REPO_ROOT, 'docs', 'topic-summary.json');
const PUBLIC_SUMMARY = path.join(REPO_ROOT, 'public', 'data-summary.json');
const PUBLIC_SOURCE_HEALTH_JSON = path.join(REPO_ROOT, 'public', 'source-health.json');
const PUBLIC_DATA_DIR = path.join(REPO_ROOT, 'public', 'data');
const PUBLIC_INGESTED_JSON = path.join(PUBLIC_DATA_DIR, 'ingested.json');
const PUBLIC_PET_RESEARCH_JSON = path.join(PUBLIC_DATA_DIR, 'pet-research.json');
const PUBLIC_PET_RECALLS_JSON = path.join(PUBLIC_DATA_DIR, 'pet-recalls.json');
const PUBLIC_REASONING_JSON = path.join(REPO_ROOT, 'public', 'agent-reasoning.json');
const PUBLIC_TOPIC_SUMMARY = path.join(REPO_ROOT, 'public', 'topic-summary.json');
const INGESTED_EXPORT_LIMIT = 200;
const INGESTED_PER_TYPE_LIMIT = 40;
const EXPORT_ONLY = String(process.env.INGEST_EXPORT_ONLY || '').trim() === '1';
const PET_OWNER_KEYWORDS =
  /\b(dog|dogs|canine|cat|cats|feline|pet|pets|puppy|kitten|owner|home care|triage|poison|toxin|flea|tick|vaccin|vomit|diarrhea|itch|cough|ear|dental|behavior)\b/i;
const PET_OWNER_FALLBACK_TYPES = new Set(['clinical', 'case_data', 'vet_practice', 'surveillance', 'literature', 'cancer']);
const RECALL_FALSE_POSITIVES = /\bhot dogs?\b|\bcorndogs?\b|\bcatfish\b/i;
const PET_PRODUCT_HINTS =
  /\b(pet\s*food|dog\s*food|cat\s*food|pet\s*treats?|dog\s*treats?|cat\s*treats?|kibble|pet\s*feed|animal\s*feed|pet\s*chews?|rawhide)\b/i;
const OPENFDA_FOOD_ENFORCEMENT_API = 'https://api.fda.gov/food/enforcement.json';
const OPENFDA_PET_RECALL_SEARCH =
  'product_description:("pet food" OR "dog food" OR "cat food" OR "pet treat" OR "pet treats" OR "dog treat" OR "dog treats" OR "cat treat" OR "cat treats" OR kibble OR "pet feed" OR "animal feed" OR rawhide)';
const FDA_RECALL_SEARCH_PAGE = 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts?search_api_fulltext=';
const PET_CONTEXT_TERMS = /\b(pet|pets|dog|dogs|canine|cat|cats|feline|puppy|puppies|kitten|kittens)\b/i;

function isFalsePetRecallRow(row) {
  if (!row) return false;
  const text = `${row.title || ''} ${row.condition_or_topic || ''}`.trim();
  if (!text) return false;
  if (!RECALL_FALSE_POSITIVES.test(text)) return false;
  // If it includes explicit pet product hints, keep it (rare but possible wording overlap).
  if (PET_PRODUCT_HINTS.test(text) || /\bpet\b/i.test(text)) return false;
  return true;
}

function openFdaIsoDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{8}$/.test(raw)) {
    const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00.000Z`;
    const ts = Date.parse(iso);
    return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
  }
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}

function isLikelyPetRecallText(text) {
  const t = String(text || '');
  if (!t) return false;
  if (RECALL_FALSE_POSITIVES.test(t) && !PET_PRODUCT_HINTS.test(t) && !/\bpet\b/i.test(t)) return false;
  // Require product hints or pet+food/treat/feed context (avoids packaging PET + unrelated “pets” mentions).
  if (PET_PRODUCT_HINTS.test(t)) return true;
  if (PET_CONTEXT_TERMS.test(t) && /\b(food|treat|treats|feed|kibble|chew|chews)\b/i.test(t)) return true;
  return false;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function fetchOpenFdaPetRecalls() {
  const url = `${OPENFDA_FOOD_ENFORCEMENT_API}?search=${encodeURIComponent(OPENFDA_PET_RECALL_SEARCH)}&sort=report_date:desc&limit=80`;
  const payload = await fetchJson(url);
  const results = Array.isArray(payload && payload.results) ? payload.results : [];
  const cutoffMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const rows = [];
  for (const r of results) {
    const text = `${r.product_description || ''} ${r.reason_for_recall || ''} ${r.recalling_firm || ''}`;
    if (!isLikelyPetRecallText(text)) continue;
    const publishedAt = openFdaIsoDate(r.recall_initiation_date || r.report_date);
    const ts = publishedAt ? Date.parse(publishedAt) : 0;
    if (ts && ts < cutoffMs) continue;
    const recallNumber = String(r.recall_number || '').trim();
    const titleBase = `${String(r.recalling_firm || '').trim()}: ${String(r.product_description || '').trim()}`
      .replace(/\s+/g, ' ')
      .trim();
    const status = String(r.status || '').trim();
    const title = `${status ? `[${status}] ` : ''}${titleBase || 'FDA pet recall alert'}`.slice(0, 900);
    const url = recallNumber ? `${FDA_RECALL_SEARCH_PAGE}${encodeURIComponent(recallNumber)}` : '';
    rows.push({
      data_type: 'recall',
      condition_or_topic: 'Pet-related recall',
      title,
      url,
      published_at: publishedAt,
      fetched_at: null,
    });
  }
  return rows.slice(0, 80);
}

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
  const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)(?:\/|$|\?)/i);
  return match ? match[1] : null;
}

function isPetRelevantRow(row) {
  if (!row) return false;
  if (row.data_type === 'pet_owner') return true;
  if (!PET_OWNER_FALLBACK_TYPES.has(row.data_type)) return false;
  const text = `${row.title || ''} ${row.condition_or_topic || ''}`;
  return PET_OWNER_KEYWORDS.test(text);
}

function selectPetResearchRows(rows) {
  const selected = [];
  const seen = new Set();
  for (const row of rows || []) {
    if (!isPetRelevantRow(row)) continue;
    if (!extractPubMedId(row.url)) continue;
    const key = `${row.url || ''}|${row.title || ''}|${row.condition_or_topic || ''}|${row.data_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(row);
  }
  return selected;
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
    let openFdaRecallFallback = [];
    try {
      openFdaRecallFallback = await fetchOpenFdaPetRecalls();
    } catch {
      openFdaRecallFallback = [];
    }
    const summary = {
      lastUpdated: meta.lastFetched || null,
      counts: {
        surveillance: meta.counts.surveillance || 0,
        literature: meta.counts.literature || 0,
        cancer: meta.counts.cancer || 0,
        case_data: meta.counts.case_data || 0,
        clinical: meta.counts.clinical || 0,
        pet_owner: meta.counts.pet_owner || 0,
        recall: Math.max(meta.counts.recall || 0, openFdaRecallFallback.length || 0),
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
    fs.writeFileSync(PUBLIC_SUMMARY, JSON.stringify(summary, null, 2), 'utf8');
    fs.writeFileSync(PUBLIC_SOURCE_HEALTH_JSON, JSON.stringify(sourceHealth, null, 2), 'utf8');
    // Export ingested rows for landing page "Browse data" (embed memory)
    const allRows = getIngestedSorted();
    const rows = selectDashboardRows(allRows);
    const petResearchRows = selectPetResearchRows(allRows);
    let petRecallRows = (allRows || [])
      .filter((r) => r && r.data_type === 'recall' && !isFalsePetRecallRow(r))
      .slice(0, 160);
    if (petRecallRows.length === 0 && openFdaRecallFallback.length > 0) {
      // Populate the Pet Safety Dashboard feed with openFDA results when DB recall rows are empty.
      const fetchedAt = meta.lastFetched || new Date().toISOString();
      petRecallRows = openFdaRecallFallback.map((r) => ({
        data_type: 'recall',
        condition_or_topic: r.condition_or_topic || 'Pet-related recall',
        title: r.title || 'FDA pet recall alert',
        url: r.url || '',
        published_at: r.published_at || null,
        fetched_at: fetchedAt,
        external_id: r.url || r.title || '',
      }));
    }
    if (petRecallRows.length === 0 && fs.existsSync(DATA_DIR)) {
      // Fallback: use recall snapshots from last ingest (e.g. when live APIs returned empty).
      const snapshotFiles = ['fda-pet-recalls.json', 'cfia-pet-recalls.json', 'fsa-pet-recalls.json', 'fsanz-pet-recalls.json', 'rasff-pet-feed-alerts.json'];
      const fetchedAt = meta.lastFetched || new Date().toISOString();
      for (const file of snapshotFiles) {
        const p = path.join(DATA_DIR, file);
        try {
          const data = JSON.parse(fs.readFileSync(p, 'utf8'));
          const list = (data && data.recalls) || [];
          for (const r of list) {
            if (r && !isFalsePetRecallRow(r)) {
              petRecallRows.push({
                data_type: 'recall',
                condition_or_topic: r.condition_or_topic || 'Pet-related recall',
                title: r.title || 'Pet recall alert',
                url: r.url || '',
                published_at: r.published_at || null,
                fetched_at: r.fetched_at || data.fetchedAt || fetchedAt,
                external_id: r.external_id || r.url || r.title || '',
              });
            }
          }
        } catch (_) {}
        if (petRecallRows.length >= 80) break;
      }
      petRecallRows = petRecallRows.slice(0, 160);
    }
    const missingPubMedIds = new Set();
    for (const row of [...rows, ...petResearchRows]) {
      if (row.title) continue;
      const pmid = extractPubMedId(row.url);
      if (pmid) missingPubMedIds.add(pmid);
    }
    const pubmedTitleMap = await fetchPubMedTitles(Array.from(missingPubMedIds));
    const mapRowForExport = (r) => {
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
        published_at: r.published_at || null,
        fetched_at: r.fetched_at || null,
      };
    };
    const mappedRows = rows.map(mapRowForExport);
    const mappedPetResearchRows = petResearchRows.map(mapRowForExport);
    const mappedPetRecallRows = petRecallRows.map(mapRowForExport);
    if (!fs.existsSync(DOCS_DATA_DIR)) fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });
    if (!fs.existsSync(PUBLIC_DATA_DIR)) fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
    fs.writeFileSync(DOCS_INGESTED_JSON, JSON.stringify(mappedRows), 'utf8');
    fs.writeFileSync(PUBLIC_INGESTED_JSON, JSON.stringify(mappedRows), 'utf8');
    fs.writeFileSync(DOCS_PET_RESEARCH_JSON, JSON.stringify(mappedPetResearchRows), 'utf8');
    fs.writeFileSync(PUBLIC_PET_RESEARCH_JSON, JSON.stringify(mappedPetResearchRows), 'utf8');
    fs.writeFileSync(DOCS_PET_RECALLS_JSON, JSON.stringify(mappedPetRecallRows), 'utf8');
    fs.writeFileSync(PUBLIC_PET_RECALLS_JSON, JSON.stringify(mappedPetRecallRows), 'utf8');
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

  if (!EXPORT_ONLY) {
    run('git add -f memory/animalmind.db memory/data-sources/ memory/autonomous-insights.md memory/agent-outputs/ memory/opportunities.md');
  }
  if (fs.existsSync(DOCS_SUMMARY)) run('git add docs/data-summary.json');
  if (fs.existsSync(DOCS_SOURCE_HEALTH_JSON)) run('git add docs/source-health.json');
  if (fs.existsSync(DOCS_INGESTED_JSON)) run('git add docs/data/ingested.json');
  if (fs.existsSync(DOCS_PET_RESEARCH_JSON)) run('git add docs/data/pet-research.json');
  if (fs.existsSync(DOCS_PET_RECALLS_JSON)) run('git add docs/data/pet-recalls.json');
  if (fs.existsSync(DOCS_REASONING_JSON)) run('git add docs/agent-reasoning.json');
  if (fs.existsSync(DOCS_TOPIC_SUMMARY)) run('git add docs/topic-summary.json');
  if (fs.existsSync(PUBLIC_SUMMARY)) run('git add public/data-summary.json');
  if (fs.existsSync(PUBLIC_SOURCE_HEALTH_JSON)) run('git add public/source-health.json');
  if (fs.existsSync(PUBLIC_INGESTED_JSON)) run('git add public/data/ingested.json');
  if (fs.existsSync(PUBLIC_PET_RESEARCH_JSON)) run('git add public/data/pet-research.json');
  if (fs.existsSync(PUBLIC_PET_RECALLS_JSON)) run('git add public/data/pet-recalls.json');
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
  run('git commit -m "' + (EXPORT_ONLY ? 'Export: ' : 'Ingest: ') + when + '"');
  const pushBranch = resolvePushBranch();
  run('git push origin ' + pushBranch);
  console.log('Pushed ingest to GitHub.');
}

main().catch((err) => {
  console.error('push-ingest-to-github failed:', err.message);
  process.exit(1);
});
