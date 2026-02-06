#!/usr/bin/env node
/**
 * Veterinary Drug Repurpose Engine runner.
 * Outputs RepurposeSignal JSON (research hypotheses only).
 */

require('../lib/env');
const { fixtureSignals, fixtureDocuments } = require('../repurpose-engine/fixtures');
const { publishSignals, publishDocuments } = require('../repurpose-engine/publisher/publish');
const { runRepurposeEngine } = require('../repurpose-engine');
const { buildRunId } = require('../repurpose-engine/utils/id');
const { writeLog } = require('../repurpose-engine/utils/logger');
const { fetchVetSignals } = require('../repurpose-engine/connectors/pubmed');
const { fetchFailedTrials } = require('../repurpose-engine/connectors/clinicaltrials');

async function main() {
  const runId = process.env.REPURPOSE_RUN_ID || buildRunId();
  const useFixtures = process.env.REPURPOSE_USE_FIXTURES === '1';
  const fetchLive = process.env.REPURPOSE_FETCH_LIVE === '1';
  const includePriorArt = process.env.REPURPOSE_INCLUDE_PRIOR_ART === '1';

  let documents = fixtureDocuments();
  if (fetchLive) {
    try {
      const [vetDocs, trialDocs] = await Promise.all([
        fetchVetSignals(),
        fetchFailedTrials('drug terminated', 'TERMINATED', 10),
      ]);
      documents = [...vetDocs, ...trialDocs];
    } catch {
      documents = fixtureDocuments();
    }
  }

  let signals;
  let outputs;
  const documentCount = publishDocuments(documents);
  if (useFixtures) {
    signals = fixtureSignals();
    outputs = publishSignals(signals, runId);
  } else {
    const result = runRepurposeEngine({ runId, includePriorArt });
    signals = result.signals;
    outputs = result.outputs;
  }

  const logPayload = {
    run_id: runId,
    started_at: new Date().toISOString(),
    use_fixtures: useFixtures,
    fetch_live: fetchLive,
    include_prior_art: includePriorArt,
    document_count: documentCount,
    signal_count: signals.length,
    outputs,
  };
  const logPath = writeLog(runId, logPayload);
  console.log('Repurpose run complete:', runId);
  console.log('Signals:', signals.length);
  console.log('Log:', logPath);
}

main().catch((err) => {
  console.error('repurpose-run failed:', err.message);
  process.exit(1);
});
