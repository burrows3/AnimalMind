const CANDIDATE_MAP = {
  'Osteoarthritis': [
    {
      compound: 'Compound AX-17 (example)',
      original_indication: 'Human osteoarthritis',
      mechanism: 'Inflammatory pathway modulation',
      source_docs: ['ctgov:EXAMPLE-OA-001'],
    },
  ],
  'Chronic kidney disease': [
    {
      compound: 'Compound RN-44 (example)',
      original_indication: 'Human CKD fibrosis',
      mechanism: 'Anti-fibrotic signaling',
      source_docs: ['ctgov:EXAMPLE-CKD-002'],
    },
  ],
  'Laminitis': [
    {
      compound: 'Compound LM-12 (example)',
      original_indication: 'Human peripheral vascular disease',
      mechanism: 'Microvascular perfusion support',
      source_docs: ['ctgov:EXAMPLE-LAM-003'],
    },
  ],
};

function candidateCompoundFinder(problemBriefs) {
  const candidates = [];
  for (const brief of problemBriefs) {
    const list = CANDIDATE_MAP[brief.condition] || [];
    for (const item of list) {
      candidates.push({
        ...item,
        target_species: brief.target_species,
        target_condition: brief.condition,
        problem_id: brief.problem_id,
      });
    }
  }
  return candidates;
}

module.exports = {
  candidateCompoundFinder,
};
