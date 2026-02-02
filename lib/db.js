/**
 * SQLite database for ingested data. Sorted by data_type and condition_or_topic.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'memory', 'animalmind.db');

let db = null;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS ingested (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_type TEXT NOT NULL,
      source TEXT NOT NULL,
      condition_or_topic TEXT NOT NULL,
      title TEXT,
      url TEXT,
      external_id TEXT NOT NULL,
      published_at TEXT,
      fetched_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source, external_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ingested_data_type ON ingested(data_type);
    CREATE INDEX IF NOT EXISTS idx_ingested_condition ON ingested(condition_or_topic);
    CREATE INDEX IF NOT EXISTS idx_ingested_fetched ON ingested(fetched_at);
  `);
}

/**
 * Upsert one row. data_type: 'literature' | 'surveillance'. source: 'pubmed' | 'cdc_travel_notices'.
 */
function upsertIngested(row) {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO ingested (data_type, source, condition_or_topic, title, url, external_id, published_at, fetched_at)
    VALUES (@data_type, @source, @condition_or_topic, @title, @url, @external_id, @published_at, @fetched_at)
    ON CONFLICT(source, external_id) DO UPDATE SET
      title = excluded.title,
      url = excluded.url,
      published_at = excluded.published_at,
      fetched_at = excluded.fetched_at,
      condition_or_topic = excluded.condition_or_topic
  `);
  stmt.run(row);
}

/**
 * Get all ingested rows sorted by data_type, then condition_or_topic, then published_at desc.
 */
function getIngestedSorted() {
  const d = getDb();
  return d.prepare(`
    SELECT id, data_type, source, condition_or_topic, title, url, external_id, published_at, fetched_at
    FROM ingested
    ORDER BY data_type, condition_or_topic, published_at DESC
  `).all();
}

/**
 * Get rows grouped by data_type then condition_or_topic (for report).
 */
function getIngestedGrouped() {
  const rows = getIngestedSorted();
  const byType = {};
  for (const r of rows) {
    if (!byType[r.data_type]) byType[r.data_type] = {};
    if (!byType[r.data_type][r.condition_or_topic]) byType[r.data_type][r.condition_or_topic] = [];
    byType[r.data_type][r.condition_or_topic].push(r);
  }
  return byType;
}

/**
 * Get meta for dashboard: lastFetched, counts by type.
 */
function getIngestedMeta() {
  const d = getDb();
  const last = d.prepare(`SELECT fetched_at FROM ingested ORDER BY fetched_at DESC LIMIT 1`).get();
  const counts = d.prepare(`
    SELECT data_type, COUNT(*) as count FROM ingested GROUP BY data_type
  `).all();
  const byType = {};
  for (const row of counts) byType[row.data_type] = row.count;
  return {
    lastFetched: last ? last.fetched_at : null,
    totalSurveillance: byType.surveillance || 0,
    totalLiterature: byType.literature || 0,
    counts: byType,
  };
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  initSchema,
  upsertIngested,
  getIngestedSorted,
  getIngestedGrouped,
  getIngestedMeta,
  closeDb,
  DB_PATH,
};
