function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function buildRunId(prefix = 'repurpose') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${stamp}`;
}

function buildSignalId(compound, condition, index) {
  const base = `${slugify(compound)}-${slugify(condition)}` || `signal-${index}`;
  return `repurpose-${base}-${String(index + 1).padStart(2, '0')}`;
}

module.exports = {
  slugify,
  buildRunId,
  buildSignalId,
};
