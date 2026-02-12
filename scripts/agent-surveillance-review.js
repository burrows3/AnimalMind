#!/usr/bin/env node
/**
 * Agent: Surveillance reviewer. Runs autonomously after ingest.
 * Reads CDC/surveillance data from DB, writes a short review so other agents
 * (and the synthesizer) can use it to find opportunities. Cost: $0 (no API calls).
 */

const fs = require('fs');
const path = require('path');
const { getIngestedGrouped, getIngestedMeta } = require('../lib/db');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const AGENT_OUTPUTS = path.join(MEMORY_DIR, 'agent-outputs');
const OUT_PATH = path.join(AGENT_OUTPUTS, 'surveillance-review.md');

function main() {
  let grouped, meta;
  try {
    grouped = getIngestedGrouped();
    meta = getIngestedMeta();
  } catch (e) {
    fs.mkdirSync(AGENT_OUTPUTS, { recursive: true });
    fs.writeFileSync(OUT_PATH, `# Surveillance reviewer\n\n*Could not read DB: ${e.message}. Run ingest first.*\n`, 'utf8');
    console.log('agent-surveillance-review: wrote (error)');
    return;
  }

  const surveillance = grouped.surveillance || {};
  const conditions = Object.keys(surveillance).sort();
  const lastFetched = meta.lastFetched || new Date().toISOString();

  const lines = [
    '# Surveillance reviewer',
    '',
    '**Agent:** Surveillance reviewer (autonomous)',
    '**Last run:** ' + new Date().toISOString(),
    '**Data as of:** ' + lastFetched,
    '',
    '---',
    '',
    '## What I see',
    '',
    'Conditions currently in CDC travel notices (and similar surveillance):',
    '',
  ];

  if (conditions.length === 0) {
    lines.push('*No surveillance data in DB. Run ingest first.*', '');
  } else {
    for (const cond of conditions.slice(0, 20)) {
      const items = surveillance[cond] || [];
      const sample = items[0];
      const title = sample && sample.title ? sample.title : cond;
      const url = sample && sample.url ? sample.url : '';
      lines.push(`- **${cond}** — ${title.slice(0, 80)}${title.length > 80 ? '…' : ''}`);
      if (url) lines.push(`  - [Source](${url})`);
      lines.push('');
    }
    if (conditions.length > 20) lines.push(`*…and ${conditions.length - 20} more conditions.*`, '');
  }

  lines.push('---', '');
  lines.push('## For other agents', '');
  lines.push('- **Travel / zoonotic:** Use the list above for travel alerts and client advice (rabies, dengue, etc.).');
  lines.push('- **Veterinary medicine:** Use for client handouts and travel health advice in the clinic.');
  lines.push('- **Synthesizer:** Consider these conditions when writing opportunities (e.g. "New rabies notice; suggest alert").');
  lines.push('');

  if (!fs.existsSync(AGENT_OUTPUTS)) fs.mkdirSync(AGENT_OUTPUTS, { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
  console.log('agent-surveillance-review: wrote', OUT_PATH);
}

main();
