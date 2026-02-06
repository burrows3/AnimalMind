const FAILURE_DB = {
  'Compound AX-17 (example)': {
    failure_type: 'efficacy',
    key_reasons: [
      {
        reason: 'Primary endpoint did not reach statistical significance in target population.',
        evidence_doc_ids: ['ctgov:EXAMPLE-OA-001'],
        confidence: 0.7,
      },
      {
        reason: 'Enrollment skewed toward late-stage disease, limiting responsiveness.',
        evidence_doc_ids: ['ctgov:EXAMPLE-OA-001'],
        confidence: 0.55,
      },
    ],
    trial_metadata: {
      phase: 'Phase 2',
      endpoint: 'Pain score reduction',
      population: 'Adults with advanced OA',
      dose_range: 'Example dosing range',
    },
  },
  'Compound RN-44 (example)': {
    failure_type: 'pk',
    key_reasons: [
      {
        reason: 'Insufficient bioavailability at planned dosing window.',
        evidence_doc_ids: ['ctgov:EXAMPLE-CKD-002'],
        confidence: 0.65,
      },
    ],
    trial_metadata: {
      phase: 'Phase 2',
      endpoint: 'eGFR stabilization',
      population: 'Stage 3 CKD',
      dose_range: 'Example dosing range',
    },
  },
  'Compound LM-12 (example)': {
    failure_type: 'trial_design',
    key_reasons: [
      {
        reason: 'Trial endpoints focused on short-term perfusion and missed chronic outcomes.',
        evidence_doc_ids: ['ctgov:EXAMPLE-LAM-003'],
        confidence: 0.6,
      },
    ],
    trial_metadata: {
      phase: 'Phase 1/2',
      endpoint: 'Perfusion index',
      population: 'Peripheral vascular disease',
      dose_range: 'Example dosing range',
    },
  },
};

function failureReasonExtractor(candidate) {
  const record = FAILURE_DB[candidate.compound] || {
    failure_type: 'unknown',
    key_reasons: [
      {
        reason: 'Failure reason not clearly disclosed in public summary.',
        evidence_doc_ids: candidate.source_docs || [],
        confidence: 0.3,
      },
    ],
  };

  return {
    compound: candidate.compound,
    original_indication: candidate.original_indication,
    failure_type: record.failure_type,
    key_reasons: record.key_reasons,
    trial_metadata: record.trial_metadata,
  };
}

module.exports = {
  failureReasonExtractor,
};
