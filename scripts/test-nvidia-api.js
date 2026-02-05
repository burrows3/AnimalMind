#!/usr/bin/env node
/**
 * One-off test: call NVIDIA NIM with current .env and print result or error.
 * Run from repo root: node scripts/test-nvidia-api.js
 */
require('../lib/env.js');
const { chat, getConfig } = require('../lib/nvidiaNim.js');

const { apiKey, baseUrl, model } = getConfig();
console.log('Config: baseUrl=%s model=%s keySet=%s', baseUrl, model, !!apiKey);

if (!apiKey) {
  console.log('ERROR: NVIDIA_API_KEY not set. Add it to .env');
  process.exit(1);
}

chat({ system: 'You are a test.', user: 'Reply with exactly: OK', maxTokens: 10 })
  .then((text) => {
    if (text) console.log('SUCCESS:', text);
    else console.log('ERROR: API returned no text');
  })
  .catch((e) => {
    console.log('ERROR:', e.message);
    process.exit(1);
  });
