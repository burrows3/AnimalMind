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

type RepurposeSignalSummary = {
  signal_id: string;
  compound: string;
  proposed_species: string[];
  proposed_condition: string;
  confidence_score: number;
  risk_overall?: number | null;
  summary_hypothesis?: string;
  executive_summary?: string[];
  disclaimer?: string;
};

type RepurposeSignalIndex = {
  run_id?: string;
  updated_at?: string;
  total?: number;
  signals?: RepurposeSignalSummary[];
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

/** Decode common HTML entities in agent text so they display correctly. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Render a line with **bold** as React nodes. */
function renderBoldLine(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, k) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={k} className="font-medium text-foreground">{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

/** Render insight block with simple markdown: paragraphs, **bold**, ### subheadings, bullets. */
function InsightContent({ text, className }: { text: string; className?: string }) {
  const decoded = decodeHtmlEntities(text);
  const blocks = decoded.split(/\n\n+/).filter(Boolean);
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const lines = trimmed.split(/\n/);
        const firstLine = lines[0] ?? "";
        const isH3 = /^###\s+/.test(firstLine);
        const allBullets = lines.every(
          (l) => /^[•\-]\s+/.test(l.trim()) || /^\*\s+/.test(l.trim())
        );
        if (isH3) {
          const heading = firstLine.replace(/^###\s+/, "").trim();
          const rest = lines.slice(1).join("\n").trim();
          return (
            <div key={i}>
              <h4 className="font-semibold text-foreground mt-4 mb-1.5 first:mt-0 text-xs uppercase tracking-wide text-muted-foreground">
                {renderBoldLine(heading)}
              </h4>
              {rest ? (
                <div className="text-muted-foreground space-y-1">
                  {rest.split(/\n/).map((line, j) => (
                    <p key={j}>{renderBoldLine(line)}</p>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }
        if (allBullets && lines.length > 0) {
          return (
            <ul key={i} className="list-disc list-inside space-y-1 text-muted-foreground">
              {lines.map((line, j) => {
                const content = line.replace(/^[•\-*\s]+/, "").trim();
                return <li key={j}>{renderBoldLine(content)}</li>;
              })}
            </ul>
          );
        }
        return (
          <p key={i} className="text-muted-foreground">
            {lines.map((line, j) => (
              <span key={j}>
                {renderBoldLine(line)}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
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

async function fetchRepurposeSignals(): Promise<RepurposeSignalIndex | null> {
  try {
    const api = await fetch(`${base}/api/repurpose/signals`, { cache: "no-store" });
    if (api.ok) {
      return await api.json();
    }
  } catch {
    // fall back to static docs
  }
  try {
    const staticRes = await fetch(`${base}/repurpose/signals.json`, { cache: "no-store" });
    if (staticRes.ok) return await staticRes.json();
  } catch {
    // ignore
  }
  return null;
}

export default function App() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [memory, setMemory] = useState<IngestedRow[] | null>(null);
  const [reasoning, setReasoning] = useState<AgentReasoning | null>(null);
  const [topicSummary, setTopicSummary] = useState<TopicSummary | null>(null);
  const [repurposeSignals, setRepurposeSignals] = useState<RepurposeSignalIndex | null>(null);
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
    fetchRepurposeSignals().then(setRepurposeSignals).catch(() => {});
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
    fetchRepurposeSignals()
      .then((data) => {
        if (!cancelled) setRepurposeSignals(data);
      })
      .catch(() => {});
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
  const repurposeUpdated = formatMaybeDate(repurposeSignals?.updated_at ?? null);
  const repurposeItems = repurposeSignals?.signals ?? [];

  return (
    <div className={cn("min-h-screen flex flex-col relative", "app-bg")}>
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <nav className="mx-auto max-w-5xl px-4 py-3 sm:px-6 flex flex-wrap justify-between items-center gap-3">
          <a href="#" className="flex items-center gap-2 font-semibold text-foreground tracking-tight text-base sm:text-lg">
            <AnimalMindLogo className="size-8 text-primary" />
            <span className="hidden sm:inline">
              <span className="text-muted-foreground font-medium text-sm">Animal Mind</span>
              <span className="mx-1.5 text-border">/</span>
            </span>
            Animal Research Network
          </a>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <a
              href="#overview"
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Overview
            </a>
            <a
              href="#audience"
              className="hidden sm:inline text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Audience
            </a>
            <a
              href="#topics"
              className="hidden sm:inline text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Topics
            </a>
            <a
              href="#data"
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Data
            </a>
            <a
              href="#repurpose"
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Repurpose
            </a>
            <a
              href="#track"
              className="hidden sm:inline text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sources
            </a>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-medium rounded-full px-2.5">
              Free access
            </Badge>
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
            Autonomous · Free · Read-only
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Autonomous research intelligence for animal health
          </h1>
          <p className="text-lg text-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            A free platform built on public sources that ingests global signals and
            synthesizes evidence for research leaders, biotech teams, and investors.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#data"
              className={cn(buttonVariants({ size: "lg" }), "rounded-lg shadow-sm")}
            >
              See live signals
            </a>
            <a
              href="#overview"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-lg")}
            >
              Product overview
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px] font-medium">
              Updated every 3 hours
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-medium">
              Evidence linked
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-medium">
              Free access
            </Badge>
          </div>
        </section>

        {/* Overview */}
        <section
          id="overview"
          aria-labelledby="overview-heading"
          className="pb-12 space-y-6"
        >
          <h2 id="overview-heading" className="text-lg font-semibold text-foreground">
            Product overview
          </h2>
          <Card className="shadow-sm border-border bg-card/95">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    What it is
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A free research engine that continuously ingests surveillance,
                    literature, clinical, and imaging signals for animal health.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    What it delivers
                  </h3>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-4 space-y-1">
                    <li>Ranked signals by topic and domain</li>
                    <li>Agent reasoning and synthesis outputs</li>
                    <li>Report status with timestamps</li>
                    <li>Exportable JSON for analysis workflows</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    How it works
                  </h3>
                  <ol className="text-sm text-muted-foreground leading-relaxed list-decimal pl-4 space-y-1">
                    <li>Ingest global sources every 3 hours</li>
                    <li>Agents reason over new data</li>
                    <li>Synthesize opportunities and risks</li>
                    <li>Publish read-only updates</li>
                  </ol>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This is a free, read-only research surface built on public sources under
                fair use. The UI links to original evidence and does not expose
                credentials or PII.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Audience */}
        <section
          id="audience"
          aria-labelledby="audience-heading"
          className="pb-12 space-y-6"
        >
          <div>
            <h2 id="audience-heading" className="text-lg font-semibold text-foreground mb-2">
              Who it is for
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Built for research teams and decision-makers who need a continuously updated
              view of animal health evidence and opportunity. Free to access and open to
              anyone.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Academia",
                desc: "Track emerging topics, prioritize grant ideas, and spot research gaps.",
              },
              {
                title: "Biotech & Pharma",
                desc: "Monitor translational signals, comparative oncology, and new targets.",
              },
              {
                title: "Investors & M&A",
                desc: "Surface momentum shifts, evidence clusters, and potential assets.",
              },
              {
                title: "Public health & conservation",
                desc: "Coordinate early signals and cross-species risk awareness.",
              },
            ].map((item) => (
              <Card key={item.title} className="border border-border bg-card/95 shadow-sm">
                <CardContent className="p-4">
                  <CardTitle className="text-sm font-semibold mb-1.5">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {item.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
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

        {/* Repurpose signals */}
        <section
          id="repurpose"
          aria-labelledby="repurpose-heading"
          className="pb-12 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="repurpose-heading" className="text-lg font-semibold text-foreground">
                Veterinary drug repurpose signals
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Research hypotheses only. No dosing guidance. Evidence is linked to public
                sources and summarized for research triage.
                {repurposeUpdated ? ` Updated ${repurposeUpdated}.` : ""}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-medium">
              Research only
            </Badge>
          </div>
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading repurpose signals...</p>
              ) : repurposeItems.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {repurposeItems.slice(0, 6).map((signal) => (
                    <Card key={signal.signal_id} className="border border-border bg-card/95 shadow-sm">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-semibold">
                            {signal.compound}
                          </CardTitle>
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            {signal.confidence_score ?? 0} / 100
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {signal.proposed_condition} · {signal.proposed_species?.join(", ") || "Multi-species"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {signal.executive_summary?.length ? (
                          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                            {signal.executive_summary.slice(0, 3).map((line, idx) => (
                              <li key={idx}>{line}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Executive summary pending. Run the repurpose engine to populate.
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            Risk {signal.risk_overall ?? "—"}
                          </Badge>
                          <a
                            href={`/repurpose/signals/${signal.signal_id}.json`}
                            className="text-primary hover:underline"
                          >
                            View JSON
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No repurpose signals yet. Run <code>npm run repurpose</code> to generate
                  the first batch.
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
          className="mt-16 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2
                id="insights-heading"
                className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2"
              >
                <Sparkles className="size-5 text-primary shrink-0" aria-hidden />
                Key insights
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Research insights by autonomous agents.
                {reasoningUpdated ? (
                  <span className="ml-1">Updated {reasoningUpdated}.</span>
                ) : null}
              </p>
            </div>
            <span
              className="text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md shrink-0 w-fit"
              aria-label="Usage notice"
            >
              For personal use only. Do not copy or redistribute in bulk.
            </span>
          </div>
          <Card className="overflow-hidden border-border bg-card shadow-md rounded-xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">Loading insights…</p>
                </div>
              ) : hasReasoning ? (
                <div
                  className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border select-none"
                  style={{ userSelect: "none" }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {visibleReasoningCards.map((card) => {
                    const Icon =
                      card.key === "surveillance"
                        ? Globe
                        : card.key === "literature"
                          ? BookOpen
                          : Sparkles;
                    return (
                      <div
                        key={card.key}
                        className="flex flex-col min-h-0 bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="p-4 pb-2 shrink-0 border-b border-border/60">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
                                <Icon className="size-4 text-primary" aria-hidden />
                              </div>
                              <CardTitle className="text-sm font-semibold text-foreground truncate">
                                {card.title}
                              </CardTitle>
                            </div>
                            {card.lastRun ? (
                              <time
                                className="text-[11px] text-muted-foreground shrink-0 tabular-nums"
                                dateTime={card.lastRun}
                              >
                                {card.lastRun}
                              </time>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-3 max-h-[320px] overscroll-contain">
                          <InsightContent text={card.text} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Insights appear after the NVIDIA LLM runs. Set NVIDIA_API_KEY
                    in the VM or GitHub Actions secrets and wait for the next ingest.
                  </p>
                </div>
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
