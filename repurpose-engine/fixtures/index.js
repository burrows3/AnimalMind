const fs = require('fs');
const path = require('path');

const FIXTURE_DIR = __dirname;

function readJson(fileName) {
  const filePath = path.join(FIXTURE_DIR, fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadFixtureSignals() {
  const signalsDir = path.join(FIXTURE_DIR, 'signals');
  if (!fs.existsSync(signalsDir)) return [];
  return fs.readdirSync(signalsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(fs.readFileSync(path.join(signalsDir, name), 'utf8')));
}

module.exports = {
  fixtureDocuments: () => readJson('documents.json'),
  fixtureSignals: loadFixtureSignals,
};
