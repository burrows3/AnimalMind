const https = require('https');
const { URL } = require('url');

const DEFAULT_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'kim-2.5';

function getConfig() {
  const apiKey = process.env.NVIDIA_API_KEY || process.env.NVAPI_KEY || '';
  const baseUrl = (process.env.NVIDIA_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
  return { apiKey, baseUrl, model };
}

function isEnabled() {
  return Boolean(getConfig().apiKey);
}

function postJson(urlString, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) {
            return reject(new Error(`NVIDIA API error (${status})`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('NVIDIA API timeout'));
    });
    req.write(payload);
    req.end();
  });
}

async function chat({ system, user, temperature = 0.2, maxTokens = 450 }) {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) return null;
  const url = `${baseUrl}/chat/completions`;
  const payload = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  const data = await postJson(url, payload, { Authorization: `Bearer ${apiKey}` });
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : null;
}

module.exports = {
  chat,
  isEnabled,
  DEFAULT_BASE,
  DEFAULT_MODEL,
};
