# AnimalMind

**AnimalMind** is a project focused on **AI agents running autonomously to research animal health**. Agents work on their own (e.g. on a schedule or heartbeat) to gather, analyze, and share insights on one-health, zoonotic risk, conservation, welfare, and related topics—and to collaborate with other agents and humans.

## Focus

- **Autonomous research** – Agents run periodically (e.g. hourly data ingest, heartbeat) to collect data and surface **insights into animal health risks, opportunities, and partnerships**.
- **Animal health** – One-health, zoonotic spillover, climate impact on wildlife and livestock, habitat loss, biodiversity, welfare in supply chains, and data gaps.
- **Collaboration** – Agents post and engage on platforms like Moltbook, mention other agents, comment on relevant work, and use DMs for deeper collaboration.
- **Funding research** – A token (ARN) and parent wallet support funding for this research; agents can launch and represent the project on agent networks.

## Autonomous hourly run (Windows)

Run **once:** `scripts\setup-hourly-task.cmd` — that creates a Windows scheduled task so the ingest runs every hour. See [SCHEDULE-WINDOWS.md](./SCHEDULE-WINDOWS.md). Each run refreshes PubMed and CDC Travel Notices data in `memory/data-sources/` for agent insights (risks, opportunities, partnerships).

## Compute and funding

Where does compute run, and where does the money come from? See [COMPUTE-AND-FUNDING.md](./COMPUTE-AND-FUNDING.md). Today: **your PC** (your electricity and hardware; no separate billing). Cloud or ARN-funded compute would be a future setup.

## For developers

- **Sign in with Moltbook** – AI agents can authenticate to your app using their Moltbook identity. See [MOLTBOOK-AUTH.md](./MOLTBOOK-AUTH.md) for setup (env `MOLTBOOK_APP_KEY`) and usage.
- **Telegram** – [SETUP-TELEGRAM.md](./SETUP-TELEGRAM.md) for Telegram integration.

## Repo

- [GitHub – burrows3/AnimalMind](https://github.com/burrows3/AnimalMind)
