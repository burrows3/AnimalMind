const fs = require("fs");
const path = require("path");
const { getSourceMeta } = require("./sourceCatalog");

const BREAKER_STATE_PATH = path.join(__dirname, "..", "memory", "ingest-circuit-breakers.json");

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 800;
const DEFAULT_MAX_FAILURES = 2;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJsonFileSafe(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFileSafe(filePath, payload) {
  try {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // Do not fail ingest on health/snapshot write issues.
  }
}

function loadCircuitState() {
  const raw = readJsonFileSafe(BREAKER_STATE_PATH);
  if (!raw || typeof raw !== "object") return {};
  return raw;
}

function saveCircuitState(state) {
  writeJsonFileSafe(BREAKER_STATE_PATH, state);
}

function getFallbackPayload(snapshotPath, fallbackData) {
  const snapshot = readJsonFileSafe(snapshotPath);
  if (snapshot !== null) return snapshot;
  return fallbackData;
}

/**
 * Run a source fetch with retries, cooldown-based circuit breaker, and snapshot fallback.
 */
async function runSourceTask({
  sourceId,
  fetcher,
  snapshotPath,
  fallbackData = null,
  requiredForCoverage = false,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  maxFailures = DEFAULT_MAX_FAILURES,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}) {
  const meta = getSourceMeta(sourceId);
  const state = loadCircuitState();
  const sourceState = state[sourceId] || { failures: 0, cooldownUntil: 0, lastError: null, lastSuccessAt: null };
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  if (sourceState.cooldownUntil && now < sourceState.cooldownUntil) {
    const fallback = getFallbackPayload(snapshotPath, fallbackData);
    if (fallback !== null) {
      return {
        data: fallback,
        health: {
          sourceId,
          name: meta?.name || sourceId,
          type: meta?.type || "other",
          tier: meta?.tier || 4,
          audience: meta?.audience || "both",
          requiredForCoverage,
          mode: "cached",
          status: "stale",
          attempts: 0,
          latencyMs: 0,
          lastAttemptAt: nowIso,
          lastSuccessAt: sourceState.lastSuccessAt || null,
          lastError: sourceState.lastError || "Source on cooldown; using cached snapshot.",
        },
      };
    }
  }

  let attempts = 0;
  let lastError = null;
  const started = Date.now();

  while (attempts <= maxRetries) {
    attempts += 1;
    try {
      const data = await fetcher();
      writeJsonFileSafe(snapshotPath, data);

      state[sourceId] = {
        failures: 0,
        cooldownUntil: 0,
        lastError: null,
        lastSuccessAt: new Date().toISOString(),
      };
      saveCircuitState(state);

      return {
        data,
        health: {
          sourceId,
          name: meta?.name || sourceId,
          type: meta?.type || "other",
          tier: meta?.tier || 4,
          audience: meta?.audience || "both",
          requiredForCoverage,
          mode: "live",
          status: "fresh",
          attempts,
          latencyMs: Date.now() - started,
          lastAttemptAt: new Date().toISOString(),
          lastSuccessAt: state[sourceId].lastSuccessAt,
          lastError: null,
        },
      };
    } catch (error) {
      lastError = error && error.message ? error.message : String(error);
      if (attempts <= maxRetries) {
        await sleep(retryDelayMs * 2 ** (attempts - 1));
      }
    }
  }

  const failures = (sourceState.failures || 0) + 1;
  const shouldCooldown = failures >= maxFailures;
  state[sourceId] = {
    failures,
    cooldownUntil: shouldCooldown ? Date.now() + cooldownMs : 0,
    lastError,
    lastSuccessAt: sourceState.lastSuccessAt || null,
  };
  saveCircuitState(state);

  const fallback = getFallbackPayload(snapshotPath, fallbackData);
  if (fallback !== null) {
    return {
      data: fallback,
      health: {
        sourceId,
        name: meta?.name || sourceId,
        type: meta?.type || "other",
        tier: meta?.tier || 4,
        audience: meta?.audience || "both",
        requiredForCoverage,
        mode: "cached",
        status: "stale",
        attempts,
        latencyMs: Date.now() - started,
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: state[sourceId].lastSuccessAt,
        lastError,
      },
    };
  }

  return {
    data: fallbackData,
    health: {
      sourceId,
      name: meta?.name || sourceId,
      type: meta?.type || "other",
      tier: meta?.tier || 4,
      audience: meta?.audience || "both",
      requiredForCoverage,
      mode: "unavailable",
      status: "error",
      attempts,
      latencyMs: Date.now() - started,
      lastAttemptAt: new Date().toISOString(),
      lastSuccessAt: state[sourceId].lastSuccessAt,
      lastError,
    },
  };
}

function writeSourceHealthSnapshot(outputPath, healthEntries) {
  const bySource = new Map();
  for (const entry of healthEntries || []) {
    if (!entry || !entry.sourceId) continue;
    bySource.set(entry.sourceId, entry);
  }
  writeJsonFileSafe(outputPath, {
    generatedAt: new Date().toISOString(),
    sources: Array.from(bySource.values()).sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
  });
}

module.exports = {
  runSourceTask,
  writeSourceHealthSnapshot,
};
