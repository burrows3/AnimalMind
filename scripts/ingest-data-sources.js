#!/usr/bin/env node
/**
 * VM job: fetch from data sources and ingest into DB (sorted by data_type and condition).
 * Also writes JSON snapshots to memory/data-sources/.
 *
 * Data sources:
 * 1. PubMed – literature (one health), cancer, case_data, clinical (vet practice, small animal, equine), pet_owner
 * 2. CDC Travel Notices (RSS) – surveillance
 * 3. Animal-health recall sources (FDA, CFIA, FSA, FSANZ, RASFF reference)
 * 4. Curated datasets (JSON) – cancer, imaging, vet_practice (guidelines, AVMA, AAHA, etc.)
 * 5. TCIA (Cancer Imaging Archive) – imaging collections (canine/veterinary when available)
 * 6. Autonomous-agent topics – PubMed queries for frontier topics (animal communication, sentience, welfare, etc.)
 */

/** Autonomous-agent topics: Clinical-Adjacent + Research & Discovery. Each run finds literature (PubMed) for these. */
const { AUTONOMOUS_AGENT_TOPICS } = require('../lib/agentTopics');

const fs = require('fs');
const path = require('path');
const https = require('https');
const { upsertIngested, deleteIngestedBySource } = require('../lib/db');
const { runSourceTask, writeSourceHealthSnapshot } = require('../lib/ingestFetch');
const { getSourceMeta } = require('../lib/sourceCatalog');

const MEMORY_DIR = path.join(__dirname, '..', 'memory', 'data-sources');
const SOURCE_HEALTH_PATH = path.join(__dirname, '..', 'memory', 'source-health.json');

// Ensure output dir exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

function writeJson(filename, data) {
  const filepath = path.join(MEMORY_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Wrote', filepath);
}

function defaultPubMedResult(query) {
  return {
    fetchedAt: new Date().toISOString(),
    source: 'PubMed',
    query,
    count: 0,
    idlist: [],
  };
}

function defaultRssResult(source, url) {
  return {
    fetchedAt: new Date().toISOString(),
    source,
    url,
    items: [],
  };
}

function defaultRecallSourceResult(source, urls = []) {
  return {
    fetchedAt: new Date().toISOString(),
    source,
    urls,
    recalls: [],
  };
}

/** Extract condition/topic from CDC notice title (e.g. "Level 2 - Monkeypox in Ghana" -> "Monkeypox"). */
function conditionFromCdcTitle(title) {
  if (!title || typeof title !== 'string') return 'Other';
  const afterLevel = title.replace(/^Level \d+\s*-\s*/i, '').trim();
  const match = afterLevel.match(/^(.+?)\s+in\s+/i);
  return (match ? match[1].trim() : afterLevel) || 'Other';
}

const PET_OWNER_RESOURCES = [
  {
    condition_or_topic: 'Household zoonotic safety',
    title: 'CDC Healthy Pets, Healthy People',
    url: 'https://www.cdc.gov/healthypets/',
  },
  {
    condition_or_topic: 'Poisoning and emergencies',
    title: 'ASPCA Animal Poison Control',
    url: 'https://www.aspca.org/pet-care/animal-poison-control',
  },
  {
    condition_or_topic: 'Preventive care',
    title: 'AAHA Pet Owner Education',
    url: 'https://www.aaha.org/',
  },
  {
    condition_or_topic: 'Small-animal guidance',
    title: 'WSAVA Global Guidelines',
    url: 'https://wsava.org/global-guidelines/',
  },
  {
    condition_or_topic: 'Symptoms and home guidance',
    title: 'Merck Veterinary Manual',
    url: 'https://www.merckvetmanual.com/',
  },
  {
    condition_or_topic: 'When to see a vet',
    title: 'AVMA Pet Owner Resources',
    url: 'https://www.avma.org/resources/pet-owners',
  },
];

// --- 1. PubMed (E-utilities) ---
function buildPubMedUrl(term, retmax = 15) {
  const q = encodeURIComponent(term);
  return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${q}&retmax=${retmax}&sort=date&retmode=json`;
}

function buildPubMedSummaryUrl(ids) {
  const q = encodeURIComponent(ids.join(','));
  return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${q}&retmode=json`;
}

const ANIMAL_DOMAIN_FILTER =
  '(Animals[MeSH Terms] OR "Veterinary Medicine"[MeSH Terms] OR "Animal Diseases"[MeSH Terms] OR animal[Title/Abstract] OR veterinary[Title/Abstract] OR "animal health"[Title/Abstract] OR "one health"[Title/Abstract])';

function buildTopicQuery(baseQuery) {
  return `(${baseQuery}) AND ${ANIMAL_DOMAIN_FILTER}`;
}

function buildBroadenedTopicQuery(baseQuery) {
  return `(${baseQuery}) OR ${ANIMAL_DOMAIN_FILTER}`;
}

function fetchPubMedQuery(term, retmax = 15) {
  return new Promise((resolve, reject) => {
    https
      .get(buildPubMedUrl(term, retmax), (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({
              fetchedAt: new Date().toISOString(),
              source: 'PubMed',
              query: term,
              count: data.esearchresult?.count ?? 0,
              idlist: data.esearchresult?.idlist ?? [],
            });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
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

async function fetchPubMedSummaries(ids) {
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

async function fetchPubMedTopicWithFallback(topicItem, retmax = 8, globalFallback) {
  const baseQuery = topicItem.query;
  const primaryQuery = buildTopicQuery(baseQuery);
  let result = await fetchPubMedQuery(primaryQuery, retmax);
  if ((result.idlist || []).length > 0) {
    return { ...result, topic: topicItem.topic, baseQuery, query: primaryQuery, fallback: null };
  }

  const broadenedQuery = buildBroadenedTopicQuery(baseQuery);
  result = await fetchPubMedQuery(broadenedQuery, retmax);
  if ((result.idlist || []).length > 0) {
    return { ...result, topic: topicItem.topic, baseQuery, query: broadenedQuery, fallback: 'broadened' };
  }

  const domainOnlyQuery = ANIMAL_DOMAIN_FILTER;
  result = await fetchPubMedQuery(domainOnlyQuery, retmax);
  if ((result.idlist || []).length > 0) {
    return { ...result, topic: topicItem.topic, baseQuery, query: domainOnlyQuery, fallback: 'domain-only' };
  }

  const fallbackIdlist = (globalFallback && globalFallback.idlist) || [];
  if (fallbackIdlist.length > 0) {
    const fallbackQuery = globalFallback.query || 'one health animal';
    return {
      fetchedAt: new Date().toISOString(),
      source: 'PubMed',
      query: fallbackQuery,
      count: String(fallbackIdlist.length),
      idlist: fallbackIdlist.slice(0, retmax),
      topic: topicItem.topic,
      baseQuery,
      fallback: 'global-fallback',
    };
  }

  return { ...result, topic: topicItem.topic, baseQuery, query: domainOnlyQuery, fallback: 'domain-only' };
}

function fetchPubMed() {
  return fetchPubMedQuery('one health animal', 15);
}

// --- 2. CDC Travel Notices (RSS) — parse with simple regex to avoid extra deps ---
const CDC_RSS_URL = 'https://wwwnc.cdc.gov/travel/rss/notices.xml';

function fetchRss(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: 'GET' };
    https
      .get(opts, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
}

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleM = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const linkM = block.match(/<link>(.*?)<\/link>/i);
    const dateM = block.match(/<pubDate>(.*?)<\/pubDate>/i);
    items.push({
      title: (titleM && titleM[1].trim()) || '',
      link: (linkM && linkM[1].trim()) || '',
      pubDate: (dateM && dateM[1].trim().replace(/"$/, '')) || '',
    });
  }
  return items;
}

async function fetchCdcTravelNotices() {
  const xml = await fetchRss(CDC_RSS_URL);
  const items = parseRssItems(xml);
  return {
    fetchedAt: new Date().toISOString(),
    source: 'CDC Travel Notices RSS',
    url: CDC_RSS_URL,
    items,
  };
}

// --- 2b. ECDC Avian influenza RSS (surveillance) ---
const ECDC_AVIAN_FLU_RSS = 'https://www.ecdc.europa.eu/en/taxonomy/term/323//feed';

async function fetchEcdcAvianFlu() {
  const xml = await fetchRss(ECDC_AVIAN_FLU_RSS);
  const items = parseRssItems(xml);
  return {
    fetchedAt: new Date().toISOString(),
    source: 'ECDC Avian influenza RSS',
    url: ECDC_AVIAN_FLU_RSS,
    items: items.slice(0, 20),
  };
}

// --- 2c. Animal-health pet recall monitors (strict companion-animal filter) ---
const HTTP_DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; AnimalMindBot/1.0; +https://animalmind.co)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

const FDA_ANIMAL_RECALLS_PAGE = 'https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals';
const FDA_RECALLS_RSS_PAGE = 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls-market-withdrawals-safety-alerts';
const OPENFDA_FOOD_ENFORCEMENT_API = 'https://api.fda.gov/food/enforcement.json';
const FDA_RECALL_SEARCH_PAGE = 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts?search_api_fulltext=';
const FDA_RECALLS_RSS_FEED = 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/rss.xml';
const OPENFDA_PET_RECALL_SEARCH =
  'product_description:("pet food" OR "dog food" OR "cat food" OR "pet treat" OR "pet treats" OR "dog treat" OR "dog treats" OR "cat treat" OR "cat treats" OR kibble OR "pet feed" OR "animal feed" OR rawhide)';

const CFIA_RECALL_PAGE = 'https://inspection.canada.ca/food-recalls-and-safety-alerts';
const CFIA_RECALL_RSS = 'https://recalls-rappels.canada.ca/en/feed/cfia-alerts-recalls';

const FSA_ALERTS_PAGE = 'https://www.food.gov.uk/news-alerts/alerts';
const FSA_ALERTS_RSS = 'https://www.food.gov.uk/news-alerts/alerts/rss';
const FSA_ALERTS_FALLBACK_PAGE = 'https://www.food.gov.uk/news-alerts';
const FSA_ALERTS_FALLBACK_RSS = 'https://www.food.gov.uk/rss.xml';

const FSANZ_RECALLS_PAGE = 'https://www.foodstandards.gov.au/industry/foodrecalls/recalls';
const FSANZ_RECALLS_FALLBACK_PAGE = 'https://www.foodstandards.gov.au/food-recalls/recall-alert';

const RASFF_PORTAL = 'https://webgate.ec.europa.eu/rasff-window/screen/search';
const RASFF_INFO_PAGE = 'https://food.ec.europa.eu/safety/rasff_en';

// Companion-animal recall filters: strict enough to avoid human-food false positives like "hot dogs".
// Prefer product/category signals (pet food, treats, feed) or explicit pet context (pet, companion, cat, canine/feline).
const PET_CONTEXT_TERMS = /\b(pet|pets|companion|canine|feline|puppy|puppies|kitten|kittens|cat|cats)\b/i;
const PET_PRODUCT_TERMS =
  /\b(pet\s*food|dog\s*food|cat\s*food|pet\s*treats?|dog\s*treats?|cat\s*treats?|kibble|pet\s*feed|animal\s*feed|pet\s*chews?|rawhide)\b/i;
const RECALL_SIGNAL_TERMS = /\b(recall|withdraw|alert|contamin|salmonella|listeria|safety)\b/i;
const LIVESTOCK_TERMS = /\b(cattle|bovine|livestock|swine|pig|poultry|broiler|turkey|hen|goat|sheep|equine|horse|foal)\b/i;
const DOG_RECALL_TERMS = /\b(dog|dogs|canine|puppy|puppies)\b/i;
const CAT_RECALL_TERMS = /\b(cat|cats|feline|kitten|kittens)\b/i;
const HUMAN_FOOD_FALSE_POSITIVES = /\bhot dogs?\b|\bcorndogs?\b|\bcatfish\b/i;

function toIsoDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  // openFDA dates are often YYYYMMDD (e.g., 20240710)
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    const iso = `${y}-${m}-${d}T00:00:00.000Z`;
    const ts = Date.parse(iso);
    return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
  }
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return Math.abs(hash).toString(36);
}

function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function normalizeText(text) {
  return decodeHtmlEntities(String(text || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toAbsoluteUrl(baseUrl, href) {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return '';
  }
}

function extractAnchorItems(html, baseUrl) {
  const out = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const href = toAbsoluteUrl(baseUrl, match[1]);
    const text = normalizeText(match[2]);
    if (!href || !text) continue;
    out.push({ href, text });
  }
  return out;
}

function isPetAnimalRecall(text, { requireRecallSignal = false } = {}) {
  const t = normalizeText(text);
  if (!t) return false;
  // Exclude obvious human-food items that accidentally match animal terms (e.g., "hot dogs", "catfish").
  if (HUMAN_FOOD_FALSE_POSITIVES.test(t) && !PET_PRODUCT_TERMS.test(t) && !/\bpet\b/i.test(t)) return false;
  const hasPetContext = PET_CONTEXT_TERMS.test(t);
  const hasPetProduct = PET_PRODUCT_TERMS.test(t);
  if (!hasPetContext && !hasPetProduct) return false;
  if (requireRecallSignal && !RECALL_SIGNAL_TERMS.test(t)) return false;
  // If it looks livestock-focused and lacks pet food/product signals, exclude.
  if (LIVESTOCK_TERMS.test(t) && !hasPetProduct && !/\bpet\b/i.test(t)) return false;
  return true;
}

function classifyRecallCondition(text) {
  const t = normalizeText(text);
  const hasDog = DOG_RECALL_TERMS.test(t) && !/\bhot dogs?\b/i.test(t) && !/\bcorndogs?\b/i.test(t);
  const hasCat = CAT_RECALL_TERMS.test(t) && !/\bcatfish\b/i.test(t);
  if (hasDog && hasCat) return 'Dog and cat recall';
  if (hasDog) return 'Dog-related recall';
  if (hasCat) return 'Cat-related recall';
  return 'Pet-related recall';
}

function makeRecallRow(sourceId, title, url, publishedAt, context = '') {
  const cleanTitle = normalizeText(title).slice(0, 800);
  const cleanUrl = String(url || '').trim();
  const text = `${cleanTitle} ${context}`;
  const idSeed = `${sourceId}|${cleanUrl}|${cleanTitle}`;
  return {
    data_type: 'recall',
    source: sourceId,
    condition_or_topic: classifyRecallCondition(text),
    title: cleanTitle || 'Pet recall alert',
    url: cleanUrl,
    external_id: `${sourceId}-${hashText(idSeed)}`,
    published_at: toIsoDate(publishedAt),
  };
}

function dedupeRecallRows(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows || []) {
    if (!row || !row.external_id) continue;
    if (seen.has(row.external_id)) continue;
    seen.add(row.external_id);
    out.push(row);
  }
  return out;
}

function fetchHttpText(url, headers = HTTP_DEFAULT_HEADERS, maxRedirects = 4) {
  return new Promise((resolve, reject) => {
    const run = (targetUrl, redirectsLeft) => {
      const u = new URL(targetUrl);
      https
        .get(
          {
            hostname: u.hostname,
            path: u.pathname + u.search,
            headers,
          },
          (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
              if (redirectsLeft <= 0) {
                reject(new Error(`Too many redirects for ${url}`));
                return;
              }
              const nextUrl = new URL(res.headers.location, targetUrl).toString();
              run(nextUrl, redirectsLeft - 1);
              return;
            }
            if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) {
              reject(new Error(`Request failed (${res.statusCode}) for ${targetUrl}`));
              return;
            }
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve(body));
          }
        )
        .on('error', reject);
    };
    run(url, maxRedirects);
  });
}

function fetchHttpJson(url, headers = HTTP_DEFAULT_HEADERS, maxRedirects = 2) {
  return fetchHttpText(url, { ...headers, Accept: 'application/json,text/plain,*/*' }, maxRedirects).then((body) => {
    return JSON.parse(body);
  });
}

function isPetRecallRecordText(text) {
  const t = normalizeText(text);
  if (!t) return false;
  // Require stronger product signals to avoid unrelated items that mention pets in passing.
  if (PET_PRODUCT_TERMS.test(t)) return true;
  if (/\bpet\b/i.test(t) && /\b(food|treat|treats|feed|kibble|chew|chews)\b/i.test(t)) return true;
  if ((DOG_RECALL_TERMS.test(t) || CAT_RECALL_TERMS.test(t)) && /\b(food|treat|treats|feed|kibble|chew|chews)\b/i.test(t)) return true;
  return false;
}

function openFdaToRecallRow(record) {
  const desc = normalizeText(record && record.product_description ? record.product_description : '').slice(0, 900);
  const firm = normalizeText(record && record.recalling_firm ? record.recalling_firm : '').slice(0, 160);
  const recallNumber = normalizeText(record && record.recall_number ? record.recall_number : '').slice(0, 80);
  const status = normalizeText(record && record.status ? record.status : '').slice(0, 40);
  const reportIso = toIsoDate(record && (record.recall_initiation_date || record.report_date) ? (record.recall_initiation_date || record.report_date) : null);
  const titleBase = [firm, desc].filter(Boolean).join(': ').trim();
  const title = `${status ? `[${status}] ` : ''}${titleBase || 'FDA pet recall alert'}`.slice(0, 900);
  const url = recallNumber ? `${FDA_RECALL_SEARCH_PAGE}${encodeURIComponent(recallNumber)}` : FDA_ANIMAL_RECALLS_PAGE;
  const text = `${title} ${desc}`;
  return {
    data_type: 'recall',
    source: 'fda_pet_recalls',
    condition_or_topic: classifyRecallCondition(text),
    title,
    url,
    external_id: recallNumber ? `fda_pet_recalls-${recallNumber}` : `fda_pet_recalls-${hashText(titleBase || desc)}`,
    published_at: reportIso,
  };
}

async function fetchFdaPetRecalls() {
  // Prefer the official FDA recalls RSS feed (contains stable per-recall URLs).
  // If blocked/unavailable, fall back to openFDA food enforcement API.
  const feedUrls = [FDA_RECALLS_RSS_FEED];
  for (const feedUrl of feedUrls) {
    try {
      const xml = await fetchHttpText(feedUrl, {
        ...HTTP_DEFAULT_HEADERS,
        Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
      });
      if (!xml || !/<rss/i.test(xml)) continue;
      const items = parseRssItems(xml);
      const rowsFromRss = items
        .filter((item) => isPetAnimalRecall(`${item.title || ''} ${item.description || ''}`, { requireRecallSignal: true }))
        .map((item) => makeRecallRow('fda_pet_recalls', item.title, item.link, item.pubDate, 'FDA recall'));
      const deduped = dedupeRecallRows(rowsFromRss).slice(0, 80);
      return {
        fetchedAt: new Date().toISOString(),
        source: 'FDA Animal & Veterinary recalls',
        urls: [FDA_ANIMAL_RECALLS_PAGE, feedUrl],
        recalls: deduped,
      };
    } catch {
      // try next feed or fall back
    }
  }

  // Fallback: openFDA food enforcement API (durable, but per-recall URLs are indirect search links).
  const payload = await fetchHttpJson(
    `${OPENFDA_FOOD_ENFORCEMENT_API}?search=${encodeURIComponent(OPENFDA_PET_RECALL_SEARCH)}&sort=report_date:desc&limit=80`,
    {
    ...HTTP_DEFAULT_HEADERS,
    Accept: 'application/json',
    }
  );
  const results = Array.isArray(payload && payload.results) ? payload.results : [];
  const cutoffMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const rows = results
    .filter((r) => {
      const text = `${r.product_description || ''} ${r.reason_for_recall || ''} ${r.recalling_firm || ''}`;
      if (!isPetAnimalRecall(text, { requireRecallSignal: false })) return false;
      if (!isPetRecallRecordText(text)) return false;
      const iso = toIsoDate(r.recall_initiation_date || r.report_date);
      const ts = iso ? Date.parse(iso) : 0;
      if (ts && ts < cutoffMs) return false;
      return true;
    })
    .map((r) => openFdaToRecallRow(r));
  return {
    fetchedAt: new Date().toISOString(),
    source: 'FDA Animal & Veterinary recalls',
    urls: [FDA_ANIMAL_RECALLS_PAGE, FDA_RECALLS_RSS_PAGE, FDA_RECALLS_RSS_FEED, OPENFDA_FOOD_ENFORCEMENT_API],
    recalls: dedupeRecallRows(rows).slice(0, 80),
  };
}

async function fetchCfiaPetRecalls() {
  const xml = await fetchHttpText(CFIA_RECALL_RSS, {
    ...HTTP_DEFAULT_HEADERS,
    Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
  });
  const items = parseRssItems(xml);
  const rows = items
    .filter((item) => isPetAnimalRecall(item.title))
    .map((item) => makeRecallRow('cfia_pet_recalls', item.title, item.link, item.pubDate, 'CFIA recall'));
  return {
    fetchedAt: new Date().toISOString(),
    source: 'CFIA pet-related recalls',
    urls: [CFIA_RECALL_PAGE, CFIA_RECALL_RSS],
    recalls: dedupeRecallRows(rows).slice(0, 80),
  };
}

async function fetchFsaPetRecalls() {
  let xml = '';
  try {
    xml = await fetchHttpText(FSA_ALERTS_RSS, {
      ...HTTP_DEFAULT_HEADERS,
      Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
    });
  } catch {
    xml = '';
  }
  if (!xml || !/<rss/i.test(xml)) {
    xml = await fetchHttpText(FSA_ALERTS_FALLBACK_RSS, {
      ...HTTP_DEFAULT_HEADERS,
      Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
    });
  }
  const items = parseRssItems(xml);
  const rows = items
    .filter((item) => String(item.link || '').includes('/news-alerts/'))
    .filter((item) => isPetAnimalRecall(item.title, { requireRecallSignal: true }))
    .map((item) => makeRecallRow('fsa_pet_recalls', item.title, item.link, item.pubDate, 'UK FSA alert'));
  return {
    fetchedAt: new Date().toISOString(),
    source: 'FSA pet-related alerts',
    urls: [FSA_ALERTS_PAGE, FSA_ALERTS_RSS],
    recalls: dedupeRecallRows(rows).slice(0, 80),
  };
}

async function fetchFsanzPetRecalls() {
  let html = '';
  try {
    html = await fetchHttpText(FSANZ_RECALLS_PAGE);
  } catch {
    html = await fetchHttpText(FSANZ_RECALLS_FALLBACK_PAGE);
  }
  const anchors = extractAnchorItems(html, FSANZ_RECALLS_FALLBACK_PAGE);
  const rows = anchors
    .filter((item) => item.href.includes('/food-recalls/recall-alert/'))
    .filter((item) => isPetAnimalRecall(item.text))
    .map((item) => makeRecallRow('fsanz_pet_recalls', item.text, item.href, null, 'FSANZ recall'));
  return {
    fetchedAt: new Date().toISOString(),
    source: 'FSANZ pet-related recalls',
    urls: [FSANZ_RECALLS_PAGE],
    recalls: dedupeRecallRows(rows).slice(0, 80),
  };
}

async function fetchRasffPetFeedAlerts() {
  // RASFF search is dynamic; keep a live source-health check and add rows only when direct feed is available.
  await Promise.all([
    fetchHttpText(RASFF_INFO_PAGE).catch(() => ''),
    fetchHttpText(RASFF_PORTAL).catch(() => ''),
  ]);
  return {
    fetchedAt: new Date().toISOString(),
    source: 'EU RASFF feed/pet alerts',
    urls: [RASFF_PORTAL, RASFF_INFO_PAGE],
    recalls: [],
  };
}

// --- 3. Curated datasets (cancer, imaging) ---
function loadCuratedDatasets() {
  const p = path.join(MEMORY_DIR, 'curated-datasets.json');
  if (!fs.existsSync(p)) {
    return {
      source: 'curated',
      items: [],
      fetchedAt: new Date().toISOString(),
      found: false,
      filePath: p,
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      source: 'curated',
      items: raw.items || [],
      fetchedAt: new Date().toISOString(),
      found: true,
      filePath: p,
    };
  } catch {
    return {
      source: 'curated',
      items: [],
      fetchedAt: new Date().toISOString(),
      found: false,
      filePath: p,
    };
  }
}

// --- 4. TCIA (Cancer Imaging Archive) – imaging collections (canine/veterinary) ---
const TCIA_COLLECTIONS_URL = 'https://www.cancerimagingarchive.net/api/v1/collections/';

function fetchTciaCollections() {
  return new Promise((resolve, reject) => {
    https
      .get(TCIA_COLLECTIONS_URL, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const list = JSON.parse(body);
            const veterinary = (Array.isArray(list) ? list : []).filter((c) => {
              const species = (c.species || []).map((s) => String(s).toLowerCase());
              const title = ((c.title && c.title.rendered) || c.collection_short_title || '').toLowerCase();
              const slug = (c.slug || '').toLowerCase();
              return (
                species.some((s) => s.includes('canine') || s.includes('dog') || s.includes('veterinary')) ||
                title.includes('canine') ||
                title.includes('catch') ||
                slug.includes('canine') ||
                slug.includes('catch')
              );
            });
            resolve({
              fetchedAt: new Date().toISOString(),
              source: 'TCIA',
              total: list.length,
              veterinary: veterinary.slice(0, 30),
            });
          } catch (e) {
            resolve({ fetchedAt: new Date().toISOString(), source: 'TCIA', total: 0, veterinary: [] });
          }
        });
      })
      .on('error', () => resolve({ fetchedAt: new Date().toISOString(), source: 'TCIA', total: 0, veterinary: [] }));
  });
}

// --- Ingest into DB (sorted by data_type, condition_or_topic) ---
function resolvePubMedTitle(pmid, titleMap) {
  if (!pmid || !titleMap) return null;
  return titleMap[String(pmid)] || null;
}

function ingestIntoDb(
  pubmed,
  cdc,
  ecdc,
  fdaPetRecalls,
  cfiaPetRecalls,
  fsaPetRecalls,
  fsanzPetRecalls,
  rasffPetFeedAlerts,
  pubmedCancer,
  pubmedCaseReports,
  pubmedClinical,
  pubmedSmallAnimal,
  pubmedEquine,
  pubmedPetOwner,
  curated,
  tcia,
  topicResults,
  pubmedTitles
) {
  const fetchedAt = new Date().toISOString();

  // Literature: PubMed (one health animal)
  for (const pmid of (pubmed && pubmed.idlist) || []) {
    upsertIngested({
      data_type: 'literature',
      source: 'pubmed',
      condition_or_topic: 'one health animal',
      title: resolvePubMedTitle(pmid, pubmedTitles),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      external_id: pmid,
      published_at: null,
      fetched_at: fetchedAt,
    });
  }

  // Literature: autonomous-agent topics (frontier topics – each run finds data for these)
  const topicList = Array.isArray(topicResults) ? topicResults : [];
  for (const result of topicList) {
    const topic = result.topic || 'Frontier topic';
    const slug = topic.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 30);
    for (const pmid of (result.idlist || [])) {
      upsertIngested({
        data_type: 'literature',
        source: 'pubmed',
        condition_or_topic: topic,
        title: resolvePubMedTitle(pmid, pubmedTitles),
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        external_id: `topic-${slug}-${pmid}`,
        published_at: null,
        fetched_at: fetchedAt,
      });
    }
  }

  // Surveillance: CDC Travel Notices
  for (const item of (cdc && cdc.items) || []) {
    const condition = conditionFromCdcTitle(item.title);
    upsertIngested({
      data_type: 'surveillance',
      source: 'cdc_travel_notices',
      condition_or_topic: condition,
      title: item.title,
      url: item.link,
      external_id: item.link,
      published_at: item.pubDate || null,
      fetched_at: fetchedAt,
    });
  }
  // Surveillance: ECDC Avian influenza
  for (const item of (ecdc && ecdc.items) || []) {
    const link = item.link || '';
    if (!link) continue;
    upsertIngested({
      data_type: 'surveillance',
      source: 'ecdc_avian_flu',
      condition_or_topic: 'Avian influenza',
      title: (item.title || '').trim() || 'ECDC update',
      url: link,
      external_id: link,
      published_at: item.pubDate || null,
      fetched_at: fetchedAt,
    });
  }

  // Regulatory: pet-focused recalls/alerts (strict companion-animal filter)
  const recallSources = [
    fdaPetRecalls,
    cfiaPetRecalls,
    fsaPetRecalls,
    fsanzPetRecalls,
    rasffPetFeedAlerts,
  ];
  const recallSourceIds = ['fda_pet_recalls', 'cfia_pet_recalls', 'fsa_pet_recalls', 'fsanz_pet_recalls', 'rasff_pet_feed_alerts'];
  for (const sourceId of recallSourceIds) {
    deleteIngestedBySource(sourceId);
  }
  for (const payload of recallSources) {
    for (const row of (payload && payload.recalls) || []) {
      upsertIngested({
        data_type: 'recall',
        source: row.source || 'fda_pet_recalls',
        condition_or_topic: row.condition_or_topic || 'Pet-related recall',
        title: row.title || 'Pet recall alert',
        url: row.url || '',
        external_id: row.external_id,
        published_at: row.published_at || null,
        fetched_at: fetchedAt,
      });
    }
  }

  // Cancer: PubMed (animal cancer / veterinary oncology)
  for (const pmid of (pubmedCancer && pubmedCancer.idlist) || []) {
    upsertIngested({
      data_type: 'cancer',
      source: 'pubmed',
      condition_or_topic: 'animal cancer',
      title: resolvePubMedTitle(pmid, pubmedTitles),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      external_id: `cancer-${pmid}`,
      published_at: null,
      fetched_at: fetchedAt,
    });
  }

  // Case data: PubMed (veterinary case reports)
  for (const pmid of (pubmedCaseReports && pubmedCaseReports.idlist) || []) {
    upsertIngested({
      data_type: 'case_data',
      source: 'pubmed',
      condition_or_topic: 'case report',
      title: resolvePubMedTitle(pmid, pubmedTitles),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      external_id: `case-${pmid}`,
      published_at: null,
      fetched_at: fetchedAt,
    });
  }

  // Clinical: PubMed (veterinary medicine – practice, small animal, equine)
  for (const { idlist, query, condition } of [
    { idlist: (pubmedClinical && pubmedClinical.idlist) || [], query: 'clinical', condition: 'clinical practice' },
    { idlist: (pubmedSmallAnimal && pubmedSmallAnimal.idlist) || [], query: 'small animal', condition: 'small animal' },
    { idlist: (pubmedEquine && pubmedEquine.idlist) || [], query: 'equine', condition: 'equine' },
  ]) {
    for (const pmid of idlist) {
      upsertIngested({
        data_type: 'clinical',
        source: 'pubmed',
        condition_or_topic: condition,
        title: resolvePubMedTitle(pmid, pubmedTitles),
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        external_id: `clinical-${pmid}`,
        published_at: null,
        fetched_at: fetchedAt,
      });
    }
  }

  // Pet owner brief: PubMed (consumer-facing companion-animal guidance terms)
  for (const pmid of (pubmedPetOwner && pubmedPetOwner.idlist) || []) {
    upsertIngested({
      data_type: 'pet_owner',
      source: 'pubmed_pet_owner',
      condition_or_topic: 'Pet owner guidance',
      title: resolvePubMedTitle(pmid, pubmedTitles),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      external_id: `pet-owner-${pmid}`,
      published_at: null,
      fetched_at: fetchedAt,
    });
  }

  // Pet owner brief: curated consumer-safe resources
  deleteIngestedBySource('pet_owner_resource');
  for (const item of PET_OWNER_RESOURCES) {
    upsertIngested({
      data_type: 'pet_owner',
      source: 'pet_owner_resource',
      condition_or_topic: item.condition_or_topic || 'Pet owner guidance',
      title: item.title,
      url: item.url,
      external_id: item.url,
      published_at: null,
      fetched_at: fetchedAt,
    });
  }

  // Curated: cancer, imaging, vet_practice (guidelines, resources)
  deleteIngestedBySource('curated');
  for (const item of (curated && curated.items) || []) {
    upsertIngested({
      data_type: item.data_type || 'imaging',
      source: 'curated',
      condition_or_topic: item.condition_or_topic || 'Dataset',
      title: item.title,
      url: item.url,
      external_id: item.url,
      published_at: null,
      fetched_at: fetchedAt,
    });
  }

  // Imaging: TCIA (veterinary/canine collections)
  for (const c of (tcia && tcia.veterinary) || []) {
    const title = (c.title && c.title.rendered) || c.collection_short_title || c.slug || 'TCIA collection';
    const link = c.link || `https://www.cancerimagingarchive.net/collection/${c.slug || c.id}/`;
    upsertIngested({
      data_type: 'imaging',
      source: 'tcia',
      condition_or_topic: (c.cancer_types && c.cancer_types[0]) || 'Cancer imaging',
      title,
      url: link,
      external_id: link,
      published_at: c.modified || null,
      fetched_at: fetchedAt,
    });
  }
}

// --- Run ---
async function main() {
  console.log('Ingesting data sources...');
  try {
    const sourceHealthEntries = [];
    const runResilientSource = async ({ sourceId, snapshotFile, fetcher, fallbackData, requiredForCoverage }) => {
      const { data, health } = await runSourceTask({
        sourceId,
        snapshotPath: path.join(MEMORY_DIR, snapshotFile),
        fetcher,
        fallbackData,
        requiredForCoverage,
      });
      sourceHealthEntries.push(health);
      return data;
    };

    const [
      pubmed,
      cdc,
      ecdc,
      fdaPetRecalls,
      cfiaPetRecalls,
      fsaPetRecalls,
      fsanzPetRecalls,
      rasffPetFeedAlerts,
      pubmedCancer,
      pubmedCaseReports,
      pubmedClinical,
      pubmedSmallAnimal,
      pubmedEquine,
      pubmedPetOwner,
      tcia,
    ] = await Promise.all([
      runResilientSource({
        sourceId: 'pubmed_recent',
        snapshotFile: 'pubmed-recent.json',
        fetcher: () => fetchPubMed(),
        fallbackData: defaultPubMedResult('one health animal'),
        requiredForCoverage: true,
      }),
      runResilientSource({
        sourceId: 'cdc_travel_notices',
        snapshotFile: 'cdc-travel-notices.json',
        fetcher: () => fetchCdcTravelNotices(),
        fallbackData: defaultRssResult('CDC Travel Notices RSS', CDC_RSS_URL),
        requiredForCoverage: true,
      }),
      runResilientSource({
        sourceId: 'ecdc_avian_flu',
        snapshotFile: 'ecdc-avian-flu.json',
        fetcher: () => fetchEcdcAvianFlu(),
        fallbackData: defaultRssResult('ECDC Avian influenza RSS', ECDC_AVIAN_FLU_RSS),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'fda_pet_recalls',
        snapshotFile: 'fda-pet-recalls.json',
        fetcher: () => fetchFdaPetRecalls(),
        fallbackData: defaultRecallSourceResult('FDA Animal & Veterinary recalls', [
          FDA_ANIMAL_RECALLS_PAGE,
          FDA_RECALLS_RSS_PAGE,
        ]),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'cfia_pet_recalls',
        snapshotFile: 'cfia-pet-recalls.json',
        fetcher: () => fetchCfiaPetRecalls(),
        fallbackData: defaultRecallSourceResult('CFIA pet-related recalls', [CFIA_RECALL_PAGE, CFIA_RECALL_RSS]),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'fsa_pet_recalls',
        snapshotFile: 'fsa-pet-recalls.json',
        fetcher: () => fetchFsaPetRecalls(),
        fallbackData: defaultRecallSourceResult('FSA pet-related alerts', [FSA_ALERTS_PAGE, FSA_ALERTS_RSS]),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'fsanz_pet_recalls',
        snapshotFile: 'fsanz-pet-recalls.json',
        fetcher: () => fetchFsanzPetRecalls(),
        fallbackData: defaultRecallSourceResult('FSANZ pet-related recalls', [FSANZ_RECALLS_PAGE]),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'rasff_pet_feed_alerts',
        snapshotFile: 'rasff-pet-feed-alerts.json',
        fetcher: () => fetchRasffPetFeedAlerts(),
        fallbackData: defaultRecallSourceResult('RASFF pet feed alerts', [RASFF_PORTAL, RASFF_INFO_PAGE]),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'pubmed_cancer',
        snapshotFile: 'pubmed-cancer.json',
        fetcher: () => fetchPubMedQuery('animal cancer veterinary oncology', 15),
        fallbackData: defaultPubMedResult('animal cancer veterinary oncology'),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'pubmed_case_reports',
        snapshotFile: 'pubmed-case-reports.json',
        fetcher: () => fetchPubMedQuery('veterinary case reports', 15),
        fallbackData: defaultPubMedResult('veterinary case reports'),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'pubmed_clinical',
        snapshotFile: 'pubmed-clinical.json',
        fetcher: () => fetchPubMedQuery('veterinary clinical practice', 12),
        fallbackData: defaultPubMedResult('veterinary clinical practice'),
        requiredForCoverage: true,
      }),
      runResilientSource({
        sourceId: 'pubmed_small_animal',
        snapshotFile: 'pubmed-small-animal.json',
        fetcher: () => fetchPubMedQuery('small animal veterinary medicine', 12),
        fallbackData: defaultPubMedResult('small animal veterinary medicine'),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'pubmed_equine',
        snapshotFile: 'pubmed-equine.json',
        fetcher: () => fetchPubMedQuery('equine veterinary medicine', 12),
        fallbackData: defaultPubMedResult('equine veterinary medicine'),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'pubmed_pet_owner',
        snapshotFile: 'pubmed-pet-owner.json',
        fetcher: () => fetchPubMedQuery('companion animal pet owner guidance veterinary', 12),
        fallbackData: defaultPubMedResult('companion animal pet owner guidance veterinary'),
        requiredForCoverage: false,
      }),
      runResilientSource({
        sourceId: 'tcia_imaging',
        snapshotFile: 'tcia-imaging.json',
        fetcher: () => fetchTciaCollections(),
        fallbackData: {
          fetchedAt: new Date().toISOString(),
          source: 'TCIA',
          total: 0,
          veterinary: [],
        },
        requiredForCoverage: false,
      }),
    ]);
    const curated = loadCuratedDatasets();
    const curatedMeta = getSourceMeta('curated_datasets');
    sourceHealthEntries.push({
      sourceId: 'curated_datasets',
      name: curatedMeta?.name || 'Curated veterinary datasets',
      type: curatedMeta?.type || 'clinical',
      tier: curatedMeta?.tier || 2,
      audience: curatedMeta?.audience || 'both',
      requiredForCoverage: true,
      mode: curated.found ? 'live' : 'unavailable',
      status: curated.found ? 'fresh' : 'error',
      attempts: 1,
      latencyMs: 0,
      lastAttemptAt: new Date().toISOString(),
      lastSuccessAt: curated.found ? curated.fetchedAt : null,
      lastError: curated.found ? null : `Missing or unreadable curated dataset file (${curated.filePath}).`,
    });

    // Autonomous-agent topics: each run finds literature for these frontier topics (retmax 5 per topic)
    const topicHealthEntries = [];
    const topicResults = await Promise.all(
      AUTONOMOUS_AGENT_TOPICS.map(async ({ topic, query }, index) => {
        const { data, health } = await runSourceTask({
          sourceId: `autonomous_topic_${index}`,
          snapshotPath: path.join(MEMORY_DIR, `pubmed-topic-${index}.json`),
          fetcher: () => fetchPubMedQuery(query, 5),
          fallbackData: { topic, query, count: 0, idlist: [] },
          requiredForCoverage: false,
        });
        topicHealthEntries.push(health);
        return {
          topic,
          query: data.query || query,
          idlist: Array.isArray(data.idlist) ? data.idlist : [],
          count: Number(data.count) || 0,
        };
      })
    );
    const topicMeta = getSourceMeta('autonomous_topics');
    const topicLiveCount = topicHealthEntries.filter((entry) => entry.mode === 'live').length;
    const topicCachedCount = topicHealthEntries.filter((entry) => entry.mode === 'cached').length;
    const topicLastSuccess = topicHealthEntries
      .map((entry) => entry.lastSuccessAt)
      .filter(Boolean)
      .sort()
      .pop() || null;
    const topicErrors = topicHealthEntries
      .map((entry) => entry.lastError)
      .filter(Boolean);
    sourceHealthEntries.push({
      sourceId: 'autonomous_topics',
      name: topicMeta?.name || 'Autonomous-agent topic ingest',
      type: topicMeta?.type || 'research',
      tier: topicMeta?.tier || 1,
      audience: topicMeta?.audience || 'pro',
      requiredForCoverage: false,
      mode: topicLiveCount > 0 ? 'live' : topicCachedCount > 0 ? 'cached' : 'unavailable',
      status: topicLiveCount === AUTONOMOUS_AGENT_TOPICS.length ? 'fresh' : topicLiveCount > 0 || topicCachedCount > 0 ? 'stale' : 'error',
      attempts: topicHealthEntries.reduce((sum, entry) => sum + (entry.attempts || 0), 0),
      latencyMs: 0,
      lastAttemptAt: new Date().toISOString(),
      lastSuccessAt: topicLastSuccess,
      lastError: topicErrors.length > 0 ? topicErrors[0] : null,
    });
    topicResults.forEach((r, i) => {
      writeJson(`pubmed-topic-${i}.json`, {
        topic: r.topic,
        baseQuery: r.baseQuery,
        query: r.query,
        fallback: r.fallback,
        count: r.count,
        idlist: r.idlist,
      });
    });

    writeJson('pubmed-recent.json', pubmed);
    writeJson('cdc-travel-notices.json', cdc);
    writeJson('pubmed-cancer.json', pubmedCancer);
    writeJson('pubmed-case-reports.json', pubmedCaseReports);
    writeJson('pubmed-clinical.json', pubmedClinical);
    writeJson('pubmed-small-animal.json', pubmedSmallAnimal);
    writeJson('pubmed-equine.json', pubmedEquine);
    writeJson('ecdc-avian-flu.json', ecdc);
    writeJson('fda-pet-recalls.json', fdaPetRecalls);
    writeJson('cfia-pet-recalls.json', cfiaPetRecalls);
    writeJson('fsa-pet-recalls.json', fsaPetRecalls);
    writeJson('fsanz-pet-recalls.json', fsanzPetRecalls);
    writeJson('rasff-pet-feed-alerts.json', rasffPetFeedAlerts);
    writeJson('tcia-imaging.json', tcia);
    writeSourceHealthSnapshot(SOURCE_HEALTH_PATH, sourceHealthEntries);
    console.log('Wrote', SOURCE_HEALTH_PATH);

    const pubmedIds = new Set([
      ...((pubmed && pubmed.idlist) || []),
      ...((pubmedCancer && pubmedCancer.idlist) || []),
      ...((pubmedCaseReports && pubmedCaseReports.idlist) || []),
      ...((pubmedClinical && pubmedClinical.idlist) || []),
      ...((pubmedSmallAnimal && pubmedSmallAnimal.idlist) || []),
      ...((pubmedEquine && pubmedEquine.idlist) || []),
      ...((pubmedPetOwner && pubmedPetOwner.idlist) || []),
      ...topicResults.flatMap((result) => result.idlist || []),
    ]);
    const pubmedTitles = await fetchPubMedSummaries(Array.from(pubmedIds));

    ingestIntoDb(
      pubmed,
      cdc,
      ecdc,
      fdaPetRecalls,
      cfiaPetRecalls,
      fsaPetRecalls,
      fsanzPetRecalls,
      rasffPetFeedAlerts,
      pubmedCancer,
      pubmedCaseReports,
      pubmedClinical,
      pubmedSmallAnimal,
      pubmedEquine,
      pubmedPetOwner,
      curated,
      tcia,
      topicResults,
      pubmedTitles
    );
    console.log(
      'Ingested into database (literature including autonomous-agent topics, surveillance, pet-only recalls, cancer, case_data, clinical, pet_owner, imaging, vet_practice).'
    );
    console.log('Done.');
  } catch (err) {
    console.error('Ingest failed:', err.message);
    process.exit(1);
  }
}

main();
