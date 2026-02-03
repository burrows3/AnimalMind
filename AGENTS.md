# Autonomous agents (research network)

Multiple agents run **autonomously** after each ingest to review animal health data and **think between agents** to surface **opportunities to improve the field**. Cost is kept low: all agents run on the same machine (or VM), no paid APIs.

---

## How it works

| Step | What runs | Output |
|------|-----------|--------|
| 1. Ingest | `ingest-data-sources.js` | DB + JSON (PubMed, CDC, cancer, case, TCIA, curated) |
| 2. Think | `think-autonomous.js` | `memory/autonomous-insights.md` (data snapshot + "consider") |
| 3. Surveillance reviewer | `agent-surveillance-review.js` | `memory/agent-outputs/surveillance-review.md` |
| 4. Literature reviewer | `agent-literature-review.js` | `memory/agent-outputs/literature-review.md` |
| 5. Synthesizer | `agent-synthesize-opportunities.js` | `memory/opportunities.md` (opportunities from all agents) |
| 6. Push | `push-ingest-to-github.js` | Commits and pushes to GitHub |

The **synthesizer** reads the surveillance and literature reviewers’ outputs (and autonomous-insights) and writes **opportunities to improve the field** — e.g. travel alerts, partnership ideas, research gaps. That’s “thinking between agents”: Agent A and B produce reviews; Agent C synthesizes into opportunities.

---

## Cost

- **$0 extra** — Same PC or VM, same 1-hour schedule. No LLM or paid API calls; agents use the DB and simple rules/templates.
- To add richer “thinking” later (e.g. LLM summaries), you can call a free-tier or low-cost API from one script; the rest stay rule-based.

---

## Adding more agents

1. **New reviewer script** — e.g. `scripts/agent-imaging-review.js` that reads imaging data from the DB and writes `memory/agent-outputs/imaging-review.md`.
2. **Synthesizer reads it** — In `agent-synthesize-opportunities.js`, add `FILES.imaging = path.join(AGENT_OUTPUTS, 'imaging-review.md')`, read it with `readSafe()`, and add a “From imaging” section to the opportunities.
3. **Wire into the run** — In `run-ingest.cmd` and `run-ingest.sh`, run the new script after the other reviewers and before the synthesizer.

Agents “talk” by **writing to shared memory** (`memory/agent-outputs/`, `memory/opportunities.md`). No server or message queue required; one machine, one schedule.

---

## Where agents run

- **Windows:** Scheduled task (every 1 hour) runs `run-ingest.cmd`, which runs ingest → think → surveillance reviewer → literature reviewer → synthesizer → push.
- **Linux/VM:** Cron runs `run-ingest.sh` every 1 hour the same way.

So as long as that machine is on, the full agent chain runs autonomously and keeps `memory/opportunities.md` (and the repo) up to date.
