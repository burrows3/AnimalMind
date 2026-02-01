# animalmind.co – DNS and GitHub Pages

Use these steps so **animalmind.co** and **www.animalmind.co** point to your landing page on GitHub Pages.

---

## 1. Enable GitHub Pages (repo)

1. Open **https://github.com/burrows3/AnimalMind**
2. **Settings** → **Pages** (left sidebar)
3. **Source:** Deploy from a branch
4. **Branch:** `main` → **Folder:** `/docs` → Save
5. **Custom domain:** type `animalmind.co` → Save
6. Wait 1–2 minutes, then tick **Enforce HTTPS** (once DNS has propagated)

---

## 2. GoDaddy DNS (what to change)

In **GoDaddy** → **My Products** → **animalmind.co** → **DNS** (or **Manage DNS**):

### A records for root (animalmind.co)

**Remove** the existing **A** record that points to "WebsiteBuilder Site" (delete it or edit it).

**Add** these **4 A records** (one row per IP):

| Type | Name | Value | TTL |
|------|------|--------|-----|
| A | @ | 185.199.108.153 | 600 |
| A | @ | 185.199.109.153 | 600 |
| A | @ | 185.199.110.153 | 600 |
| A | @ | 185.199.111.153 | 600 |

*(Name = @ means the root domain animalmind.co.)*

### CNAME for www (www.animalmind.co)

**Edit** the existing **CNAME** record where **Name** is `www`:

- **Before:** Value might be `animalmind.co` or similar  
- **After:** set Value to **`burrows3.github.io`**  
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
- Then open **http://animalmind.co** and **http://www.animalmind.co** – you should see the Animal Mind landing page.
- After **Enforce HTTPS** is enabled in GitHub Pages, use **https://animalmind.co**.

---

## Summary

| Where | What to do |
|-------|------------|
| GitHub repo | Settings → Pages → Source: main, folder **/docs** → Custom domain: **animalmind.co** → Enforce HTTPS when ready |
| GoDaddy DNS | Remove A “WebsiteBuilder”; add 4× A @ → GitHub IPs; set CNAME www → **burrows3.github.io** |

The landing page files live in **`docs/index.html`** (and **`docs/CNAME`**). Edit `docs/index.html` to change the text or link.
