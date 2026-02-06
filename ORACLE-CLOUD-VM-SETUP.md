# Set up Animal Research Network on an Oracle Cloud VM

**Optional.** Oracle Cloud is free but its networking (VCN, security lists, NSGs) can be confusing. If you’d rather not use Oracle: run the **Windows scheduled task** on your PC ([SCHEDULE-WINDOWS.md](./SCHEDULE-WINDOWS.md)), or use a simpler VPS (e.g. [VM-RECOMMENDATIONS.md](./VM-RECOMMENDATIONS.md)).

Step-by-step below: create an **Always Free** VM, install Node.js, clone the repo, and run **ingest + think + push** every 3 hours so your PC can stay off.

**Cost:** The **Always Free** VM (1 vCPU, 1 GB RAM) is **$0/month**. You stay under $10 as long as you don’t add paid resources.

---

## Easiest: 2 steps (VM already Running)

If your instance is **Running** and you have its **Public IP** and your **private key**:

**1. Open the firewall (once)**  
**Menu (≡)** → **Networking** → **Virtual cloud networks** → click your VCN (e.g. **animalresearchnetwork**) → **Default Security List** → **Add ingress rules**. Add two rules: **Source** `0.0.0.0/0`, **TCP**, **Destination port** `22` → Save. Then same again with port **`3000`** → Save.

**2. Run the setup script (from your PC)**  
Open PowerShell, go to the repo folder, then run:

```powershell
.\scripts\run-oracle-vm-setup.ps1
```

When it asks: enter your **private key path**, your **VM public IP** (e.g. `147.224.216.170`), and your **GitHub username** (e.g. `burrows3`). When the script asks for your **GitHub token**, paste a [Personal Access Token](https://github.com/settings/tokens) (repo scope) and press Enter. For **PM2**, type **y** or **n**. Done.

**Connection timed out?**  
1. **Compute → Instances** – instance must be **Running**; if **Stopped**, click **Start** and copy the **Public IP** (it can change).  
2. **Networking → VCN → Security Lists** – default list must have an **Ingress** rule: **Source** `0.0.0.0/0`, **TCP**, **Destination port** `22`. Add it and Save.  
3. Run the script again with the **current** Public IP (e.g. `-VmIp "NEW_IP"`).

---

## Simplest path: VCN first, then instance (avoids “You must select a public subnet”)

Do these in order so you never see the public-IP warning.

**A. Create a public subnet (once)**

1. **Menu (≡)** → **Networking** → **Virtual cloud networks**.
2. **Create Virtual Cloud Network**.
3. **Name:** `vcn-animalmind`. **Compartment:** your compartment (e.g. animalresearchnetwork).
4. **CIDR:** `10.0.0.0/16`.
5. **Create virtual cloud network only** – leave **Create public subnet** unchecked (we’ll add the subnet next).
6. Click **Create VCN**.
7. Open the new VCN → **Subnets** → **Create Subnet**.
8. **Name:** `public-subnet`. **Subnet type:** **Regional**, **Public**. **CIDR:** `10.0.0.0/24`. **Compartment:** same as VCN.
9. Click **Create Subnet**.

**B. Create the VM**

1. **Menu** → **Compute** → **Instances** → **Create instance**.
2. **Name:** e.g. `animalmind`. **Image:** Ubuntu 22.04. **Shape:** VM.Standard.E2.1.Micro or VM.Standard.A1.Flex (Always Free).
3. **Networking:** **Select existing virtual cloud network** → choose **vcn-animalmind** → **Select existing subnet** → choose **public-subnet**.
4. **Public IPv4 address:** **Automatically assign public IPv4 address** (this will work now).
5. **SSH keys:** **Generate a key pair for me** → **Download private key** and save it.
6. **Create**. Wait for **Running**, then copy the **Public IP**.

**C. Open firewall and SSH**

1. **Networking** → **Virtual cloud networks** → **vcn-animalmind** → **Default Security List** → **Add ingress rules:** TCP 22, then TCP 3000 (Source: 0.0.0.0/0). Save.
2. From your PC: `ssh -i "path\to\your-private-key.key" ubuntu@PUBLIC_IP`.
3. On the VM, run the one-line setup (section below) and paste your GitHub token when asked.

---

## Minimal steps (you do 4 things, then one command)

1. **Sign up** – [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) → Start for free (card for verification; no charge within Always Free).
2. **Create VM** – Console → Compute → Instances → Create instance. Name e.g. `animalmind`. Image: **Ubuntu 22.04**. Shape: **VM.Standard.E2.1.Micro** (Always free). Assign public IP. Generate SSH key pair and download the private key.
3. **Open ports** – VCN → Default Security List → Add ingress: TCP 22 (SSH), then TCP 3000 (dashboard).
4. **SSH in** (from Windows PowerShell, use your key path and VM public IP):
   ```powershell
   ssh -i "PRIVATE_KEY_PATH" ubuntu@YOUR_VM_PUBLIC_IP
   ```
5. **One command on the VM** (paste your GitHub token when asked):
   ```bash
   sudo apt-get update -qq && sudo apt-get install -y git curl && git clone https://github.com/YOUR_GITHUB_USERNAME/AnimalMind.git ~/AnimalMind && bash ~/AnimalMind/scripts/oracle-vm-bootstrap.sh
   ```

That’s it. Ingest is scheduled every 3 hours; optionally the script starts the dashboard with PM2. Full details below.

---

## Quick path: Windows + GitHub HTTPS

If you're on **Windows** and use **GitHub over HTTPS** (no SSH key for GitHub):

1. **SSH from PowerShell** (use your key path and the VM’s public IP):
   ```powershell
   ssh -i "PRIVATE_KEY_PATH" ubuntu@YOUR_VM_PUBLIC_IP
   ```
2. **Git push from the VM:** Use **Option A (HTTPS + token)** in section 6 below. Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope, then on the VM set:
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_GITHUB_USERNAME/AnimalMind.git
   ```
   When Git asks for a password, use the **token**, not your GitHub password.

---

## 1. Sign up for Oracle Cloud (Always Free)

1. Go to **https://www.oracle.com/cloud/free/** and click **Start for free**.
2. Create an account (email, country, name). Oracle may ask for a **credit card** for verification; they do **not** charge if you stay within Always Free limits.
3. Choose your **region** (e.g. Phoenix, Ashburn). You can create **2 AMD VMs** (1 vCPU, 1 GB RAM each) or use **Ampere (Arm)** – we use **one** AMD VM for this guide.
4. Log in to the **Oracle Cloud Console**: https://cloud.oracle.com/

---

## 2. Create a VM instance

1. In the console, open the **hamburger menu** (top left) → **Compute** → **Instances**.
2. Click **Create instance**.
3. **Name:** e.g. `animalmind` or `animal-research-network`.
4. **Placement:** Keep default (your region, any availability zone).
5. **Image and shape:**
   - Click **Edit** next to "Image and shape".
   - **Image:** Pick **Ubuntu 22.04** (or latest Ubuntu).
   - **Shape:** Under "Always free-eligible", pick **VM.Standard.E2.1.Micro** (1 OCPU, 1 GB memory). Click **Select shape**.
6. **Networking:** Keep default VCN (create new if needed). Ensure **"Assign a public IPv4 address"** is checked so you can SSH.
7. **Add SSH keys:**
   - Choose **"Generate a key pair for me"** (Oracle will offer a download). Download the private key and keep it safe (e.g. `oracle-animalmind.key`). You will use it to SSH.
   - Or **"Upload public key"** if you already have an SSH key – paste your public key.
8. Click **Create**. Wait until the instance state is **Running** (green). Note the **Public IP address**.

---

## 3. Open SSH and HTTP in the firewall

The VM is behind a **firewall (security list)**. You need to allow SSH (22) and, if you run the dashboard, HTTP (80) or your app port (e.g. 3000).

1. In the console: **Networking** → **Virtual cloud networks** → click your VCN.
2. Click the **Default Security List** (or the one attached to your instance’s subnet).
3. **Ingress rules** → **Add ingress rule**:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Destination port range:** `22` (SSH). Save.
4. Add another ingress rule for the app (if you want the dashboard from the browser):
   - **Destination port range:** `3000` (or `80` if you use a reverse proxy later). Save.

---

## 4. SSH into the VM

From your PC (PowerShell or a terminal), use the private key you downloaded. Replace `PRIVATE_KEY_PATH` and `PUBLIC_IP`:

```bash
ssh -i PRIVATE_KEY_PATH ubuntu@PUBLIC_IP
```

Example (Windows, if you have OpenSSH):

```powershell
ssh -i "PRIVATE_KEY_PATH" ubuntu@YOUR_VM_PUBLIC_IP
```

If the key has the wrong permissions (Linux/Mac): `chmod 600 PRIVATE_KEY_PATH`.  
First login can take a minute while the VM finishes booting.

---

## 5. Install Node.js (LTS) on the VM

On the VM (Ubuntu), run:

```bash
sudo apt-get update
sudo apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

(Use Node 20 LTS; adjust the URL if you prefer another LTS version.)

---

## 6. Clone the repo and install dependencies

On the VM:

```bash
cd ~
git clone https://github.com/YOUR_GITHUB_USERNAME/AnimalMind.git
cd AnimalMind
npm install
```

So the VM can **push** to GitHub (for ingest → push), use either **HTTPS with a token** or **SSH**.

**Option A – HTTPS + Personal Access Token (use this if you use GitHub over HTTPS / no SSH):**

1. On GitHub: **Settings** → **Developer settings** → **Personal access tokens** → create a token with `repo` scope.
2. On the VM, set the remote to use the token (once):

```bash
git remote set-url origin https://YOUR_GITHUB_TOKEN@github.com/YOUR_GITHUB_USERNAME/AnimalMind.git
```

Or when you first push, Git will ask for username/password – use your GitHub username and the **token** as the password.

**Option B – SSH key:**

1. On the VM: `ssh-keygen -t ed25519 -C "animalmind-vm" -f ~/.ssh/animalmind -N ""`
2. `cat ~/.ssh/animalmind.pub` – copy the output.
3. On GitHub: **Settings** → **SSH and GPG keys** → **New SSH key** → paste, save.
4. In the repo: `git remote set-url origin git@github.com:YOUR_GITHUB_USERNAME/AnimalMind.git`
5. Test: `ssh -T git@github.com` (first time: type `yes` to accept host key).

---

## 7. Run the ingest once (test)

On the VM:

```bash
cd ~/AnimalMind
node scripts/ingest-data-sources.js
node scripts/think-autonomous.js
node scripts/push-ingest-to-github.js
```

If push asks for credentials, use Option A or B above. Check GitHub – you should see a new commit (Ingest: …).

---

## 8. Schedule ingest every 3 hours (cron)

On the VM:

```bash
crontab -e
```

If asked, choose an editor (e.g. `nano`). Add this line (runs at 00:00, 06:00, 12:00, 18:00):

```
0 */6 * * * cd ~/AnimalMind && /usr/bin/node scripts/ingest-data-sources.js && /usr/bin/node scripts/think-autonomous.js && /usr/bin/node scripts/push-ingest-to-github.js >> ~/AnimalMind/memory/cron.log 2>&1
```

Replace `~/AnimalMind` with your repo path if different (e.g. `/home/ubuntu/AnimalMind`). Save and exit.

**Alternative (using the shell script):** You can instead run the bundled script so logs go to `memory/ingest.log`:

```
0 */6 * * * ~/AnimalMind/scripts/run-ingest.sh >> ~/AnimalMind/memory/cron.log 2>&1
```

Verify: `crontab -l` should show the line. After 3 hours, check `memory/cron.log` (and `memory/ingest.log` if you use the script) and GitHub for a new commit.

---

## 9. (Optional) Run the dashboard 24/7 with PM2

So you can open the Animal Research Network dashboard in a browser without your PC:

```bash
sudo npm install -g pm2
cd ~/AnimalMind
pm2 start server.js --name animalmind
pm2 save
pm2 startup
```

Run the command `pm2 startup` prints (it will say something like `sudo env PATH=...`). That makes the app start after a reboot.

Open in a browser: **http://YOUR_VM_PUBLIC_IP:3000**  
(You must have opened port 3000 in the security list – see step 3.)

Useful PM2 commands:

- `pm2 status` – list processes  
- `pm2 logs animalmind` – view logs  
- `pm2 restart animalmind` – restart the app  

---

## 10. Summary

| Step | What you did |
|------|----------------|
| 1 | Signed up for Oracle Cloud Always Free |
| 2 | Created a VM (Ubuntu, 1 vCPU, 1 GB RAM) |
| 3 | Opened SSH (22) and, if needed, app port (3000) in the security list |
| 4 | SSH’d in with your private key |
| 5 | Installed Node.js 20 LTS |
| 6 | Cloned AnimalMind repo and set up Git push (token or SSH) |
| 7 | Ran ingest + think + push once to verify |
| 8 | Added a cron job to run ingest + think + push every 3 hours |
| 9 | (Optional) Started the dashboard with PM2 on port 3000 |

After this, **your PC can stay off**. The Oracle VM runs ingest + think + push every 3 hours and can serve the dashboard at **http://YOUR_VM_PUBLIC_IP:3000**.

---

## Troubleshooting

- **SSH "Permission denied":** Check that you use the correct user (`ubuntu` for Ubuntu images) and the correct private key file, and that the VM’s public IP is the one shown in the console.
- **Push to GitHub fails:** Ensure the remote URL uses your token (HTTPS) or that your SSH key is added to GitHub and `ssh -T git@github.com` works.
- **Cron doesn’t run:** Use full paths (`/usr/bin/node`, full path to `AnimalMind`). Check `crontab -l` and logs in `memory/cron.log` or `memory/ingest.log`.
- **Dashboard not reachable:** Ensure port 3000 (or 80) is allowed in the VM’s **security list** (step 3).
