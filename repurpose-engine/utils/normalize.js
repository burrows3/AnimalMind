const KNOWN_SPECIES = {
  dog: 'canine',
  dogs: 'canine',
  canine: 'canine',
  cat: 'feline',
  cats: 'feline',
  feline: 'feline',
  horse: 'equine',
  horses: 'equine',
  equine: 'equine',
  bovine: 'bovine',
  cattle: 'bovine',
};

function normalizeSpecies(value) {
  if (!value) return value;
  const key = String(value).toLowerCase();
  return KNOWN_SPECIES[key] || value;
}

function normalizeList(list, normalizer) {
  if (!Array.isArray(list)) return [];
  const normalized = list.map(normalizer).filter(Boolean);
  return Array.from(new Set(normalized));
}

function normalizeDocument(doc) {
  const entities = doc.entities || {};
  return {
    ...doc,
    entities: {
      drugs: normalizeList(entities.drugs, (v) => (v ? String(v) : v)),
      species: normalizeList(entities.species, normalizeSpecies),
      conditions: normalizeList(entities.conditions, (v) => (v ? String(v) : v)),
      mechanisms: normalizeList(entities.mechanisms, (v) => (v ? String(v) : v)),
    },
  };
}

module.exports = {
  normalizeDocument,
  normalizeSpecies,
};
