const RISK_DB = {
  'Compound AX-17 (example)': {
    canine: {
      overall_risk: 35,
      risk_flags: [
        { flag: 'GI intolerance risk', severity: 2, evidence_doc_ids: ['ctgov:EXAMPLE-OA-001'] },
      ],
    },
  },
  'Compound RN-44 (example)': {
    feline: {
      overall_risk: 55,
      risk_flags: [
        { flag: 'Renal clearance uncertainty', severity: 3, evidence_doc_ids: ['ctgov:EXAMPLE-CKD-002'] },
      ],
    },
  },
  'Compound LM-12 (example)': {
    equine: {
      overall_risk: 72,
      risk_flags: [
        { flag: 'Cardiovascular risk profile unclear', severity: 4, evidence_doc_ids: ['ctgov:EXAMPLE-LAM-003'] },
      ],
    },
  },
};

function riskScreener(candidate) {
  const speciesList = candidate.target_species || [];
  return speciesList.map((species) => {
    const record = RISK_DB[candidate.compound]?.[species] || {
      overall_risk: 40,
      risk_flags: [],
    };
    return {
      compound: candidate.compound,
      target_species: species,
      risk_flags: record.risk_flags,
      overall_risk: record.overall_risk,
    };
  });
}

module.exports = {
  riskScreener,
};
