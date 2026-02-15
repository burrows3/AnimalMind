const fs = require("fs");
const path = require("path");
const { getSourceCatalog } = require("./sourceCatalog");

const SOURCE_HEALTH_PATH = path.join(__dirname, "..", "memory", "source-health.json");

// Ingest runs every 12 hours, so these windows are tuned for that cadence.
const FRESH_MS = 18 * 60 * 60 * 1000;
const STALE_MS = 36 * 60 * 60 * 1000;
const VERY_STALE_MS = 72 * 60 * 60 * 1000;

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function statusFromAge(lastSuccessAt, mode, fallbackStatus) {
  if (fallbackStatus === "error" || mode === "unavailable") return "error";
  if (!lastSuccessAt) return "no_data";
  const ts = new Date(lastSuccessAt).getTime();
  if (Number.isNaN(ts)) return "no_data";
  const age = Date.now() - ts;
  if (age <= FRESH_MS) return "fresh";
  if (age <= STALE_MS) return "stale";
  if (age <= VERY_STALE_MS) return "very_stale";
  return "no_data";
}

function gapMessage(detail) {
  const typeLabel =
    detail.type === "surveillance"
      ? "outbreak surveillance"
      : detail.type === "regulatory"
        ? "regulatory monitoring"
        : detail.type === "clinical"
          ? "clinical guidance"
          : "research monitoring";
  if (detail.status === "error") {
    return `${detail.name} is unavailable; ${typeLabel} may be incomplete.`;
  }
  if (detail.status === "very_stale") {
    return `${detail.name} is delayed; ${typeLabel} may be outdated.`;
  }
  return `${detail.name} has no recent data; ${typeLabel} may miss current signals.`;
}

function normalizeSourceDetail(meta, sourceRow) {
  const row = sourceRow || {};
  const status = statusFromAge(row.lastSuccessAt || null, row.mode || null, row.status || null);
  const ts = row.lastSuccessAt || null;
  const ageMs = ts ? Math.max(0, Date.now() - new Date(ts).getTime()) : null;
  const normalized =
    row.mode === "cached" && status === "fresh"
      ? "stale"
      : status;

  return {
    sourceId: meta.id,
    name: meta.name,
    type: meta.type,
    tier: meta.tier,
    audience: meta.audience,
    requiredForCoverage: !!meta.requiredForCoverage,
    status: normalized,
    mode: row.mode || "unavailable",
    lastUpdate: ts,
    ageMs,
    lastError: row.lastError || null,
  };
}

function loadSourceHealthSnapshot(snapshotPath = SOURCE_HEALTH_PATH) {
  return readJsonSafe(snapshotPath) || { generatedAt: null, sources: [] };
}

function summarizeSourceHealth(snapshotPath = SOURCE_HEALTH_PATH) {
  const snapshot = loadSourceHealthSnapshot(snapshotPath);
  const snapshotById = new Map(
    (Array.isArray(snapshot.sources) ? snapshot.sources : []).map((source) => [source.sourceId, source])
  );

  const catalog = getSourceCatalog();
  const details = catalog.map((meta) => normalizeSourceDetail(meta, snapshotById.get(meta.id)));

  // Include unknown sources for observability, but keep them non-required.
  for (const sourceRow of Array.isArray(snapshot.sources) ? snapshot.sources : []) {
    if (!sourceRow || !sourceRow.sourceId || snapshotById.get(sourceRow.sourceId) == null) continue;
    if (catalog.some((meta) => meta.id === sourceRow.sourceId)) continue;
    details.push({
      sourceId: sourceRow.sourceId,
      name: sourceRow.name || sourceRow.sourceId,
      type: sourceRow.type || "other",
      tier: sourceRow.tier || 4,
      audience: sourceRow.audience || "both",
      requiredForCoverage: false,
      status: sourceRow.status || "no_data",
      mode: sourceRow.mode || "unavailable",
      lastUpdate: sourceRow.lastSuccessAt || null,
      ageMs: sourceRow.lastSuccessAt
        ? Math.max(0, Date.now() - new Date(sourceRow.lastSuccessAt).getTime())
        : null,
      lastError: sourceRow.lastError || null,
    });
  }

  const required = details.filter((item) => item.requiredForCoverage);
  const requiredActive = required.filter((item) => ["fresh", "stale", "very_stale"].includes(item.status));
  const coveragePercent = required.length
    ? Math.round((requiredActive.length / required.length) * 100)
    : 0;

  const staleCount = details.filter((item) => item.status === "stale" || item.status === "very_stale").length;
  const errorCount = details.filter((item) => item.status === "error").length;
  const noDataCount = details.filter((item) => item.status === "no_data").length;

  const updates = details
    .map((item) => item.lastUpdate)
    .filter(Boolean)
    .map((iso) => new Date(iso).getTime())
    .filter((n) => !Number.isNaN(n));

  const intelligenceGaps = details
    .filter((item) => item.status === "error" || item.status === "very_stale" || item.status === "no_data")
    .map((item) => ({
      sourceId: item.sourceId,
      severity: item.requiredForCoverage || item.status === "error" ? "critical" : "warning",
      message: gapMessage(item),
    }))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));

  const hasCriticalGaps = intelligenceGaps.some((gap) => gap.severity === "critical");
  let overallStatus = "insufficient";
  if (coveragePercent >= 80 && !hasCriticalGaps) {
    overallStatus = "sufficient";
  } else if (coveragePercent >= 50) {
    overallStatus = "limited";
  }

  return {
    summary: {
      generatedAt: snapshot.generatedAt || null,
      overallStatus,
      coveragePercent,
      totalSources: details.length,
      requiredSources: required.length,
      staleSources: staleCount,
      errorSources: errorCount,
      noDataSources: noDataCount,
      newestUpdate: updates.length ? new Date(Math.max(...updates)).toISOString() : null,
      oldestUpdate: updates.length ? new Date(Math.min(...updates)).toISOString() : null,
    },
    details,
    intelligenceGaps,
  };
}

module.exports = {
  SOURCE_HEALTH_PATH,
  loadSourceHealthSnapshot,
  summarizeSourceHealth,
};
