# Roadmap: Animal Research Network (built by ChatVet)

**End goal:** Build **Animal Research Network** as a research engine for ChatVet—autonomous data collection, insights into animal health risks and opportunities, and a frontend so vets and partners can use it.

---

## What runs when

| What | Frequency | Purpose |
|------|-----------|---------|
| **Data ingest** (PubMed + CDC) | **Every hour** (Windows Task Scheduler) | Keeps the DB and GitHub up to date with latest literature and surveillance. |
| **Dependabot** (dependency updates) | **Weekly** (GitHub) | Opens PRs for npm and GitHub Actions updates; no secrets needed. |

So: **ingest = hourly**; **Dependabot = weekly**. The research engine's data is refreshed every hour.

---

## Product improvements (research engine)

1. **More data sources** – Add WOAH/OIE alerts, FAO, clinical trial registries, or (with agreements) VMS-style feeds so the engine covers more than PubMed + CDC.
2. **Opportunities API** – Expose "new this week," "by condition," "by data type" so ChatVet's app or frontend can query alerts, research questions, and partnership leads.
3. **Branding** – Product name: **Animal Research Network** (built by ChatVet). Keep ARN/parent wallet (chatvet.base.eth) for funding; optional "Sign in with Moltbook" for agents.
4. **Summaries (optional)** – Use an LLM or extractive summarization on new papers/notices so the engine suggests one-line "insights" or "opportunities" instead of only raw links.
5. **Alerts / notifications** – When new high-impact notices or papers match a topic, notify (email, Telegram, or in-app) so ChatVet users see timely signals.

---

## Frontend (provide a UI)

**Goal:** A simple web UI so users can browse ingested data, filter by type/condition, and see links to sources—the first version of **Animal Research Network** in the browser.

**What we're adding:**

- **Express server** – Serves the frontend and an **API** (`GET /api/ingested`) that returns ingested data from the DB (grouped by data type and condition).
- **Single-page dashboard** – One HTML page that calls the API and renders surveillance notices and literature by type/condition, with links to CDC and PubMed.

**How to run:**

```bash
npm install
npm run start
```

Then open **http://localhost:3000** to view the research engine data.

**Next steps (later):**

- Search/filter by condition or keyword.
- "New this week" or "Latest" section.
- ChatVet logo and "Built by ChatVet"; optional login (Moltbook or email).
- Deploy to a VM or cloud (e.g. Railway, Render) so it's always on for Animal Research Network users.

---

## Who benefits

- **Veterinarians and clinics** — See travel and outbreak notices (e.g. rabies, dengue) in one place; use for client advice and travel health.
- **Researchers and one-health teams** — Track recent literature and surveillance by condition; spot gaps and partnership opportunities.
- **Animal Research Network users and ChatVet partners** — Use the research engine as a layer for animal health decisions, alerts, and collaboration.
- **Public health and NGOs** — Monitor animal health risks and opportunities for early signals and cross-sector collaboration.

---

## Summary

| Question | Answer |
|----------|--------|
| Will it run every hour? | **Ingest** runs every hour (Task Scheduler). **Dependabot** runs weekly. |
| End goal? | **Animal Research Network** (built by ChatVet)—data, insights, opportunities, and a frontend. |
| How to improve? | More sources, opportunities API, optional summaries/alerts. |
| Frontend? | Express + one dashboard page that reads from the DB via `/api/ingested`; run with `npm run start`. |
