const { scoreSignal } = require('../scoring/scoring');
const { buildSignalId } = require('../utils/id');

function averageConfidence(points) {
  if (!points.length) return 0.3;
  const sum = points.reduce((acc, item) => acc + (item.confidence || 0), 0);
  return sum / points.length;
}

function buildReasoningSummaries({
  compound,
  failureSummary,
  failureType,
  speciesSummaries,
  evidenceSummary,
  riskSummary,
  nextStepsSummary,
}) {
  return {
    executive_summary: [
      `${compound}: ${failureSummary}`,
      speciesSummaries[0] ? speciesSummaries[0].summary : 'Species rationale requires additional review.',
      evidenceSummary,
      riskSummary,
    ].filter(Boolean),
    failure_summary: `${failureSummary} Failure type: ${failureType}.`,
    species_benefit_summary: speciesSummaries,
    evidence_summary: evidenceSummary,
    risk_summary: riskSummary,
    next_steps_summary: nextStepsSummary,
  };
}

function buildSignal({
  candidate,
  failureBundle,
  speciesBundles,
  vetEvidenceBundles,
  riskBundles,
  runId,
}) {
  const species = candidate.target_species || [];
  const speciesRationalePoints = speciesBundles.flatMap((b) => b.rationale_points || []);
  const rationaleConfidence = averageConfidence(speciesRationalePoints);
  const vetStrength = vetEvidenceBundles[0]?.overall_strength || 'weak';
  const vetDocs = vetEvidenceBundles.flatMap((b) =>
    b.evidence_items.flatMap((item) => item.evidence_doc_ids || []),
  );
  const failureDocs = failureBundle.key_reasons.flatMap((item) => item.evidence_doc_ids || []);
  const rationaleDocs = speciesRationalePoints.flatMap((item) => item.evidence_doc_ids || []);
  const evidenceDocs = Array.from(new Set([...vetDocs, ...failureDocs, ...rationaleDocs]));
  const riskOverall = Math.max(...riskBundles.map((r) => r.overall_risk || 0), 0);
  const riskFlags = riskBundles.flatMap((r) => r.risk_flags || []);

  const scoring = scoreSignal({
    failureType: failureBundle.failure_type,
    vetEvidenceStrength: vetStrength,
    rationaleConfidence,
    riskScore: riskOverall,
    signalVolume: evidenceDocs.length,
  });

  const failureSummary = failureBundle.key_reasons
    .map((r) => r.reason)
    .slice(0, 2)
    .join(' ');
  const whyAnimalsSummary = speciesRationalePoints
    .map((r) => r.hypothesis)
    .slice(0, 2)
    .join(' ');
  const evidenceSummary = vetEvidenceBundles.length
    ? `Veterinary evidence is ${vetStrength} with ${vetDocs.length} cited item(s). Evidence remains limited.`
    : 'No veterinary evidence found in current sources.';

  const riskSummary = riskOverall >= 70
    ? 'Risk profile is high. Not recommended for further pursuit.'
    : `Risk profile is moderate (${riskOverall}/100) with flagged contraindications requiring review.`;

  const recommendedNextSteps = riskOverall >= 70
    ? ['do_not_pursue']
    : vetStrength === 'strong'
      ? ['retrospective_review', 'pilot_study']
      : ['retrospective_review', 'in_vitro', 'pilot_study'];

  const nextStepsSummary = `Next steps: ${recommendedNextSteps.join(', ')} (research-only).`;

  const speciesSummaries = speciesBundles.map((bundle) => ({
    species: bundle.target_species,
    summary: bundle.rationale_points.length
      ? bundle.rationale_points.map((p) => p.hypothesis).join(' ')
      : 'Species rationale requires additional review.',
  }));

  return {
    signal_id: buildSignalId(candidate.compound, candidate.target_condition, candidate.index || 0),
    compound: candidate.compound,
    proposed_species: species,
    proposed_condition: candidate.target_condition,
    summary_hypothesis: `Research hypothesis: ${candidate.compound} may warrant evaluation for ${candidate.target_condition} in ${species.join(', ')}.`,
    why_failed_originally: {
      summary: failureSummary || 'Failure reason not clearly disclosed in public sources.',
      failure_type: failureBundle.failure_type,
      key_points: failureBundle.key_reasons.map((r) => r.reason),
    },
    why_it_might_work_in_animals: {
      summary: whyAnimalsSummary || 'Species rationale not yet established.',
      key_points: speciesRationalePoints.map((r) => r.hypothesis),
    },
    evidence: {
      vet_strength: vetStrength,
      key_docs: evidenceDocs,
      notes: 'Evidence is research-only and requires validation.',
    },
    risk: {
      overall_risk: riskOverall,
      key_flags: riskFlags.map((f) => `${f.flag} (severity ${f.severity})`),
    },
    novelty_vectors: ['new_species', 'new_indication'],
    confidence_score: scoring.confidence_score,
    addressability_score: scoring.addressability_score,
    translation_risk: scoring.translation_risk,
    score_breakdown: scoring.breakdown,
    recommended_next_steps: recommendedNextSteps,
    provenance: {
      agent_run_ids: [runId],
      timestamps: [new Date().toISOString()],
    },
    reasoning_summaries: buildReasoningSummaries({
      compound: candidate.compound,
      failureSummary: failureSummary || 'Failure reason not clearly disclosed in public sources.',
      failureType: failureBundle.failure_type,
      speciesSummaries,
      evidenceSummary,
      riskSummary,
      nextStepsSummary,
    }),
    disclaimer: 'Research hypothesis only; not medical advice.',
  };
}

module.exports = {
  buildSignal,
};
