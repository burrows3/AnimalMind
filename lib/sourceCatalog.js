/**
 * Canonical source metadata for AnimalMind ingest and brief quality scoring.
 * Lower tier number means higher editorial/operational trust.
 */

const SOURCE_CATALOG = [
  {
    id: "pubmed_recent",
    name: "PubMed core literature",
    type: "research",
    tier: 1,
    audience: "both",
    requiredForCoverage: true,
  },
  {
    id: "pubmed_cancer",
    name: "PubMed veterinary oncology",
    type: "research",
    tier: 1,
    audience: "pro",
    requiredForCoverage: false,
  },
  {
    id: "pubmed_case_reports",
    name: "PubMed case reports",
    type: "research",
    tier: 1,
    audience: "pro",
    requiredForCoverage: false,
  },
  {
    id: "pubmed_clinical",
    name: "PubMed clinical practice",
    type: "research",
    tier: 1,
    audience: "pro",
    requiredForCoverage: true,
  },
  {
    id: "pubmed_small_animal",
    name: "PubMed small animal",
    type: "research",
    tier: 1,
    audience: "both",
    requiredForCoverage: false,
  },
  {
    id: "pubmed_equine",
    name: "PubMed equine",
    type: "research",
    tier: 1,
    audience: "pro",
    requiredForCoverage: false,
  },
  {
    id: "pubmed_pet_owner",
    name: "PubMed pet owner guidance",
    type: "research",
    tier: 1,
    audience: "pet",
    requiredForCoverage: false,
  },
  {
    id: "autonomous_topics",
    name: "Autonomous-agent topic ingest",
    type: "research",
    tier: 1,
    audience: "pro",
    requiredForCoverage: false,
  },
  {
    id: "cdc_travel_notices",
    name: "CDC travel notices",
    type: "surveillance",
    tier: 1,
    audience: "both",
    requiredForCoverage: true,
  },
  {
    id: "ecdc_avian_flu",
    name: "ECDC avian influenza",
    type: "surveillance",
    tier: 1,
    audience: "pro",
    requiredForCoverage: false,
  },
  {
    id: "fda_pet_recalls",
    name: "FDA Animal & Veterinary pet recalls",
    type: "regulatory",
    tier: 1,
    audience: "both",
    requiredForCoverage: false,
  },
  {
    id: "cfia_pet_recalls",
    name: "CFIA pet-related recalls (Canada)",
    type: "regulatory",
    tier: 1,
    audience: "both",
    requiredForCoverage: false,
  },
  {
    id: "fsa_pet_recalls",
    name: "FSA pet-related alerts (United Kingdom)",
    type: "regulatory",
    tier: 2,
    audience: "both",
    requiredForCoverage: false,
  },
  {
    id: "fsanz_pet_recalls",
    name: "FSANZ pet-related recalls (Australia/NZ)",
    type: "regulatory",
    tier: 2,
    audience: "both",
    requiredForCoverage: false,
  },
  {
    id: "rasff_pet_feed_alerts",
    name: "EU RASFF pet feed alerts",
    type: "regulatory",
    tier: 1,
    audience: "both",
    requiredForCoverage: false,
  },
  {
    id: "curated_datasets",
    name: "Curated veterinary datasets",
    type: "clinical",
    tier: 2,
    audience: "both",
    requiredForCoverage: true,
  },
  {
    id: "tcia_imaging",
    name: "TCIA veterinary imaging",
    type: "research",
    tier: 2,
    audience: "pro",
    requiredForCoverage: false,
  },
];

const SOURCE_CATALOG_BY_ID = Object.fromEntries(
  SOURCE_CATALOG.map((source) => [source.id, source])
);

function getSourceCatalog() {
  return SOURCE_CATALOG.slice();
}

function getSourceMeta(sourceId) {
  return SOURCE_CATALOG_BY_ID[sourceId] || null;
}

module.exports = {
  SOURCE_CATALOG,
  getSourceCatalog,
  getSourceMeta,
};
