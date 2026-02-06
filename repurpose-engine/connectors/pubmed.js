const https = require('https');
const { normalizeDocument } = require('../utils/normalize');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
}

function buildSearchUrl(term, retmax = 10) {
  const q = encodeURIComponent(term);
  return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${q}&retmax=${retmax}&sort=date&retmode=json`;
}

async function fetchPubMedIds(term, retmax = 10) {
  const body = await httpsGet(buildSearchUrl(term, retmax));
  const data = JSON.parse(body);
  return data?.esearchresult?.idlist ?? [];
}

function toDocument(pmid, query) {
  return normalizeDocument({
    id: `pmid:${pmid}`,
    source: 'pubmed',
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    title: `PubMed ${pmid}`,
    authors: '',
    date: new Date().toISOString(),
    abstract_or_snippet: `Query match: ${query}`,
    doc_type: 'review',
    entities: {
      drugs: [],
      species: [],
      conditions: [],
      mechanisms: [],
    },
  });
}

async function fetchPubMedDocs(term, retmax = 10) {
  const ids = await fetchPubMedIds(term, retmax);
  return ids.map((pmid) => toDocument(pmid, term));
}

async function fetchVetSignals() {
  const term = 'veterinary case report drug';
  return fetchPubMedDocs(term, 10);
}

module.exports = {
  fetchPubMedDocs,
  fetchVetSignals,
};
