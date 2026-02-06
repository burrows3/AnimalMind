const RATIONALE_DB = {
  'Compound AX-17 (example)': {
    canine: [
      {
        hypothesis: 'Canine inflammatory response may be more responsive to short-term modulation.',
        biological_basis: 'Species differences in inflammatory mediator profiles and activity patterns.',
        evidence_doc_ids: ['pmid:EXAMPLE-VET-101'],
        confidence: 0.55,
      },
    ],
  },
  'Compound RN-44 (example)': {
    feline: [
      {
        hypothesis: 'Feline CKD progression windows may allow earlier intervention.',
        biological_basis: 'Different progression tempo and management context in cats.',
        evidence_doc_ids: ['pmid:EXAMPLE-VET-202'],
        confidence: 0.5,
      },
    ],
  },
  'Compound LM-12 (example)': {
    equine: [
      {
        hypothesis: 'Equine laminitis endpoints differ from human perfusion metrics.',
        biological_basis: 'Different clinical outcome measures and care pathways.',
        evidence_doc_ids: ['pmid:EXAMPLE-VET-303'],
        confidence: 0.52,
      },
    ],
  },
};

function speciesAdvantageAnalyzer(candidate) {
  const speciesList = candidate.target_species || [];
  const rationaleBySpecies = RATIONALE_DB[candidate.compound] || {};
  return speciesList.map((species) => ({
    compound: candidate.compound,
    target_species: species,
    rationale_points: rationaleBySpecies[species] || [
      {
        hypothesis: 'Species-specific factors may alter response.',
        biological_basis: 'Limited public evidence; requires targeted review.',
        evidence_doc_ids: candidate.source_docs || [],
        confidence: 0.3,
      },
    ],
    pk_pd_notes: 'No dosing guidance provided; research-only hypothesis.',
  }));
}

module.exports = {
  speciesAdvantageAnalyzer,
};
