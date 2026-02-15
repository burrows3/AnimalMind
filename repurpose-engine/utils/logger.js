const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'memory', 'repurpose', 'logs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeLog(runId, payload) {
  ensureDir(LOG_DIR);
  const outPath = path.join(LOG_DIR, `${runId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return outPath;
}

module.exports = {
  writeLog,
  LOG_DIR,
};
