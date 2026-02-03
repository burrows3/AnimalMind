# Easiest VM setup (API token or web UI)

Run ingest + think + push **24/7** so your PC can sleep. Two paths: **DigitalOcean** (easiest, ~$6/mo or free credit) or **Oracle Cloud** (free, a few more steps).

---

## Where to go (easiest)

| Option | Where | Cost | API token? |
|--------|--------|------|------------|
| **DigitalOcean** | [cloud.digitalocean.com](https://cloud.digitalocean.com) | ~$6/mo (or free credit for new accounts) | Yes – use it to create a droplet from your PC |
| **Oracle Cloud** | [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) | $0 Always Free | No – use the web console; see [ORACLE-CLOUD-VM-SETUP.md](./ORACLE-CLOUD-VM-SETUP.md) |

**Recommendation:** Use **DigitalOcean** if you want the simplest setup with an API token. Use **Oracle** if you want $0 and are okay with the web console.

---

## Option A: DigitalOcean with API token (create VM from your PC)

**1. Get an API token**

- Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) → sign up or log in.
- **API** (left sidebar or [digitalocean.com/account/api/tokens](https://cloud.digitalocean.com/account/api/tokens)) → **Generate New Token**.
- Name it (e.g. `AnimalMind`), choose **Read/Write**, then **Generate Token**.
- Copy the token and keep it somewhere safe (you won’t see it again).

**2. Create the droplet from your PC**

From the repo root (PowerShell or Bash):

```bash
# Set your token (replace with your actual token)
export DO_API_TOKEN=your_digitalocean_token_here   # Linux/macOS
# Or on Windows PowerShell:
# $env:DO_API_TOKEN = "your_digitalocean_token_here"

node scripts/create-droplet-do.js
```

The script creates an Ubuntu 22.04 droplet (1 GB RAM), waits for it to get an IP, then prints:

- The **droplet IP**
- The **SSH command** to use
- The **one command** to run on the VM after you SSH in

**3. SSH in and run the one command**

Use the SSH command printed by the script (or add your SSH key in the DigitalOcean UI first and use `ssh root@IP`). Then run the one-liner it prints, e.g.:

```bash
sudo apt-get update -qq && sudo apt-get install -y git curl && git clone https://github.com/YOUR_GITHUB_USERNAME/AnimalMind.git ~/AnimalMind && bash ~/AnimalMind/scripts/oracle-vm-bootstrap.sh
```

When prompted, paste your **GitHub Personal Access Token** ([github.com/settings/tokens](https://github.com/settings/tokens), `repo` scope). Ingest will be scheduled every 1 hour; optionally start the dashboard with PM2.

**4. Open the dashboard (optional)**

In DigitalOcean: **Networking** → **Firewall** (create one if needed) → add **Inbound** rule: TCP, port **3000**, all IPv4. Attach the firewall to your droplet. Then open `http://YOUR_DROPLET_IP:3000` in a browser.

---

## Option B: DigitalOcean without API (web UI only)

**1. Create a droplet in the UI**

- [cloud.digitalocean.com](https://cloud.digitalocean.com) → **Droplets** → **Create Droplet**.
- **Image:** Ubuntu 22.04 LTS.
- **Plan:** Basic, **$6/mo** (1 GB RAM / 1 vCPU).
- **Region:** Pick one close to you.
- **Authentication:** Add your SSH key (or choose Password and set one).
- **Create Droplet**. Copy the **IP address** once it’s ready.

**2. SSH in**

```bash
ssh root@YOUR_DROPLET_IP
# Or: ssh ubuntu@YOUR_DROPLET_IP  if you chose Ubuntu with a non-root user
```

**3. Run the one-time setup**

Replace `YOUR_GITHUB_USERNAME` with your GitHub username:

```bash
sudo apt-get update -qq && sudo apt-get install -y git curl && git clone https://github.com/YOUR_GITHUB_USERNAME/AnimalMind.git ~/AnimalMind && bash ~/AnimalMind/scripts/oracle-vm-bootstrap.sh
```

Paste your **GitHub token** when asked. Ingest runs every 1 hour; say **y** to PM2 if you want the dashboard at `http://YOUR_DROPLET_IP:3000`. Open port **3000** in DigitalOcean **Firewall** if you want to access it from the web.

---

## Option C: Oracle Cloud (free)

See **[ORACLE-CLOUD-VM-SETUP.md](./ORACLE-CLOUD-VM-SETUP.md)** for the full steps. Summary: sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/), create a VM (Ubuntu 22.04, Always Free shape), open ports 22 and 3000, SSH in, then run the same clone + `bash ~/AnimalMind/scripts/oracle-vm-bootstrap.sh`. No API token needed; everything is done in the Oracle web console.

---

## After the VM is running

- **Ingest:** Runs every 1 hour via cron (ingest → think → agents → push to GitHub).
- **Dashboard:** If you started PM2, open `http://YOUR_VM_IP:3000` (and open port 3000 in the cloud firewall).
- **Logs:** On the VM, `crontab -l` shows the schedule; `~/AnimalMind/memory/ingest.log` and `~/AnimalMind/memory/cron.log` show runs.

Your PC can stay off; the VM keeps the research engine up to date.

### Switch existing VM from 6-hour to 1-hour

If the VM was set up earlier with every-6-hour cron, update it:

```bash
crontab -e
```

Replace the line that has `*/6` with:

```
0 * * * * ~/AnimalMind/scripts/run-ingest.sh >> ~/AnimalMind/memory/cron.log 2>&1
```

Save and exit. Verify with `crontab -l`.
