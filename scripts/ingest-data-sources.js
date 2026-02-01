#!/usr/bin/env node
/**
 * VM job: fetch from data sources and write to memory/data-sources/.
 * Run on a schedule (e.g. cron every 6–12h): npm run ingest
 *
 * Data sources:
 * 1. PubMed (NCBI E-utilities) – recent papers, one health / animal
 * 2. CDC Travel Notices (RSS) – outbreak and travel health notices
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

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

// --- 1. PubMed (E-utilities) ---
const PUBMED_URL =
  'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=one+health+animal&retmax=15&sort=date&retmode=json';

function fetchPubMed() {
  return new Promise((resolve, reject) => {
    https
      .get(PUBMED_URL, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const result = {
              fetchedAt: new Date().toISOString(),
              source: 'PubMed E-utilities',
              query: 'one health animal',
              count: data.esearchresult?.count ?? 0,
              idlist: data.esearchresult?.idlist ?? [],
              ids: data.esearchresult?.idlist ?? [],
            };
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
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

// --- Run ---
async function main() {
  console.log('Ingesting data sources...');
  try {
    const [pubmed, cdc] = await Promise.all([fetchPubMed(), fetchCdcTravelNotices()]);
    writeJson('pubmed-recent.json', pubmed);
    writeJson('cdc-travel-notices.json', cdc);
    console.log('Done.');
  } catch (err) {
    console.error('Ingest failed:', err.message);
    process.exit(1);
  }
}

main();
