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

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

// public/ (Express)
const publicDir = path.join(REPO_ROOT, "public");
copyFile(path.join(DIST, "index.html"), path.join(publicDir, "index.html"));
const publicAssetsDir = path.join(publicDir, "assets");
resetDir(publicAssetsDir);
copyDir(path.join(DIST, "assets"), publicAssetsDir);
const faviconSrc = path.join(DIST, "favicon.svg");
if (fs.existsSync(faviconSrc)) {
  copyFile(faviconSrc, path.join(publicDir, "favicon.svg"));
}
const logoSrc = path.join(DIST, "logo.png");
if (fs.existsSync(logoSrc)) {
  copyFile(logoSrc, path.join(publicDir, "logo.png"));
}
for (let i = 1; i <= 6; i++) {
  const name = `pet-placeholder-${i}.svg`;
  const src = path.join(DIST, name);
  if (fs.existsSync(src)) {
    copyFile(src, path.join(publicDir, name));
  }
}
copyDir(path.join(DIST, "pet-images"), path.join(publicDir, "pet-images"));
console.log("Copied build to public/");

// docs/ (GitHub Pages)
const docsDir = path.join(REPO_ROOT, "docs");
copyFile(path.join(DIST, "index.html"), path.join(docsDir, "index.html"));
const docsAssetsDir = path.join(docsDir, "assets");
resetDir(docsAssetsDir);
copyDir(path.join(DIST, "assets"), docsAssetsDir);
if (fs.existsSync(faviconSrc)) {
  copyFile(faviconSrc, path.join(docsDir, "favicon.svg"));
}
if (fs.existsSync(logoSrc)) {
  copyFile(logoSrc, path.join(docsDir, "logo.png"));
}
for (let i = 1; i <= 6; i++) {
  const name = `pet-placeholder-${i}.svg`;
  const src = path.join(DIST, name);
  if (fs.existsSync(src)) {
    copyFile(src, path.join(docsDir, name));
  }
}
copyDir(path.join(DIST, "pet-images"), path.join(docsDir, "pet-images"));
console.log("Copied build to docs/");

console.log("Done. Restart server or push docs for GitHub Pages.");
