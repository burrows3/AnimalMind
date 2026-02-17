/**
 * Waitlist sign-up: tries same-origin /api/waitlist first (backed up on server + Supabase);
 * else POSTs to Supabase when configured. Configure in .env: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * In Supabase create table waitlist (id, email, created_at), enable RLS with insert for anon.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const WAITLIST_TABLE = (import.meta.env.VITE_SUPABASE_WAITLIST_TABLE as string) || "waitlist";

export async function submitWaitlist(email: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "Email required" };

  try {
    const apiUrl = typeof window !== "undefined" ? `${window.location.origin}/api/waitlist` : "";
    if (apiUrl) {
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data.ok !== false) return { ok: true };
        return { ok: false, error: data.error || "Signup failed" };
      }
      if (r.status !== 404 && r.status !== 502) {
        const t = await r.text();
        return { ok: false, error: (t || r.statusText).slice(0, 120) };
      }
    }
  } catch {
    // Fall through to Supabase when server is unreachable (e.g. static deploy)
  }

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
        const alreadyListed = r.status === 409 || (r.status === 400 && /duplicate|unique|already|conflict/i.test(t));
        if (alreadyListed) return { ok: true };
        const msg = t || r.statusText;
        return { ok: false, error: msg.length > 120 ? `${msg.slice(0, 120)}…` : msg };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  }
  return { ok: false, error: "Signup unavailable. Try again later." };
}

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}
