#!/usr/bin/env node
/**
 * VM job: fetch from data sources and ingest into DB (sorted by data_type and condition).
 * Also writes JSON snapshots to memory/data-sources/.
 *
 * Data sources:
 * 1. PubMed – literature (one health), cancer, case_data, clinical (vet practice, small animal, equine)
 * 2. CDC Travel Notices (RSS) – surveillance
 * 3. Curated datasets (JSON) – cancer, imaging, vet_practice (guidelines, AVMA, AAHA, etc.)
 * 4. TCIA (Cancer Imaging Archive) – imaging collections (canine/veterinary when available)
 * 5. Autonomous-agent topics – PubMed queries for frontier topics (animal communication, sentience, welfare, etc.)
 */

/** Autonomous-agent topics: Clinical-Adjacent + Research & Discovery. Each run finds literature (PubMed) for these. */
const AUTONOMOUS_AGENT_TOPICS = [
  // Clinical-Adjacent
  { topic: 'Early Detection of Disease Across Species', query: 'early detection disease animal veterinary' },
  { topic: 'Decoding Animal Pain and Distress', query: 'animal pain distress behavior biomarkers' },
  { topic: 'Preclinical Disease States', query: 'preclinical disease animal veterinary' },
  { topic: 'Unexplained Recovery and Resilience', query: 'animal recovery resilience veterinary' },
  { topic: 'Microbiome–Behavior–Health Coupling', query: 'microbiome animal behavior health' },
  { topic: 'Biological Timing and Treatment Response', query: 'chronobiology veterinary anesthesia vaccination' },
  { topic: 'Non-Linear Dose and Response Effects', query: 'dose response veterinary non-linear' },
  { topic: 'Emergent Effects of Complex Care Pathways', query: 'veterinary care pathway outcomes' },
  { topic: 'Silent or Masked Disease and Distress', query: 'masked pain disease animal stoic' },
  { topic: 'Unintended Consequences of Standard Care', query: 'veterinary practice long-term effects' },
  // Research & Discovery
  { topic: 'Unknown Biological Signals', query: 'biomarker animal health uncharacterized' },
  { topic: 'Latent Protective Mechanisms', query: 'disease resistance animal natural' },
  { topic: 'Pain Modulation Beyond Analgesics', query: 'pain modulation animal non-drug' },
  { topic: 'Hidden Costs of Normal Physiology', query: 'stress inflammation animal cumulative' },
  { topic: 'Environmental Exposure and Sentinel Signals', query: 'sentinel animal environmental exposure' },
  { topic: 'Species-Specific Health Advantages', query: 'comparative physiology animal adaptation' },
  { topic: 'Comparative Physiology at Extremes', query: 'extreme environment animal physiology' },
  { topic: 'Genetic Intervention and Biological Integrity', query: 'gene editing animal health' },
  { topic: 'Developmental Programming and Lifelong Health', query: 'early life exposure animal disease' },
  { topic: 'Unexpected Correlations and Anomalies', query: 'veterinary anomaly correlation biology' },
];

const fs = require('fs');
const path = require('path');
const https = require('https');
const { upsertIngested } = require('../lib/db');

const MEMORY_DIR = path.join(__dirname, '..', 'memory', 'data-sources');

// Ensure output dir exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

function writeJson(filename, data) {
  const filepath = path.join(MEMORY_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Wrote', filepath);
}

/** Extract condition/topic from CDC notice title (e.g. "Level 2 - Monkeypox in Ghana" -> "Monkeypox"). */
function conditionFromCdcTitle(title) {
  if (!title || typeof title !== 'string') return 'Other';
  const afterLevel = title.replace(/^Level \d+\s*-\s*/i, '').trim();
  const match = afterLevel.match(/^(.+?)\s+in\s+/i);
  return (match ? match[1].trim() : afterLevel) || 'Other';
}

// --- 1. PubMed (E-utilities) ---
function buildPubMedUrl(term, retmax = 15) {
  const q = encodeURIComponent(term);
  return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${q}&retmax=${retmax}&sort=date&retmode=json`;
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

// --- 3. Curated datasets (cancer, imaging) ---
function loadCuratedDatasets() {
  const p = path.join(MEMORY_DIR, 'curated-datasets.json');
  if (!fs.existsSync(p)) return { items: [] };
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { items: raw.items || [], fetchedAt: new Date().toISOString() };
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
function ingestIntoDb(pubmed, cdc, pubmedCancer, pubmedCaseReports, pubmedClinical, pubmedSmallAnimal, pubmedEquine, curated, tcia, topicResults) {
  const fetchedAt = new Date().toISOString();

  // Literature: PubMed (one health animal)
  for (const pmid of (pubmed && pubmed.idlist) || []) {
    upsertIngested({
      data_type: 'literature',
      source: 'pubmed',
      condition_or_topic: 'one health animal',
      title: null,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      external_id: pmid,
      published_at: null,
      fetched_at: fetchedAt,
    });
  }

  // Literature: autonomous-agent topics (frontier topics – each run finds data for these)
  for (const result of topicResults || []) {
    const topic = result.topic || 'Frontier topic';
    const slug = topic.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 30);
    for (const pmid of (result.idlist || [])) {
      upsertIngested({
        data_type: 'literature',
        source: 'pubmed',
        condition_or_topic: topic,
        title: null,
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

  // Cancer: PubMed (animal cancer / veterinary oncology)
  for (const pmid of (pubmedCancer && pubmedCancer.idlist) || []) {
    upsertIngested({
      data_type: 'cancer',
      source: 'pubmed',
      condition_or_topic: 'animal cancer',
      title: null,
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
      title: null,
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
        title: null,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        external_id: `clinical-${pmid}`,
        published_at: null,
        fetched_at: fetchedAt,
      });
    }
  }

  // Curated: cancer, imaging, vet_practice (guidelines, resources)
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
    const [pubmed, cdc, pubmedCancer, pubmedCaseReports, pubmedClinical, pubmedSmallAnimal, pubmedEquine, tcia] = await Promise.all([
      fetchPubMed(),
      fetchCdcTravelNotices(),
      fetchPubMedQuery('animal cancer veterinary oncology', 15),
      fetchPubMedQuery('veterinary case reports', 15),
      fetchPubMedQuery('veterinary clinical practice', 12),
      fetchPubMedQuery('small animal veterinary medicine', 12),
      fetchPubMedQuery('equine veterinary medicine', 12),
      fetchTciaCollections(),
    ]);
    const curated = loadCuratedDatasets();

    // Autonomous-agent topics: each run finds literature for these frontier topics (retmax 5 per topic)
    const topicResults = await Promise.all(
      AUTONOMOUS_AGENT_TOPICS.map(({ topic, query }) =>
        fetchPubMedQuery(query, 5).then((r) => ({ topic, query: r.query, idlist: r.idlist || [], count: r.count }))
      )
    );
    topicResults.forEach((r, i) => {
      writeJson(`pubmed-topic-${i}.json`, { topic: AUTONOMOUS_AGENT_TOPICS[i].topic, query: r.query, count: r.count, idlist: r.idlist });
    });

    writeJson('pubmed-recent.json', pubmed);
    writeJson('cdc-travel-notices.json', cdc);
    writeJson('pubmed-cancer.json', pubmedCancer);
    writeJson('pubmed-case-reports.json', pubmedCaseReports);
    writeJson('pubmed-clinical.json', pubmedClinical);
    writeJson('pubmed-small-animal.json', pubmedSmallAnimal);
    writeJson('pubmed-equine.json', pubmedEquine);
    writeJson('tcia-imaging.json', tcia);

    ingestIntoDb(pubmed, cdc, pubmedCancer, pubmedCaseReports, pubmedClinical, pubmedSmallAnimal, pubmedEquine, curated, tcia, topicResults);
    console.log('Ingested into database (literature including autonomous-agent topics, surveillance, cancer, case_data, clinical, imaging, vet_practice).');
    console.log('Done.');
  } catch (err) {
    console.error('Ingest failed:', err.message);
    process.exit(1);
  }
}

main();
