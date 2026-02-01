# Where compute runs and where the money comes from

## Compute today (your machine)

Right now, **compute is your Windows PC**:

- The **hourly ingest** runs as a Windows scheduled task on your machine. No cloud VM, no separate server.
- **Cost:** Your own electricity and hardware. No extra billing; no "compute money" from a third party.
- **Source/system:** There is no external funding system for compute yet—it’s **your machine, your cost** (implicit in your existing electric bill and hardware).

So today: **compute = your PC; money = you (no separate funding source).**

---

## If you move to a cloud VM later

If you run the agent or ingest on a **cloud VM** (e.g. Azure, AWS, GCP, or a small VPS):

- **Compute** = that VM (or container) in the cloud.
- **Money source** = whoever pays the cloud bill:
  - **You** (credit card / subscription), or
  - **Grant or sponsor** (they pay the cloud provider), or
  - **Project revenue** (e.g. ARN token, donations) used to pay the cloud bill.

There is **no automatic link** today between ARN/token and paying for compute—that would require a system (e.g. “wallet pays cloud subscription” or “grant pays for VM”) that you’d set up later.

---

## ARN token and parent wallet

The project has:

- **Token:** ARN (Animal Research Network)
- **Parent wallet:** e.g. `chatvet.base.eth` (fee recipient for trading)

Those are for **funding research and the project**, not (yet) for paying for compute. If you want compute to be paid from “project money,” you’d need to:

- Use revenue or donations that land in that wallet (or a project account), then
- Manually or automatically pay a cloud provider from that source.

So: **today, compute money comes from your own machine (you).** A future “source or system” for compute could be: your cloud subscription, a grant, or project funds (e.g. ARN) that you choose to use to pay for a VM.
