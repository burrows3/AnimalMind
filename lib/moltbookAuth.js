/**
 * Moltbook "Sign in with Moltbook" authentication middleware.
 * Verifies X-Moltbook-Identity token via Moltbook API and attaches agent to request.
 *
 * Setup:
 * 1. Set MOLTBOOK_APP_KEY in environment (from https://moltbook.com/developers/dashboard).
 * 2. Use requireMoltbookAuth or verifyMoltbookIdentity in your app.
 */

const VERIFY_URL = 'https://moltbook.com/api/v1/agents/verify-identity';
const APP_KEY_HEADER = 'X-Moltbook-App-Key';
const IDENTITY_HEADER = 'X-Moltbook-Identity';

/**
 * Get app key from environment. Throws if missing.
 */
function getAppKey() {
  const key = process.env.MOLTBOOK_APP_KEY;
  if (!key || !key.trim()) {
    throw new Error('MOLTBOOK_APP_KEY is not set. Set it in your environment or .env.');
  }
  return key.trim();
}

/**
 * Verify an identity token with Moltbook.
 *
 * @param {string} token - The value of the X-Moltbook-Identity header (JWT).
 * @param {string} [audience] - Optional audience (e.g. your domain). Required if token was issued with audience.
 * @returns {Promise<{ valid: boolean, agent?: object, error?: string }>}
 */
async function verifyMoltbookIdentity(token, audience) {
  const appKey = getAppKey();
  const body = { token };
  if (audience != null) body.audience = audience;

  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [APP_KEY_HEADER]: appKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const out = {
      valid: false,
      error: data.error || 'verify_failed',
      hint: data.hint,
      status: response.status,
    };
    if (data.retry_after_seconds != null) out.retry_after_seconds = data.retry_after_seconds;
    return out;
  }

  if (data.valid === true && data.agent) {
    return { valid: true, agent: data.agent };
  }

  return {
    valid: false,
    error: data.error || 'invalid_token',
    hint: data.hint,
  };
}

/**
 * Express middleware: require X-Moltbook-Identity and verify with Moltbook.
 * On success, sets req.moltbookAgent (and req.agent) to the verified agent profile.
 * On failure, sends 401 with JSON { error, hint? } and does not call next().
 *
 * @param {object} [options]
 * @param {string} [options.audience] - Audience for verification (default: process.env.MOLTBOOK_AUDIENCE).
 * @returns {function(req, res, next)}
 */
function requireMoltbookAuth(options = {}) {
  const audience = options.audience ?? process.env.MOLTBOOK_AUDIENCE ?? null;

  return async function moltbookAuthMiddleware(req, res, next) {
    const token = req.headers[IDENTITY_HEADER.toLowerCase()] ?? req.headers['x-moltbook-identity'];

    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(401).json({
        error: 'missing_identity_token',
        hint: 'Send the Moltbook identity token in the X-Moltbook-Identity header.',
      });
    }

    try {
      const result = await verifyMoltbookIdentity(token.trim(), audience);
      if (!result.valid) {
        const status = result.status ?? 401;
        const body = { error: result.error };
        if (result.hint) body.hint = result.hint;
        if (result.retry_after_seconds != null) body.retry_after_seconds = result.retry_after_seconds;
        return res.status(status).json(body);
      }
      req.moltbookAgent = result.agent;
      req.agent = result.agent;
      next();
    } catch (err) {
      if (err.message && err.message.includes('MOLTBOOK_APP_KEY')) {
        return res.status(500).json({
          error: 'invalid_app_key',
          hint: 'Server is missing MOLTBOOK_APP_KEY. Contact the app owner.',
        });
      }
      return res.status(500).json({
        error: 'verify_failed',
        hint: 'Failed to verify identity with Moltbook.',
      });
    }
  };
}

/**
 * Standalone function to extract and verify identity from a request-like object.
 * Use when you are not using Express (e.g. Next.js route, serverless).
 *
 * @param {object} request - Object with headers (e.g. { headers: { 'x-moltbook-identity': '...' } }).
 * @param {string} [audience] - Optional audience (default: process.env.MOLTBOOK_AUDIENCE).
 * @returns {Promise<{ agent: object } | { error: string, hint?: string, status?: number }>}
 */
async function getVerifiedAgentFromRequest(request, audience) {
  const headers = request.headers || {};
  const token =
    headers[IDENTITY_HEADER] ||
    headers['x-moltbook-identity'] ||
    headers['X-Moltbook-Identity'];

  if (!token || typeof token !== 'string' || !token.trim()) {
    return { error: 'missing_identity_token', hint: 'Send the token in X-Moltbook-Identity header.', status: 401 };
  }

  const result = await verifyMoltbookIdentity(token.trim(), audience ?? process.env.MOLTBOOK_AUDIENCE ?? null);
  if (!result.valid) {
    return {
      error: result.error,
      hint: result.hint,
      status: result.status ?? 401,
    };
  }
  return { agent: result.agent };
}

module.exports = {
  getAppKey,
  verifyMoltbookIdentity,
  requireMoltbookAuth,
  getVerifiedAgentFromRequest,
  VERIFY_URL,
  APP_KEY_HEADER,
  IDENTITY_HEADER,
};
