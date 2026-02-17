/**
 * Email signup for updates: sends to Supabase only (via same-origin /api/waitlist or direct).
 * Set in .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY. Table: waitlist (email, created_at), RLS allow insert for anon.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const WAITLIST_TABLE = (import.meta.env.VITE_SUPABASE_WAITLIST_TABLE as string) || "waitlist";

export async function submitWaitlist(email: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "Email required" };

  // Prefer same-origin API (server forwards to Supabase)
  if (typeof window !== "undefined") {
    try {
      const r = await fetch(`${window.location.origin}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data.ok !== false) return { ok: true };
        return { ok: false, error: data.error || "Signup failed" };
      }
      if (r.status !== 404) {
        const t = await r.text();
        return { ok: false, error: (t || r.statusText).slice(0, 100) };
      }
    } catch {
      // Fall through to direct Supabase
    }
  }

  // Direct to Supabase (static deploy or server unreachable)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const r = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${WAITLIST_TABLE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!r.ok) {
        const t = await r.text();
        if (r.status === 409 || (r.status === 400 && /duplicate|unique|already|conflict/i.test(t))) return { ok: true };
        return { ok: false, error: (t || r.statusText).slice(0, 100) };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  }

  return { ok: false, error: "Signup unavailable. Try again later." };
}
