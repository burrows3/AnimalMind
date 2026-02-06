# Push AnimalMind to GitHub

Your repo is connected to **https://github.com/YOUR_GITHUB_USERNAME/AnimalMind.git** (or your org/repo) on branch `main`. Files are staged and ready to commit.

## 1. Set your Git identity (one-time)

If you haven't already:

```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

Or for this repo only:

```bash
cd YOUR_REPO_ROOT
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

## 2. Commit and push

From the AnimalMind folder:

```bash
cd YOUR_REPO_ROOT
git commit -m "Add Moltbook auth, .env.example, .gitignore, docs"
git push -u origin main
```

## What will be pushed

- `.gitignore` – ignores `.env`, `node_modules`, `.npm-cache`, etc.
- `.env.example` – template for `MOLTBOOK_APP_KEY`
- `README.md` – updated with Moltbook auth link
- `MOLTBOOK-AUTH.md` – Moltbook Sign-in integration guide
- `lib/moltbookAuth.js` – Moltbook auth middleware

Secrets (e.g. `.env`) and caches (e.g. `.npm-cache`) are not committed.

## Create an `animalmind` branch (optional)

If you want a branch named `animalmind`:

```bash
git checkout -b animalmind
git push -u origin animalmind
```

Then switch back to `main` with: `git checkout main`.
