import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const TRACK_ITEMS = [
  { key: "surveillance", title: "Surveillance", desc: "CDC travel notices" },
  { key: "literature", title: "Literature", desc: "PubMed" },
  { key: "cancer", title: "Cancer", desc: "Veterinary oncology" },
  { key: "case_data", title: "Case data", desc: "Veterinary case reports" },
  { key: "clinical", title: "Clinical", desc: "Practice, small animal, equine" },
  { key: "imaging", title: "Imaging", desc: "TCIA, radiographs" },
  { key: "vet_practice", title: "Vet practice", desc: "AAHA, AVMA, VIN, Merck" },
];

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

// Icons as inline SVG components for medical/research vibe
function HeroIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-20 text-primary", className)}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M32 12c-4 4-8 8-8 14 0 6 4 10 8 10s8-4 8-10c0-6-4-10-8-14z" />
      <path d="M20 36c-2 2-4 6-4 10 0 6 4 12 16 12s16-6 16-12c0-4-2-8-4-10" />
      <circle cx="32" cy="44" r="4" />
      <path d="M28 44h8M32 40v8" />
    </svg>
  );
}

function DataIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 text-primary", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M3 3v18h18" />
      <path d="M18 9v4M14 7v8M10 11v4M6 13v2" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5 text-muted-foreground", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export default function App() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [memory, setMemory] = useState<IngestedRow[] | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);

  // Prefer API when available (local Express), else static JSON (GitHub Pages)
  useEffect(() => {
    let cancelled = false;
    const base = typeof document !== "undefined" ? "" : "";
    const summaryUrl = `${base}/data-summary.json`;
    fetch(summaryUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSummary(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!memoryOpen) return;
    setMemoryLoading(true);
    const base = typeof document !== "undefined" ? "" : "";
    fetch(`${base}/data/ingested.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setMemory(Array.isArray(data) ? data : null);
      })
      .catch(() => setMemory(null))
      .finally(() => setMemoryLoading(false));
  }, [memoryOpen]);

  const lastUpdated = summary?.lastUpdated
    ? new Date(summary.lastUpdated).toLocaleString()
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 flex justify-between items-center gap-4">
          <span className="font-semibold text-lg text-foreground tracking-tight">
            Animal Research Network
          </span>
          <Badge variant="success" className="uppercase tracking-wide text-xs">
            Secure · Read-only
          </Badge>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 space-y-10">
        {/* Hero */}
        <section className="text-center space-y-4">
          <HeroIcon className="mx-auto block" />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Animal Research Network
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Surveillance, literature, clinical, and vet practice resources for
            animal health. Collected and updated by autonomous agents.
          </p>
          <p className="text-sm text-foreground/80">
            Agents run on a schedule: ingest, analyze, push. No credentials or
            PII in this interface.
          </p>
          <a
            href="https://github.com/burrows3/AnimalMind"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "rounded-lg")}
          >
            View source
          </a>
        </section>

        {/* Live data */}
        <section aria-labelledby="data-heading" className="space-y-4">
          <h2
            id="data-heading"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <DataIcon />
            Live data (from autonomous ingest)
          </h2>
          <Card>
            <CardContent className="p-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : summary?.counts ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {DATA_ORDER.map((key) => (
                      <div
                        key={key}
                        className="rounded-lg border border-border bg-muted/50 p-4 text-center transition-colors hover:bg-muted/80"
                      >
                        <span className="block text-2xl font-bold text-foreground">
                          {summary.counts[key] ?? 0}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {LABELS[key] ?? key}
                        </span>
                      </div>
                    ))}
                  </div>
                  {lastUpdated && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <ClockIcon />
                      Last updated: {lastUpdated}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Data will appear after the next autonomous ingest and push.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* What the agents track */}
        <section aria-labelledby="track-heading" className="space-y-4">
          <h2
            id="track-heading"
            className="text-lg font-semibold text-foreground"
          >
            What the agents track
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TRACK_ITEMS.map((item) => (
              <Card
                key={item.key}
                className="border-l-4 border-l-primary bg-card transition-colors hover:bg-muted/30"
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {item.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Browse data (agent memory) */}
        <section aria-labelledby="memory-heading" className="space-y-4">
          <h2 id="memory-heading" className="text-lg font-semibold text-foreground">
            Browse data (agent memory)
          </h2>
          <p className="text-sm text-muted-foreground">
            Latest items from autonomous ingest. Links open the source (CDC,
            PubMed, etc.).
          </p>
          <Button
            variant="outline"
            onClick={() => setMemoryOpen((o) => !o)}
            aria-expanded={memoryOpen}
            aria-controls="memory-panel"
          >
            {memoryOpen ? "Hide data" : "Show data"}
          </Button>
          {memoryOpen && (
            <Card id="memory-panel" className="max-h-[70vh] overflow-y-auto">
              <CardContent className="p-4">
                {memoryLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : memory && memory.length > 0 ? (
                  <div className="space-y-6">
                    {DATA_ORDER.map((type) => {
                      const items = memory.filter((r) => r.data_type === type);
                      if (items.length === 0) return null;
                      return (
                        <div key={type}>
                          <h3 className="text-sm font-semibold text-foreground mb-2">
                            {LABELS[type] ?? type} ({items.length})
                          </h3>
                          <ul className="list-none space-y-2">
                            {items.map((item, i) => {
                              const href = safeHref(item.url);
                              return (
                                <li key={i} className="text-sm">
                                  {href !== "#" ? (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      {item.title || "Untitled"}
                                    </a>
                                  ) : (
                                    <span>{item.title || "Untitled"}</span>
                                  )}
                                  {item.condition_or_topic && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {item.condition_or_topic}
                                    </div>
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
                  <p className="text-sm text-muted-foreground">
                    No data yet. Run ingest and push.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <footer className="border-t border-border mt-10 py-6 text-center text-sm text-muted-foreground">
        <p>
          Research engine for veterinarians and partners. Data from public
          sources only.
        </p>
        <p className="mt-1 text-emerald-600 text-xs font-medium">
          No credentials, API keys, or PII are exposed in this UI.
        </p>
      </footer>
    </div>
  );
}
