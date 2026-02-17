/**
 * Animal Research Network – minimal frontend + API (built by ChatVet).
 * Serves ingested data from the DB and a single-page dashboard.
 * Run: npm run start → http://localhost:3000
 */

require('dotenv').config();
const path = require('path');
// Use frontend .env for Supabase when root .env doesn't set them (e.g. local dev)
require('dotenv').config({ path: path.join(__dirname, 'frontend', '.env') });

const express = require('express');
const fs = require('fs');
const { getIngestedGrouped, getIngestedMeta, getIngestedSorted, getIngestedByTypeSorted } = require('./lib/db');
const { summarizeSourceHealth } = require('./lib/dataFreshness');

const app = express();
const PORT = process.env.PORT || 3000;
const INTERNAL_API_KEY = (process.env.INTERNAL_API_KEY || '').trim();

app.disable('x-powered-by');

// In-memory rate limit: max requests per window per IP (throttle bulk extraction)
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

function requireInternalApiKey(req, res, next) {
  if (!INTERNAL_API_KEY) {
    return res.status(404).json({ error: 'Not found.' });
  }
  const key = req.get('x-internal-api-key');
  if (!key || key !== INTERNAL_API_KEY) {
    return res.status(404).json({ error: 'Not found.' });
  }
  return next();
}

function isBlockedPath(requestPath) {
  const lowered = (requestPath || '').toLowerCase();
  if (lowered.includes('..')) return true;
  if (
    lowered.startsWith('/.git') ||
    lowered.startsWith('/.env') ||
    lowered.startsWith('/.cursor') ||
    lowered.startsWith('/scripts') ||
    lowered.startsWith('/lib') ||
    lowered.startsWith('/memory')
  ) {
    return true;
  }
  return /\.(map|md|markdown|tsx?|jsx?|cjs|mjs|env|ini|log|sql|bak|dist-info)$/i.test(lowered);
}

app.use((req, res, next) => {
  if (isBlockedPath(req.path || '')) {
    return res.status(404).send('Not found.');
  }
  return next();
});

// Security headers: no secrets in UI; reduce XSS, clickjacking, and info leakage
app.use((req, res, next) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  const isSecure = req.secure || forwardedProto === 'https';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (isSecure) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  next();
});

app.use(express.json());

// Email signup for updates → Supabase only
const WAITLIST_BACKUP = path.join(__dirname, 'memory', 'waitlist-backup.jsonl');
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const WAITLIST_TABLE = (process.env.SUPABASE_WAITLIST_TABLE || process.env.VITE_SUPABASE_WAITLIST_TABLE || 'waitlist').trim();

function appendWaitlistBackup(email) {
  try {
    const dir = path.dirname(WAITLIST_BACKUP);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(WAITLIST_BACKUP, JSON.stringify({ email, created_at: new Date().toISOString() }) + '\n', 'utf8');
  } catch (e) {
    console.warn('Waitlist backup:', e.message);
  }
}

function postToSupabase(email) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return Promise.resolve(null);
  const https = require('https');
  const body = JSON.stringify({ email });
  const u = new URL(`${SUPABASE_URL}/rest/v1/${WAITLIST_TABLE}`);
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'return=minimal',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (ch) => (data += ch));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

app.post('/api/waitlist', rateLimit, (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Valid email required' });
  }
  appendWaitlistBackup(email);
  postToSupabase(email).then((out) => {
    if (out && out.error) {
      console.warn('Waitlist Supabase request error:', out.error);
      return res.status(502).json({ ok: false, error: 'Signup service temporarily unavailable.' });
    }
    if (out && out.status >= 400) {
      console.warn('Waitlist Supabase rejected:', out.status, out.body);
      const msg = out.body && /RLS|policy|permission|denied/i.test(out.body)
        ? 'Signup not allowed. Check Supabase RLS policies for the waitlist table.'
        : (out.body || out.status + '').slice(0, 80);
      return res.status(502).json({ ok: false, error: msg });
    }
    res.json({ ok: true });
  });
});

// API: ingested data + meta (counts, last updated) for dashboard. Read-only; no credentials.
app.get('/api/ingested', rateLimit, requireInternalApiKey, (req, res) => {
  try {
    const meta = getIngestedMeta();
    const data = getIngestedGrouped();
    res.json({ meta, data });
  } catch (e) {
    res.status(500).json({ error: 'Service temporarily unavailable.' });
  }
});

// API: dashboard payload (summary + flat ingested list + key insights). Rate-limited to prevent bulk extraction.
const INGESTED_EXPORT_LIMIT = 280;
const INGESTED_PER_TYPE_LIMIT = 40;
const PET_OWNER_KEYWORDS =
  /\b(dog|dogs|canine|cat|cats|feline|pet|pets|puppy|kitten|owner|home care|triage|poison|toxin|flea|tick|vaccin|vomit|diarrhea|itch|cough|ear|dental|behavior)\b/i;
const PET_OWNER_FALLBACK_TYPES = new Set(['clinical', 'case_data', 'vet_practice', 'surveillance', 'literature', 'cancer']);

function selectDashboardRows(rows, perTypeLimit = INGESTED_PER_TYPE_LIMIT, totalLimit = INGESTED_EXPORT_LIMIT) {
  const selected = [];
  const byTypeCount = {};
  for (const row of rows) {
    const type = row.data_type || 'other';
    byTypeCount[type] = byTypeCount[type] || 0;
    if (byTypeCount[type] >= perTypeLimit) continue;
    selected.push(row);
    byTypeCount[type] += 1;
    if (selected.length >= totalLimit) break;
  }
  return selected;
}

function extractPubMedId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)(?:\/|$|\?)/i);
  return match ? match[1] : null;
}

function isPetRelevantRow(row) {
  if (!row) return false;
  if (row.data_type === 'pet_owner') return true;
  if (!PET_OWNER_FALLBACK_TYPES.has(row.data_type)) return false;
  const text = `${row.title || ''} ${row.condition_or_topic || ''}`;
  return PET_OWNER_KEYWORDS.test(text);
}

function selectPetResearchRows(rows) {
  const selected = [];
  const seen = new Set();
  for (const row of rows || []) {
    if (!isPetRelevantRow(row)) continue;
    if (!extractPubMedId(row.url)) continue;
    const key = `${row.url || ''}|${row.title || ''}|${row.condition_or_topic || ''}|${row.data_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(row);
  }
  return selected;
}

app.get('/api/dashboard', rateLimit, (req, res) => {
  try {
    const meta = getIngestedMeta();
    const sourceHealth = summarizeSourceHealth();
    const summary = {
      lastUpdated: meta.lastFetched || null,
      counts: meta.counts || {},
      sourceHealthSummary: sourceHealth.summary,
      sourceHealthDetails: sourceHealth.details,
      intelligenceGaps: sourceHealth.intelligenceGaps,
    };
    // Avoid scanning the entire DB on every request; the dashboard exports are capped anyway.
    const rows = selectDashboardRows(getIngestedSorted({ limit: 5000 }))
      .map((r) => ({
        data_type: r.data_type,
        condition_or_topic: r.condition_or_topic || '',
        title: r.title || '',
        url: r.url || '',
        published_at: r.published_at || null,
        fetched_at: r.fetched_at || null,
      }));
    res.json({
      summary,
      ingested: rows,
      sourceHealthSummary: sourceHealth.summary,
      sourceHealthDetails: sourceHealth.details,
      intelligenceGaps: sourceHealth.intelligenceGaps,
    });
  } catch (e) {
    res.status(500).json({ error: 'Service temporarily unavailable.' });
  }
});

// API: complete pet-relevant research list (uncapped). Used for "View all research" in Pet edition.
app.get('/api/pet-research', rateLimit, (req, res) => {
  try {
    const rows = selectPetResearchRows(getIngestedSorted()).map((r) => ({
      data_type: r.data_type,
      condition_or_topic: r.condition_or_topic || '',
      title: r.title || '',
      url: r.url || '',
      published_at: r.published_at || null,
      fetched_at: r.fetched_at || null,
    }));
    res.json({ count: rows.length, ingested: rows });
  } catch (e) {
    res.status(500).json({ error: 'Service temporarily unavailable.' });
  }
});

// API: pet recall feed (limited). Used by the Pet Safety Dashboard so recall alerts don't get starved by other data types.
app.get('/api/pet-recalls', rateLimit, (req, res) => {
  try {
    const rows = getIngestedByTypeSorted('recall', { limit: 120 }).map((r) => ({
      data_type: r.data_type,
      condition_or_topic: r.condition_or_topic || '',
      title: r.title || '',
      url: r.url || '',
      published_at: r.published_at || null,
      fetched_at: r.fetched_at || null,
      source: r.source || '',
    }));
    res.json({ count: rows.length, ingested: rows });
  } catch {
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

app.get('/api/repurpose/signals', rateLimit, requireInternalApiKey, (req, res) => {
  const indexPath = path.join(__dirname, 'memory', 'repurpose', 'signals.json');
  const data = readJsonSafe(indexPath);
  if (!data) {
    return res.status(404).json({ error: 'Repurpose signals not available.' });
  }
  return res.json(data);
});

app.get('/api/repurpose/signals/:id', rateLimit, requireInternalApiKey, (req, res) => {
  const fileName = `${req.params.id}.json`;
  const filePath = path.join(__dirname, 'memory', 'repurpose', 'signals', fileName);
  const data = readJsonSafe(filePath);
  if (!data) {
    return res.status(404).json({ error: 'Repurpose signal not found.' });
  }
  return res.json(data);
});

app.get('/api/repurpose/documents', rateLimit, requireInternalApiKey, (req, res) => {
  const docsPath = path.join(__dirname, 'memory', 'repurpose', 'documents.json');
  const data = readJsonSafe(docsPath);
  if (!data) {
    return res.status(404).json({ error: 'Repurpose documents not available.' });
  }
  return res.json(data);
});

// Static frontend
app.use(
  express.static(path.join(__dirname, 'public'), {
    dotfiles: 'deny',
    etag: false,
    index: false,
  })
);

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
