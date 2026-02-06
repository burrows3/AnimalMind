/**
 * Animal Research Network – minimal frontend + API (built by ChatVet).
 * Serves ingested data from the DB and a single-page dashboard.
 * Run: npm run start → http://localhost:3000
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { getIngestedGrouped, getIngestedMeta, getIngestedSorted } = require('./lib/db');
const { getAgentReasoning } = require('./lib/agentReasoning');
const { getTopicSummary } = require('./lib/topicSummary');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory rate limit: max requests per window per IP
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 60;
const rateStore = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateStore.get(ip);
  if (!entry) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateStore.set(ip, entry);
  }
  if (now >= entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW_MS;
  }
  entry.count += 1;
  if (entry.count > RATE_MAX_REQUESTS) {
    res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
    return;
  }
  next();
}

// Security headers: no secrets in UI; reduce XSS, clickjacking, and info leakage
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// API: ingested data + meta (counts, last updated) for dashboard. Read-only; no credentials.
app.get('/api/ingested', (req, res) => {
  try {
    const meta = getIngestedMeta();
    const data = getIngestedGrouped();
    res.json({ meta, data });
  } catch (e) {
    res.status(500).json({ error: 'Service temporarily unavailable.' });
  }
});

// API: dashboard payload (summary + flat ingested list) so UI shows live data after ingest.
const INGESTED_EXPORT_LIMIT = 200;
app.get('/api/dashboard', (req, res) => {
  try {
    const meta = getIngestedMeta();
    const summary = {
      lastUpdated: meta.lastFetched || null,
      counts: meta.counts || {},
    };
    const reasoning = getAgentReasoning();
    const topicSummary = getTopicSummary();
    const rows = getIngestedSorted()
      .slice(0, INGESTED_EXPORT_LIMIT)
      .map((r) => ({
        data_type: r.data_type,
        condition_or_topic: r.condition_or_topic || '',
        title: r.title || '',
        url: r.url || '',
      }));
    res.json({ summary, ingested: rows, reasoning, topicSummary });
  } catch (e) {
    res.status(500).json({ error: 'Service temporarily unavailable.' });
  }
});

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

app.get('/api/repurpose/signals', rateLimit, (req, res) => {
  const indexPath = path.join(__dirname, 'memory', 'repurpose', 'signals.json');
  const data = readJsonSafe(indexPath);
  if (!data) {
    return res.status(404).json({ error: 'Repurpose signals not available.' });
  }
  return res.json(data);
});

app.get('/api/repurpose/signals/:id', rateLimit, (req, res) => {
  const fileName = `${req.params.id}.json`;
  const filePath = path.join(__dirname, 'memory', 'repurpose', 'signals', fileName);
  const data = readJsonSafe(filePath);
  if (!data) {
    return res.status(404).json({ error: 'Repurpose signal not found.' });
  }
  return res.json(data);
});

app.get('/api/repurpose/documents', rateLimit, (req, res) => {
  const docsPath = path.join(__dirname, 'memory', 'repurpose', 'documents.json');
  const data = readJsonSafe(docsPath);
  if (!data) {
    return res.status(404).json({ error: 'Repurpose documents not available.' });
  }
  return res.json(data);
});

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: serve index.html for /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function tryListen(port, maxTries = 5) {
  const server = app.listen(port, () => {
    console.log(`Animal Research Network → http://localhost:${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port - PORT < maxTries) {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      tryListen(port + 1, maxTries);
    } else {
      console.error(`Cannot bind to port ${port}.`);
      console.error('Free the port (e.g. close the other Node window) or use: set PORT=3001 && npm start');
      process.exit(1);
    }
  });
}

tryListen(PORT);
