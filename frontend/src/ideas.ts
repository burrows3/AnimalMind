/**
 * Platform ideas: submit to Supabase (same project as waitlist).
 * Table: platform_ideas (id, idea, email, source, created_at).
 * Configure: same VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as waitlist.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const IDEAS_TABLE = (import.meta.env.VITE_SUPABASE_IDEAS_TABLE as string) || "platform_ideas";

export type IdeaSource = "landing" | "pet" | "pro";

export async function submitIdea(idea: string, source: IdeaSource, email?: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = (idea || "").trim();
  if (!trimmed) return { ok: false, error: "Please describe your idea." };

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: "Ideas are not available right now. Try again later." };
  }

  try {
    const body: Record<string, unknown> = {
      idea: trimmed.slice(0, 5000),
      source,
    };
    if (email && email.trim()) {
      body.email = email.trim().slice(0, 320);
    }
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${IDEAS_TABLE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: t || r.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}
