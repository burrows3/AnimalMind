#!/usr/bin/env node
/**
 * Copy frontend build (dist/) to public/ and docs/ for Express and GitHub Pages.
 * Preserves docs/CNAME, docs/data-summary.json, docs/data/ — only overwrites index.html and assets/.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const DIST = path.join(REPO_ROOT, "frontend", "dist");

if (!fs.existsSync(DIST)) {
  console.error("Run npm run build in frontend first.");
  process.exit(1);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    const s = path.join(srcDir, name);
    const d = path.join(destDir, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

// public/ (Express)
const publicDir = path.join(REPO_ROOT, "public");
copyFile(path.join(DIST, "index.html"), path.join(publicDir, "index.html"));
copyDir(path.join(DIST, "assets"), path.join(publicDir, "assets"));
console.log("Copied build to public/");

// docs/ (GitHub Pages)
const docsDir = path.join(REPO_ROOT, "docs");
copyFile(path.join(DIST, "index.html"), path.join(docsDir, "index.html"));
copyDir(path.join(DIST, "assets"), path.join(docsDir, "assets"));
console.log("Copied build to docs/");

console.log("Done. Restart server or push docs for GitHub Pages.");
