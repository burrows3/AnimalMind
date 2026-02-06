#!/usr/bin/env node
/**
 * Read ingested data from the database (sorted by data_type and condition_or_topic)
 * and write a simple HTML report to memory/ingest-report.html.
 * Run after ingest: node scripts/write-report.js
 */

const fs = require('fs');
const path = require('path');
const { getIngestedGrouped } = require('../lib/db');

const OUT_PATH = path.join(__dirname, '..', 'memory', 'ingest-report.html');

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { dateStyle: 'short' });
  } catch {
    return s;
  }
}

let grouped;
try {
  grouped = getIngestedGrouped();
} catch (e) {
  grouped = {};
}

const dataTypeLabels = {
  surveillance: 'Surveillance (CDC Travel Notices)',
  literature: 'Literature (PubMed)',
  cancer: 'Cancer (animal / veterinary oncology)',
  case_data: 'Case data (veterinary case reports)',
  clinical: 'Clinical (practice, small animal, equine)',
  imaging: 'Imaging & radiographs',
  vet_practice: 'Vet practice (guidelines, resources)',
};
const sections = [];

for (const [dataType, conditions] of Object.entries(grouped)) {
  const label = dataTypeLabels[dataType] || dataType;
  let sectionHtml = `<section><h2>${escapeHtml(label)}</h2>`;
  const conditionsSorted = Object.keys(conditions).sort();
  for (const condition of conditionsSorted) {
    const rows = conditions[condition];
    sectionHtml += `<h3>${escapeHtml(condition)}</h3><table><thead><tr><th>Title / ID</th><th>Date</th><th>Link</th></tr></thead><tbody>`;
    for (const r of rows) {
      const title = r.title || (r.external_id && dataType === 'literature' ? `PMID ${r.external_id}` : r.external_id) || r.external_id;
      sectionHtml += `<tr><td>${escapeHtml(title)}</td><td>${formatDate(r.published_at)}</td><td><a href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener">Link</a></td></tr>`;
    }
    sectionHtml += '</tbody></table>';
  }
  sectionHtml += '</section>';
  sections.push(sectionHtml);
}

const bodySections = sections.length
  ? sections.join('\n')
  : '<p>No data in database. Run <code>npm run ingest</code> first.</p>';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AnimalMind – Ingest Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 1.5rem; background: #f8f9fa; }
    h1 { color: #1a1a2e; margin-bottom: 0.25rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
    section { background: #fff; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    h2 { margin-top: 0; color: #16213e; font-size: 1.1rem; }
    h3 { margin: 1rem 0 0.5rem; color: #0f3460; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee; }
    th { color: #555; font-weight: 600; }
    a { color: #0d6efd; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>AnimalMind – Ingest Report</h1>
  <p class="meta">From database, sorted by <strong>data type</strong> (surveillance / literature) and <strong>condition or topic</strong>. Ingest runs every 3 hours.</p>
  ${bodySections}
</body>
</html>
`;

const outDir = path.dirname(OUT_PATH);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUT_PATH, html, 'utf8');
console.log('Report written to', OUT_PATH);
