/**
 * Waitlist sign-up: when Supabase is configured, POST to your table; otherwise fallback to mailto.
 * Configure in .env: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * In Supabase create a table, e.g. waitlist (id, email, created_at), enable RLS with insert for anon.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const WAITLIST_TABLE = (import.meta.env.VITE_SUPABASE_WAITLIST_TABLE as string) || "waitlist";

export async function submitWaitlist(email: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "Email required" };

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const r = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${WAITLIST_TABLE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!r.ok) {
        const t = await r.text();
        const alreadyListed = r.status === 409 || (r.status === 400 && /duplicate|unique|already|conflict/i.test(t));
        if (alreadyListed) return { ok: true };
        return { ok: false, error: t || r.statusText };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  }
  return { ok: false, error: "MAILTO" };
}

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}
