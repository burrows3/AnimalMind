const path = require('path');

const schemaPath = (name) => path.join(__dirname, name);

module.exports = {
  document: schemaPath('document.schema.json'),
  failureReason: schemaPath('failure-reason.schema.json'),
  speciesRationale: schemaPath('species-rationale.schema.json'),
  vetEvidence: schemaPath('vet-evidence.schema.json'),
  risk: schemaPath('risk.schema.json'),
  reasoningSummaries: schemaPath('reasoning-summaries.schema.json'),
  repurposeSignal: schemaPath('repurpose-signal.schema.json'),
  priorArt: schemaPath('prior-art.schema.json'),
};
