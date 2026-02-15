import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  Clock,
  ExternalLink,
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
import { Button } from "@/components/ui/button";
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
  "pet_owner",
  "imaging",
  "vet_practice",
] as const;

const LABELS: Record<string, string> = {
  surveillance: "Surveillance",
  literature: "Literature",
  cancer: "Cancer",
  case_data: "Case reports",
  clinical: "Clinical",
  pet_owner: "Pet brief",
  imaging: "Imaging",
  vet_practice: "Vet practice",
};

const TRACK_ITEMS: { key: string; title: string; desc: string; tag: string }[] = [
  { key: "surveillance", title: "Surveillance", desc: "CDC travel notices", tag: "CDC" },
  { key: "literature", title: "Literature", desc: "PubMed", tag: "PubMed" },
  { key: "cancer", title: "Cancer", desc: "Veterinary oncology", tag: "Oncology" },
  { key: "case_data", title: "Case data", desc: "Veterinary case reports", tag: "Case reports" },
  { key: "clinical", title: "Clinical", desc: "Practice, small animal, equine", tag: "Clinical" },
  { key: "pet_owner", title: "Pet owner brief", desc: "Companion-animal owner guidance", tag: "Pet" },
  { key: "imaging", title: "Imaging", desc: "TCIA, radiographs", tag: "TCIA" },
  { key: "vet_practice", title: "Vet practice", desc: "AAHA, AVMA, VIN, Merck", tag: "Guidelines" },
];

const DATA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  surveillance: Globe,
  literature: BookOpen,
  cancer: FlaskConical,
  case_data: FileText,
  clinical: Stethoscope,
  pet_owner: Heart,
  imaging: BarChart3,
  vet_practice: Building2,
};

const PET_OWNER_KEYWORDS = /\b(dog|dogs|canine|cat|cats|feline|pet|pets|puppy|kitten|owner|home care|triage|poison|toxin|flea|tick|vaccin|vomit|diarrhea|itch|cough|ear|dental|behavior)\b/i;
const PET_OWNER_FALLBACK_TYPES = new Set(["clinical", "case_data", "vet_practice", "surveillance", "literature", "cancer"]);
const RESEARCH_TYPES = new Set(["literature", "clinical", "cancer", "case_data"]);
const PRO_BRIEF_TYPES = new Set(["surveillance", "literature", "clinical", "cancer", "case_data", "imaging", "vet_practice"]);
const BRAND_TAGLINE = "ANIMAL HEALTH NEWS";
const BRAND_HEADLINE = "INTELLIGENCE FOR ANIMAL HEALTH";
const BRAND_SUBHEAD = "Run by autonomous agents. Reviewed by humans.";
const BRAND_ONE_LINER = "Two editions: Clinical and Pet.";
const PRO_MARKETING_HEADLINE = "AnimalMind Pro is the modern intelligence layer for veterinary medicine.";
const PRO_MARKETING_VALUE =
  "It monitors veterinary research and public health sources in real time, then delivers concise AI summaries of outbreak alerts, drug updates, regulatory changes, and clinical insights so teams can act quickly.";
const PRO_MARKETING_BENEFITS = [
  "Track new research, surveillance signals, and regulatory changes in one place.",
  "Get prioritized outbreak alerts by region, species, and clinical relevance.",
  "Stay current on drug approvals, safety signals, label changes, and withdrawals.",
  "Focus on high-signal updates designed to reduce noise for busy clinicians.",
  "Replace hours of manual review with brief updates you can scan in minutes.",
];
const PRO_MARKETING_CREDIBILITY =
  "Built for veterinarians, researchers, and animal health professionals, with source-linked updates from trusted public data.";
const CONSUMER_SECTION_HASHES = new Set([
  "pet-cta",
  "pet-brief",
  "pet-mission",
  "pet-topics",
  "pet-updates",
]);
const CLINICAL_SECTION_HASHES = new Set([
  "pro-cta",
  "data",
  "brief-articles",
  "mission",
  "topics",
  "track",
  "waitlist",
  "memory-panel",
]);
/** High-quality distinct photos per article. Each article gets a unique image from a deterministic URL. */
const PET_IMAGE_WIDTH = 480;
const PET_IMAGE_HEIGHT = 300;
/** Real animal/nature photos: Unsplash CDN (verified IDs). One per article index; fallback to Picsum then SVG. */
const PET_ARTICLE_PHOTOS: string[] = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca239d?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1574158622688-e89e3eaf0f74?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1458571037713-913d8b481dc6?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1474511324803-24c5926a8c78?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1583337133575-2d75733f19e0?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1587303853328-5f3b2c1a0d9e?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1583337133575-2d75733f19e0?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1511044568932-338cba0ad803?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1530281700549-e82e7bf97421?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1583337133575-2d75733f19e0?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1568572933382-74d440642117?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca239d?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1574158622688-e89e3eaf0f74?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1458571037713-913d8b481dc6?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1474511324803-24c5926a8c78?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1583337133575-2d75733f19e0?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1587303853328-5f3b2c1a0d9e?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1511044568932-338cba0ad803?w=480&q=80&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=480&q=80&fit=crop",
];
function petImageUrlForArticle(_topicKey: string, articleIndex: number): string {
  const url = PET_ARTICLE_PHOTOS[articleIndex % PET_ARTICLE_PHOTOS.length];
  if (url) return url;
  return `https://picsum.photos/seed/pet-${articleIndex}/${PET_IMAGE_WIDTH}/${PET_IMAGE_HEIGHT}`;
}
/** Map inferPetImageIndex (0–7) to topic key. */
const PET_TOPIC_KEYS = ["cat", "turtle", "wildlife", "horse", "dog", "bird", "cattle", "wildlife"] as const;
/** Featured/more cards: distinct photos. */
const PET_FEATURED_IMAGES = PET_ARTICLE_PHOTOS.slice(0, 8);
/** Fallback when image fails to load. */
const PET_ARTICLE_IMAGE_FALLBACK = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"><rect fill="#e2e8f0" width="480" height="300"/><text x="240" y="155" font-family="system-ui,sans-serif" font-size="14" fill="#64748b" text-anchor="middle" dominant-baseline="middle">Pet health</text></svg>')}`;

type DataSummary = {
  lastUpdated?: string | null;
  counts?: Record<string, number>;
  sourceHealthSummary?: SourceHealthSummary | null;
  sourceHealthDetails?: SourceHealthDetail[];
  intelligenceGaps?: IntelligenceGap[];
};

type SourceHealthStatus = "fresh" | "stale" | "very_stale" | "no_data" | "error" | "disabled";
type SourceHealthOverall = "sufficient" | "limited" | "insufficient";
type SourceHealthSeverity = "warning" | "critical";

type SourceHealthSummary = {
  generatedAt?: string | null;
  overallStatus?: SourceHealthOverall;
  coveragePercent?: number;
  totalSources?: number;
  requiredSources?: number;
  staleSources?: number;
  errorSources?: number;
  noDataSources?: number;
  newestUpdate?: string | null;
  oldestUpdate?: string | null;
};

type SourceHealthDetail = {
  sourceId: string;
  name: string;
  type?: string;
  tier?: number;
  audience?: string;
  requiredForCoverage?: boolean;
  status?: SourceHealthStatus;
  mode?: string;
  lastUpdate?: string | null;
  lastError?: string | null;
};

type IntelligenceGap = {
  sourceId?: string;
  severity?: SourceHealthSeverity;
  message: string;
};

type IngestedRow = {
  data_type: string;
  condition_or_topic?: string;
  title?: string;
  url?: string;
};

type BriefAudience = "pro" | "pet" | "all";

type BriefArticle = {
  id: string;
  audience: BriefAudience;
  title: string;
  summary: string;
  points: string[];
  sources: IngestedRow[];
};

type PetNewsCard = {
  id: string;
  title: string;
  summary: string;
  tip: string;
  sources: IngestedRow[];
};

/** One article per research item, written for pet owners, with image that matches content. */
type PetArticle = {
  id: string;
  title: string;
  summary: string;
  points: string[];
  sources: IngestedRow[];
  /** Image URL chosen to match the article (e.g. dog for canine cancer). */
  imageUrl: string;
};

function safeHref(url: string | undefined): string {
  if (!url || typeof url !== "string") return "#";
  const u = String(url).trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return "#";
}

function sourceHostLabel(url: string | undefined): string {
  const href = safeHref(url);
  if (href === "#") return "Source";
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    return host || "Source";
  } catch {
    return "Source";
  }
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "unknown";
  const ageMs = Math.max(0, Date.now() - ts);
  const mins = Math.floor(ageMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function healthOverallLabel(status: SourceHealthOverall | undefined): string {
  if (status === "sufficient") return "Sufficient";
  if (status === "limited") return "Limited";
  if (status === "insufficient") return "Insufficient";
  return "Unknown";
}

function sourceStatusLabel(status: SourceHealthStatus | undefined): string {
  if (status === "fresh") return "Fresh";
  if (status === "stale") return "Stale";
  if (status === "very_stale") return "Very stale";
  if (status === "error") return "Error";
  if (status === "disabled") return "Disabled";
  return "No data";
}

function deriveHealthFromLastUpdated(lastUpdated: string | null | undefined): SourceHealthSummary | null {
  if (!lastUpdated) return null;
  const ts = new Date(lastUpdated).getTime();
  if (Number.isNaN(ts)) return null;
  const ageMs = Math.max(0, Date.now() - ts);
  const ageHours = ageMs / (60 * 60 * 1000);
  if (ageHours <= 18) {
    return {
      overallStatus: "sufficient",
      coveragePercent: 100,
      newestUpdate: lastUpdated,
      oldestUpdate: lastUpdated,
    };
  }
  if (ageHours <= 36) {
    return {
      overallStatus: "limited",
      coveragePercent: 66,
      newestUpdate: lastUpdated,
      oldestUpdate: lastUpdated,
    };
  }
  return {
    overallStatus: "insufficient",
    coveragePercent: 33,
    newestUpdate: lastUpdated,
    oldestUpdate: lastUpdated,
  };
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
      const apiSourceHealthSummary =
        data.sourceHealthSummary ?? data.summary?.sourceHealthSummary ?? deriveHealthFromLastUpdated(data.summary?.lastUpdated);
      const summaryFromApi: DataSummary | null = data.summary
        ? {
            ...data.summary,
            sourceHealthSummary: apiSourceHealthSummary,
            sourceHealthDetails: Array.isArray(data.sourceHealthDetails)
              ? data.sourceHealthDetails
              : Array.isArray(data.summary?.sourceHealthDetails)
                ? data.summary.sourceHealthDetails
                : [],
            intelligenceGaps: Array.isArray(data.intelligenceGaps)
              ? data.intelligenceGaps
              : Array.isArray(data.summary?.intelligenceGaps)
                ? data.summary.intelligenceGaps
                : [],
          }
        : null;
      return {
        summary: summaryFromApi,
        ingested: Array.isArray(data.ingested) ? data.ingested : null,
      };
    }
  } catch {
    // e.g. GitHub Pages: no API
  }
  const [summaryRes, ingestedRes, sourceHealthRes] = await Promise.all([
    fetch(`${base}/data-summary.json`, { cache: "no-store" }),
    fetch(`${base}/data/ingested.json`, { cache: "no-store" }),
    fetch(`${base}/source-health.json`, { cache: "no-store" }).catch(() => null),
  ]);
  const summary = summaryRes.ok ? await summaryRes.json() : null;
  const sourceHealthPayload = sourceHealthRes && sourceHealthRes.ok ? await sourceHealthRes.json() : null;
  if (summary && sourceHealthPayload) {
    summary.sourceHealthSummary = summary.sourceHealthSummary ?? sourceHealthPayload.summary ?? null;
    summary.sourceHealthDetails = summary.sourceHealthDetails ?? sourceHealthPayload.details ?? [];
    summary.intelligenceGaps = summary.intelligenceGaps ?? sourceHealthPayload.intelligenceGaps ?? [];
  }
  if (summary && !summary.sourceHealthSummary) {
    summary.sourceHealthSummary = deriveHealthFromLastUpdated(summary.lastUpdated);
  }
  const ingestedPayload = ingestedRes.ok ? await ingestedRes.json() : null;
  const ingested = Array.isArray(ingestedPayload) ? ingestedPayload : null;
  return { summary, ingested };
}

function toPetBriefItems(rows: IngestedRow[] | null, limit = 14): IngestedRow[] {
  if (!rows || rows.length === 0) return [];
  const explicit = rows.filter((r) => r.data_type === "pet_owner");
  const fallback = rows.filter((r) => {
    if (!PET_OWNER_FALLBACK_TYPES.has(r.data_type)) return false;
    const text = `${r.title || ""} ${r.condition_or_topic || ""}`;
    return PET_OWNER_KEYWORDS.test(text);
  });
  const combined = [...explicit, ...fallback];
  const seen = new Set<string>();
  const unique: IngestedRow[] = [];
  for (const item of combined) {
    const key = `${item.url || ""}|${item.title || ""}|${item.condition_or_topic || ""}|${item.data_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}

function topTopics(rows: IngestedRow[], limit = 3): Array<{ topic: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const topic = (row.condition_or_topic || "General focus").trim() || "General focus";
    counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => (b.count - a.count) || a.topic.localeCompare(b.topic))
    .slice(0, limit);
}

function uniqueRows(rows: IngestedRow[], limit = 4): IngestedRow[] {
  const seen = new Set<string>();
  const selected: IngestedRow[] = [];
  for (const row of rows) {
    const key = `${row.url || ""}|${row.title || ""}|${row.condition_or_topic || ""}|${row.data_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(row);
    if (selected.length >= limit) break;
  }
  return selected;
}

function formatTopics(topics: Array<{ topic: string; count: number }>): string {
  if (topics.length === 0) return "general updates";
  if (topics.length === 1) return topics[0].topic;
  if (topics.length === 2) return `${topics[0].topic} and ${topics[1].topic}`;
  return `${topics[0].topic}, ${topics[1].topic}, and ${topics[2].topic}`;
}

function buildDailyBriefArticles(rows: IngestedRow[] | null): BriefArticle[] {
  if (!rows || rows.length === 0) return [];
  const surveillanceRows = rows.filter((r) => r.data_type === "surveillance");
  const researchRows = rows.filter((r) => RESEARCH_TYPES.has(r.data_type));
  const petRows = toPetBriefItems(rows, 18);
  const proRows = rows.filter((r) => PRO_BRIEF_TYPES.has(r.data_type));
  const articles: BriefArticle[] = [];

  if (surveillanceRows.length > 0) {
    const topics = topTopics(surveillanceRows, 3);
    articles.push({
      id: "surveillance-watchlist",
      audience: "all",
      title: "Surveillance watchlist: conditions to track now",
      summary: `Current feed signals emphasize ${formatTopics(topics)}.`,
      points: [
        `Top tracked conditions: ${topics.map((t) => `${t.topic} (${t.count})`).join(", ")}.`,
        "Use this watchlist for travel advice, triage preparation, and clinic communication.",
        "Cross-check outbreak context before operational decisions.",
      ],
      sources: uniqueRows(surveillanceRows, 4),
    });
  }

  if (researchRows.length > 0) {
    const topics = topTopics(researchRows, 3);
    articles.push({
      id: "research-pulse",
      audience: "pro",
      title: "Research pulse: today’s strongest evidence signals",
      summary: `New research activity clusters around ${formatTopics(topics)}.`,
      points: [
        `${researchRows.length} research-linked items are represented in today’s ingest slice.`,
        "Use these signals to prioritize rounds, education updates, and literature review.",
        "Focus first on topics that appear repeatedly across multiple source types.",
      ],
      sources: uniqueRows(researchRows, 4),
    });
  }

  if (petRows.length > 0) {
    const topics = topTopics(petRows, 3);
    articles.push({
      id: "pet-owner-practical",
      audience: "pet",
      title: "Pet news you can use today",
      summary: `Friendly, source-backed updates focused on ${formatTopics(topics)}.`,
      points: [
        "What to watch at home today.",
        "When to contact your veterinarian sooner.",
        "Trusted links for deeper reading.",
      ],
      sources: uniqueRows(petRows, 4),
    });
  }

  if (proRows.length > 0) {
    const topics = topTopics(proRows, 3);
    articles.push({
      id: "operations-brief",
      audience: "pro",
      title: "Operations brief: what to monitor in the next cycle",
      summary: `Cross-source monitoring currently centers on ${formatTopics(topics)}.`,
      points: [
        "Align care pathways and communication around repeated topic clusters.",
        "Flag items that overlap surveillance and clinical evidence for team review.",
        "Carry high-signal topics into the next daily brief for continuity.",
      ],
      sources: uniqueRows(proRows, 3),
    });
  }

  return articles;
}

function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function stableArticleId(row: IngestedRow): string {
  const key = `${row.url ?? ""}|${row.title ?? ""}|${row.condition_or_topic ?? ""}|${row.data_type}`;
  const h = hashText(key);
  return `pet-art-${Math.abs(h).toString(36)}`;
}

/** Article title from the actual source; fallback only when source has no title. */
function petArticleTitle(row: IngestedRow): string {
  const t = (row.title || "").trim();
  if (t) {
    if (t.length <= 72) return t;
    const end = t.lastIndexOf(" ", 69);
    return (end > 0 ? t.slice(0, end) : t.slice(0, 72)) + "…";
  }
  const topic = friendlyPetTopic(row.condition_or_topic || "");
  return `${topic}: what pet owners should know`;
}

/** One-sentence summary tied to this specific source for pet owners. */
function petArticleSummary(row: IngestedRow): string {
  const topic = (row.condition_or_topic || "pet health").replace(/<[^>]+>/g, "").trim() || "pet health";
  const hasTitle = (row.title || "").trim().length > 0;
  if (hasTitle) {
    return `This source on ${topic} is relevant for pet owners. Here's what it may mean for you and your pet—read the source for full details.`;
  }
  return `New update on ${topic}. Here's what it may mean for you and your pet. Read the source for full details; this is not medical advice.`;
}

/** 2–3 takeaway points for this article; topic-specific so each article feels real. */
function petArticlePoints(row: IngestedRow): string[] {
  const topic = (row.condition_or_topic || "").toLowerCase();
  const title = (row.title || "").toLowerCase();
  const text = `${topic} ${title}`;
  const points: string[] = [];
  if (text.includes("surveillance") || row.data_type === "surveillance") {
    points.push("Check travel and disease notices if you're planning trips with your pet.");
  }
  if (text.includes("poison") || text.includes("toxin") || text.includes("emergenc")) {
    points.push("Keep poison control and your vet's number handy; quick action matters.");
  }
  if (text.includes("vaccin") || text.includes("prevent")) {
    points.push("Routine care and prevention support long-term health—ask your vet what's right for your pet.");
  }
  if (text.includes("cancer") || text.includes("canine") || text.includes("feline")) {
    points.push("Early detection and regular check-ups help; your vet can explain options and what to watch for.");
  }
  if (text.includes("when to see") || text.includes("vet")) {
    points.push("When in doubt, contact your veterinarian.");
  }
  if (points.length < 1) {
    points.push("Staying informed helps you partner with your vet.");
  }
  points.push("Read the source for full details; this is not medical advice.");
  return points.slice(0, 3);
}

/** Choose image index (0–7) that matches article content: dog, cat, bird, horse, etc. */
function inferPetImageIndex(row: IngestedRow): number {
  const t = `${(row.title ?? "")} ${(row.condition_or_topic ?? "")}`.toLowerCase();
  if (/\b(canine|dog|puppy|puppies)\b/.test(t)) return 4; // pet-5 dog
  if (/\b(feline|cat|kitten|kittens)\b/.test(t)) return 0; // pet-1 cat
  if (/\b(bird|avian|parrot|poultry|budgie)\b/.test(t)) return 5; // pet-6 parrot
  if (/\b(equine|horse|pony|foal)\b/.test(t)) return 3; // pet-4 horse
  if (/\b(cattle|cow|cows|livestock)\b/.test(t)) return 6; // pet-7 cows
  if (/\b(wildlife|fox|exotic|lemur)\b/.test(t)) return 7; // pet-8 lemur
  if (/\b(marine|turtle|aquatic)\b/.test(t)) return 1; // pet-2 turtle
  if (/\b(surveillance|travel|outbreak)\b/.test(t)) return 2; // pet-3 fox (travel/wildlife)
  return 4; // default dog for general pet
}

/** One article per source; each gets a different image (seed = global index so every card is unique). */
function buildPetArticlesFromResearch(rows: IngestedRow[] | null): PetArticle[] {
  const petRows = toPetBriefItems(rows, 30);
  if (petRows.length === 0) return [];
  return petRows.map((row, articleIndex) => {
    const imageIndex = inferPetImageIndex(row);
    const topicKey = PET_TOPIC_KEYS[imageIndex] ?? "dog";
    const imageUrl = petImageUrlForArticle(topicKey, articleIndex);
    return {
      id: stableArticleId(row),
      title: petArticleTitle(row),
      summary: petArticleSummary(row),
      points: petArticlePoints(row),
      sources: [row],
      imageUrl,
    };
  });
}

/** Pick image by seed (for featured/more pet news cards). */
function pickPetNewsImage(seed: string): string {
  const idx = hashText(seed) % PET_FEATURED_IMAGES.length;
  return PET_FEATURED_IMAGES[idx];
}

/** Image for research article at index (featured/more cards). */
function petArticleImage(index: number): string {
  return index < PET_FEATURED_IMAGES.length ? PET_FEATURED_IMAGES[index] : PET_ARTICLE_IMAGE_FALLBACK;
}

function friendlyPetTopic(topic: string): string {
  const t = (topic || "").toLowerCase();
  if (t.includes("household zoonotic")) return "Keeping pets and people healthy";
  if (t.includes("poison")) return "Poison and toxin safety";
  if (t.includes("prevent")) return "Prevention and routine care";
  if (t.includes("when to see")) return "When to call the vet";
  if (t.includes("pet owner guidance")) return "Everyday pet care";
  if (t.includes("canine cancer") || t.includes("animal cancer")) return "Cancer in dogs and cats";
  if (t.includes("case report")) return "Clinical cases";
  if (t.includes("clinical practice")) return "Clinical practice";
  if (t.includes("chikungunya") || t.includes("rabies") || t.includes("dengue")) return "Travel and disease alerts";
  if (t.includes("small-animal") || t.includes("symptoms")) return "Pet health at home";
  return topic || "Everyday pet care";
}

function buildPetNewsCards(rows: IngestedRow[] | null): PetNewsCard[] {
  const petRows = toPetBriefItems(rows, 24);
  if (petRows.length === 0) return [];
  const topics = topTopics(petRows, 5);
  return topics.slice(0, 4).map((topic, idx) => {
    const groupRows = petRows.filter((r) => (r.condition_or_topic || "Everyday pet care") === topic.topic);
    const label = friendlyPetTopic(topic.topic);
    return {
      id: `pet-news-${idx}-${topic.topic}`,
      title: `${label}: what pet owners should know`,
      summary: `${topic.count} update${topic.count === 1 ? "" : "s"} in today’s brief.`,
      tip: "If your pet seems worse, uncomfortable, or not eating/drinking normally, contact your vet.",
      sources: uniqueRows(groupRows.length > 0 ? groupRows : petRows, 2),
    };
  });
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

  const hashToView = (h: string) => {
    if (h === "consumer" || h === "clinical") return h;
    if (CONSUMER_SECTION_HASHES.has(h)) return "consumer";
    if (CLINICAL_SECTION_HASHES.has(h)) return "clinical";
    return "";
  };
  const [view, setView] = useState<"" | "consumer" | "clinical">(() =>
    hashToView(typeof window !== "undefined" ? window.location.hash.slice(1) : "")
  );

  // Sync view from hash on mount (e.g. direct load of animalmind.co/#consumer) and when hash changes
  useEffect(() => {
    const syncFromHash = () => setView(hashToView(window.location.hash.slice(1)));
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
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
  const petBriefItems = useMemo(() => toPetBriefItems(memory), [memory]);
  const petBriefCount = summary?.counts?.pet_owner ?? petBriefItems.length;
  const dailyBriefArticles = useMemo(() => buildDailyBriefArticles(memory), [memory]);
  const proBriefArticles = useMemo(
    () => dailyBriefArticles.filter((article) => article.audience !== "pet"),
    [dailyBriefArticles]
  );
  const petBriefArticles = useMemo(
    () => dailyBriefArticles.filter((article) => article.audience !== "pro"),
    [dailyBriefArticles]
  );
  /** One article per ingested research item, written for pet owners; each has its own image. */
  const petArticlesFromResearch = useMemo(() => buildPetArticlesFromResearch(memory), [memory]);
  const petNewsCards = useMemo(() => buildPetNewsCards(memory), [memory]);
  const featuredPetNews = petNewsCards[0] ?? null;
  const morePetNews = petNewsCards.slice(1);
  const sourceHealthSummary = summary?.sourceHealthSummary ?? null;
  const sourceHealthDetails = summary?.sourceHealthDetails ?? [];
  const intelligenceGaps = summary?.intelligenceGaps ?? [];
  const topHealthDetails = useMemo(() => {
    const priority = {
      error: 0,
      no_data: 1,
      very_stale: 2,
      stale: 3,
      fresh: 4,
      disabled: 5,
    } as const;
    return [...sourceHealthDetails]
      .sort((a, b) => {
        const requiredDelta = Number(!!b.requiredForCoverage) - Number(!!a.requiredForCoverage);
        if (requiredDelta !== 0) return requiredDelta;
        const aPriority = priority[a.status || "no_data"];
        const bPriority = priority[b.status || "no_data"];
        if (aPriority !== bPriority) return aPriority - bPriority;
        return (a.name || "").localeCompare(b.name || "");
      })
      .slice(0, 6);
  }, [sourceHealthDetails]);
  const statusToneClass =
    sourceHealthSummary?.overallStatus === "sufficient"
      ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
      : sourceHealthSummary?.overallStatus === "limited"
        ? "border-amber-200 bg-amber-50/60 text-amber-900"
        : "border-rose-200 bg-rose-50/60 text-rose-900";

  return (
    <div className={cn("min-h-screen flex flex-col relative", "app-bg")}>
      {/* ——— Landing: WSJ-style editorial, hero image, two distinct editions ——— */}
      {view === "" && (
        <>
          <header className="border-b border-border bg-card">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate("")}
                className="flex items-center gap-2 text-foreground no-underline min-h-[44px]"
              >
                <AnimalMindLogo className="size-8 text-foreground shrink-0" />
                <span className="text-xl font-semibold tracking-tight">AnimalMind</span>
              </button>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                {BRAND_TAGLINE}
              </p>
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
            {/* Hero: editorial image + headline */}
            <section className="mb-10 sm:mb-14">
              <div className="rounded-none overflow-hidden border border-border bg-card shadow-sm">
                <div className="relative aspect-[16/9] sm:aspect-[21/9] min-h-[200px]">
                  <img
                    src="https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1200&q=85"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-foreground/40" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/90 font-semibold mb-2">
                      {BRAND_HEADLINE}
                    </p>
                    <h1 className="text-2xl sm:text-4xl md:text-[2.75rem] font-semibold text-white leading-tight max-w-2xl tracking-tight">
                      {BRAND_SUBHEAD}
                    </h1>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground max-w-2xl">
                {BRAND_ONE_LINER}
              </p>
            </section>

            {/* Two editions: distinct cards with pictures */}
            <p className="section-label mb-4">Our editions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <button
                type="button"
                onClick={() => navigate("clinical")}
                className="group text-left rounded-none border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-foreground/20 transition-all min-h-[44px]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted/30">
                  <img
                    src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=85"
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                <div className="p-5 sm:p-6 border-t border-border">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">For Clinical & Research</p>
                  <h2 className="text-xl font-semibold text-foreground mb-2">AnimalMind Pro</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Real-time intelligence briefs with research, outbreak, drug, and regulatory updates.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-foreground flex items-center gap-2">
                    Enter Pro
                    <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate("consumer")}
                className="group text-left rounded-none border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-foreground/20 transition-all min-h-[44px]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted/30">
                  <img
                    src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=85"
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                <div className="p-5 sm:p-6 border-t border-border">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">For Pet Owners</p>
                  <h2 className="text-xl font-semibold text-foreground mb-2">AnimalMind Pet</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Plain-language pet guidance from the same autonomous engine powering Pro.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-foreground flex items-center gap-2">
                    Enter Pet
                    <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                  </p>
                </div>
              </button>
            </div>

            <p className="mt-10 pt-8 border-t border-border text-center text-xs text-muted-foreground max-w-xl mx-auto">
              AI infrastructure for animal health. Evidence from public sources. Not medical advice.
            </p>
          </main>
          <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
            <p>AnimalMind · Animal Health News</p>
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
                <a href="#pet-brief" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Today's brief</a>
                <a href="#pet-cta" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Notify me</a>
                <span className="text-sm text-muted-foreground font-medium">AnimalMind Pet</span>
              </div>
            </nav>
          </header>

          <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:py-8 sm:px-6 relative z-1 overflow-x-hidden">
            {sourceHealthSummary && (
              <section className={cn("mb-6 rounded-md border px-4 py-3", statusToneClass)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    Data status: {healthOverallLabel(sourceHealthSummary.overallStatus)}
                  </p>
                  <span className="text-xs">
                    Coverage {sourceHealthSummary.coveragePercent ?? 0}%
                  </span>
                </div>
                <p className="mt-1 text-xs">
                  Last reliable source update {relativeTime(sourceHealthSummary.newestUpdate || summary?.lastUpdated)}.
                </p>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer select-none font-medium">View source status</summary>
                  {topHealthDetails.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-muted-foreground">
                      {topHealthDetails.map((item) => (
                        <li key={`pet-health-${item.sourceId}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0">
                            {sourceStatusLabel(item.status)} · {relativeTime(item.lastUpdate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-muted-foreground">Detailed source health appears after the next ingest cycle.</p>
                  )}
                  {intelligenceGaps.length > 0 && (
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {intelligenceGaps.slice(0, 2).map((gap, idx) => (
                        <li key={`pet-gap-${idx}`}>{gap.message}</li>
                      ))}
                    </ul>
                  )}
                </details>
              </section>
            )}
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
                    {BRAND_HEADLINE}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    AnimalMind Pet is the owner edition: plain-language guidance from the same autonomous engine as Pro.
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
                Friendly pet health news, every day
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-6">
                Get clear updates for real pet-owner questions: what to watch, what is likely routine, and when to call your vet.
              </p>
              <div className="rounded-lg overflow-hidden border border-border bg-muted/20 max-w-2xl">
                <img
                  src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=700&q=80"
                  alt=""
                  className="w-full h-48 object-cover"
                />
              </div>
            </section>

            <section id="pet-brief" aria-labelledby="pet-brief-heading" className="py-10 border-b border-border">
              <h2 id="pet-brief-heading" className="section-label mb-2 flex items-center gap-2">
                <Heart className="size-4" aria-hidden />
                Today's pet brief
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
                Same trusted engine as Pro, translated into plain language for pet parents.
              </p>
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-semibold">Pet news for today</CardTitle>
                  <CardDescription className="text-xs">
                    Quick, friendly updates with trusted links for deeper reading.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Pet brief</Badge>
                      <span className="text-sm text-muted-foreground">{petBriefCount} item(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {lastUpdated && (
                        <span className="text-xs text-muted-foreground">As of {lastUpdated}</span>
                      )}
                      <Button variant="outline" size="sm" className="gap-2 rounded-md" disabled={refreshing} onClick={loadData} aria-label="Refresh pet brief">
                        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
                        {refreshing ? "Refreshing…" : "Refresh"}
                      </Button>
                    </div>
                  </div>
                  {loading || memoryLoading ? (
                    <p className="text-sm text-muted-foreground">Loading pet news…</p>
                  ) : petNewsCards.length > 0 ? (
                    <div className="space-y-4">
                      {featuredPetNews && (
                        <Card className="border border-border bg-muted/10 overflow-hidden shadow-sm">
                          <div className="aspect-[16/8] overflow-hidden bg-muted/20 border-b border-border">
                            <img
                              src={petArticleImage(0)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardHeader className="p-4 pb-2">
                            <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">Featured pet news</Badge>
                            <CardTitle className="text-base font-semibold">{featuredPetNews.title}</CardTitle>
                            <CardDescription className="text-sm">{featuredPetNews.summary}</CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 space-y-3">
                            <p className="text-sm text-muted-foreground">{featuredPetNews.tip}</p>
                            {featuredPetNews.sources.length > 0 && (
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Trusted sources</p>
                                <div className="flex flex-wrap gap-2">
                                  {featuredPetNews.sources.slice(0, 3).map((source, idx) => {
                                    const href = safeHref(source.url);
                                    return href !== "#" ? (
                                      <a
                                        key={`featured-pet-source-${idx}`}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 min-h-[40px] text-xs font-medium text-foreground hover:bg-muted/40 hover:border-foreground/30"
                                      >
                                        <ExternalLink className="size-3.5" aria-hidden />
                                        View source · {sourceHostLabel(source.url)}
                                      </a>
                                    ) : (
                                      <span
                                        key={`featured-pet-source-${idx}`}
                                        className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 min-h-[40px] text-xs text-muted-foreground"
                                      >
                                        {source.title || "Source"}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                      {morePetNews.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {morePetNews.map((card, moreIndex) => (
                            <Card key={card.id} className="border border-border bg-muted/10 overflow-hidden">
                              <div className="aspect-[16/9] overflow-hidden bg-muted/20 border-b border-border">
                                <img
                                  src={petArticleImage(featuredPetNews ? 1 + moreIndex : moreIndex)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardHeader className="p-3 pb-2">
                                <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">Pet news</Badge>
                                <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                                <CardDescription className="text-xs">{card.summary}</CardDescription>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 space-y-2">
                                <p className="text-xs text-muted-foreground">{card.tip}</p>
                                {card.sources.length > 0 && (
                                  <div className="space-y-2">
                                    {card.sources.slice(0, 2).map((source, idx) => {
                                      const href = safeHref(source.url);
                                      return href !== "#" ? (
                                        <a
                                          key={`pet-news-source-${card.id}-${idx}`}
                                          href={href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 min-h-[40px] text-xs font-medium text-foreground hover:bg-muted/40 hover:border-foreground/30"
                                        >
                                          <span className="truncate">View source · {sourceHostLabel(source.url)}</span>
                                          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                                        </a>
                                      ) : (
                                        <span
                                          key={`pet-news-source-${card.id}-${idx}`}
                                          className="inline-flex w-full items-center rounded-md border border-border bg-background px-3 py-2 min-h-[40px] text-xs text-muted-foreground"
                                        >
                                          {source.title || "Source"}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pet brief data will appear after the next autonomous ingest and push.
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Educational only. AnimalMind Pet does not replace veterinary diagnosis or emergency care.
                  </p>
                  {!loading && !memoryLoading && (
                    <div className="mt-6 border-t border-border pt-4">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Articles from today's research</h3>
                      <p className="text-xs text-muted-foreground mb-4">One article per source—each card is tied to a single research item. Image matches the topic (e.g. dog for canine). Tap View source to read the full report.</p>
                      {petArticlesFromResearch.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {petArticlesFromResearch.map((article) => (
                          <Card key={`pet-article-${article.id}`} className="border border-border bg-muted/10 overflow-hidden">
                            <div className="aspect-[16/10] overflow-hidden bg-muted/20 border-b border-border">
                              <img
                                src={article.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = PET_ARTICLE_IMAGE_FALLBACK;
                                }}
                              />
                            </div>
                            <CardHeader className="p-3 pb-2">
                              <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">Article</Badge>
                              <CardTitle className="text-sm font-semibold leading-snug">{article.title}</CardTitle>
                              <CardDescription className="text-xs">{article.summary}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-2">
                              <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                                {article.points.map((point, idx) => (
                                  <li key={`pet-point-${article.id}-${idx}`}>{point}</li>
                                ))}
                              </ul>
                              {article.sources.length > 0 && (() => {
                                const source = article.sources[0];
                                const href = safeHref(source.url);
                                return (
                                  <div>
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Source</p>
                                    {href !== "#" ? (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 min-h-[40px] text-xs font-medium text-foreground hover:bg-muted/40 hover:border-foreground/30"
                                      >
                                        <span className="truncate">View source</span>
                                        <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                                      </a>
                                    ) : (
                                      <span className="inline-flex w-full items-center rounded-md border border-border bg-background px-3 py-2 min-h-[40px] text-xs text-muted-foreground">
                                        {source.title || "Source"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No articles from today's research yet. Run an ingest to see pet-relevant articles here.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Mission / What we do */}
            <section id="pet-mission" aria-labelledby="pet-mission-heading" className="pb-10">
              <h2 id="pet-mission-heading" className="section-label mb-3">What to expect</h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                <p>
                  AnimalMind Pet turns autonomous research into simple daily guidance for pet owners.
                </p>
                <p>
                  You get clear signals on what to watch, what is likely routine, and when to contact a veterinarian.
                </p>
                <p>
                  Educational only; never a replacement for professional veterinary care.
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
            <p className="mt-1">Run by autonomous agents. Reviewed by humans.</p>
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
                <a href="#brief-articles" className="hidden sm:flex px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] items-center">Articles</a>
                <a href="#mission" className="px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] flex items-center">Mission</a>
                <a href="#topics" className="hidden sm:flex px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] items-center">Topics</a>
                <a href="#track" className="hidden sm:flex px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] items-center">Sources</a>
                <a href="#waitlist" className="px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] flex items-center">Updates</a>
              </div>
            </nav>
            <div className="mx-auto max-w-4xl px-4 pb-2 sm:px-6 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5 text-xs text-muted-foreground">
              <span className="truncate">{BRAND_TAGLINE}</span>
              <span className="shrink-0">{editionDate}</span>
            </div>
          </header>

          <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:py-8 sm:px-6 relative z-1 overflow-x-hidden">
            {sourceHealthSummary && (
              <section className={cn("mb-6 rounded-md border px-4 py-3", statusToneClass)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    Data status: {healthOverallLabel(sourceHealthSummary.overallStatus)}
                  </p>
                  <span className="text-xs">
                    Coverage {sourceHealthSummary.coveragePercent ?? 0}%
                  </span>
                </div>
                <p className="mt-1 text-xs">
                  Reliability snapshot based on source freshness and ingest success. Last update{" "}
                  {relativeTime(sourceHealthSummary.newestUpdate || summary?.lastUpdated)}.
                </p>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer select-none font-medium">View source status</summary>
                  {topHealthDetails.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-muted-foreground">
                      {topHealthDetails.map((item) => (
                        <li key={`pro-health-${item.sourceId}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {item.name}
                            {item.tier ? ` (Tier ${item.tier})` : ""}
                          </span>
                          <span className="shrink-0">
                            {sourceStatusLabel(item.status)} · {relativeTime(item.lastUpdate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-muted-foreground">Detailed source health appears after the next ingest cycle.</p>
                  )}
                  {intelligenceGaps.length > 0 && (
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {intelligenceGaps.slice(0, 3).map((gap, idx) => (
                        <li key={`pro-gap-${idx}`}>{gap.message}</li>
                      ))}
                    </ul>
                  )}
                </details>
              </section>
            )}
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
                  AnimalMind Pro
                </Badge>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI research monitoring</span>
              </div>
              <h2 id="pro-cta-heading" className="text-lg sm:text-xl font-semibold text-foreground leading-tight mb-2">
                {PRO_MARKETING_HEADLINE}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {PRO_MARKETING_VALUE}
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground mb-4">
                {PRO_MARKETING_BENEFITS.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
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
            {PRO_MARKETING_CREDIBILITY} Not medical advice.
          </p>
        </section>

        {/* Lead — newsletter edition with image */}
        <section className="pb-8 border-b border-border">
          <p className="section-label mb-1">AnimalMind Pro</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight mb-2">
            Fast, concise intelligence for veterinary decision-making
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mb-6">
            Review high-signal updates across research, outbreaks, drug changes, and regulatory shifts in minutes.
          </p>
          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 max-w-2xl mb-6">
            <img
              src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=700&q=80"
              alt=""
              className="w-full h-44 object-cover"
            />
          </div>
        </section>

        {/* Mission — how the newsletter works */}
        <section id="mission" aria-labelledby="mission-heading" className="pb-10">
          <h2 id="mission-heading" className="section-label mb-3">Why teams use AnimalMind Pro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
              <img
                src="https://images.pexels.com/photos/6235666/pexels-photo-6235666.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt=""
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                {PRO_MARKETING_VALUE}
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                {PRO_MARKETING_BENEFITS.map((benefit) => (
                  <li key={`mission-${benefit}`}>{benefit}</li>
                ))}
              </ul>
              <p>{PRO_MARKETING_CREDIBILITY}</p>
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

          <section id="brief-articles" aria-labelledby="brief-articles-heading" className="mt-8">
            <h2 id="brief-articles-heading" className="section-label mb-2">Daily brief articles</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Auto-generated article drafts from today’s ingest, with direct source links for review.
            </p>
            {proBriefArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proBriefArticles.map((article) => (
                  <Card key={`pro-article-${article.id}`} className="border border-border bg-card shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          {article.audience === "all" ? "All audiences" : "Pro"}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-semibold">{article.title}</CardTitle>
                      <CardDescription className="text-sm">{article.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                        {article.points.map((point, idx) => (
                          <li key={`pro-point-${article.id}-${idx}`}>{point}</li>
                        ))}
                      </ul>
                      {article.sources.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Source links</p>
                          <div className="space-y-2">
                            {article.sources.map((source, idx) => {
                              const href = safeHref(source.url);
                              return href !== "#" ? (
                                <a
                                  key={`pro-source-${article.id}-${idx}`}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 min-h-[40px] text-sm font-medium text-foreground hover:bg-muted/40 hover:border-foreground/30"
                                >
                                  <span className="truncate">View source · {sourceHostLabel(source.url)}</span>
                                  <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                                </a>
                              ) : (
                                <span
                                  key={`pro-source-${article.id}-${idx}`}
                                  className="inline-flex w-full items-center rounded-md border border-border bg-background px-3 py-2 min-h-[40px] text-sm text-muted-foreground"
                                >
                                  {source.title || "Source"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border border-border bg-card">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Article drafts will appear after ingest data is available.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

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
            <p className="mt-1">{PRO_MARKETING_CREDIBILITY}</p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
              No credentials or PII collected.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
