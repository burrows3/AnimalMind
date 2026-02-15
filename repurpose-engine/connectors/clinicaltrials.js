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

function buildSearchUrl(term, status = 'TERMINATED', pageSize = 10) {
  const q = encodeURIComponent(term);
  return `https://clinicaltrials.gov/api/v2/studies?query.term=${q}&filter.overallStatus=${status}&pageSize=${pageSize}`;
}

function toDocument(study) {
  const nctId = study?.protocolSection?.identificationModule?.nctId;
  const title = study?.protocolSection?.identificationModule?.briefTitle || 'Clinical trial';
  const condition = study?.protocolSection?.conditionsModule?.conditions?.[0] || '';
  const phase = study?.protocolSection?.designModule?.phases?.[0] || '';
  return normalizeDocument({
    id: `ctgov:${nctId || title}`,
    source: 'clinicaltrials',
    url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : '',
    title,
    authors: '',
    date: new Date().toISOString(),
    abstract_or_snippet: `Condition: ${condition}${phase ? `; Phase: ${phase}` : ''}`,
    doc_type: 'trial',
    entities: {
      drugs: [],
      species: [],
      conditions: condition ? [condition] : [],
      mechanisms: [],
    },
  });
}

async function fetchFailedTrials(term, status = 'TERMINATED', pageSize = 10) {
  const body = await httpsGet(buildSearchUrl(term, status, pageSize));
  const data = JSON.parse(body);
  const studies = data?.studies ?? [];
  return studies.map(toDocument);
}

module.exports = {
  fetchFailedTrials,
};
