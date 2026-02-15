const FAILURE_ADDRESSABILITY = {
  efficacy: 0.7,
  trial_design: 0.7,
  strategy: 0.65,
  pk: 0.6,
  toxicity: 0.3,
  unknown: 0.4,
};

const VET_EVIDENCE_SCORE = {
  weak: 12,
  moderate: 22,
  strong: 32,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreSignal({
  failureType,
  vetEvidenceStrength,
  rationaleConfidence,
  riskScore,
  signalVolume = 0,
}) {
  const vetScore = VET_EVIDENCE_SCORE[vetEvidenceStrength] ?? 10;
  const rationaleScore = clamp(Math.round(rationaleConfidence * 25), 0, 25);
  const addressability = FAILURE_ADDRESSABILITY[failureType] ?? 0.4;
  const addressabilityScore = Math.round(addressability * 20);
  const recencyScore = clamp(Math.round(signalVolume), 0, 10);
  const riskPenalty = Math.round((riskScore / 100) * 40);

  const confidence = clamp(
    vetScore + rationaleScore + addressabilityScore + recencyScore - riskPenalty,
    0,
    100,
  );

  const translationRisk = clamp(Math.round(100 - addressability * 100), 0, 100);

  return {
    confidence_score: confidence,
    addressability_score: Math.round(addressability * 100),
    translation_risk: translationRisk,
    breakdown: {
      vet_evidence: vetScore,
      species_rationale: rationaleScore,
      addressability: addressabilityScore,
      recency_volume: recencyScore,
      risk_penalty: riskPenalty,
    },
  };
}

module.exports = {
  scoreSignal,
};
