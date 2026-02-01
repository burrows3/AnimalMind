# Running the ingest every 6 hours on Windows (autonomous)

**Most efficient:** use **Windows Task Scheduler**. No extra process runs between runs; the task simply triggers every 6 hours. No Node daemon, no cron service—just a scheduled task.

## One-click setup (recommended)

Run this **once** from the repo (no need to open Task Scheduler yourself):

```cmd
scripts\setup-hourly-task.cmd
```

That creates the scheduled task **AnimalMind Ingest** to run every 6 hours. If you get "access denied," right‑click the script → **Run as administrator**. To run the task now: `schtasks /run /tn "AnimalMind Ingest"`. To remove it: `schtasks /delete /tn "AnimalMind Ingest" /f`.

---

## Manual setup (optional)

If you prefer to create the task by hand:

1. **Open Task Scheduler**  
   Win + R → `taskschd.msc` → Enter.

2. **Create task**  
   Action → **Create Task** (not “Create Basic Task”) so you can set “Run whether user is logged on or not” for true autonomy.

3. **General**
   - Name: `AnimalMind Ingest`
   - Description: `Data ingest every 6 hours (PubMed + CDC) for animal health insights`
   - Select **Run whether user is logged on or not** (and enter your password when prompted) so it runs when the machine is locked or you’re away.
   - Optionally: **Run with highest privileges** only if you need it (usually not).

4. **Triggers**
   - New → **On a schedule**
   - Settings: **Daily**, repeat every **1 hour**, for a duration of **Indefinitely**
   - Or: **Repeat task every**: 1 hour, for duration **Indefinitely**
   - Start: today (or when you want it to start).
   - Enabled: yes.

5. **Actions**
   - New → **Start a program**
   - **Program/script:**  
     `C:\Users\burro\AnimalMind\AnimalMind\scripts\run-ingest.cmd`  
     (Use your actual repo path if different.)
   - **Start in (optional but recommended):**  
     `C:\Users\burro\AnimalMind\AnimalMind`  
     (Repo root so `node scripts\ingest-data-sources.js` and `memory\` paths work.)

6. **Conditions** (optional)
   - Uncheck **Start the task only if the computer is on AC power** if you want it to run on battery (e.g. laptop).
   - Leave **Wake the computer to run this task** unchecked unless you want the PC to wake for the run.

7. **Settings**
   - Allow task to be run on demand: yes.
   - If the task fails, restart every: optional (e.g. 10 minutes, 3 times).
   - Stop if it runs longer than: optional (e.g. 5 minutes).

8. **OK** and enter your Windows password if you chose “Run whether user is logged on or not”.

## Verify

- In Task Scheduler, right‑click **AnimalMind Ingest** → **Run**. Check that `memory\data-sources\pubmed-recent.json` and `memory\data-sources\cdc-travel-notices.json` update and that `memory\ingest.log` gets a new line (e.g. `01/31/2026 12:00:00 ok`).
- **Task Scheduler Library** → **AnimalMind Ingest** → **History** shows last run and result.

## What runs every 6 hours

- **Program:** `scripts\run-ingest.cmd`  
  Runs `node scripts\ingest-data-sources.js` from the repo root, appends one line to `memory\ingest.log` (timestamp + ok/FAIL), then runs `node scripts\push-ingest-to-github.js` to **commit and push** the ingest (DB + JSON) to GitHub so the latest data is stored in the repo.
- **Result:** `memory\data-sources\pubmed-recent.json` and `memory\data-sources\cdc-travel-notices.json` are refreshed. Agents (or you) use these for insights, risks, opportunities, and partnerships—see [ARCHITECTURE.md](./ARCHITECTURE.md) and the “Agent tasks and goals” section there.

## Why Task Scheduler

- **Efficient:** No process running between runs; OS wakes the task every 6 hours.
- **Native:** No extra services or cron ports; works on any Windows machine.
- **Autonomous:** With “Run whether user is logged on or not,” it keeps running when you’re not there.
