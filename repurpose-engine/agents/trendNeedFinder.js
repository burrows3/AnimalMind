const DEFAULT_PROBLEM_BRIEFS = [
  {
    problem_id: 'canine-osteoarthritis',
    target_species: ['canine'],
    condition: 'Osteoarthritis',
    keywords: ['pain', 'inflammation', 'mobility'],
    rationale: 'High prevalence with ongoing need for safer long-term management.',
  },
  {
    problem_id: 'feline-ckd',
    target_species: ['feline'],
    condition: 'Chronic kidney disease',
    keywords: ['renal', 'fibrosis', 'glomerular'],
    rationale: 'Progressive disease with limited disease-modifying options.',
  },
  {
    problem_id: 'equine-laminitis',
    target_species: ['equine'],
    condition: 'Laminitis',
    keywords: ['inflammation', 'vascular', 'metabolic'],
    rationale: 'Severe outcomes; need for mechanism-based interventions.',
  },
];

function trendNeedFinder() {
  return DEFAULT_PROBLEM_BRIEFS;
}

module.exports = {
  trendNeedFinder,
};
