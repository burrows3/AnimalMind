# What is running now, and what happens when you go to sleep

## What is currently running

| Component | When it runs | What it does |
|-----------|--------------|--------------|
| **AnimalMind Ingest** (Windows scheduled task) | **Every 3 hours** (if you ran `scripts\setup-hourly-task.cmd`) | 1) Fetches data (PubMed, CDC, cancer, case reports, TCIA, curated). 2) Writes to DB and JSON. 3) Think + **agents** (surveillance reviewer, literature reviewer, synthesizer) write insights and **opportunities**. 4) Push to GitHub. See [AGENTS.md](./AGENTS.md). |
| **Dashboard** (Express server) | **Only when you run `npm start`** and leave it open | Serves the Animal Research Network page at http://localhost:3000. If you close the terminal or the PC restarts, it stops. It is **not** a scheduled task. |

So **when you go to sleep**, the only thing that keeps going (if your PC stays on) is the **ingest task**: every 3 hours it collects new data and pushes it to GitHub. Nothing is reading that data and “thinking” about how to improve animal health – no analysis, no alerts, no suggested next steps.

---

## What happens when you sleep (today)

1. **If your PC is on** and the scheduled task is set up:
   - **Every 3 hours** the task runs: ingest → DB + JSON → push to GitHub.
   - You wake up to **fresh data** in the repo and in `memory/` (and in the DB if you run the dashboard later). No one (and no agent) has yet read that data to summarize or suggest actions.

2. **If your PC is off or asleep**:
   - The task does **not** run. No ingest, no push. When you turn the PC back on, the next run is at the next scheduled time (every 3 hours).

3. **“Think on its own”**:
   - Right now the system does **not** think on its own. It **collects** data but does not **analyze** it or **propose** ways to improve animal health. To get there, we need an autonomous “think” step (see below).

---

## What “think on its own” should do

To improve animal health on its own while you sleep, the system should:

1. **Keep doing** what it does: ingest every 3 hours (surveillance, literature, cancer, case data, imaging).
2. **Plus:** After each ingest (or on a schedule), **read** the latest data and **write** a short “what matters” summary: new outbreaks, new papers, possible alerts, partnership or research opportunities. So when you wake up, there is not only raw data but a **digest** and **suggested focus** (e.g. “New: Rabies in Morocco, Dengue global. Consider alert.” “15 new cancer papers; consider outreach to X.”).
3. **Optional later:** Send that digest somewhere (e.g. email or a “daily brief” in the dashboard).

The repo now includes an **autonomous “think” step** and **multiple agents** that run after each ingest: think → **surveillance reviewer** → **literature reviewer** → **synthesizer** → push. The synthesizer reads the reviewers’ outputs and writes **`memory/opportunities.md`** (opportunities to improve the field). See [AGENTS.md](./AGENTS.md) for the full agent chain. The task runs ingest → think → agents → push, so when you sleep, it keeps collecting **and** updating insights and opportunities.

---

## Summary

| Question | Answer |
|----------|--------|
| **What is it currently running?** | The **ingest task every 3 hours** (data collection + push to GitHub). The **dashboard** only runs if you started it with `npm start`. |
| **If I go to sleep, what will it do?** | If the PC stays on: **every 3 hours** it will ingest data and push to GitHub, and (with the new step) write **`memory/autonomous-insights.md`** with a short “what matters for animal health” summary. |
| **Does it “think” on its own?** | **Yes, in a simple way:** the new step reads the latest data and writes suggested focus (alerts, partnerships, gaps). It does not yet send alerts or post anywhere; that would be a next step. |
