# Security audit report

This document summarizes a full security audit of the AnimalMind project: secrets and private info, agent takeover risk, injection, and hardening. Findings and fixes are below.

**Audit date:** 2026-01-31  
**Scope:** Repo root, `lib/`, `scripts/`, `server.js`, `docs/`, `.gitignore`, `.env.example`, SECURITY.md, and related docs.

---

## 1. Secrets and private information

| Area | Status | Notes |
|------|--------|--------|
| `.env` | ✅ | In `.gitignore`; never committed. `.env.example` has placeholders only. |
| API keys / tokens | ✅ | Moltbook key in env; GitHub token/SSH used by system Git, not stored in repo. |
| Docs placeholders | ✅ | Setup docs use `YOUR_DOMAIN`, `YOUR_GITHUB_USERNAME`, `PRIVATE_KEY_PATH`, etc. |
| `docs/CNAME` | ✅ | Contains real domain (`animalmind.co`) by design for GitHub Pages; public. |
| `docs/index.html` | ⚠️ | Contains real GitHub link (`burrows3/AnimalMind`) for live site. If you fork, change this. |
| Oracle script default | ✅ Fixed | Default GitHub username removed; script now requires explicit `-GhUser` or prompt so forks don’t leak a real username. |

**Recommendation:** When forking, replace the GitHub link in `docs/index.html` and ensure no real IPs, key paths, or usernames remain in committed files.

---

## 2. Agent takeover and abuse

| Risk | Status | Notes |
|------|--------|--------|
| Arbitrary code execution | ✅ | No `eval`, `Function`, or user/agent input passed to `exec`/`spawn`. |
| Command injection | ✅ Fixed | `push-ingest-to-github.js` now uses `execSync('git', ['-C', REPO_ROOT, 'commit', '-m', msg])` so the commit message is not parsed by a shell. |
| Moltbook identity | ✅ | Token verified server-side via Moltbook API; app key in env. No client trust without verification. |
| Future agent-only routes | ✅ Doc | SECURITY.md and checklist: use `requireMoltbookAuth` for any endpoint that accepts agent actions. |

**Conclusion:** No agent or user input flows into shell commands or code execution. Scripts use fixed paths and parameterized DB only.

---

## 3. Injection and output safety

| Area | Status | Notes |
|------|--------|--------|
| SQL | ✅ | `lib/db.js` uses prepared statements only; no string concatenation into SQL. |
| HTML (report) | ✅ | `write-report.js` uses `escapeHtml()` for titles, URLs, and labels. |
| HTML (landing) | ✅ Fixed | `docs/index.html` “Browse data” now uses `safeHref(url)` so only `http://` and `https://` are used in `<a href>`. Prevents `javascript:` or `data:` from ingested content. |
| External data | ✅ | Ingest parses PubMed/CDC JSON and RSS; data is stored and rendered with escaping, not executed. |

---

## 4. Files and paths

| Area | Status | Notes |
|------|--------|--------|
| Write paths | ✅ | All writes use `path.join(__dirname, ...)` or fixed names (e.g. `memory/animalmind.db`, `docs/data-summary.json`). No user-controlled paths. |
| Ingest filenames | ✅ | `writeJson()` called with fixed names (`pubmed-recent.json`, `cdc-travel-notices.json`, etc.). |

---

## 5. Server and HTTP

| Area | Status | Notes |
|------|--------|--------|
| User input | ✅ | `/api/ingested` returns DB data only; no query params or body used. |
| Security headers | ✅ Added | `server.js` sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. |
| Static files | ✅ | Serves only `public/` and fixed routes; no user-controlled path. |

---

## 6. Dependencies and automation

| Area | Status | Notes |
|------|--------|--------|
| Dependencies | ✅ | Minimal: `better-sqlite3`, `express`. No known high/critical in audit. |
| CI | ✅ | `.github/workflows/security-audit.yml` runs `npm audit --audit-level=high` on push/PR. |
| Scheduled task | ✅ | Runs with user account; no elevated privileges. Credentials from system Git. |

---

## 7. Changes made in this audit

1. **`scripts/push-ingest-to-github.js`** – Git commit no longer built via shell string; uses `runGit(['commit', '-m', msg])` so the message is not parsed by the shell.
2. **`docs/index.html`** – “Browse data” links use `safeHref(url)` so only `http://` and `https://` are allowed in hrefs; titles/conditions remain escaped.
3. **`scripts/run-oracle-vm-setup.ps1`** – Removed default GitHub username; script now requires `-GhUser` or a non-empty prompt so a real username isn’t hardcoded for forks.
4. **`server.js`** – Added middleware setting `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
5. **`SECURITY.md`** – New sections: “Agent takeover and abuse” and “URL sanitization”; checklist item for agent-only routes and URL allowlisting.
6. **`SECURITY-AUDIT.md`** – This report.

---

## 8. Checklist for maintainers

- [ ] No secrets in repo; `.env` not committed; assume history is public.
- [ ] Run `npm run audit` and fix high/critical; CI runs this on push/PR.
- [ ] GitHub 2FA; PAT/SSH with minimal scope for push.
- [ ] Dependabot enabled (alerts + security updates).
- [ ] Agent-only endpoints use `requireMoltbookAuth`; URLs from ingested data allowlisted (http/https only) in links.
- [ ] When forking, replace real GitHub link in `docs/index.html` and any other identifying placeholders.

---

## 9. Reporting vulnerabilities

Do not open public issues for security flaws. Use **SECURITY.md** → “Reporting a vulnerability” (email maintainer or GitHub Security Advisories).
