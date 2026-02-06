# Security

This document describes how we protect the project from hackers and bad actors, and how to report vulnerabilities. A **full security audit** (secrets, agent takeover, injection, hardening) is in [SECURITY-AUDIT.md](./SECURITY-AUDIT.md).

---

## Protecting the project (private by default)

- **Do not share anything sensitive on GitHub.** Never commit `.env`, API keys, tokens, passwords, or PII. This repo is intended to be private. Keep secrets in local `.env` and private notes only.
- **Frontend is read-only.** The dashboard and landing page display data from public sources (PubMed, CDC, curated). No credentials, API keys, or PII are exposed in the UI. External links use `rel="noopener noreferrer"` and only `http://` / `https://` URLs are allowed.
- **API does not leak internals.** The `/api/ingested` endpoint returns only DB data; errors return a generic message (no stack traces or paths to the client).

---

## Documentation and placeholders

**Do not commit identifying or system-specific details** in markdown or config that could expose your environment:

- **Use placeholders** in setup docs: `YOUR_DOMAIN`, `YOUR_GITHUB_USERNAME`, `YOUR_REPO_ROOT`, `PRIVATE_KEY_PATH`, `YOUR_VM_PUBLIC_IP`. Replace with real values only in local copies or private notes.
- **Avoid** real Windows/Linux user paths (e.g. `C:\Users\YourName\`), VM IPs, SSH key paths, or org/repo names if the repo is shared. Docs in this repo use generic placeholders so anyone can follow them without leaking your system.
- **`docs/CNAME`** must contain your real custom domain for GitHub Pages to serve it; that value is public by nature (it’s your site URL). All other domain references in docs should use `YOUR_DOMAIN`.

---

## Private repository

This repo is **private**. Assume that:

- **All current and past commits are visible to collaborators.** Never commit secrets, API keys, or tokens even temporarily. If something was committed by mistake, treat it as compromised; rotate the secret and consider rewriting history to remove it.
- **Access should be limited.** Only approved collaborators should have access to the repo and data. Use `.env` for local secrets; `.env.example` has placeholders only.
- **Vulnerabilities must be reported privately.** Do not disclose security issues in public issues or PRs; use the process below.

**Recommended for private repos (GitHub Settings):**

- **Security → Code security and analysis:** Enable **Dependabot alerts** and **Dependabot security updates** (or use the `.github/dependabot.yml` in this repo).
- **Branches → Branch protection (main):** Consider requiring status checks (e.g. the Security audit workflow) and/or PR reviews before merging.

---

## Reporting a vulnerability

If you find a security issue, **do not open a public issue**. Instead:

- **Email** the maintainer (see repo owner / GitHub profile), or  
- Use **GitHub Security Advisories**: repo → **Security** → **Advisory** → **Report a vulnerability**.

We will respond and work with you on a fix and disclosure.

**Supported versions:** Security fixes are applied to the default branch (`main`). We do not maintain separate release branches for older versions.

---

## What we protect against

### 1. Secrets and credentials

- **Never commit** `.env`, API keys, passwords, or tokens to the repo. They are in `.gitignore` (`.env`, `.env.local`, `.env.*.local`).
- **Use only** `.env.example` as a template; put real values in `.env` locally and keep `.env` out of version control.
- **Moltbook / app keys:** Store in environment variables (e.g. `MOLTBOOK_APP_KEY`). Never hardcode in source.
- **GitHub push:** The scheduled ingest (every 3 hours) pushes to GitHub using your system Git credentials (HTTPS or SSH). Use a **personal access token (PAT)** or SSH key with minimal scope; enable **2FA** on your GitHub account.

### 2. Dependencies

- We keep dependencies minimal and use **prepared statements** in the DB layer (no raw string concatenation for SQL).
- Run **`npm audit`** regularly to check for known vulnerabilities. Fix high/critical issues.
- A **GitHub Action** runs `npm audit` on push/PR (see `.github/workflows/security-audit.yml`).

### 3. Database and files

- **SQLite** (`memory/animalmind.db`) is used with parameterized queries only (`lib/db.js`). No user-supplied input is concatenated into SQL.
- Ingest scripts write only to fixed paths under `memory/`. No user-controlled file paths.
- Keep **file permissions** sensible: `memory/` and the DB should not be world-writable on shared systems.

### 4. Scripts and automation

- **`push-ingest-to-github.js`** runs `git add`, `git commit`, and `git push`. It does not log or expose credentials; Git uses your system credential store.
- **Scheduled task** (`run-ingest.cmd`): runs with your user account. Do not run the task as a high-privilege account; keep the repo in a normal user directory.

### 5. External data

- Ingest pulls from **PubMed** and **CDC** over HTTPS. We do not execute or eval that data; we parse JSON/RSS and store it. Report generation **escapes HTML** when writing to `ingest-report.html` to avoid injection.

### 6. If you add a web app or API later

- Use **HTTPS** only.
- **Validate and sanitize** all user input; use allowlists where possible.
- **Rate limit** endpoints to reduce abuse.
- Keep **Moltbook token verification** server-side (`lib/moltbookAuth.js`); never trust client-supplied identity without verifying with Moltbook.

---

## Quick checklist (maintainers)

- [ ] No secrets in repo (only `.env.example` with placeholders). Assume all history is visible to collaborators.
- [ ] Run `npm run audit` and fix high/critical. CI runs this on push/PR.
- [ ] GitHub 2FA enabled; PAT/SSH with minimal scope for push.
- [ ] **Dependabot** enabled (alerts + security updates). See `.github/dependabot.yml`.
- [ ] Node and OS kept updated for security patches.
- [ ] (Optional) Branch protection on `main` requiring status checks or PR review.
- [ ] Agent-only endpoints use `requireMoltbookAuth`; URLs from ingested data are allowlisted (http/https only) before use in links.
