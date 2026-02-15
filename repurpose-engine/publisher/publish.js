const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const MEMORY_DIR = path.join(REPO_ROOT, 'memory', 'repurpose');
const DOCS_DIR = path.join(REPO_ROOT, 'docs', 'repurpose');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public', 'repurpose');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function buildIndex(signals, runId) {
  return {
    run_id: runId,
    updated_at: new Date().toISOString(),
    total: signals.length,
    signals: signals.map((signal) => ({
      signal_id: signal.signal_id,
      compound: signal.compound,
      proposed_species: signal.proposed_species,
      proposed_condition: signal.proposed_condition,
      confidence_score: signal.confidence_score,
      risk_overall: signal.risk?.overall_risk ?? null,
      summary_hypothesis: signal.summary_hypothesis,
      executive_summary: signal.reasoning_summaries?.executive_summary ?? [],
      disclaimer: signal.disclaimer,
    })),
  };
}

function publishSignals(signals, runId) {
  const index = buildIndex(signals, runId);
  const indexName = 'signals.json';

  writeJson(path.join(MEMORY_DIR, indexName), index);
  writeJson(path.join(DOCS_DIR, indexName), index);
  writeJson(path.join(PUBLIC_DIR, indexName), index);

  for (const signal of signals) {
    const fileName = `${signal.signal_id}.json`;
    writeJson(path.join(MEMORY_DIR, 'signals', fileName), signal);
    writeJson(path.join(DOCS_DIR, 'signals', fileName), signal);
    writeJson(path.join(PUBLIC_DIR, 'signals', fileName), signal);
  }

  writeJson(path.join(MEMORY_DIR, 'last-run.json'), {
    run_id: runId,
    updated_at: new Date().toISOString(),
  });

  return {
    memory: path.join(MEMORY_DIR, indexName),
    docs: path.join(DOCS_DIR, indexName),
    public: path.join(PUBLIC_DIR, indexName),
  };
}

function publishDocuments(documents) {
  const payload = {
    updated_at: new Date().toISOString(),
    total: documents.length,
    documents,
  };
  writeJson(path.join(MEMORY_DIR, 'documents.json'), payload);
  writeJson(path.join(DOCS_DIR, 'documents.json'), payload);
  writeJson(path.join(PUBLIC_DIR, 'documents.json'), payload);
  return payload.total;
}

module.exports = {
  publishSignals,
  publishDocuments,
};
