# Running the ingest every 1 hour on Windows (autonomous)

**Most efficient:** use **Windows Task Scheduler**. No extra process runs between runs; the task simply triggers every 1 hour. No Node daemon, no cron service—just a scheduled task.

## One-click setup (recommended)

Run this **once** from the repo (no need to open Task Scheduler yourself):

```cmd
scripts\setup-hourly-task.cmd
```

That creates the scheduled task **AnimalMind Ingest** to run every 1 hour. If you get "access denied," right‑click the script → **Run as administrator**. To run the task now: `schtasks /run /tn "AnimalMind Ingest"`. To remove it: `schtasks /delete /tn "AnimalMind Ingest" /f`.

---

## Manual setup (optional)

If you prefer to create the task by hand:

1. **Open Task Scheduler**  
   Win + R → `taskschd.msc` → Enter.

2. **Create task**  
   Action → **Create Task** (not “Create Basic Task”) so you can set “Run whether user is logged on or not” for true autonomy.

3. **General**
   - Name: `AnimalMind Ingest`
   - Description: `Data ingest every 1 hour (PubMed + CDC) for animal health insights`
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
     `YOUR_REPO_ROOT\scripts\run-ingest.cmd`  
     (Use your actual repo path, e.g. `C:\path\to\AnimalMind\scripts\run-ingest.cmd`.)
   - **Start in (optional but recommended):**  
     `YOUR_REPO_ROOT`  
     (Repo root so `node scripts\ingest-data-sources.js` and `memory\` paths work.)

6. **Conditions** (optional)
   - Uncheck **Start the task only if the computer is on AC power** if you want it to run on battery (e.g. laptop).
   - Leave **Wake the computer to run this task** unchecked unless you want the PC to wake for the run.

7. **Settings**
   - Allow task to be run on demand: yes.
   - **Run task as soon as possible after a scheduled start is missed:** check this if you want ingest to run once after the PC wakes from sleep (so a missed 00:00 or 06:00 run happens when you wake the machine).
   - If the task fails, restart every: optional (e.g. 10 minutes, 3 times).
   - Stop if it runs longer than: optional (e.g. 5 minutes).

8. **OK** and enter your Windows password if you chose “Run whether user is logged on or not”.

## When does ingestion run next?

- **Schedule:** The task **AnimalMind Ingest** runs **every 1 hour** (on the hour), as set by `scripts\setup-hourly-task.cmd` (`/sc hourly /mo 1 /st 00:00`).
- **See exact next run:** Open **Task Scheduler** → **Task Scheduler Library** → **AnimalMind Ingest** → **Next Run Time** in the list, or run:
  ```cmd
  schtasks /query /tn "AnimalMind Ingest" /fo LIST /v
  ```
  and look for the line **Next Run Time**.
- **Last run:** Check `memory\ingest.log` (each line is a run: date, time, ok or FAIL).

## Verify

- In Task Scheduler, right‑click **AnimalMind Ingest** → **Run**. Check that `memory\data-sources\pubmed-recent.json` and `memory\data-sources\cdc-travel-notices.json` update and that `memory\ingest.log` gets a new line (e.g. `01/31/2026 12:00:00 ok`).
- **Task Scheduler Library** → **AnimalMind Ingest** → **History** shows last run and result.

## What runs every 1 hour

- **Program:** `scripts\run-ingest.cmd`  
  Runs `node scripts\ingest-data-sources.js` from the repo root, appends one line to `memory\ingest.log` (timestamp + ok/FAIL), then runs `node scripts\push-ingest-to-github.js` to **commit and push** the ingest (DB + JSON) to GitHub so the latest data is stored in the repo.
- **Result:** `memory\data-sources\pubmed-recent.json` and `memory\data-sources\cdc-travel-notices.json` are refreshed. Agents (or you) use these for insights, risks, opportunities, and partnerships—see [ARCHITECTURE.md](./ARCHITECTURE.md) and the “Agent tasks and goals” section there.

## Why Task Scheduler

- **Efficient:** No process running between runs; OS wakes the task every 1 hour.
- **Native:** No extra services or cron ports; works on any Windows machine.
- **Autonomous:** With "Run whether user is logged on or not," it keeps running when you're not there.

## If the computer was asleep

- **Scheduled tasks do not run while the PC is asleep.** Any hour that falls while the machine is sleeping is skipped. Nothing runs until the next scheduled time after wake.
- **To run after wake:** In the task **Settings** tab, enable **"Run task as soon as possible after a scheduled start is missed."** Then when you wake the PC, the task will run once for the missed time (and then resume the normal 1-hour schedule).
- **For 24/7 ingest:** Use a machine that stays on (e.g. a server or cloud VM). See [ORACLE-CLOUD-VM-SETUP.md](./ORACLE-CLOUD-VM-SETUP.md) for a VM that runs ingest even when your laptop is closed.

## Why every 1 hour?

- **Fresher data:** Surveillance (CDC) and literature (PubMed) updates appear within an hour instead of six.
- **Same VM cost:** The droplet is billed per month, not per run; running every 1 hour does not increase cost.
- **Quicker opportunities:** Agent outputs and pushed commits reflect new data more often.

