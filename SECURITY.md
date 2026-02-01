# Security

This document describes how we protect the project from hackers and bad actors, and how to report vulnerabilities.

---

## Public repository

This repo is **public**. Assume that:

- **All current and past commits are visible.** Never commit secrets, API keys, or tokens—even “temporarily.” If something was committed by mistake, treat it as compromised; rotate the secret and consider rewriting history to remove it.
- **Anyone can clone and run the code.** Use `.env` for local secrets; `.env.example` has placeholders only. Ingested data in the repo (PubMed, CDC) is from public sources; no PII.
- **Vulnerabilities must be reported privately.** Do not disclose security issues in public issues or PRs; use the process below.

**Recommended for public repos (GitHub Settings):**

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
- **GitHub push:** The hourly ingest pushes to GitHub using your system Git credentials (HTTPS or SSH). Use a **personal access token (PAT)** or SSH key with minimal scope; enable **2FA** on your GitHub account.

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

- [ ] No secrets in repo (only `.env.example` with placeholders). Assume all history is public.
- [ ] Run `npm run audit` and fix high/critical. CI runs this on push/PR.
- [ ] GitHub 2FA enabled; PAT/SSH with minimal scope for push.
- [ ] **Dependabot** enabled (alerts + security updates). See `.github/dependabot.yml`.
- [ ] Node and OS kept updated for security patches.
- [ ] (Optional) Branch protection on `main` requiring status checks or PR review.
