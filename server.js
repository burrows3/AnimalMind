/**
 * Animal Research Network – minimal frontend + API (built by ChatVet).
 * Serves ingested data from the DB and a single-page dashboard.
 * Run: npm run start → http://localhost:3000
 */

const express = require('express');
const path = require('path');
const { getIngestedGrouped, getIngestedMeta, getIngestedSorted } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;

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
    const rows = getIngestedSorted()
      .slice(0, INGESTED_EXPORT_LIMIT)
      .map((r) => ({
        data_type: r.data_type,
        condition_or_topic: r.condition_or_topic || '',
        title: r.title || '',
        url: r.url || '',
      }));
    res.json({ summary, ingested: rows });
  } catch (e) {
    res.status(500).json({ error: 'Service temporarily unavailable.' });
  }
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
