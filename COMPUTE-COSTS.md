# Compute cost estimates

Rough estimates for running Animal Research Network (ingest + DB + optional frontend) under different setups. Prices are ballpark (USD) and can vary by region and provider.

---

## What uses compute

| Component | Usage | Notes |
|-----------|--------|------|
| **Hourly ingest** | ~5–15 s every hour | PubMed, CDC, cancer, case reports, TCIA, curated JSON. Light CPU/network. |
| **SQLite DB** | On disk, MB scale | No separate DB service. |
| **Frontend (Express)** | Low traffic | Optional; only if you serve the dashboard 24/7. |

So total compute need is **small**: a single small VM or your PC is enough.

---

## Scenario 1: Your PC (current setup)

| Item | Estimate |
|------|----------|
| **Uptime** | 24 hours/day (PC on) or 12 hours/day (e.g. work hours). |
| **Cost** | **Electricity only.** No extra subscription. |
| **Electricity** | Ingest + Node is negligible (~few W). Whole laptop: ~20–50 W when active. 24 h → ~0.5–1.2 kWh/day. At **$0.10–0.15/kWh** → **~$0.05–0.18/day** (~**$1.50–5.50/month**). 12 h/day → about half. |
| **Hardware** | Already owned; no extra compute cost. |

**Summary (your PC):** **~$0–6/month** depending on how you count electricity; no cloud bill.

---

## Scenario 2: Cloud VM, 24 hours/day

Single small Linux VM runs: cron (hourly ingest) + Node (optional frontend) + SQLite.

| Provider | Example plan | Monthly (approx) | Per day |
|----------|----------------|-------------------|---------|
| **DigitalOcean** | Basic Droplet, 1 vCPU, 1 GB RAM | **~$6** | ~$0.20 |
| **Linode** | Nanode 1 GB | **~$5** | ~$0.17 |
| **AWS** | t3.micro (after free tier), 1 vCPU, 1 GB | **~$8–10** | ~$0.27–0.33 |
| **Azure** | B1s, 1 vCPU, 1 GB | **~$7–12** | ~$0.23–0.40 |
| **GCP** | e2-micro (free tier eligible in some regions) | **$0–6** | ~$0–0.20 |
| **Oracle Cloud** | Free tier VM (2 AMD, 1 GB each) | **$0** | $0 |

**Summary (cloud 24/7):** **~$0–12/month** (~**$0–0.40/day**), depending on provider and free tiers.

---

## Scenario 3: Cloud VM, 12 hours/day

If the VM only needs to run **12 hours per day** (e.g. 8:00–20:00):

- **Option A:** Same VM as above, but you **stop it** when not needed. Cost ≈ **half** of 24/7 → **~$3–6/month** (~**$0.10–0.20/day**).
- **Option B:** Use **spot/preemptible** instances (if available) for the 12 h window; often **~30–70% cheaper** than on‑demand → **~$2.50–7/month** for 12 h/day.

**Summary (cloud 12 h/day):** **~$0–7/month** (~**$0–0.23/day**).

---

## Scenario 4: PaaS / serverless (e.g. Railway, Render, Vercel)

| Service | Typical use | Free tier | Paid (always‑on) |
|---------|-------------|-----------|-------------------|
| **Railway** | App + cron or always-on worker | Limited free credit | **~$5–7/month** |
| **Render** | Web service + background worker | Free tier (spins down) | **~$7–10/month** for always-on |
| **Vercel** | Frontend only; cron for ingest elsewhere | Generous free | **$0** if ingest runs on your PC |
| **Fly.io** | Small VM | Free allowance | **~$0–5/month** |

**Summary (PaaS):** **~$0–10/month** depending on always-on vs free tier.

---

## Totals (ballpark)

| Setup | Hours/day | Monthly (USD) | Per day (USD) |
|-------|-----------|----------------|----------------|
| **Your PC** | 24 | ~0–6 (electricity) | ~0–0.20 |
| **Your PC** | 12 | ~0–3 (electricity) | ~0–0.10 |
| **Cloud VM** | 24 | ~0–12 | ~0–0.40 |
| **Cloud VM** | 12 | ~0–7 | ~0–0.23 |
| **PaaS (always-on)** | 24 | ~0–10 | ~0–0.33 |

---

## Notes

- **Free tiers:** GCP e2-micro, Oracle Cloud free tier, and Vercel (frontend only) can keep **24 h** cost at **$0** or very low.
- **Ingest-only on cloud:** If only the **hourly ingest** runs in the cloud (e.g. GitHub Actions cron or a tiny serverless function), cost is often **$0** (free tier) or **&lt; $1/month**.
- **Your PC + cloud frontend:** Run ingest on your PC (current setup); host only the **dashboard** on Vercel/Railway free tier → **~$0/month**.
- All figures are **estimates**; check current pricing and data transfer rules for your region and provider.

---

## Best VM for $10/month or less (PC off)

If you don't want your computer running and are okay spending **$10/month or less**, see **[VM-RECOMMENDATIONS.md](./VM-RECOMMENDATIONS.md)** for a ranked list: **Oracle Free ($0)**, **Linode $5**, **DigitalOcean $6**, Vultr, Hetzner, Railway. Any of these can run ingest + think + push 24/7 and optionally the dashboard.
