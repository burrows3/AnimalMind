#!/usr/bin/env node
/**
 * Agent: Literature reviewer. Runs autonomously after ingest.
 * Reads literature, cancer, and case_data from DB; reasons by autonomous-agent topic;
 * writes themes and gaps so the synthesizer can find opportunities. Cost: $0 (no API calls).
 */

const fs = require('fs');
const path = require('path');
const { getIngestedGrouped, getIngestedMeta } = require('../lib/db');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const AGENT_OUTPUTS = path.join(MEMORY_DIR, 'agent-outputs');
const OUT_PATH = path.join(AGENT_OUTPUTS, 'literature-review.md');

/** Same 20 topics as ingest (Clinical-Adjacent + Research & Discovery). Used for reasoning. */
const AUTONOMOUS_AGENT_TOPICS = [
  'Early Detection of Disease Across Species',
  'Decoding Animal Pain and Distress',
  'Preclinical Disease States',
  'Unexplained Recovery and Resilience',
  'Microbiome–Behavior–Health Coupling',
  'Biological Timing and Treatment Response',
  'Non-Linear Dose and Response Effects',
  'Emergent Effects of Complex Care Pathways',
  'Silent or Masked Disease and Distress',
  'Unintended Consequences of Standard Care',
  'Unknown Biological Signals',
  'Latent Protective Mechanisms',
  'Pain Modulation Beyond Analgesics',
  'Hidden Costs of Normal Physiology',
  'Environmental Exposure and Sentinel Signals',
  'Species-Specific Health Advantages',
  'Comparative Physiology at Extremes',
  'Genetic Intervention and Biological Integrity',
  'Developmental Programming and Lifelong Health',
  'Unexpected Correlations and Anomalies',
];

/** One-line inferred opportunity/gap per topic (reasoning). */
function inferOpportunity(topic) {
  if (/Early Detection|Preclinical/.test(topic)) return 'Prioritize validation of preclinical signals and early biomarkers for clinical use.';
  if (/Pain|Distress|Stoic/.test(topic)) return 'Aggregate behavior, physiology, and biomarker studies to improve recognition in stoic species.';
  if (/Recovery|Resilience/.test(topic)) return 'Identify protective factors and care patterns from outlier recovery cases.';
  if (/Microbiome/.test(topic)) return 'Map microbiome–behavior–health links for interventions and diet trials.';
  if (/Timing|Biological Timing/.test(topic)) return 'Use timing data to optimize anesthesia, vaccination, and treatment windows.';
  if (/Non-Linear|Dose/.test(topic)) return 'Document threshold and paradoxical responses for dosing guidelines.';
  if (/Complex Care|Emergent/.test(topic)) return 'Analyze combination effects beyond single interventions.';
  if (/Silent|Masked/.test(topic)) return 'Improve detection of hidden disease and distress with better tools and criteria.';
  if (/Unintended|Standard Care/.test(topic)) return 'Track long-term effects of common practices to refine guidelines.';
  if (/Unknown.*Signals|Latent|Unexpected/.test(topic)) return 'Explore uncharacterized signals and anomalies for new biology or biomarkers.';
  if (/Pain Modulation|Beyond Analgesics/.test(topic)) return 'Catalog non-drug pain modulation for adjunct strategies.';
  if (/Hidden Costs|Normal Physiology/.test(topic)) return 'Quantify cumulative cost of stress and inflammation for prevention.';
  if (/Environmental|Sentinel/.test(topic)) return 'Use animal sentinel data for environmental and human health early warning.';
  if (/Species-Specific|Comparative|Extremes/.test(topic)) return 'Translate extreme physiology and adaptations into medical insights.';
  if (/Genetic|Developmental/.test(topic)) return 'Integrate gene editing and early-life effects into health and welfare assessment.';
  return 'Use new literature for research gaps, teaching, or practice-relevant synthesis.';
}

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
  const litByCond = grouped.literature || {};

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
    '## Reasoning by autonomous-agent topic',
    '',
    'The agent reasons over ingested literature for each autonomous-agent topic (Clinical-Adjacent and Research & Discovery). Data from sources; reasoning from patterns and inferred gaps.',
    '',
  ];

  let topicCount = 0;
  for (const topic of AUTONOMOUS_AGENT_TOPICS) {
    const items = litByCond[topic] || [];
    if (items.length === 0) continue;
    topicCount++;
    const opportunity = inferOpportunity(topic);
    lines.push(`- **${topic}** — ${items.length} item(s). **Reasoning:** ${opportunity}`);
  }
  if (topicCount === 0) {
    lines.push('- *No topic-specific literature in this run. Topic queries run each ingest.*', '');
  }
  lines.push('');

  lines.push('## Themes and gaps (for synthesizer)', '');
  const types = [
    { key: 'literature', label: 'One-health / animal literature' },
    { key: 'cancer', label: 'Animal / veterinary oncology' },
    { key: 'case_data', label: 'Veterinary case reports' },
  ];

  for (const { key, label } of types) {
    const byCond = grouped[key] || {};
    const conditions = Object.keys(byCond).sort().filter((c) => !AUTONOMOUS_AGENT_TOPICS.includes(c));
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
  lines.push('- **Synthesizer:** Use "Reasoning by autonomous-agent topic" and themes above for opportunities.');
  lines.push('- **Veterinary medicine:** Clinical + case_data + vet_practice support daily practice, guidelines, and client resources.');
  lines.push('');

  if (!fs.existsSync(AGENT_OUTPUTS)) fs.mkdirSync(AGENT_OUTPUTS, { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
  console.log('agent-literature-review: wrote', OUT_PATH);
}

main();
