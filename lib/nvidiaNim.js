const https = require('https');
const { URL } = require('url');

const DEFAULT_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'moonshotai/kimi-k2.5';
// Fallbacks if default returns 404 (set NVIDIA_MODEL to skip fallback)
const FALLBACK_MODELS = [
  'moonshotai/kimi-k2-instruct',
  'meta/llama-3.1-70b-instruct',
  'nvidia/nemotron-3-nano-30b-a3b',
  'deepseek-ai/deepseek-v3.1-terminus',
];

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
    const timeoutMs = Number(process.env.NVIDIA_API_TIMEOUT_MS) || 90000;
    req.setTimeout(timeoutMs, () => {
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
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const modelsToTry = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  for (const modelId of modelsToTry) {
    try {
      const payload = {
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
      };
      const data = await postJson(url, payload, { Authorization: `Bearer ${apiKey}` });
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.trim()) return text.trim();
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('404')) {
        console.warn('nvidiaNim:', modelId, '404, trying next');
        continue;
      }
      if (msg.includes('timeout')) {
        console.warn('nvidiaNim:', modelId, 'timeout, trying next');
        continue;
      }
      throw e;
    }
  }
  console.warn('nvidiaNim: no model responded (all 404/timeout)');
  return null;
}

module.exports = {
  chat,
  getConfig,
  isEnabled,
  DEFAULT_BASE,
  DEFAULT_MODEL,
};
