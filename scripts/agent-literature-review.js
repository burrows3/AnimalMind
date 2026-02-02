#!/usr/bin/env node
/**
 * Agent: Literature reviewer. Runs autonomously after ingest.
 * Reads literature, cancer, and case_data from DB, writes themes and gaps
 * so the synthesizer can find opportunities. Cost: $0 (no API calls).
 */

const fs = require('fs');
const path = require('path');
const { getIngestedGrouped, getIngestedMeta } = require('../lib/db');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const AGENT_OUTPUTS = path.join(MEMORY_DIR, 'agent-outputs');
const OUT_PATH = path.join(AGENT_OUTPUTS, 'literature-review.md');

function main() {
  let grouped, meta;
  try {
    grouped = getIngestedGrouped();
    meta = getIngestedMeta();
  } catch (e) {
    fs.mkdirSync(AGENT_OUTPUTS, { recursive: true });
    fs.writeFileSync(OUT_PATH, `# Literature reviewer\n\n*Could not read DB: ${e.message}. Run ingest first.*\n`, 'utf8');
    console.log('agent-literature-review: wrote (error)');
    return;
  }

  const lastFetched = meta.lastFetched || new Date().toISOString();
  const counts = meta.counts || {};

  const lines = [
    '# Literature reviewer',
    '',
    '**Agent:** Literature reviewer (autonomous)',
    '**Last run:** ' + new Date().toISOString(),
    '**Data as of:** ' + lastFetched,
    '',
    '---',
    '',
    '## Snapshot',
    '',
    `| Type | Count |`,
    `|------|-------|`,
    `| Literature (one health) | ${counts.literature || 0} |`,
    `| Cancer (animal/veterinary) | ${counts.cancer || 0} |`,
    `| Case data (veterinary case reports) | ${counts.case_data || 0} |`,
    '',
    '## Themes and gaps (for synthesizer)',
    '',
  ];

  const types = [
    { key: 'literature', label: 'One-health / animal literature' },
    { key: 'cancer', label: 'Animal / veterinary oncology' },
    { key: 'case_data', label: 'Veterinary case reports' },
  ];

  for (const { key, label } of types) {
    const byCond = grouped[key] || {};
    const conditions = Object.keys(byCond).sort();
    if (conditions.length === 0) continue;
    lines.push(`### ${label}`, '');
    for (const cond of conditions.slice(0, 8)) {
      const items = byCond[cond] || [];
      lines.push(`- **${cond}** — ${items.length} item(s). Use for partnerships, research gaps, or teaching.`);
    }
    lines.push('');
  }

  lines.push('---', '');
  lines.push('## For other agents', '');
  lines.push('- **Synthesizer:** Use themes above for "opportunities" and **for the clinic** (protocols, differentials, CE, client handouts).');
  lines.push('- **Veterinary medicine:** Clinical + case_data + vet_practice support daily practice, guidelines, and client resources.');
  lines.push('- **Imaging:** Curated/TCIA data is in the DB; link to teaching or model development where relevant.');
  lines.push('');

  if (!fs.existsSync(AGENT_OUTPUTS)) fs.mkdirSync(AGENT_OUTPUTS, { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
  console.log('agent-literature-review: wrote', OUT_PATH);
}

main();
