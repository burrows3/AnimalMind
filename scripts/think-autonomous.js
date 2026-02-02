#!/usr/bin/env node
/**
 * Autonomous "think" step: read latest ingested data and write a short
 * "what matters for animal health" summary so the system "thinks on its own."
 * Run after ingest (e.g. from run-ingest.cmd). Writes memory/autonomous-insights.md.
 */

const fs = require('fs');
const path = require('path');
const { getIngestedMeta, getIngestedGrouped } = require('../lib/db');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const OUT_PATH = path.join(MEMORY_DIR, 'autonomous-insights.md');

function main() {
  let meta, grouped;
  try {
    meta = getIngestedMeta();
    grouped = getIngestedGrouped();
  } catch (e) {
    fs.writeFileSync(OUT_PATH, `# Autonomous insights\n\n*Could not read DB: ${e.message}. Run ingest first.*\n`, 'utf8');
    console.log('Wrote', OUT_PATH, '(error)');
    return;
  }

  const counts = meta.counts || {};
  const lastFetched = meta.lastFetched ? new Date(meta.lastFetched).toISOString() : '—';

  const lines = [
    '# Autonomous insights',
    '',
    '**Last updated:** ' + lastFetched,
    '',
    'The system read the latest ingested data and summarized what matters for animal health.',
    '',
    '---',
    '',
    '## Data snapshot',
    '',
    `| Type | Count |`,
    `|------|-------|`,
    `| Surveillance (CDC) | ${counts.surveillance || 0} |`,
    `| Literature (PubMed) | ${counts.literature || 0} |`,
    `| Cancer (animal / veterinary) | ${counts.cancer || 0} |`,
    `| Case data (veterinary case reports) | ${counts.case_data || 0} |`,
    `| Clinical (practice, small animal, equine) | ${counts.clinical || 0} |`,
    `| Imaging & radiographs | ${counts.imaging || 0} |`,
    `| Vet practice (guidelines, resources) | ${counts.vet_practice || 0} |`,
    '',
  ];

  // Top conditions by type (for focus)
  const surveillanceConditions = grouped.surveillance ? Object.keys(grouped.surveillance).slice(0, 10) : [];
  if (surveillanceConditions.length) {
    lines.push('## Active surveillance (conditions tracked)', '');
    lines.push(surveillanceConditions.map((c) => `- ${c}`).join('\n'), '');
  }

  lines.push('---', '');
  lines.push('## Consider (for animal health)', '');
  lines.push('- **Surveillance:** Review new CDC travel notices for travel alerts and client advice (e.g. rabies, dengue, zoonotic).');
  lines.push('- **Literature:** Review new one-health and animal papers for partnerships and research gaps.');
  lines.push('- **Cancer:** Review new animal/veterinary oncology items for comparative oncology and collaboration.');
  lines.push('- **Case data:** Review new veterinary case reports for emerging patterns or teaching material.');
  lines.push('- **Clinical:** Use clinical/small animal/equine literature for protocols, differentials, and CE.');
  lines.push('- **Imaging:** Use curated imaging datasets (TCIA, radiographs) for teaching or model development.');
  lines.push('- **Vet practice:** Use AAHA/AVMA/VIN/Merck resources for guidelines and client handouts.');
  lines.push('');
  lines.push('## For veterinary medicine (practice use)', '');
  lines.push('- **In the clinic:** Surveillance = travel/zoonotic client advice; clinical + case_data = differentials and protocols; cancer = oncology consults; vet_practice = guidelines and client resources.');
  lines.push('- **CE and teaching:** Literature, case reports, and clinical papers support continuing education and rounds.');
  lines.push('- **Client handouts:** Use surveillance conditions and vet_practice links for client-facing materials.');
  lines.push('');
  lines.push('*This file is updated automatically after each ingest. The system does not yet send alerts or post elsewhere; that would be a next step.*');
  lines.push('');

  const md = lines.join('\n');
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, md, 'utf8');
  console.log('Wrote', OUT_PATH);
}

main();
