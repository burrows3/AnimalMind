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

const CLINICAL_TOPICS = [
  {
    title: "Early Detection of Disease Across Species",
    desc: "Identifying weak, preclinical signals that precede diagnosable disease in companion animals, livestock, wildlife, and sentinel species.",
  },
  {
    title: "Decoding Animal Pain and Distress",
    desc: "Interpreting pain, discomfort, and stress using behavior, physiology, imaging, and emerging biomarkers—especially in stoic species.",
  },
  {
    title: "Preclinical Disease States",
    desc: "Tracking subtle biological and behavioral changes that occur before disease becomes clinically apparent.",
  },
  {
    title: "Unexplained Recovery and Resilience",
    desc: "Studying cases where animals recover faster or more completely than expected to identify protective factors or care patterns.",
  },
  {
    title: "Microbiome–Behavior–Health Coupling",
    desc: "Understanding how microbial communities influence immunity, pain, appetite, cognition, and disease progression.",
  },
  {
    title: "Biological Timing and Treatment Response",
    desc: "Exploring how timing (beyond circadian rhythms) affects anesthesia, vaccination, healing, and therapeutic outcomes.",
  },
  {
    title: "Non-Linear Dose and Response Effects",
    desc: "Identifying threshold and paradoxical responses where small interventions produce large effects—or none at all.",
  },
  {
    title: "Emergent Effects of Complex Care Pathways",
    desc: "Analyzing how combinations of diagnostics, treatments, environment, and handling influence outcomes beyond any single intervention.",
  },
  {
    title: "Silent or Masked Disease and Distress",
    desc: "Investigating conditions where symptoms are actively hidden by evolution, limiting detection even with advanced monitoring.",
  },
  {
    title: "Unintended Consequences of Standard Care",
    desc: "Tracking long-term or population-level effects of widely accepted veterinary practices that were never fully evaluated.",
  },
];

const RESEARCH_TOPICS = [
  {
    title: "Unknown Biological Signals",
    desc: "Uncharacterized molecules, rhythms, or physiological signals that correlate with health or disease but lack clear explanation.",
  },
  {
    title: "Latent Protective Mechanisms",
    desc: "Natural disease resistance, pain tolerance, or longevity traits observed in certain species, breeds, or individuals.",
  },
  {
    title: "Pain Modulation Beyond Analgesics",
    desc: "Non-drug biological or neurological mechanisms that suppress pain or distress without traditional analgesia.",
  },
  {
    title: "Hidden Costs of Normal Physiology",
    desc: "Biological processes (stress, inflammation, metabolism) that cause cumulative damage despite being evolutionarily necessary.",
  },
  {
    title: "Environmental Exposure and Sentinel Signals",
    desc: "Animal responses to toxins, climate stressors, and ecological change that precede human health impacts.",
  },
  {
    title: "Species-Specific Health Advantages",
    desc: "Evolutionary adaptations that outperform current medical solutions, such as hypoxia tolerance or infection resistance.",
  },
  {
    title: "Comparative Physiology at Extremes",
    desc: "How animals survive extreme environments and what this reveals about biological limits and resilience.",
  },
  {
    title: "Genetic Intervention and Biological Integrity",
    desc: "Health implications of gene editing, selective breeding, and biologic modification.",
  },
  {
    title: "Developmental Programming and Lifelong Health",
    desc: "How early-life exposures shape disease risk, resilience, and aging across an animal's lifespan.",
  },
  {
    title: "Unexpected Correlations and Anomalies",
    desc: "Reproducible patterns that do not fit existing biological models but may point to new mechanisms or therapies.",
  },
];

const ALL_TOPICS = [...CLINICAL_TOPICS, ...RESEARCH_TOPICS];

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

type ReasoningSection = {
  lastRun?: string | null;
  reasoning?: string | null;
};

type AgentReasoning = {
  updatedAt?: string | null;
  surveillance?: ReasoningSection;
  literature?: ReasoningSection;
  synthesis?: ReasoningSection;
};

type TopicSummaryItem = {
  topic: string;
  count: number;
};

type TopicSummaryTotals = {
  topicCount?: number;
  topicsWithItems?: number;
  totalItems?: number;
};

type TopicSummary = {
  updatedAt?: string | null;
  topics?: TopicSummaryItem[];
  totals?: TopicSummaryTotals;
};

function safeHref(url: string | undefined): string {
  if (!url || typeof url !== "string") return "#";
  const u = String(url).trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return "#";
}

function formatMaybeDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
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
  reasoning: AgentReasoning | null;
  topicSummary: TopicSummary | null;
}> {
  try {
    const r = await fetch(`${base}/api/dashboard`, { cache: "no-store" });
    if (r.ok) {
      const data = await r.json();
      return {
        summary: data.summary ?? null,
        ingested: Array.isArray(data.ingested) ? data.ingested : null,
        reasoning: data.reasoning ?? null,
        topicSummary: data.topicSummary ?? null,
      };
    }
  } catch {
    // e.g. GitHub Pages: no API
  }
  const [summaryRes, ingestedRes, reasoningRes, topicRes] = await Promise.all([
    fetch(`${base}/data-summary.json`, { cache: "no-store" }),
    fetch(`${base}/data/ingested.json`, { cache: "no-store" }),
    fetch(`${base}/agent-reasoning.json`, { cache: "no-store" }),
    fetch(`${base}/topic-summary.json`, { cache: "no-store" }),
  ]);
  const summary = summaryRes.ok ? await summaryRes.json() : null;
  const ingestedData = ingestedRes.ok ? await ingestedRes.json() : null;
  const ingested = Array.isArray(ingestedData) ? ingestedData : null;
  const reasoningData = reasoningRes.ok ? await reasoningRes.json() : null;
  const reasoning = reasoningData && typeof reasoningData === "object"
    ? reasoningData
    : null;
  const topicData = topicRes.ok ? await topicRes.json() : null;
  const topicSummary = topicData && typeof topicData === "object"
    ? topicData
    : null;
  return { summary, ingested, reasoning, topicSummary };
}

export default function App() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [memory, setMemory] = useState<IngestedRow[] | null>(null);
  const [reasoning, setReasoning] = useState<AgentReasoning | null>(null);
  const [topicSummary, setTopicSummary] = useState<TopicSummary | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = useCallback(() => {
    setRefreshing(true);
    fetchDashboard()
      .then(({ summary: s, ingested: i, reasoning: r, topicSummary: t }) => {
        setSummary(s);
        setMemory(i);
        setReasoning(r);
        setTopicSummary(t);
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboard()
      .then(({ summary: s, ingested: i, reasoning: r, topicSummary: t }) => {
        if (!cancelled) {
          setSummary(s);
          setMemory(i);
          setReasoning(r);
          setTopicSummary(t);
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

  useEffect(() => {
    if (!memoryOpen) return;
    if (memory !== null) return; // already have from dashboard
    setMemoryLoading(true);
    fetch(`${base}/data/ingested.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setMemory(Array.isArray(data) ? data : null);
      })
      .catch(() => setMemory(null))
      .finally(() => setMemoryLoading(false));
  }, [memoryOpen, memory]);

  const lastUpdated = summary?.lastUpdated
    ? new Date(summary.lastUpdated).toLocaleString()
    : null;
  const reasoningUpdated = formatMaybeDate(reasoning?.updatedAt ?? null);
  const reasoningCards = [
    {
      key: "surveillance",
      title: "Surveillance reasoning",
      text: reasoning?.surveillance?.reasoning ?? null,
      lastRun: formatMaybeDate(reasoning?.surveillance?.lastRun ?? null),
    },
    {
      key: "literature",
      title: "Literature reasoning",
      text: reasoning?.literature?.reasoning ?? null,
      lastRun: formatMaybeDate(reasoning?.literature?.lastRun ?? null),
    },
    {
      key: "synthesis",
      title: "Opportunities synthesis",
      text: reasoning?.synthesis?.reasoning ?? null,
      lastRun: formatMaybeDate(reasoning?.synthesis?.lastRun ?? null),
    },
  ];
  const hasReasoning = reasoningCards.some((item) => Boolean(item.text));
  const visibleReasoningCards = reasoningCards.filter((item) => item.text);
  const topicUpdated = formatMaybeDate(topicSummary?.updatedAt ?? null);
  const topicTotals = topicSummary?.totals ?? {};
  const topicCounts = new Map(
    (topicSummary?.topics ?? []).map((item) => [item.topic, item.count]),
  );
  const reportHasSurveillance = Boolean(reasoning?.surveillance?.reasoning);
  const reportHasLiterature = Boolean(reasoning?.literature?.reasoning);
  const reportHasSynthesis = Boolean(reasoning?.synthesis?.reasoning);
  const reportStatus = reportHasSurveillance || reportHasLiterature || reportHasSynthesis
    ? reportHasSurveillance && reportHasLiterature && reportHasSynthesis
      ? "Complete"
      : "Partial"
    : "Pending";
  const reportStatusDetail = formatMaybeDate(reasoning?.updatedAt ?? null);

  return (
    <div className={cn("min-h-screen flex flex-col relative", "app-bg")}>
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <nav className="mx-auto max-w-5xl px-4 py-3 sm:px-6 flex justify-between items-center gap-4">
          <a href="#" className="flex items-center gap-2 font-semibold text-foreground tracking-tight text-lg">
            <AnimalMindLogo className="size-8 text-primary" />
            <span className="hidden sm:inline">
              <span className="text-muted-foreground font-medium text-sm">Animal Mind</span>
              <span className="mx-1.5 text-border">/</span>
            </span>
            Animal Research Network
          </a>
          <div className="flex items-center gap-3">
            <a
              href="#mission"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Mission
            </a>
            <a
              href="#topics"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Topics
            </a>
            <a
              href="#data"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Data
            </a>
            <a
              href="#insights"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Key insights
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
        <section className="text-center space-y-6 pb-12">
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
          <p className="text-lg text-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            One place for animal health research and practice.
          </p>
          <a
            href="#mission"
            className={cn(buttonVariants({ size: "lg" }), "rounded-lg shadow-sm")}
          >
            How it works
          </a>
        </section>

        {/* Mission & how it works */}
        <section
          id="mission"
          aria-labelledby="mission-heading"
          className="pb-12 space-y-6"
        >
          <h2 id="mission-heading" className="sr-only">
            Mission and how it works
          </h2>
          <Card className="shadow-sm border-border bg-card/95">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Our mission
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We exist to improve animal health. By bringing surveillance, literature,
                  clinical, and vet practice resources into one research network, we help
                  veterinarians, researchers, and one-health teams make better decisions—
                  from outbreak awareness to oncology, imaging, and guidelines.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  How we ingest data
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We don’t yet “investigate by topic” on demand. Instead, autonomous agents
                  run on a schedule with a fixed set of search terms and curated sources:
                  PubMed (one health, veterinary oncology, case reports, clinical, small
                  animal, equine), CDC travel notices, TCIA imaging, and curated links
                  (AAHA, AVMA, Merck, etc.). They fetch, analyze, and organize; then push
                  updates here. This site is read-only—you see the latest evidence and
                  links; no credentials or PII are used here. We’re building toward
                  topic-driven investigation over time.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Who it’s for
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Clinicians checking travel notices or differentials; researchers
                  scanning literature and case data; educators and students building on
                  current evidence. If your goal is better outcomes for animals, this
                  network is for you.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Autonomous-Agent Topics: Clinical-Adjacent + Research & Discovery */}
        <section
          id="topics"
          aria-labelledby="topics-heading"
          className="pb-12 space-y-8"
        >
          <div>
            <h2
              id="topics-heading"
              className="text-lg font-semibold text-foreground mb-2"
            >
              Autonomous-Agent Topics
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Clinical-adjacent topics inform veterinary care today. Research topics explore biology, mechanisms, and long-term discovery.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Clinical-Adjacent
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Topics that directly inform veterinary decision-making, interpretation, and care—without replacing clinical judgment.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                {CLINICAL_TOPICS.map((item, i) => (
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
                {RESEARCH_TOPICS.map((item, i) => (
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

        {/* Topic summary + report status */}
        <section
          id="topic-summary"
          aria-labelledby="topic-summary-heading"
          className="pb-12 space-y-4"
        >
          <h2 id="topic-summary-heading" className="text-lg font-semibold text-foreground">
            Topic summary
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Summary by autonomous-agent topic after each ingest.
            {topicUpdated ? ` Updated ${topicUpdated}.` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px] font-medium">
              Report status: {reportStatus}
            </Badge>
            {reportStatusDetail && (
              <span className="text-xs text-muted-foreground">
                Last report update {reportStatusDetail}
              </span>
            )}
            {topicTotals.topicCount !== undefined && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                Topics with data: {topicTotals.topicsWithItems ?? 0}/{topicTotals.topicCount ?? 0}
              </Badge>
            )}
            {topicTotals.totalItems !== undefined && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                Total items: {topicTotals.totalItems ?? 0}
              </Badge>
            )}
          </div>
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading topic summary...</p>
              ) : topicSummary?.topics?.length ? (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                  {ALL_TOPICS.map((item) => {
                    const count = topicCounts.get(item.title) ?? 0;
                    return (
                      <li key={item.title}>
                        <Card className="border border-border bg-card/95 shadow-sm h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-semibold">
                                {item.title}
                              </CardTitle>
                              <Badge variant="secondary" className="text-[10px] font-medium shrink-0">
                                {count}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs leading-relaxed mt-1.5">
                              {item.desc}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Topic summary appears after the next ingest and push.
                </p>
              )}
            </CardContent>
          </Card>
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
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {lastUpdated && (
                        <span className="flex items-center gap-2">
                          <Clock className="size-4" aria-hidden />
                          Data as of {lastUpdated}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={refreshing}
                        onClick={refreshData}
                        aria-label="Refresh data"
                      >
                        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
                        {refreshing ? "Refreshing…" : "Refresh data"}
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

        {/* Key insights — research insights by autonomous agents */}
        <section
          id="insights"
          aria-labelledby="insights-heading"
          className="mt-12 space-y-4"
        >
          <h2 id="insights-heading" className="text-lg font-semibold text-foreground">
            Key insights
          </h2>
          <p className="text-sm text-muted-foreground">
            Research insights by autonomous agents. Summaries appear when NVIDIA reasoning
            is enabled during ingest.
            {reasoningUpdated ? ` Updated ${reasoningUpdated}.` : ""}
          </p>
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading insights...</p>
              ) : hasReasoning ? (
                <>
                  <p className="text-xs text-muted-foreground mb-4 border-b border-border pb-2">
                    For personal use only. Do not copy or redistribute in bulk.
                  </p>
                  <div
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none"
                    style={{ userSelect: "none" }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {visibleReasoningCards.map((card) => (
                      <Card
                        key={card.key}
                        className="border border-border bg-card/95 shadow-sm h-full"
                      >
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-semibold">
                              {card.title}
                            </CardTitle>
                            {card.lastRun && (
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                {card.lastRun}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {card.text}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Insights appear after the NVIDIA LLM runs. Set NVIDIA_API_KEY
                  in the VM or GitHub Actions secrets and wait for the next ingest.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

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
