# Custom domain – DNS and GitHub Pages

Use these steps so **YOUR_DOMAIN** and **www.YOUR_DOMAIN** point to your landing page on GitHub Pages. Replace `YOUR_DOMAIN` (e.g. `yourdomain.com`) and `YOUR_GITHUB_USERNAME` with your own values.

---

## 1. Enable GitHub Pages (repo)

1. Open **https://github.com/YOUR_GITHUB_USERNAME/AnimalMind** (or your repo URL)
2. **Settings** → **Pages** (left sidebar)
3. **Source:** Deploy from a branch
4. **Branch:** `main` → **Folder:** `/docs` → Save
5. **Custom domain:** type **YOUR_DOMAIN** (e.g. `yourdomain.com`) → Save
6. Wait 1–2 minutes, then tick **Enforce HTTPS** (once DNS has propagated)

---

## 2. GoDaddy DNS (what to change)

In **GoDaddy** → **My Products** → **YOUR_DOMAIN** → **DNS** (or **Manage DNS**):

### A records for root (YOUR_DOMAIN)

**Remove** the existing **A** record that points to "WebsiteBuilder Site" (delete it or edit it).

**Add** these **4 A records** (one row per IP):

| Type | Name | Value | TTL |
|------|------|--------|-----|
| A | @ | 185.199.108.153 | 600 |
| A | @ | 185.199.109.153 | 600 |
| A | @ | 185.199.110.153 | 600 |
| A | @ | 185.199.111.153 | 600 |

*(Name = @ means the root domain YOUR_DOMAIN.)*

### CNAME for www (www.YOUR_DOMAIN)

**Edit** the existing **CNAME** record where **Name** is `www`:

- **Before:** Value might be YOUR_DOMAIN or similar  
- **After:** set Value to **`YOUR_GITHUB_USERNAME.github.io`**  
- Name: `www`  
- TTL: 1 Hour (or 600) is fine  

*(Do **not** delete the two **NS** records; leave those as they are.)*

### Leave as-is

- **NS** (@ → ns31.domaincontrol.com, ns32.domaincontrol.com) – don’t delete or edit  
- **CNAME** `pay` – leave if you use GoDaddy payments  
- **CNAME** `_domainconnect` – leave  
- **SOA** – leave  
- **TXT** `_dmarc` – leave  

---

## 3. Wait and test

- DNS can take from a few minutes up to 48 hours (often 10–30 minutes).
- Then open **http://YOUR_DOMAIN** and **http://www.YOUR_DOMAIN** – you should see your landing page.
- After **Enforce HTTPS** is enabled in GitHub Pages, use **https://YOUR_DOMAIN**.

---

## Summary

| Where | What to do |
|-------|------------|
| GitHub repo | Settings → Pages → Source: main, folder **/docs** → Custom domain: **YOUR_DOMAIN** → Enforce HTTPS when ready |
| GoDaddy DNS | Remove A “WebsiteBuilder”; add 4× A @ → GitHub IPs; set CNAME www → **YOUR_GITHUB_USERNAME.github.io** |

The landing page files live in **`docs/index.html`** (and **`docs/CNAME`**). Edit `docs/index.html` to change the text or link.

---

## If you still see GoDaddy’s “Launching Soon” or “GoDaddy” page

Sometimes GoDaddy still shows a default page even when DNS points to GitHub. **Use Cloudflare for DNS** (free) so GoDaddy is no longer in the path.

### 1. Add the site in Cloudflare

1. Go to **https://dash.cloudflare.com** and sign up or log in (free).
2. Click **Add a site** → enter **YOUR_DOMAIN** → **Add site**.
3. Choose the **Free** plan → **Continue**.
4. Cloudflare will show your current DNS records (imported from GoDaddy). Check that you have:
   - **4 A records** for **@** → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153  
   - **1 CNAME** **www** → **YOUR_GITHUB_USERNAME.github.io**
5. If any are missing, add them. Then click **Continue**.
6. Cloudflare will show **two nameservers**, e.g.:
   - `ada.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`  
   Copy them (you’ll paste them in GoDaddy).

### 2. Point the domain to Cloudflare in GoDaddy

1. In **GoDaddy** → **My Products** → **YOUR_DOMAIN** → open the domain.
2. Go to the **DNS** tab → **Nameservers** sub-tab (not “DNS Records”).
3. Click **Change** (or “Manage” nameservers).
4. Choose **Enter my own nameservers (custom)**.
5. Paste Cloudflare’s **first** nameserver in the first box, **second** in the second box.
6. **Save**.

### 3. Wait and test

- Propagation can take 5–30 minutes (sometimes up to a few hours).
- Then open **https://YOUR_DOMAIN** (and try incognito or another device if needed).

After this, **GoDaddy only holds the registration**; **Cloudflare serves DNS**, so GoDaddy’s default page no longer appears.
