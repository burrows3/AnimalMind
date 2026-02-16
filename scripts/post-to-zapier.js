#!/usr/bin/env node
/**
 * Build 1–3 pet-owner posts from ingested data and POST each to the Zapier webhook.
 * Run after ingest (e.g. from run-ingest.sh or GitHub Actions). No-op if ZAPIER_WEBHOOK_URL is unset.
 * Payload: { title, summary, link, image } — set ZAPIER_WEBHOOK_URL in env (e.g. GitHub secrets).
 */

const https = require('https');
const { getIngestedSorted } = require('../lib/db');

const PET_OWNER_FALLBACK_TYPES = new Set([
  'clinical', 'case_data', 'vet_practice', 'surveillance', 'literature', 'cancer', 'pet_owner',
]);
const PET_OWNER_KEYWORDS =
  /\b(dog|dogs|canine|cat|cats|feline|pet|pets|puppy|kitten|owner|home care|triage|poison|toxin|flea|tick|vaccin|vomit|diarrhea|itch|cough|ear|dental|behavior)\b/i;
const MAX_POSTS = 3;
const IMG_W = 480;
const IMG_H = 300;
// Force JPEG so Instagram/Facebook Graph API accepts the URL (they reject unknown/unsupported formats).
const U = (id) =>
  `https://images.unsplash.com/photo-${id}?w=${IMG_W}&q=80&fit=crop&fm=jpg`;
const IMAGE_BY_TOPIC = {
  dog: U('1587303853328-5f3b2c1a0d9e'),
  cat: U('1514888286974-6c03e2ca239d'),
  bird: U('1548199973-03cce0bbc87b'),
  horse: U('1535591273668-578e31182d5e'),
  general: U('1587300003388-59208cc962cb'),
};

function toPetBriefItems(rows, limit = 14) {
  if (!rows || rows.length === 0) return [];
  const explicit = rows.filter((r) => r.data_type === 'pet_owner');
  const fallback = rows.filter((r) => {
    if (!PET_OWNER_FALLBACK_TYPES.has(r.data_type)) return false;
    const text = `${r.title || ''} ${r.condition_or_topic || ''}`;
    return PET_OWNER_KEYWORDS.test(text);
  });
  const combined = [...explicit, ...fallback];
  const seen = new Set();
  const unique = [];
  for (const item of combined) {
    const key = `${item.source || ''}:${item.external_id || item.id || item.url || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique.slice(0, limit);
}

function petArticleTitle(row) {
  const t = (row.title || '').trim();
  if (t) {
    if (t.length <= 72) return t;
    const end = t.lastIndexOf(' ', 69);
    return (end > 0 ? t.slice(0, end) : t.slice(0, 72)) + '…';
  }
  const topic = (row.condition_or_topic || 'pet health').replace(/<[^>]+>/g, '').trim() || 'pet health';
  return `${topic}: what pet owners should know`;
}

function petArticleSummary(row) {
  const topic = (row.condition_or_topic || 'pet health').replace(/<[^>]+>/g, '').trim() || 'pet health';
  const hasTitle = (row.title || '').trim().length > 0;
  if (hasTitle) {
    return `This source on ${topic} is relevant for pet owners. Here's what it may mean for you and your pet—read the source for full details.`;
  }
  return `New update on ${topic}. Here's what it may mean for you and your pet. Read the source for full details; this is not medical advice.`;
}

function inferTopicKey(row) {
  const t = `${row.condition_or_topic || ''} ${row.title || ''}`.toLowerCase();
  if (/\b(dog|canine|puppy)\b/.test(t)) return 'dog';
  if (/\b(cat|feline|kitten)\b/.test(t)) return 'cat';
  if (/\b(bird|avian|parrot|poultry)\b/.test(t)) return 'bird';
  if (/\b(horse|equine)\b/.test(t)) return 'horse';
  return 'general';
}

function safeLink(url) {
  if (!url || typeof url !== 'string') return '';
  const u = String(url).trim();
  return u.startsWith('http://') || u.startsWith('https://') ? u : '';
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(payload);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({ statusCode: res.statusCode, data });
        else reject(new Error(`POST ${url} → ${res.statusCode} ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.startsWith('https://')) {
    console.log('ZAPIER_WEBHOOK_URL not set or invalid; skipping Zapier post.');
    process.exit(0);
  }

  const rows = getIngestedSorted();
  const petRows = toPetBriefItems(rows, MAX_POSTS);
  if (petRows.length === 0) {
    console.log('No pet-relevant items to post; skipping Zapier.');
    process.exit(0);
  }

  const posts = petRows.slice(0, MAX_POSTS).map((row) => {
    const title = petArticleTitle(row);
    const summary = petArticleSummary(row);
    const link = safeLink(row.url);
    const imageUrl = IMAGE_BY_TOPIC[inferTopicKey(row)] || IMAGE_BY_TOPIC.general;
    const captionParts = [title, summary];
    if (link) captionParts.push(link);
    const caption = captionParts.join('\n\n').slice(0, 2200);
    return {
      title,
      summary,
      link,
      image: imageUrl,
      media: imageUrl,
      caption,
    };
  });

  for (let i = 0; i < posts.length; i++) {
    try {
      await postJson(webhookUrl, posts[i]);
      console.log(`Zapier post ${i + 1}/${posts.length}: ${posts[i].title.slice(0, 50)}…`);
    } catch (err) {
      console.error('Zapier POST failed:', err.message);
      process.exit(1);
    }
  }
  console.log('Zapier posts done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
