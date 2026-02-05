# AnimalMind

**AnimalMind** is a project focused on **AI agents running autonomously to research animal health**. Agents work on their own (e.g. on a schedule or heartbeat) to gather, analyze, and share insights on one-health, zoonotic risk, conservation, welfare, and related topics—and to collaborate with other agents and humans.

## Focus

- **Autonomous research** – Agents run periodically (data ingest every 1 hour) to collect data and surface **insights into animal health risks, opportunities, and partnerships**.
- **Animal health** – One-health, zoonotic spillover, climate impact on wildlife and livestock, habitat loss, biodiversity, welfare in supply chains, and data gaps.
- **Collaboration** – Agents post and engage on platforms like Moltbook, mention other agents, comment on relevant work, and use DMs for deeper collaboration.
- **Funding research** – A token (ARN) and parent wallet support funding for this research; agents can launch and represent the project on agent networks.
- **Optional LLM reasoning** – Set `NVIDIA_API_KEY` to enable NVIDIA NIM reasoning summaries in the agent outputs.

## Animal Research Network (frontend)

Animal Research Network is built by ChatVet. Run it locally to browse ingested data in the browser:

```bash
npm run start
```

Then open **http://localhost:3000** (or the port shown; if 3000 is in use, the server tries 3001, 3002, …). The dashboard is in **`public/`**—run `npm start` from the repo root. If you see "address already in use", free the port or run `set PORT=3001 && npm start`. The dashboard shows **surveillance** (CDC), **literature** (PubMed), **cancer** (animal/veterinary oncology), **case data** (veterinary case reports), and **imaging** (TCIA, curated datasets) grouped by condition/topic. Data is refreshed every 1 hour.

See [ROADMAP.md](./ROADMAP.md) for end goal, improvements, and next steps. **What runs when you sleep, and how it "thinks" on its own:** [WHAT-RUNS-WHEN-YOU-SLEEP.md](./WHAT-RUNS-WHEN-YOU-SLEEP.md). **Multiple autonomous agents (reviewers + synthesizer) that think between agents to find opportunities:** [AGENTS.md](./AGENTS.md).

## Autonomous run every 1 hour (Windows)

Run **once:** `scripts\setup-hourly-task.cmd` — that creates a Windows scheduled task so the ingest runs every 1 hour. See [SCHEDULE-WINDOWS.md](./SCHEDULE-WINDOWS.md). Each run refreshes PubMed and CDC Travel Notices data in `memory/data-sources/` for agent insights (risks, opportunities, partnerships).

## Compute and funding

Where does compute run, and where does the money come from? See [COMPUTE-AND-FUNDING.md](./COMPUTE-AND-FUNDING.md). **Cost estimates** (12–24 h/day, your PC vs cloud): [COMPUTE-COSTS.md](./COMPUTE-COSTS.md). **Best VM for $10/month or less** (so your PC doesn't have to run): [VM-RECOMMENDATIONS.md](./VM-RECOMMENDATIONS.md). **Easiest VM setup (API token or web UI):** [VM-SETUP-EASIEST.md](./VM-SETUP-EASIEST.md)—DigitalOcean with an API token or Oracle Cloud (free). **Oracle Cloud** (free VM) step-by-step: [ORACLE-CLOUD-VM-SETUP.md](./ORACLE-CLOUD-VM-SETUP.md). Today: **your PC** (electricity only; no cloud bill). Cloud or ARN-funded compute would be a future setup.

## Security

To protect from hackers and bad actors: secrets stay in `.env` (never committed), dependencies are audited (`npm run audit`), and we use parameterized DB queries and HTML escaping. See [SECURITY.md](./SECURITY.md) for practices and how to report vulnerabilities.

## For developers

- **Sign in with Moltbook** – AI agents can authenticate to your app using their Moltbook identity. See [MOLTBOOK-AUTH.md](./MOLTBOOK-AUTH.md) for setup (env `MOLTBOOK_APP_KEY`) and usage.
- **Telegram** – [SETUP-TELEGRAM.md](./SETUP-TELEGRAM.md) for Telegram integration.

## Repo

- This project is intended to be private and access-controlled. Share the repo only with authorized collaborators.
