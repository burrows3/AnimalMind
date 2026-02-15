const { trendNeedFinder } = require('./agents/trendNeedFinder');
const { candidateCompoundFinder } = require('./agents/candidateFinder');
const { failureReasonExtractor } = require('./agents/failureReasonExtractor');
const { speciesAdvantageAnalyzer } = require('./agents/speciesAdvantageAnalyzer');
const { vetSignalMiner } = require('./agents/vetSignalMiner');
const { riskScreener } = require('./agents/riskScreener');
const { buildSignal } = require('./agents/hypothesisSynthesizer');
const { priorArtScout } = require('./agents/priorArtScout');
const { publishSignals } = require('./publisher/publish');
const { buildRunId } = require('./utils/id');

function runRepurposeEngine({ runId = buildRunId(), includePriorArt = false }) {
  const problemBriefs = trendNeedFinder();
  const candidates = candidateCompoundFinder(problemBriefs).map((c, idx) => ({ ...c, index: idx }));

  const signals = candidates.map((candidate) => {
    const failureBundle = failureReasonExtractor(candidate);
    const speciesBundles = speciesAdvantageAnalyzer(candidate);
    const vetEvidenceBundles = vetSignalMiner(candidate);
    const riskBundles = riskScreener(candidate);

    const signal = buildSignal({
      candidate,
      failureBundle,
      speciesBundles,
      vetEvidenceBundles,
      riskBundles,
      runId,
    });

    if (includePriorArt) {
      signal.prior_art = priorArtScout(signal);
    }

    return signal;
  });

  const outputs = publishSignals(signals, runId);
  return { runId, signals, outputs };
}

module.exports = {
  runRepurposeEngine,
};
