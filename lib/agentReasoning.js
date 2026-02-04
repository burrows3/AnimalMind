const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const AGENT_OUTPUTS = path.join(MEMORY_DIR, 'agent-outputs');

const FILES = {
  surveillance: path.join(AGENT_OUTPUTS, 'surveillance-review.md'),
  literature: path.join(AGENT_OUTPUTS, 'literature-review.md'),
  synthesis: path.join(MEMORY_DIR, 'opportunities.md'),
};

function readSafe(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  } catch {
    return '';
  }
}

function extractLastRun(text) {
  const match = text.match(/\*\*Last run:\*\*\s*(.+)/i);
  return match ? match[1].trim() : null;
}

function extractSection(text, headingRegex) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (headingRegex.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (/^#{1,6}\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const section = lines.slice(start, end).join('\n').trim();
  return section || null;
}

function toTimestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getAgentReasoning() {
  const surveillanceText = readSafe(FILES.surveillance);
  const literatureText = readSafe(FILES.literature);
  const synthesisText = readSafe(FILES.synthesis);

  const surveillance = {
    lastRun: extractLastRun(surveillanceText),
    reasoning: extractSection(surveillanceText, /^#{2,6}\s+LLM reasoning\s+\(NVIDIA\)/i),
  };
  const literature = {
    lastRun: extractLastRun(literatureText),
    reasoning: extractSection(literatureText, /^#{2,6}\s+LLM reasoning\s+\(NVIDIA\)/i),
  };
  const synthesis = {
    lastRun: extractLastRun(synthesisText),
    reasoning: extractSection(synthesisText, /^#{2,6}\s+LLM synthesis\s+\(NVIDIA\)/i),
  };

  const timestamps = [surveillance.lastRun, literature.lastRun, synthesis.lastRun]
    .map(toTimestamp)
    .filter((t) => t !== null);
  const updatedAt = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

  return {
    updatedAt,
    surveillance,
    literature,
    synthesis,
  };
}

module.exports = {
  getAgentReasoning,
  extractSection,
};
