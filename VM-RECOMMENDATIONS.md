# Best VM for $10/month or less (so your PC doesn't have to run)

You want the **ingest + think step** (and optionally the dashboard) to run **24/7 in the cloud** so your computer can stay off. Here are the best options under **$10/month**.

---

## Recommended (under $10/month)

| Rank | Provider | Plan | Price | Why |
|------|----------|------|-------|-----|
| **1** | **Oracle Cloud** | Always Free – 2 AMD VMs (1 GB RAM each) | **$0** | Free forever; enough for ingest + dashboard. Signup can require a credit card (no charge if you stay in free tier). |
| **2** | **Linode** | Nanode 1 GB | **$5/mo** | Simple, reliable, good for Node.js. 1 vCPU, 1 GB RAM, 25 GB SSD. |
| **3** | **DigitalOcean** | Basic Droplet, 1 GB | **$6/mo** | Very common choice; good docs and UX. 1 vCPU, 1 GB RAM, 25 GB SSD. |
| **4** | **Vultr** | Cloud Compute, 1 GB | **$5–6/mo** | Good performance for the price; many regions. |
| **5** | **Hetzner** | CX11 or similar | **~$4–5/mo** | Often 2 GB RAM for ~$5 in EU. Best value if you're fine with EU datacenter. |
| **6** | **Railway** | Hobby / usage-based | **~$5–7/mo** | Not a raw VM; deploy Node app and run cron or worker. Easiest if you prefer "deploy and forget." |

**Best VM for most people at $10 or less:** **Linode $5** or **DigitalOcean $6** – predictable, easy to set up, and well under $10. Use **Oracle Cloud Free** if you want $0 and are okay with their signup and limits.

---

## What to run on the VM

1. **OS:** Linux (Ubuntu 22.04 LTS is a good default).
2. **Node.js:** Install Node 20 LTS; clone your repo.
3. **Cron:** Run the ingest every 6 hours, e.g.  
   `0 */6 * * * cd /home/ubuntu/AnimalMind && node scripts/ingest-data-sources.js && node scripts/think-autonomous.js && node scripts/push-ingest-to-github.js`
4. **Optional – dashboard 24/7:** Run `npm start` with a process manager (e.g. `pm2`) so the Express server stays up and you can open the dashboard in a browser without your PC.
5. **Git:** Use a deploy key or token so the VM can push to GitHub (no need to leave your computer on).

Once this is set up, **your PC can be off**; the VM runs ingest + think + push every 6 hours and can serve the dashboard 24/7.

---

## Quick comparison

| | Oracle Free | Linode $5 | DigitalOcean $6 |
|--|-------------|-----------|------------------|
| **Cost** | $0 | $5/mo | $6/mo |
| **RAM** | 1 GB × 2 (two VMs) | 1 GB | 1 GB |
| **Best for** | Zero cost | Simplicity, value | Ease of use, docs |

All of these are **under $10/month** and enough for Animal Research Network (ingest + SQLite + optional Express). Pick Oracle for $0, or Linode/DigitalOcean for the simplest paid option.
