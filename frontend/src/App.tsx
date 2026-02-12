import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  Clock,
  FileText,
  FlaskConical,
  Globe,
  Heart,
  RefreshCw,
  Shield,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { submitWaitlist, isSupabaseConfigured } from "./waitlist";

const DATA_ORDER = [
  "surveillance",
  "literature",
  "cancer",
  "case_data",
  "clinical",
  "imaging",
  "vet_practice",
] as const;

const LABELS: Record<string, string> = {
  surveillance: "Surveillance",
  literature: "Literature",
  cancer: "Cancer",
  case_data: "Case reports",
  clinical: "Clinical",
  imaging: "Imaging",
  vet_practice: "Vet practice",
};

const TRACK_ITEMS: { key: string; title: string; desc: string; tag: string }[] = [
  { key: "surveillance", title: "Surveillance", desc: "CDC travel notices", tag: "CDC" },
  { key: "literature", title: "Literature", desc: "PubMed", tag: "PubMed" },
  { key: "cancer", title: "Cancer", desc: "Veterinary oncology", tag: "Oncology" },
  { key: "case_data", title: "Case data", desc: "Veterinary case reports", tag: "Case reports" },
  { key: "clinical", title: "Clinical", desc: "Practice, small animal, equine", tag: "Clinical" },
  { key: "imaging", title: "Imaging", desc: "TCIA, radiographs", tag: "TCIA" },
  { key: "vet_practice", title: "Vet practice", desc: "AAHA, AVMA, VIN, Merck", tag: "Guidelines" },
];

const DATA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  surveillance: Globe,
  literature: BookOpen,
  cancer: FlaskConical,
  case_data: FileText,
  clinical: Stethoscope,
  imaging: BarChart3,
  vet_practice: Building2,
};

type DataSummary = {
  lastUpdated?: string | null;
  counts?: Record<string, number>;
};

type IngestedRow = {
  data_type: string;
  condition_or_topic?: string;
  title?: string;
  url?: string;
};

function safeHref(url: string | undefined): string {
  if (!url || typeof url !== "string") return "#";
  const u = String(url).trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return "#";
}

/** Animal Mind logo: animal head (profile) + mind dot. Same as favicon. */
function AnimalMindLogo({ className }: { className?: string }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="currentColor" />
      <path fill="currentColor" d="M10 10 L8 16 L12 14 Z" />
      <circle cx="24" cy="10" r="4" fill="currentColor" />
    </svg>
  );
}

const base = typeof document !== "undefined" ? "" : "";

/** Try /api/dashboard first (live from DB when running locally); else use static JSON. */
async function fetchDashboard(): Promise<{
  summary: DataSummary | null;
  ingested: IngestedRow[] | null;
}> {
  try {
    const r = await fetch(`${base}/api/dashboard`, { cache: "no-store" });
    if (r.ok) {
      const data = await r.json();
      return {
        summary: data.summary ?? null,
        ingested: Array.isArray(data.ingested) ? data.ingested : null,
      };
    }
  } catch {
    // e.g. GitHub Pages: no API
  }
  const [summaryRes, ingestedRes] = await Promise.all([
    fetch(`${base}/data-summary.json`, { cache: "no-store" }),
    fetch(`${base}/data/ingested.json`, { cache: "no-store" }),
  ]);
  const summary = summaryRes.ok ? await summaryRes.json() : null;
  const ingested = ingestedRes.ok && Array.isArray(await ingestedRes.json())
    ? await ingestedRes.json()
    : null;
  return { summary, ingested };
}

export default function App() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [memory, setMemory] = useState<IngestedRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [waitlistError, setWaitlistError] = useState("");
  const [proCtaExpanded, setProCtaExpanded] = useState(false);

  const hashToView = (h: string) => (h === "consumer" || h === "clinical" ? h : "");
  const [view, setView] = useState<"" | "consumer" | "clinical">(() =>
    hashToView(typeof window !== "undefined" ? window.location.hash.slice(1) : "")
  );

  useEffect(() => {
    const onHash = () => setView(hashToView(window.location.hash.slice(1)));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const t =
      view === "consumer"
        ? "AnimalMind Pet"
        : view === "clinical"
          ? "AnimalMind Pro"
          : "AnimalMind — AI Infrastructure for Animal Health";
    document.title = t;
  }, [view]);

  const navigate = (v: "" | "consumer" | "clinical") => {
    window.location.hash = v;
    setView(v);
  };

  const loadData = useCallback(() => {
    setRefreshing(true);
    fetchDashboard()
      .then(({ summary: s, ingested: i }) => {
        setSummary(s);
        setMemory(i);
      })
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboard()
      .then(({ summary: s, ingested: i }) => {
        if (!cancelled) {
          setSummary(s);
          setMemory(i);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load ingested list if dashboard didn't include it (e.g. API returned summary only)
  useEffect(() => {
    if (memory !== null) return;
    setMemoryLoading(true);
    fetch(`${base}/data/ingested.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMemory(Array.isArray(data) ? data : null))
      .catch(() => setMemory(null))
      .finally(() => setMemoryLoading(false));
  }, [memory]);

  const lastUpdated = summary?.lastUpdated
    ? new Date(summary.lastUpdated).toLocaleString()
    : null;

  const editionDate = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className={cn("min-h-screen flex flex-col relative", "app-bg")}>
      {/* ——— Landing: AnimalMind hero, two pathways (Pro / Pet) ——— */}
      {view === "" && (
        <>
          <header className="border-b border-border bg-card">
            <div className="mx-auto max-w-3xl px-4 py-4 flex justify-center">
              <button
                type="button"
                onClick={() => navigate("")}
                className="flex items-center gap-2 text-foreground no-underline min-h-[44px]"
              >
                <AnimalMindLogo className="size-8 text-foreground shrink-0" />
                <span className="text-xl font-semibold tracking-tight">AnimalMind</span>
              </button>
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground text-center mb-2 tracking-tight">
              AnimalMind
            </h1>
            <p className="text-center text-lg text-muted-foreground mb-3">
              Autonomous AI for Animal Health.
            </p>
            <p className="text-center text-sm text-muted-foreground mb-12 max-w-md mx-auto">
              Continuous intelligence for veterinary professionals.<br />
              Research-backed guidance for pet owners.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate("clinical")}
                className="flex flex-col rounded-lg border-2 border-border bg-card p-6 text-left min-h-[44px] hover:border-foreground/30 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium text-muted-foreground mb-1">For Clinical & Research</span>
                <span className="font-semibold text-foreground text-lg">AnimalMind Pro</span>
                <span className="mt-3 text-sm text-muted-foreground">Autonomous research intelligence. Daily veterinary brief.</span>
                <span className="mt-4 text-sm font-medium text-foreground">→</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("consumer")}
                className="flex flex-col rounded-lg border-2 border-border bg-card p-6 text-left min-h-[44px] hover:border-foreground/30 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium text-muted-foreground mb-1">For Pet Owners</span>
                <span className="font-semibold text-foreground text-lg">AnimalMind Pet</span>
                <span className="mt-3 text-sm text-muted-foreground">Research-backed guidance. Powered by Pro infrastructure.</span>
                <span className="mt-4 text-sm font-medium text-foreground">→</span>
              </button>
            </div>
          </main>
          <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
            <p>AI infrastructure for animal health. Evidence from public sources.</p>
          </footer>
        </>
      )}

      {/* ——— AnimalMind Pet: same format as Pro, pet-owner focus, more imagery ——— */}
      {view === "consumer" && (
        <>
          <header className="sticky top-0 z-10 border-b border-border bg-card">
            <nav className="mx-auto max-w-4xl px-4 py-3 sm:px-6 flex justify-between items-center">
              <button
                type="button"
                onClick={() => navigate("")}
                className="flex items-center gap-2 text-foreground min-h-[44px]"
              >
                <AnimalMindLogo className="size-7 text-foreground shrink-0" />
                <span className="text-base font-semibold">AnimalMind</span>
              </button>
              <div className="flex items-center gap-4">
                <a href="#pet-cta" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Notify me</a>
                <span className="text-sm text-muted-foreground font-medium">AnimalMind Pet</span>
              </div>
            </nav>
          </header>

          <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:py-8 sm:px-6 relative z-1 overflow-x-hidden">
            {/* Hero CTA — image + headline + waitlist */}
            <section
              id="pet-cta"
              aria-labelledby="pet-cta-heading"
              className="mb-8 sm:mb-10 rounded-lg border border-border bg-muted/30 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                <div className="lg:col-span-3 relative h-56 sm:h-64 lg:h-auto min-h-[220px]">
                  <img
                    src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="lg:col-span-2 p-4 sm:p-6 flex flex-col justify-center">
                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider rounded-md text-muted-foreground border-0 w-fit mb-2">
                    AnimalMind Pet
                  </Badge>
                  <h2 id="pet-cta-heading" className="text-lg sm:text-xl font-semibold text-foreground leading-tight mb-2">
                    Research-backed guidance for pet owners
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Plain-language insights from the same intelligence that powers veterinary and clinical research. When to see a vet, what to watch for, and what the evidence says.
                  </p>
                  {waitlistStatus === "success" ? (
                    <p className="text-sm text-foreground font-medium">You’re on the list. We’ll notify you when Pet launches.</p>
                  ) : (
                    <form
                      className="flex flex-col sm:flex-row gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const email = waitlistEmail.trim();
                        if (!email) return;
                        setWaitlistStatus("loading");
                        setWaitlistError("");
                        const result = await submitWaitlist(email);
                        if (result.ok) {
                          setWaitlistStatus("success");
                          setWaitlistEmail("");
                        } else if (result.error === "MAILTO") {
                          window.location.href = `mailto:pro@animalmind.co?subject=AnimalMind%20Pet%20updates&body=${encodeURIComponent(`Please add me for Pet owner updates.\nEmail: ${email}`)}`;
                          setWaitlistStatus("success");
                          setWaitlistEmail("");
                        } else {
                          setWaitlistStatus("error");
                          setWaitlistError(result.error || "Something went wrong.");
                        }
                      }}
                    >
                      <input
                        type="email"
                        placeholder="Your email"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        disabled={waitlistStatus === "loading"}
                        className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 min-h-[44px]"
                        aria-label="Email"
                      />
                      <Button type="submit" disabled={waitlistStatus === "loading"} className="rounded-md shrink-0 min-h-[44px]">
                        {waitlistStatus === "loading" ? "…" : "Notify me"}
                      </Button>
                    </form>
                  )}
                  {waitlistStatus === "error" && waitlistError && (
                    <p className="mt-2 text-sm text-destructive">{waitlistError}</p>
                  )}
                </div>
              </div>
              <p className="p-4 pt-0 sm:px-6 text-xs text-muted-foreground border-t border-border/80 mt-0">
                Powered by AnimalMind Pro. Not a replacement for veterinary care. When in doubt, see your vet.
              </p>
            </section>

            {/* Lead */}
            <section className="pb-8 border-b border-border">
              <p className="section-label mb-1">For pet owners</p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight mb-2">
                Clear, evidence-based guidance in one place
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-6">
                AnimalMind Pet turns the same autonomous research that professionals use into clear answers for people who care for companion animals—without replacing your veterinarian.
              </p>
              <div className="rounded-lg overflow-hidden border border-border bg-muted/20 max-w-2xl">
                <img
                  src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=700&q=80"
                  alt=""
                  className="w-full h-48 object-cover"
                />
              </div>
            </section>

            {/* Mission / What we do */}
            <section id="pet-mission" aria-labelledby="pet-mission-heading" className="pb-10">
              <h2 id="pet-mission-heading" className="section-label mb-3">What to expect</h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                <p>
                  AnimalMind Pet gives you structured, research-backed guidance: what the literature and veterinary sources say about common concerns, when to monitor at home, and when to seek a vet. We always recommend escalation to a veterinarian when appropriate.
                </p>
                <p>
                  Content is derived from AnimalMind Pro—the same autonomous intelligence that monitors veterinary literature, outbreak data, and clinical research. Simplified for clarity; accurate and evidence-based.
                </p>
                <p>
                  For pet owners who want to understand the evidence without replacing professional care. Clear, reassuring, and professional.
                </p>
              </div>
            </section>

            {/* Topics we cover — cards with professional images */}
            <section id="pet-topics" aria-labelledby="pet-topics-heading" className="pb-10">
              <h2 id="pet-topics-heading" className="section-label mb-3">What we cover</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-border bg-card overflow-hidden">
                  <div className="aspect-4/3 overflow-hidden bg-muted/30">
                    <img src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80" alt="" className="w-full h-full object-cover" />
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-base font-semibold">Dogs & cats</CardTitle>
                    <CardDescription className="text-sm">Companion animal health, behavior, and care—backed by current research.</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border border-border bg-card overflow-hidden">
                  <div className="aspect-4/3 overflow-hidden bg-muted/30">
                    <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&q=80" alt="" className="w-full h-full object-cover" />
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-base font-semibold">When to see a vet</CardTitle>
                    <CardDescription className="text-sm">Signs to watch for and when to seek professional care.</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border border-border bg-card overflow-hidden">
                  <div className="aspect-4/3 overflow-hidden bg-muted/30">
                    <img src="https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=400&q=80" alt="" className="w-full h-full object-cover" />
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-base font-semibold">Evidence in plain language</CardTitle>
                    <CardDescription className="text-sm">What studies and guidelines say—without the jargon.</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </section>

            {/* Updates */}
            <section id="pet-updates" aria-labelledby="pet-updates-heading" className="py-12 border-t border-border">
              <h2 id="pet-updates-heading" className="section-label mb-2">Updates</h2>
              <p className="text-lg font-semibold text-foreground mb-1">Get notified</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                We’ll email you when AnimalMind Pet launches and when we add new guidance. No spam.
              </p>
              {waitlistStatus === "success" ? (
                <p className="text-sm text-foreground font-medium">You’re on the list. We’ll notify you when we have updates.</p>
              ) : (
                <form
                  className="flex flex-col sm:flex-row gap-2 max-w-md"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const email = waitlistEmail.trim();
                    if (!email) return;
                    setWaitlistStatus("loading");
                    setWaitlistError("");
                    const result = await submitWaitlist(email);
                    if (result.ok) {
                      setWaitlistStatus("success");
                      setWaitlistEmail("");
                    } else if (result.error === "MAILTO") {
                      window.location.href = `mailto:pro@animalmind.co?subject=AnimalMind%20Pet%20updates&body=${encodeURIComponent(`Please add me for Pet updates.\nEmail: ${email}`)}`;
                      setWaitlistStatus("success");
                      setWaitlistEmail("");
                    } else {
                      setWaitlistStatus("error");
                      setWaitlistError(result.error || "Something went wrong.");
                    }
                  }}
                >
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    disabled={waitlistStatus === "loading"}
                    className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    aria-label="Email for updates"
                  />
                  <Button type="submit" disabled={waitlistStatus === "loading"} className="rounded-md shrink-0">
                    {waitlistStatus === "loading" ? "…" : "Notify me"}
                  </Button>
                </form>
              )}
              {waitlistStatus === "error" && waitlistError && (
                <p className="mt-2 text-sm text-destructive">{waitlistError}</p>
              )}
            </section>

            <div className="pt-6 flex justify-center">
              <button type="button" onClick={() => navigate("")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to AnimalMind
              </button>
            </div>
          </main>

          <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">AnimalMind Pet</p>
            <p className="mt-1">Research-backed guidance for pet owners. Powered by AnimalMind Pro.</p>
            <p className="mt-2 text-xs">Not a replacement for veterinary care. When in doubt, see your vet.</p>
          </footer>
        </>
      )}

      {/* ——— AnimalMind Pro: autonomous research intelligence ——— */}
      {view === "clinical" && (
        <>
          <header className="sticky top-0 z-10 border-b border-border bg-card">
            <nav className="mx-auto max-w-4xl px-4 py-3 sm:px-6 flex flex-wrap justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("")}
                className="flex items-center gap-2 text-foreground min-h-[44px] py-1 text-left"
              >
                <AnimalMindLogo className="size-7 sm:size-8 text-foreground shrink-0" />
                <span className="text-base sm:text-xl font-semibold tracking-tight">AnimalMind Pro</span>
              </button>
              <div className="flex flex-wrap items-center gap-0.5 sm:gap-2 text-sm">
                <a href="#data" className="px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] flex items-center">Digest</a>
                <a href="#pro-cta" className="px-2.5 py-2 rounded-md text-foreground font-medium hover:bg-muted/50 min-h-[44px] flex items-center">Brief</a>
                <a href="#mission" className="px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] flex items-center">Mission</a>
                <a href="#topics" className="hidden sm:flex px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] items-center">Topics</a>
                <a href="#track" className="hidden sm:flex px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] items-center">Sources</a>
                <a href="#waitlist" className="px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] flex items-center">Updates</a>
              </div>
            </nav>
            <div className="mx-auto max-w-4xl px-4 pb-2 sm:px-6 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5 text-xs text-muted-foreground">
              <span className="truncate">Rapid autonomous AI agent news · Animal health</span>
              <span className="shrink-0">{editionDate}</span>
            </div>
          </header>

          <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:py-8 sm:px-6 relative z-1 overflow-x-hidden">
            {/* Pro CTA — newsletter hero with image */}
        <section
          id="pro-cta"
          aria-labelledby="pro-cta-heading"
          className="mb-8 sm:mb-10 rounded-lg border border-border bg-muted/30 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            <div className="lg:col-span-2 relative h-48 sm:h-56 lg:min-h-[240px] order-2 lg:order-1">
              <img
                src="https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&q=80"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-3 p-4 sm:p-6 flex flex-col justify-center order-1 lg:order-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider rounded-md text-muted-foreground border-0">
                  Newsletter
                </Badge>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI agent–driven</span>
              </div>
              <h2 id="pro-cta-heading" className="text-lg sm:text-xl font-semibold text-foreground leading-tight mb-2">
                Daily Autonomous Veterinary Intelligence Brief
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Autonomous AI agents monitor surveillance, literature, and clinical sources 24/7. This newsletter delivers a rapid, structured digest—outbreak signals, new research, drug updates—so you stay current on animal health.
              </p>
              <div className="shrink-0 w-full sm:w-auto">
                {waitlistStatus === "success" ? (
                  <p className="text-sm text-foreground font-medium py-2">You’re on the list. We’ll notify you when the daily brief launches.</p>
                ) : proCtaExpanded ? (
                  <form
                    className="flex flex-col sm:flex-row gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const email = waitlistEmail.trim();
                      if (!email) return;
                      setWaitlistStatus("loading");
                      setWaitlistError("");
                      const result = await submitWaitlist(email);
                      if (result.ok) {
                        setWaitlistStatus("success");
                        setWaitlistEmail("");
                      } else if (result.error === "MAILTO") {
                        window.location.href = `mailto:pro@animalmind.co?subject=Pro%20early%20access&body=${encodeURIComponent(`Please add me for early access.\nEmail: ${email}`)}`;
                        setWaitlistStatus("success");
                        setWaitlistEmail("");
                      } else {
                        setWaitlistStatus("error");
                        setWaitlistError(result.error || "Something went wrong.");
                      }
                    }}
                  >
                    <input
                      type="email"
                      placeholder="Your email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      disabled={waitlistStatus === "loading"}
                      className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 min-h-[44px]"
                      aria-label="Email"
                    />
                    <Button type="submit" disabled={waitlistStatus === "loading"} className="rounded-md shrink-0 min-h-[44px]">
                      {waitlistStatus === "loading" ? "…" : "Notify me"}
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto rounded-md font-medium border-border bg-background min-h-[44px]"
                    onClick={() => setProCtaExpanded(true)}
                  >
                    Early access to the brief
                  </Button>
                )}
              </div>
              {waitlistStatus === "error" && waitlistError && (
                <p className="mt-2 text-sm text-destructive">{waitlistError}</p>
              )}
            </div>
          </div>
          <p className="px-4 sm:px-6 py-3 border-t border-border/80 text-xs text-muted-foreground">
            AnimalMind Pro: autonomous research engine. Evidence from public sources only; not medical advice.
          </p>
        </section>

        {/* Lead — newsletter edition with image */}
        <section className="pb-8 border-b border-border">
          <p className="section-label mb-1">This edition</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight mb-2">
            Rapid autonomous AI agent news for animal health
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mb-6">
            AI agents ingest CDC travel notices, PubMed literature, veterinary oncology, case reports, clinical and imaging sources, and guidelines on a schedule. This digest is the live output—read-only; no credentials or PII.
          </p>
          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 max-w-2xl mb-6">
            <img
              src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=700&q=80"
              alt=""
              className="w-full h-44 object-cover"
            />
          </div>
          <a href="#data" className={cn(buttonVariants({ variant: "default", size: "sm" }), "rounded-md")}>
            View today’s digest
          </a>
        </section>

        {/* Mission — how the newsletter works */}
        <section id="mission" aria-labelledby="mission-heading" className="pb-10">
          <h2 id="mission-heading" className="section-label mb-3">How the newsletter works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
              <img
                src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&q=80"
                alt=""
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                AnimalMind Pro is a rapid, AI agent–driven newsletter focused on animal health. Autonomous agents run on a schedule: they monitor veterinary literature, outbreak data, drug signals, and clinical research, then synthesize a daily brief.
              </p>
              <p>
                Curated sources: PubMed (one health, oncology, case reports, clinical, small animal, equine), CDC travel notices, TCIA imaging, and guidelines (AAHA, AVMA, Merck, etc.). Read-only; we publish the digest as the core product.
              </p>
              <p>
                For clinicians, researchers, educators, and students. Newsletter-style delivery; infrastructure-level AI.
              </p>
            </div>
          </div>
        </section>

        {/* Topics */}
        <section id="topics" aria-labelledby="topics-heading" className="pb-10">
          <h2 id="topics-heading" className="section-label mb-3">Autonomous-Agent Topics</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mb-6">
            Clinical-adjacent topics inform veterinary care today. Research topics explore biology, mechanisms, and long-term discovery.
          </p>
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Clinical-Adjacent
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Topics that directly inform veterinary decision-making, interpretation, and care—without replacing clinical judgment.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                {[
                  { title: "Early Detection of Disease Across Species", desc: "Identifying weak, preclinical signals that precede diagnosable disease in companion animals, livestock, wildlife, and sentinel species." },
                  { title: "Decoding Animal Pain and Distress", desc: "Interpreting pain, discomfort, and stress using behavior, physiology, imaging, and emerging biomarkers—especially in stoic species." },
                  { title: "Preclinical Disease States", desc: "Tracking subtle biological and behavioral changes that occur before disease becomes clinically apparent." },
                  { title: "Unexplained Recovery and Resilience", desc: "Studying cases where animals recover faster or more completely than expected to identify protective factors or care patterns." },
                  { title: "Microbiome–Behavior–Health Coupling", desc: "Understanding how microbial communities influence immunity, pain, appetite, cognition, and disease progression." },
                  { title: "Biological Timing and Treatment Response", desc: "Exploring how timing (beyond circadian rhythms) affects anesthesia, vaccination, healing, and therapeutic outcomes." },
                  { title: "Non-Linear Dose and Response Effects", desc: "Identifying threshold and paradoxical responses where small interventions produce large effects—or none at all." },
                  { title: "Emergent Effects of Complex Care Pathways", desc: "Analyzing how combinations of diagnostics, treatments, environment, and handling influence outcomes beyond any single intervention." },
                  { title: "Silent or Masked Disease and Distress", desc: "Investigating conditions where symptoms are actively hidden by evolution, limiting detection even with advanced monitoring." },
                  { title: "Unintended Consequences of Standard Care", desc: "Tracking long-term or population-level effects of widely accepted veterinary practices that were never fully evaluated." },
                ].map((item, i) => (
                  <li key={i}>
                    <Card className="border border-border bg-card/95 shadow-sm h-full">
                      <CardContent className="p-4">
                        <CardTitle className="text-sm font-semibold mb-1.5">
                          {item.title}
                        </CardTitle>
                        <CardDescription className="text-xs leading-relaxed">
                          {item.desc}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Research & Discovery
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Topics where mechanisms are unclear, outcomes are surprising, and long-term autonomous exploration may lead to new biology, tools, or therapies.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                {[
                  { title: "Unknown Biological Signals", desc: "Uncharacterized molecules, rhythms, or physiological signals that correlate with health or disease but lack clear explanation." },
                  { title: "Latent Protective Mechanisms", desc: "Natural disease resistance, pain tolerance, or longevity traits observed in certain species, breeds, or individuals." },
                  { title: "Pain Modulation Beyond Analgesics", desc: "Non-drug biological or neurological mechanisms that suppress pain or distress without traditional analgesia." },
                  { title: "Hidden Costs of Normal Physiology", desc: "Biological processes (stress, inflammation, metabolism) that cause cumulative damage despite being evolutionarily necessary." },
                  { title: "Environmental Exposure and Sentinel Signals", desc: "Animal responses to toxins, climate stressors, and ecological change that precede human health impacts." },
                  { title: "Species-Specific Health Advantages", desc: "Evolutionary adaptations that outperform current medical solutions, such as hypoxia tolerance or infection resistance." },
                  { title: "Comparative Physiology at Extremes", desc: "How animals survive extreme environments and what this reveals about biological limits and resilience." },
                  { title: "Genetic Intervention and Biological Integrity", desc: "Health implications of gene editing, selective breeding, and biologic modification." },
                  { title: "Developmental Programming and Lifelong Health", desc: "How early-life exposures shape disease risk, resilience, and aging across an animal's lifespan." },
                  { title: "Unexpected Correlations and Anomalies", desc: "Reproducible patterns that do not fit existing biological models but may point to new mechanisms or therapies." },
                ].map((item, i) => (
                  <li key={i}>
                    <Card className="border border-border bg-card/95 shadow-sm h-full">
                      <CardContent className="p-4">
                        <CardTitle className="text-sm font-semibold mb-1.5">
                          {item.title}
                        </CardTitle>
                        <CardDescription className="text-xs leading-relaxed">
                          {item.desc}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Today's digest + Topics — agent output */}
        <section id="data" aria-labelledby="data-heading" className="pb-10">
          <h2 id="data-heading" className="section-label mb-2 flex items-center gap-2">
            <BarChart3 className="size-4" aria-hidden />
            Today’s digest
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Rapid autonomous ingest. Surveillance, literature, clinical—public sources only.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Left: Today's digest — counts + summary */}
            <Card className="shadow-sm border-border border-l-4 border-l-foreground/20 h-fit">
              <CardContent className="p-4 sm:p-6">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : summary?.counts ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {DATA_ORDER.map((key) => {
                        const Icon = DATA_ICONS[key];
                        return (
                          <div
                            key={key}
                            className="rounded-lg border border-border bg-muted/40 p-3 text-center"
                          >
                            {Icon && <Icon className="size-4 text-foreground mx-auto mb-1 block" aria-hidden />}
                            <span className="block text-xl font-bold text-foreground">{summary.counts[key] ?? 0}</span>
                            <span className="block text-[11px] text-muted-foreground">{LABELS[key] ?? key}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {(() => {
                        const total = Object.values(summary.counts).reduce((a, b) => a + b, 0);
                        return `${total} items across surveillance, literature, clinical, and more. Links open original sources (CDC, PubMed, etc.).`;
                      })()}
                    </p>
                    <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                      {lastUpdated && (
                        <span className="flex items-center gap-2">
                          <Clock className="size-4" aria-hidden />
                          As of {lastUpdated}
                        </span>
                      )}
                      <Button variant="outline" size="sm" className="gap-2 rounded-md" disabled={refreshing} onClick={loadData} aria-label="Refresh data">
                        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
                        {refreshing ? "Refreshing…" : "Refresh"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Data will appear after the next autonomous ingest and push.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Right: Topics — data by type */}
            <Card id="memory-panel" className="shadow-sm border-border border-l-4 border-l-foreground/20 max-h-[55vh] sm:max-h-[65vh] lg:max-h-[70vh] flex flex-col min-h-0">
              <CardHeader className="p-3 sm:p-4 pb-2 border-b border-border shrink-0">
                <CardTitle className="text-sm font-semibold">Topics</CardTitle>
                <CardDescription className="text-xs">
                  Items by source type. Click through to CDC, PubMed, and more.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto min-h-0 overscroll-contain">
                {memoryLoading ? (
                  <div className="p-6">
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  </div>
                ) : memory && memory.length > 0 ? (
                  <div className="divide-y divide-border">
                    {DATA_ORDER.map((type) => {
                      const items = memory.filter((r) => r.data_type === type);
                      if (items.length === 0) return null;
                      const Icon = DATA_ICONS[type];
                      return (
                        <div key={type} className="p-4 bg-muted/15 first:bg-transparent">
                          <div className="flex items-center gap-2 mb-2">
                            {Icon && <Icon className="size-4 text-foreground shrink-0" aria-hidden />}
                            <h3 className="text-sm font-semibold text-foreground">
                              {LABELS[type] ?? type}
                            </h3>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {items.length}
                            </span>
                          </div>
                          <ul className="list-none space-y-2">
                            {items.map((item, i) => {
                              const href = safeHref(item.url);
                              return (
                                <li key={i} className="text-sm py-1.5 px-2 rounded border border-border/50 bg-card hover:border-foreground/20">
                                  {href !== "#" ? (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline block">
                                      {item.title || "Untitled"}
                                    </a>
                                  ) : (
                                    <span className="text-foreground">{item.title || "Untitled"}</span>
                                  )}
                                  {item.condition_or_topic && (
                                    <div className="text-xs text-muted-foreground mt-0.5">{item.condition_or_topic}</div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-muted-foreground">No data yet. Run ingest and push.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sources (what the agents track) — full width below */}
          <section id="track" aria-labelledby="track-heading" className="mt-8 space-y-3">
            <h2 id="track-heading" className="section-label mb-2">Sources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TRACK_ITEMS.map((item) => (
                <Card key={item.key} className="border border-border bg-card shadow-sm">
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{item.tag}</Badge>
                    </div>
                    <CardDescription className="text-xs">{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        </section>

        {/* Updates / Waitlist — Supabase or mailto */}
        <section id="waitlist" aria-labelledby="waitlist-heading" className="py-12 border-t border-border">
          <h2 id="waitlist-heading" className="section-label mb-2">Updates</h2>
          <p className="text-lg font-semibold text-foreground mb-1">Notify me</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Get notified when we add new digests, daily briefs, or major updates. No spam.
          </p>
          {waitlistStatus === "success" ? (
            <p className="text-sm text-foreground font-medium">You’re on the list! We’ll notify you when we have updates.</p>
          ) : (
            <form
              className="flex flex-col sm:flex-row gap-2 max-w-md"
              onSubmit={async (e) => {
                e.preventDefault();
                const email = waitlistEmail.trim();
                if (!email) return;
                setWaitlistStatus("loading");
                setWaitlistError("");
                const result = await submitWaitlist(email);
                if (result.ok) {
                  setWaitlistStatus("success");
                  setWaitlistEmail("");
                } else if (result.error === "MAILTO") {
                  window.location.href = `mailto:pro@animalmind.co?subject=Newsletter%20sign-up&body=${encodeURIComponent(`Please add me to the newsletter.\nEmail: ${email}`)}`;
                  setWaitlistStatus("success");
                  setWaitlistEmail("");
                } else {
                  setWaitlistStatus("error");
                  setWaitlistError(result.error || "Something went wrong.");
                }
              }}
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                disabled={waitlistStatus === "loading"}
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                aria-label="Email for updates"
              />
              <Button type="submit" disabled={waitlistStatus === "loading"} className="rounded-md shrink-0">
                {waitlistStatus === "loading" ? "…" : "Notify me"}
              </Button>
            </form>
          )}
          {waitlistStatus === "error" && waitlistError && (
            <p className="mt-2 text-sm text-destructive">{waitlistError}</p>
          )}
          {!isSupabaseConfigured() && waitlistStatus === "idle" && (
            <p className="mt-2 text-xs text-muted-foreground">Or email pro@animalmind.co with subject “AnimalMind Pro updates”.</p>
          )}
        </section>

        <div className="pt-8 flex justify-center">
          <a href="#data" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to digest
            <ChevronDown className="size-4 rotate-180" aria-hidden />
          </a>
        </div>
          </main>

          <footer className="border-t border-border bg-card mt-auto py-8 text-center text-sm text-muted-foreground relative z-1">
            <p className="font-semibold text-foreground">AnimalMind Pro</p>
            <p className="mt-1">Autonomous research intelligence. Evidence from public sources only.</p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
              No credentials or PII collected.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
