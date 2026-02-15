const VET_EVIDENCE_DB = {
  'Compound AX-17 (example)': {
    canine: {
      condition: 'Osteoarthritis',
      evidence_items: [
        {
          type: 'case_report',
          finding: 'Single case report suggests improved mobility in canine OA model.',
          sample_size: 'n=1',
          evidence_doc_ids: ['pmid:EXAMPLE-VET-101'],
          strength_grade: 'weak',
        },
      ],
      overall_strength: 'weak',
    },
  },
  'Compound RN-44 (example)': {
    feline: {
      condition: 'Chronic kidney disease',
      evidence_items: [
        {
          type: 'retrospective',
          finding: 'Retrospective review notes potential stabilization signal.',
          sample_size: 'n=18',
          evidence_doc_ids: ['pmid:EXAMPLE-VET-202'],
          strength_grade: 'moderate',
        },
      ],
      overall_strength: 'moderate',
    },
  },
  'Compound LM-12 (example)': {
    equine: {
      condition: 'Laminitis',
      evidence_items: [
        {
          type: 'mechanistic',
          finding: 'Mechanistic study aligns with perfusion support hypothesis.',
          sample_size: 'n=12',
          evidence_doc_ids: ['pmid:EXAMPLE-VET-303'],
          strength_grade: 'weak',
        },
      ],
      overall_strength: 'weak',
    },
  },
};

function vetSignalMiner(candidate) {
  const speciesList = candidate.target_species || [];
  return speciesList.map((species) => {
    const record = VET_EVIDENCE_DB[candidate.compound]?.[species] || {
      condition: candidate.target_condition,
      evidence_items: [],
      overall_strength: 'weak',
    };
    return {
      compound: candidate.compound,
      target_species: species,
      target_condition: record.condition,
      evidence_items: record.evidence_items,
      overall_strength: record.overall_strength,
    };
  });
}

module.exports = {
  vetSignalMiner,
};
