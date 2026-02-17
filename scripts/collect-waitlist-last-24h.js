#!/usr/bin/env node
/**
 * Collect waitlist emails from the last 24 hours.
 * Reads memory/waitlist-backup.jsonl (created by server when users submit the form).
 * Run from repo root: node scripts/collect-waitlist-last-24h.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const BACKUP_PATH = path.join(REPO_ROOT, 'memory', 'waitlist-backup.jsonl');
const HOURS = 24;

function main() {
  const since = Date.now() - HOURS * 60 * 60 * 1000;
  const emails = [];

  if (!fs.existsSync(BACKUP_PATH)) {
    console.log('No waitlist backup file found at memory/waitlist-backup.jsonl');
    console.log('Emails are only backed up there when the server (npm start) is used and POST /api/waitlist is called.');
    process.exit(0);
    return;
  }

  const content = fs.readFileSync(BACKUP_PATH, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      const at = row.created_at ? new Date(row.created_at).getTime() : 0;
      if (row.email && at >= since) emails.push({ email: row.email, created_at: row.created_at });
    } catch {
      // skip invalid lines
    }
  }

  const unique = [...new Map(emails.map((e) => [e.email.toLowerCase(), e])).values()].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  console.log(`Waitlist emails (last ${HOURS} hours) from backup:\n`);
  if (unique.length === 0) {
    console.log('(none)');
  } else {
    unique.forEach(({ email, created_at }) => console.log(`${email}\t${created_at}`));
    console.log(`\nTotal: ${unique.length}`);
  }
}

main();
