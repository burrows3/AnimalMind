import { useEffect, useState } from "react";
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
  Shield,
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

export default function App() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [memory, setMemory] = useState<IngestedRow[] | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const base = typeof document !== "undefined" ? "" : "";
    fetch(`${base}/data-summary.json`, { cache: "no-store" })
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
    <div className={cn("min-h-screen flex flex-col relative", "app-bg")}>
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <nav className="mx-auto max-w-5xl px-4 py-3 sm:px-6 flex justify-between items-center gap-4">
          <a href="#" className="font-semibold text-foreground tracking-tight text-lg">
            Animal Research Network
          </a>
          <div className="flex items-center gap-3">
            <a
              href="#data"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Data
            </a>
            <a
              href="#track"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sources
            </a>
            <a
              href="https://github.com/burrows3/AnimalMind"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "rounded-lg")}
            >
              View source
            </a>
          </div>
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 relative z-[1]">
        {/* Hero */}
        <section className="text-center space-y-5 pb-12">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs font-medium gap-1.5"
          >
            <Shield className="size-3.5" aria-hidden />
            Autonomous · Secure · Read-only
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Animal Research Network
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
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
            className={cn(buttonVariants({ size: "lg" }), "rounded-lg shadow-sm")}
          >
            View source
          </a>
        </section>

        {/* Two-column: Live data + What the agents track */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Live data */}
          <section
            id="data"
            aria-labelledby="data-heading"
            className="lg:col-span-7 space-y-4"
          >
            <h2
              id="data-heading"
              className="flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <BarChart3 className="size-5 text-primary" aria-hidden />
              Live data (from autonomous ingest)
            </h2>
            <Card className="shadow-sm border-border">
              <CardContent className="p-6">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : summary?.counts ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {DATA_ORDER.map((key) => {
                        const Icon = DATA_ICONS[key];
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-border bg-muted/40 p-4 text-center transition-colors hover:bg-muted/70 hover:border-primary/20 shadow-sm"
                          >
                            {Icon && (
                              <Icon className="size-5 text-primary mx-auto mb-2 block" aria-hidden />
                            )}
                            <span className="block text-2xl font-bold text-foreground">
                              {summary.counts[key] ?? 0}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {LABELS[key] ?? key}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {lastUpdated && (
                      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="size-4" aria-hidden />
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
          <section
            id="track"
            aria-labelledby="track-heading"
            className="lg:col-span-5 space-y-4"
          >
            <h2
              id="track-heading"
              className="text-lg font-semibold text-foreground"
            >
              What the agents track
            </h2>
            <div className="space-y-3">
              {TRACK_ITEMS.map((item) => (
                <Card
                  key={item.key}
                  className="border border-border bg-card shadow-sm transition-shadow hover:shadow"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {item.title}
                      </CardTitle>
                      <Badge variant="secondary" className="text-[10px] font-medium shrink-0">
                        {item.tag}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {item.desc}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Browse data (agent memory) */}
        <section
          id="memory"
          aria-labelledby="memory-heading"
          className="mt-12 space-y-4"
        >
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
            className="rounded-lg shadow-sm"
          >
            {memoryOpen ? "Hide data" : "Show data"}
          </Button>
          {memoryOpen && (
            <Card
              id="memory-panel"
              className="max-h-[70vh] overflow-y-auto shadow-sm border-border"
            >
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

        {/* Discover more */}
        <div className="mt-16 flex justify-center">
          <a
            href="#memory"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Discover more
            <ChevronDown className="size-4" aria-hidden />
          </a>
        </div>
      </main>

      <footer className="border-t border-border bg-card/80 mt-auto py-6 text-center text-sm text-muted-foreground relative z-[1]">
        <p>
          Research engine for veterinarians and partners. Data from public
          sources only.
        </p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-emerald-700 text-xs font-medium">
          <Heart className="size-3.5" aria-hidden />
          No credentials, API keys, or PII are exposed in this UI.
        </p>
      </footer>
    </div>
  );
}
