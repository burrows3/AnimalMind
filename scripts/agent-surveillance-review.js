#!/usr/bin/env node
/**
 * Agent: Surveillance reviewer. Runs autonomously after ingest.
 * Reads CDC/surveillance data from DB, writes a short review so other agents
 * (and the synthesizer) can use it to find opportunities. Cost: $0 by default;
 * optional NVIDIA LLM reasoning when NVIDIA_API_KEY is set.
 */

require('../lib/env');
const fs = require('fs');
const path = require('path');
const { getIngestedGrouped, getIngestedMeta } = require('../lib/db');
const { chat: nvidiaChat, isEnabled: isNvidiaEnabled } = require('../lib/nvidiaNim');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const AGENT_OUTPUTS = path.join(MEMORY_DIR, 'agent-outputs');
const OUT_PATH = path.join(AGENT_OUTPUTS, 'surveillance-review.md');

async function buildLlmReasoning({ lastFetched, conditions, surveillance }) {
  if (!isNvidiaEnabled()) return null;
  const rows = conditions.slice(0, 20).map((cond) => {
    const items = surveillance[cond] || [];
    const sampleTitle = items[0]?.title || cond;
    return `- ${cond} (${items.length} items) — ${sampleTitle.slice(0, 90)}`;
  });
  const user = [
    `Data as of: ${lastFetched}`,
    '',
    'Conditions:',
    rows.length ? rows.join('\n') : '- (no conditions)',
    '',
    'Return:',
    '- 3-5 key risks (bullets)',
    '- 3-5 actions/opportunities for veterinary teams (bullets)',
    '- 1 short geographic awareness note (1 sentence)',
    'Keep it concise. No extra preamble.',
  ].join('\n');
  try {
    return await nvidiaChat({
      system: 'You are an autonomous surveillance analyst for animal health.',
      user,
      maxTokens: 350,
      temperature: 0.2,
    });
  } catch (e) {
    console.warn('agent-surveillance-review: LLM unavailable:', e.message);
    return null;
  }
}

async function main() {
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
  const llmReasoning = await buildLlmReasoning({ lastFetched, conditions, surveillance });
  if (llmReasoning) {
    lines.push('## LLM reasoning (NVIDIA)', '');
    lines.push(llmReasoning, '');
  }
  lines.push('## For other agents', '');
  lines.push('- **Travel / zoonotic:** Use the list above for travel alerts and client advice (rabies, dengue, etc.).');
  lines.push('- **Veterinary medicine:** Use for client handouts and travel health advice in the clinic.');
  lines.push('- **Synthesizer:** Consider these conditions when writing opportunities (e.g. "New rabies notice; suggest alert").');
  lines.push('');

  if (!fs.existsSync(AGENT_OUTPUTS)) fs.mkdirSync(AGENT_OUTPUTS, { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
  console.log('agent-surveillance-review: wrote', OUT_PATH);
}

main().catch((err) => {
  console.error('agent-surveillance-review: failed', err.message);
  process.exit(1);
});
