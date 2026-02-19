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
import { submitWaitlist } from "./waitlist";
import { submitIdea, type IdeaSource } from "./ideas";

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
  recall: "Recall",
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
const BRAND_HEADLINE = "ANIMAL HEALTH NEWS";
const BRAND_SUBHEAD = "Run by autonomous AI agents. Research and trends validated by humans.";
const BRAND_ONE_LINER = "Two editions: Pro and Pet. Research-backed updates every 6 hours.";
const PRO_MARKETING_HEADLINE = "AnimalMind Pro is the modern intelligence layer for veterinary medicine.";
const PRO_MARKETING_VALUE =
  "It monitors veterinary research and public health sources on a 6-hour cadence, then delivers concise AI summaries of outbreak alerts, drug updates, regulatory changes, and clinical insights so teams can act quickly.";
const PRO_MARKETING_BENEFITS = [
  "Track new research, surveillance signals, and regulatory changes in one place.",
  "Get prioritized outbreak alerts by region, species, and clinical relevance.",
  "Stay current on drug approvals, safety signals, label changes, and withdrawals.",
  "Focus on high-signal updates designed to reduce noise for busy clinicians.",
  "Replace hours of manual review with brief updates you can scan in minutes.",
];
const PRO_MISSION_POINTS = [
  "Shared digest view keeps teams aligned on what changed and why it matters.",
  "Source-linked cards make triage and verification fast during clinical workflows.",
  "A predictable 6-hour cadence improves freshness without introducing alert fatigue.",
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
/** Animal images are generated per topic from research data so cards stay relevant and never drift to non-animal scenes. */
const PET_IMAGE_WIDTH = 480;
const PET_IMAGE_HEIGHT = 300;
const PET_TOPICS = ["dog", "cat", "bird", "horse", "cattle", "wildlife", "turtle", "general"] as const;
type PetTopicKey = (typeof PET_TOPICS)[number];
const PET_TOPIC_LABEL: Record<PetTopicKey, string> = {
  dog: "Canine",
  cat: "Feline",
  bird: "Avian",
  horse: "Equine",
  cattle: "Bovine",
  wildlife: "Wildlife",
  turtle: "Reptile",
  general: "Pet care",
};
const PET_TOPIC_BASE_HUE: Record<PetTopicKey, number> = {
  dog: 28,
  cat: 285,
  bird: 195,
  horse: 32,
  cattle: 16,
  wildlife: 132,
  turtle: 166,
  general: 210,
};

function petTopicShapeSvg(topicKey: PetTopicKey, fill: string, stroke: string): string {
  if (topicKey === "cat") {
    return `<path d="M240 86 L205 56 L190 90 L240 98 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M240 86 L275 56 L290 90 L240 98 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="240" cy="138" r="52" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="220" cy="132" rx="8" ry="11" fill="${stroke}"/><ellipse cx="260" cy="132" rx="8" ry="11" fill="${stroke}"/><circle cx="240" cy="148" r="5" fill="${stroke}"/>`;
  }
  if (topicKey === "bird") {
    return `<ellipse cx="240" cy="148" rx="70" ry="48" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="188" cy="118" r="28" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M160 118 L134 106 L134 130 Z" fill="${stroke}"/><ellipse cx="256" cy="148" rx="34" ry="24" fill="rgba(255,255,255,0.22)" stroke="${stroke}" stroke-width="1.5"/><circle cx="196" cy="112" r="4" fill="${stroke}"/>`;
  }
  if (topicKey === "horse") {
    return `<ellipse cx="235" cy="162" rx="88" ry="42" fill="${fill}" stroke="${stroke}" stroke-width="2"/><rect x="278" y="112" width="34" height="70" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="314" cy="122" rx="34" ry="24" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M336 103 L346 88 L328 93 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/><rect x="180" y="188" width="10" height="32" rx="5" fill="${stroke}"/><rect x="222" y="188" width="10" height="32" rx="5" fill="${stroke}"/><rect x="258" y="188" width="10" height="32" rx="5" fill="${stroke}"/><rect x="294" y="188" width="10" height="32" rx="5" fill="${stroke}"/>`;
  }
  if (topicKey === "cattle") {
    return `<ellipse cx="235" cy="162" rx="90" ry="44" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="318" cy="138" rx="40" ry="30" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M283 124 Q266 102 250 122" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/><path d="M353 124 Q370 102 386 122" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/><ellipse cx="334" cy="146" rx="7" ry="6" fill="${stroke}"/><rect x="182" y="192" width="10" height="28" rx="5" fill="${stroke}"/><rect x="224" y="192" width="10" height="28" rx="5" fill="${stroke}"/><rect x="266" y="192" width="10" height="28" rx="5" fill="${stroke}"/><rect x="308" y="192" width="10" height="28" rx="5" fill="${stroke}"/>`;
  }
  if (topicKey === "wildlife") {
    return `<path d="M240 86 L200 54 L186 98 L240 108 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M240 86 L280 54 L294 98 L240 108 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="240" cy="144" r="54" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="219" cy="136" rx="7" ry="10" fill="${stroke}"/><ellipse cx="261" cy="136" rx="7" ry="10" fill="${stroke}"/><path d="M212 164 Q240 182 268 164" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`;
  }
  if (topicKey === "turtle") {
    return `<ellipse cx="238" cy="148" rx="78" ry="54" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="320" cy="146" r="22" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="189" cy="126" rx="16" ry="10" fill="rgba(255,255,255,0.24)"/><ellipse cx="238" cy="121" rx="16" ry="10" fill="rgba(255,255,255,0.24)"/><ellipse cx="287" cy="126" rx="16" ry="10" fill="rgba(255,255,255,0.24)"/><ellipse cx="213" cy="165" rx="16" ry="10" fill="rgba(255,255,255,0.24)"/><ellipse cx="262" cy="170" rx="16" ry="10" fill="rgba(255,255,255,0.24)"/><ellipse cx="190" cy="176" rx="18" ry="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="286" cy="176" rx="18" ry="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  }
  if (topicKey === "general") {
    return `<circle cx="194" cy="128" r="18" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="236" cy="114" r="16" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="278" cy="128" r="18" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="236" cy="170" rx="52" ry="34" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  }
  return `<ellipse cx="240" cy="170" rx="84" ry="36" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="240" cy="126" rx="58" ry="50" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="240" cy="76" rx="36" ry="38" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="204" cy="64" rx="18" ry="28" fill="${fill}" stroke="${stroke}" stroke-width="2" transform="rotate(-28 204 64)"/><ellipse cx="276" cy="64" rx="18" ry="28" fill="${fill}" stroke="${stroke}" stroke-width="2" transform="rotate(28 276 64)"/><circle cx="224" cy="76" r="6" fill="${stroke}"/><circle cx="256" cy="76" r="6" fill="${stroke}"/><ellipse cx="240" cy="90" rx="8" ry="6" fill="${stroke}"/>`;
}

function petTopicSvgImage(topicKey: PetTopicKey, variant = 0): string {
  const baseHue = PET_TOPIC_BASE_HUE[topicKey];
  const hue = (baseHue + variant * 19) % 360;
  const bg = `hsl(${hue}, 48%, 95%)`;
  const fill = `hsl(${hue}, 44%, 74%)`;
  const stroke = `hsl(${hue}, 34%, 30%)`;
  const shape = petTopicShapeSvg(topicKey, fill, stroke);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PET_IMAGE_WIDTH} ${PET_IMAGE_HEIGHT}" fill="none"><rect width="${PET_IMAGE_WIDTH}" height="${PET_IMAGE_HEIGHT}" fill="${bg}"/>${shape}<text x="${PET_IMAGE_WIDTH / 2}" y="${PET_IMAGE_HEIGHT - 20}" font-family="system-ui,sans-serif" font-size="13" fill="${stroke}" text-anchor="middle" dominant-baseline="middle">${PET_TOPIC_LABEL[topicKey]}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildPetTopicImagePool(topicKey: PetTopicKey, size = 10): string[] {
  return Array.from({ length: size }, (_, idx) => petTopicSvgImage(topicKey, idx));
}

const PET_IMAGES_BY_TOPIC: Record<PetTopicKey, string[]> = {
  dog: buildPetTopicImagePool("dog"),
  cat: buildPetTopicImagePool("cat"),
  bird: buildPetTopicImagePool("bird"),
  horse: buildPetTopicImagePool("horse"),
  cattle: buildPetTopicImagePool("cattle"),
  wildlife: buildPetTopicImagePool("wildlife"),
  turtle: buildPetTopicImagePool("turtle"),
  general: buildPetTopicImagePool("general"),
};
/** Distinct fallback image per article index (no blanks). */
function petFallbackImageUrl(articleIndex: number): string {
  const h = (articleIndex * 47 + 137) % 360;
  const bg = `hsl(${h}, 28%, 92%)`;
  const fg = `hsl(${h}, 35%, 40%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PET_IMAGE_WIDTH} ${PET_IMAGE_HEIGHT}"><rect fill="${bg}" width="${PET_IMAGE_WIDTH}" height="${PET_IMAGE_HEIGHT}"/><ellipse cx="240" cy="140" rx="80" ry="50" fill="${fg}" opacity="0.25"/><text x="240" y="200" font-family="system-ui,sans-serif" font-size="13" fill="${fg}" text-anchor="middle" dominant-baseline="middle">Pet health</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const PET_PLACEHOLDER_IMAGES = [
  "/pet-placeholder-1.svg",
  "/pet-placeholder-2.svg",
  "/pet-placeholder-3.svg",
  "/pet-placeholder-4.svg",
  "/pet-placeholder-5.svg",
  "/pet-placeholder-6.svg",
];
const PET_ARTICLE_IMAGE_FALLBACK = PET_PLACEHOLDER_IMAGES[0] ?? petFallbackImageUrl(999);

function inferPetTopicKeyFromText(text: string): PetTopicKey {
  const t = text.toLowerCase();
  if (/\b(canine|dog|puppy|puppies)\b/.test(t)) return "dog";
  if (/\b(feline|cat|kitten|kittens)\b/.test(t)) return "cat";
  if (/\b(bird|avian|parrot|poultry|budgie)\b/.test(t)) return "bird";
  if (/\b(equine|horse|pony|foal)\b/.test(t)) return "horse";
  if (/\b(cattle|cow|cows|livestock|bovine)\b/.test(t)) return "cattle";
  if (/\b(marine|turtle|aquatic|reptile)\b/.test(t)) return "turtle";
  if (/\b(wildlife|fox|exotic|lemur|zoonotic|rabies|dengue|chikungunya|outbreak|travel|surveillance)\b/.test(t)) {
    return "wildlife";
  }
  return "dog";
}

function inferPetTopicKey(row: { title?: string; condition_or_topic?: string }): PetTopicKey {
  return inferPetTopicKeyFromText(`${row.title ?? ""} ${row.condition_or_topic ?? ""}`);
}

function petTopicPlaceholderImage(topicKey: PetTopicKey, offset = 0): string {
  return petTopicSvgImage(topicKey, 100 + offset);
}

function pickDistinctImage(pool: string[], startIndex: number, used: Set<string>): string {
  if (pool.length === 0) return PET_ARTICLE_IMAGE_FALLBACK;
  for (let i = 0; i < pool.length; i += 1) {
    const candidate = pool[(startIndex + i) % pool.length];
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = pool[startIndex % pool.length] ?? pool[0];
  used.add(fallback);
  return fallback;
}

function pickBackupImage(pool: string[], startIndex: number, primary: string): string {
  if (pool.length === 0) return primary;
  for (let i = 0; i < pool.length; i += 1) {
    const candidate = pool[(startIndex + i) % pool.length];
    if (candidate !== primary) return candidate;
  }
  return primary;
}

function petTopicImageSet(topicKey: PetTopicKey, useIndex: number, usedPrimary: Set<string>) {
  const pool = PET_IMAGES_BY_TOPIC[topicKey] ?? PET_IMAGES_BY_TOPIC.general;
  const primary = pickDistinctImage(pool, useIndex, usedPrimary);
  const backup = pickBackupImage(pool, useIndex + 1, primary);
  return {
    imageUrl: primary,
    backupImageUrl: backup,
    fallbackImageUrl: petTopicPlaceholderImage(topicKey, useIndex),
  };
}

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
  abstract?: string;
  published_at?: string | null;
  fetched_at?: string | null;
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
  paragraphs: string[];
  sources: IngestedRow[];
  imageUrl: string;
  backupImageUrl: string;
  fallbackImageUrl: string;
};

/** One article per research item, written for pet owners, with image that matches content. */
type PetArticle = {
  id: string;
  title: string;
  summary: string;
  points: string[];
  sources: IngestedRow[];
  /** Primary image URL (topic-matched animal photo). */
  imageUrl: string;
  /** Backup image URL (same topic, tried when primary fails to avoid blanks). */
  backupImageUrl: string;
  /** Final fallback when both primary and backup fail (local animal placeholder). */
  fallbackImageUrl: string;
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

function extractPubMedIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)(?:\/|$|\?)/i);
  return match ? match[1] : null;
}

function collectPubMedIds(rows: IngestedRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = extractPubMedIdFromUrl(row.url);
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

function buildPubMedEfetchUrl(ids: string[]): string {
  const joined = encodeURIComponent(ids.join(","));
  return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${joined}&retmode=xml`;
}

function parsePubMedAbstractsXml(xml: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const parserErrors = doc.getElementsByTagName("parsererror");
    if (parserErrors.length === 0) {
      const articles = Array.from(doc.getElementsByTagName("PubmedArticle"));
      for (const article of articles) {
        const pmidNode = article.getElementsByTagName("PMID")[0];
        const pmid = pmidNode?.textContent?.trim();
        if (!pmid) continue;
        const abstractNodes = Array.from(article.getElementsByTagName("AbstractText"));
        const abstract = abstractNodes
          .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" ");
        if (abstract) map[pmid] = abstract;
      }
      return map;
    }
  }
  const blocks = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  for (const block of blocks) {
    const pmid = block.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    if (!pmid) continue;
    const abstracts = Array.from(block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g))
      .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (abstracts.length > 0) map[pmid] = abstracts.join(" ");
  }
  return map;
}

async function fetchPubMedAbstracts(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const out: Record<string, string> = {};
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const batch = unique.slice(i, i + chunkSize);
    const res = await fetch(buildPubMedEfetchUrl(batch), { cache: "no-store" });
    if (!res.ok) continue;
    const xml = await res.text();
    Object.assign(out, parsePubMedAbstractsXml(xml));
    // Respect NCBI unauthenticated rate limits.
    if (i + chunkSize < unique.length) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  return out;
}

const PUBMED_ABSTRACT_CACHE_KEY = "animalmind_pubmed_abstracts_v1";

function readPubMedAbstractCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PUBMED_ABSTRACT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writePubMedAbstractCache(cache: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PUBMED_ABSTRACT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota/storage errors.
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

/** AnimalMind logo: dog, cat, bird + ANIMAL MIND wordmark. */
function AnimalMindLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="AnimalMind"
      className={cn("shrink-0 w-auto object-contain", className)}
    />
  );
}

const base = typeof document !== "undefined" ? "" : "";

function timeoutSignal(timeoutMs: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), Math.max(0, timeoutMs));
  return {
    signal: controller.signal,
    cancel: () => window.clearTimeout(id),
  };
}

async function fetchJsonWithTimeout<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T | null> {
  if (typeof window === "undefined") return null;
  const { signal, cancel } = timeoutSignal(timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    cancel();
  }
}

/** Try /api/dashboard first (live from DB when running locally); else use static JSON. */
async function fetchDashboard(): Promise<{
  summary: DataSummary | null;
  ingested: IngestedRow[] | null;
}> {
  const apiPayload = await fetchJsonWithTimeout<any>(`${base}/api/dashboard`, { cache: "no-store" }, 3500);
  if (apiPayload) {
    const apiSourceHealthSummary =
      apiPayload.sourceHealthSummary ??
      apiPayload.summary?.sourceHealthSummary ??
      deriveHealthFromLastUpdated(apiPayload.summary?.lastUpdated);
    const summaryFromApi: DataSummary | null = apiPayload.summary
      ? {
          ...apiPayload.summary,
          sourceHealthSummary: apiSourceHealthSummary,
          sourceHealthDetails: Array.isArray(apiPayload.sourceHealthDetails)
            ? apiPayload.sourceHealthDetails
            : Array.isArray(apiPayload.summary?.sourceHealthDetails)
              ? apiPayload.summary.sourceHealthDetails
              : [],
          intelligenceGaps: Array.isArray(apiPayload.intelligenceGaps)
            ? apiPayload.intelligenceGaps
            : Array.isArray(apiPayload.summary?.intelligenceGaps)
              ? apiPayload.summary.intelligenceGaps
              : [],
        }
      : null;
    return {
      summary: summaryFromApi,
      ingested: Array.isArray(apiPayload.ingested) ? apiPayload.ingested : null,
    };
  }

  const [summaryPayload, ingestedPayload, sourceHealthPayload] = await Promise.all([
    fetchJsonWithTimeout<any>(`${base}/data-summary.json`, { cache: "no-store" }, 5000),
    fetchJsonWithTimeout<any>(`${base}/data/ingested.json`, { cache: "no-store" }, 7000),
    fetchJsonWithTimeout<any>(`${base}/source-health.json`, { cache: "no-store" }, 5000),
  ]);

  const summary: DataSummary | null =
    summaryPayload && typeof summaryPayload === "object" ? (summaryPayload as DataSummary) : null;
  if (summary && sourceHealthPayload && typeof sourceHealthPayload === "object") {
    summary.sourceHealthSummary = summary.sourceHealthSummary ?? sourceHealthPayload.summary ?? null;
    summary.sourceHealthDetails = summary.sourceHealthDetails ?? sourceHealthPayload.details ?? [];
    summary.intelligenceGaps = summary.intelligenceGaps ?? sourceHealthPayload.intelligenceGaps ?? [];
  }
  if (summary && !summary.sourceHealthSummary) {
    summary.sourceHealthSummary = deriveHealthFromLastUpdated(summary.lastUpdated);
  }
  const ingested = Array.isArray(ingestedPayload) ? (ingestedPayload as IngestedRow[]) : null;
  return { summary, ingested };
}

/** Fetch the complete pet-relevant research list (uncapped), with static fallback for docs/public builds. */
async function fetchAllPetResearch(): Promise<IngestedRow[] | null> {
  const apiPayload = await fetchJsonWithTimeout<any>(`${base}/api/pet-research`, { cache: "no-store" }, 6000);
  if (apiPayload && Array.isArray(apiPayload.ingested)) return apiPayload.ingested as IngestedRow[];
  const staticPayload = await fetchJsonWithTimeout<any>(`${base}/data/pet-research.json`, { cache: "no-store" }, 6000);
  return Array.isArray(staticPayload) ? (staticPayload as IngestedRow[]) : null;
}

async function fetchPetRecalls(): Promise<IngestedRow[] | null> {
  const apiPayload = await fetchJsonWithTimeout<any>(`${base}/api/pet-recalls`, { cache: "no-store" }, 4500);
  if (apiPayload && Array.isArray(apiPayload.ingested)) return apiPayload.ingested as IngestedRow[];
  const staticPayload = await fetchJsonWithTimeout<any>(`${base}/data/pet-recalls.json`, { cache: "no-store" }, 4500);
  return Array.isArray(staticPayload) ? (staticPayload as IngestedRow[]) : null;
}

function rowTimestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatIngestedDate(value: string | null | undefined): string {
  const ms = rowTimestampMs(value);
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Strip HTML tags and decode common entities so titles/topics display cleanly. */
function stripHtmlForDisplay(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return "";
  const decoded = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const PET_SAFETY_SIGNAL_KEYWORDS =
  /\b(recall|withdrawn?|advisory|alert|contaminat(?:ed|ion)|listeria|salmonella|toxic|toxicity|poison(?:ing)?|unsafe)\b/i;
const PET_SAFETY_CONTEXT_KEYWORDS =
  /\b(pet|pets|dog|dogs|cat|cats|canine|feline|puppy|puppies|kitten|kittens|companion)\b/i;
const DOG_SIGNAL_KEYWORDS = /\b(dog|dogs|canine|puppy|puppies)\b/i;
const CAT_SIGNAL_KEYWORDS = /\b(cat|cats|feline|kitten|kittens)\b/i;

function rowSignalText(row: IngestedRow): string {
  return `${row.title || ""} ${row.condition_or_topic || ""}`
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPetSafetySignals(rows: IngestedRow[] | null, limit = 16): IngestedRow[] {
  if (!rows || rows.length === 0) return [];
  const candidates = rows.filter((row) => {
    const text = rowSignalText(row);
    if (!text) return false;
    if (!PET_SAFETY_SIGNAL_KEYWORDS.test(text)) return false;
    return PET_SAFETY_CONTEXT_KEYWORDS.test(text) || row.data_type === "pet_owner";
  });
  return uniqueRows(sortPetRowsNewestFirst(candidates), limit);
}

function petRowSortScore(row: IngestedRow): number {
  if (extractPubMedIdFromUrl(row.url)) return 3; // Research-linked rows should lead pet-owner cards.
  if (row.data_type === "pet_owner") return 2;
  if (PET_OWNER_FALLBACK_TYPES.has(row.data_type)) return 1;
  return 0;
}

function sortPetRowsNewestFirst(rows: IngestedRow[]): IngestedRow[] {
  return [...rows].sort((a, b) => {
    const scoreDelta = petRowSortScore(b) - petRowSortScore(a);
    if (scoreDelta !== 0) return scoreDelta;

    const aDate = rowTimestampMs(a.published_at ?? a.fetched_at);
    const bDate = rowTimestampMs(b.published_at ?? b.fetched_at);
    if (aDate !== bDate) return bDate - aDate;

    const typeDelta = (a.data_type || "").localeCompare(b.data_type || "");
    if (typeDelta !== 0) return typeDelta;

    const titleDelta = (a.title || "").localeCompare(b.title || "");
    if (titleDelta !== 0) return titleDelta;

    return (a.url || "").localeCompare(b.url || "");
  });
}

function toPetBriefItems(rows: IngestedRow[] | null, limit = 14): IngestedRow[] {
  if (!rows || rows.length === 0) return [];
  const explicit = rows.filter((r) => r.data_type === "pet_owner");
  const fallback = rows.filter((r) => {
    if (!PET_OWNER_FALLBACK_TYPES.has(r.data_type)) return false;
    const text = `${r.title || ""} ${r.condition_or_topic || ""}`;
    return PET_OWNER_KEYWORDS.test(text);
  });
  const combined = sortPetRowsNewestFirst([...explicit, ...fallback]);
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

function toPetResearchItems(rows: IngestedRow[] | null, limit = 30): IngestedRow[] {
  const expanded = toPetBriefItems(rows, Math.max(limit * 3, limit));
  const researchOnly = expanded.filter((row) => Boolean(extractPubMedIdFromUrl(row.url)));
  return researchOnly.slice(0, limit);
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
      points: ensureThreeParagraphs([
        `Top tracked conditions in this cycle are ${topics.map((t) => `${t.topic} (${t.count})`).join(", ")}. These represent the strongest surveillance-linked research themes in the current ingest window.`,
        "Use this watchlist to guide travel counseling, triage planning, and proactive communication with owners when conditions begin to trend upward.",
        "Before operational changes, open the source links to validate geography, species relevance, and reporting timeframes that can shift the practical risk profile.",
      ], formatTopics(topics)),
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
      points: ensureThreeParagraphs([
        `${researchRows.length} research-linked records are represented in this digest, with repeated concentration around ${formatTopics(topics)}.`,
        "Treat these themes as near-term reading priorities for rounds, case discussions, protocol reviews, and internal education updates.",
        "Start with topics appearing across multiple source types, because repeated cross-source recurrence usually indicates higher signal quality.",
      ], formatTopics(topics)),
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
      points: ensureThreeParagraphs([
        `Today's owner-facing research themes center on ${formatTopics(topics)}, which helps prioritize what is most relevant for at-home observation.`,
        "Each article emphasizes concrete monitoring triggers so owners can escalate to veterinary care earlier when trends suggest increased risk.",
        "Every summary links back to source material so decisions stay grounded in verifiable research context, not generalized advice.",
      ], formatTopics(topics)),
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
      points: ensureThreeParagraphs([
        `Current operations-relevant clusters are ${formatTopics(topics)}, giving teams a focused set of signals to carry into shift handoffs and planning.`,
        "Align internal communication and care pathways around repeated clusters, especially where clinical and surveillance evidence overlap.",
        "Carry these same high-signal topics into the next cycle to preserve continuity and reduce context switching across the team.",
      ], formatTopics(topics)),
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
  const t = stripHtmlForDisplay(row.title || "");
  if (t) {
    if (t.length <= 72) return t;
    const end = t.lastIndexOf(" ", 69);
    return (end > 0 ? t.slice(0, end) : t.slice(0, 72)) + "…";
  }
  const topic = friendlyPetTopic(stripHtmlForDisplay(row.condition_or_topic || ""));
  return `${topic}: what pet owners should know`;
}

/** One-sentence summary tied to this specific source for pet owners. */
function petArticleSummary(row: IngestedRow, evidenceText = ""): string {
  const topic = articleTopicText(row);
  const hasTitle = (row.title || "").trim().length > 0;
  const evidence = firstSentences(evidenceText, 1, 170);
  if (evidence) {
    return `From this source on ${topic}: ${evidence}`;
  }
  if (hasTitle) {
    return `This source is about ${topic}. Read the linked report for full details.`;
  }
  return `New source update on ${topic}. This summary is educational and not medical advice.`;
}

function articleTopicText(row: IngestedRow): string {
  const cleaned = stripHtmlForDisplay(row.condition_or_topic || "pet health");
  return cleaned || "pet health";
}

function shortHeadline(text: string, max = 96): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  const clipped = cleaned.slice(0, max);
  const breakAt = clipped.lastIndexOf(" ");
  const safe = breakAt > 50 ? clipped.slice(0, breakAt) : clipped;
  return `${safe}…`;
}

function cleanEvidenceText(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

function rowEvidenceText(row: IngestedRow, abstractByPmid: Record<string, string>): string {
  const fromRow = cleanEvidenceText(row.abstract);
  if (fromRow) return fromRow;
  const pmid = extractPubMedIdFromUrl(row.url);
  if (!pmid) return "";
  return cleanEvidenceText(abstractByPmid[pmid]);
}

function firstSentences(text: string, maxSentences = 2, maxChars = 320): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const matches = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
  const picked: string[] = [];
  let length = 0;
  for (const s of matches) {
    const sentence = s.trim();
    if (!sentence) continue;
    if (picked.length >= maxSentences) break;
    if (length + sentence.length > maxChars && picked.length > 0) break;
    picked.push(sentence);
    length += sentence.length + 1;
  }
  const joined = picked.join(" ").trim();
  return joined.length > maxChars ? `${joined.slice(0, maxChars - 1)}…` : joined;
}

function sourceEvidenceSnippet(rows: IngestedRow[], abstractByPmid: Record<string, string>): string {
  const snippets: string[] = [];
  for (const row of rows) {
    const evidence = rowEvidenceText(row, abstractByPmid);
    if (!evidence) continue;
    const snippet = firstSentences(evidence, 1, 220);
    if (!snippet) continue;
    snippets.push(snippet);
    if (snippets.length >= 2) break;
  }
  return snippets.join(" ");
}

function ensureThreeParagraphs(paragraphs: string[], topic: string): string[] {
  const cleaned = paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  while (cleaned.length < 3) {
    cleaned.push(`This update remains focused on ${topic}. Review the linked source for full methods and context.`);
  }
  return cleaned.slice(0, 3);
}

/** Keep pet-owner copy short, clear, and grounded in source text. */
function ensurePetOwnerParagraphs(paragraphs: string[], topic: string): string[] {
  const cleaned = paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .slice(0, 3);
  while (cleaned.length < 2) {
    cleaned.push(`This update is about ${topic}. Please review the linked source for exact details.`);
  }
  if (cleaned.length === 2) {
    cleaned.push("If your pet seems unwell, contact your veterinarian.");
  }
  return cleaned;
}

/** Three pet-owner paragraphs per source card, written in plain language. */
function petArticleParagraphs(row: IngestedRow, evidenceText = ""): string[] {
  const topic = articleTopicText(row);
  const sourceLabel = LABELS[row.data_type] ?? row.data_type.replace(/_/g, " ");
  const citedTitle = shortHeadline(stripHtmlForDisplay(row.title) || `Update on ${topic}`, 110);
  const intro = `This article summarizes one source: “${citedTitle}.” It is from ${sourceLabel} and focuses on ${topic}.`;
  const evidenceSummary = firstSentences(evidenceText, 2, 360);
  const interpretation = evidenceSummary
    ? `What the source says: ${evidenceSummary}`
    : "What the source says: The abstract text was not available in this feed. Please open the source link to review methods and results directly.";
  const action =
    "What this means for pet owners: Use this as background information, not a diagnosis. If your pet has concerning symptoms, contact your veterinarian and share the source link during the visit.";
  return ensurePetOwnerParagraphs([intro, interpretation, action], topic);
}

/** One article per source; image matches topic (dog→dog photo), distinct. Backup = same topic so no blanks. */
function buildPetArticlesFromResearch(rows: IngestedRow[] | null, abstractByPmid: Record<string, string>): PetArticle[] {
  const petRows = toPetResearchItems(rows, 30);
  if (petRows.length === 0) return [];
  const topicUseCount: Record<PetTopicKey, number> = {
    cat: 0,
    turtle: 0,
    wildlife: 0,
    horse: 0,
    dog: 0,
    bird: 0,
    cattle: 0,
    general: 0,
  };
  const usedPrimary = new Set<string>();
  return petRows.map((row, articleIndex) => {
    const topicKey = inferPetTopicKey(row);
    const useIndex = topicUseCount[topicKey];
    topicUseCount[topicKey] = useIndex + 1;
    const images = petTopicImageSet(topicKey, useIndex, usedPrimary);
    const evidenceText = rowEvidenceText(row, abstractByPmid);
    return {
      id: stableArticleId(row),
      title: petArticleTitle(row),
      summary: petArticleSummary(row, evidenceText),
      points: petArticleParagraphs(row, evidenceText),
      sources: [row],
      imageUrl: images.imageUrl,
      backupImageUrl: images.backupImageUrl,
      fallbackImageUrl: images.fallbackImageUrl || petTopicPlaceholderImage(topicKey, articleIndex),
    };
  });
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

function buildPetNewsParagraphs(
  topicLabel: string,
  topicCount: number,
  sourceRows: IngestedRow[],
  evidenceSummary: string
): string[] {
  const updatesLabel = topicCount === 1 ? "update" : "updates";
  const sourceMix = Array.from(
    new Set(sourceRows.map((row) => LABELS[row.data_type] ?? row.data_type.replace(/_/g, " ")))
  ).slice(0, 3);
  const sourceMixText = sourceMix.length > 0 ? sourceMix.join(", ") : "public sources";
  const leadTitle = shortHeadline(sourceRows[0]?.title || "", 90);
  const lead = leadTitle
    ? `In this issue: ${topicCount} ${updatesLabel} on ${topicLabel.toLowerCase()} from ${sourceMixText}. One source article is “${leadTitle}.”`
    : `In this issue: ${topicCount} ${updatesLabel} on ${topicLabel.toLowerCase()} from ${sourceMixText}.`;
  const researchAngle = evidenceSummary
    ? `From the linked studies: ${evidenceSummary}`
    : "From the linked studies: We could not read enough abstract detail in this feed, so please open the source links for full context.";
  const meaning = "Owner takeaway: Use this as a quick update and a conversation starter with your vet. If symptoms feel urgent, contact your veterinarian right away.";
  return ensurePetOwnerParagraphs([lead, researchAngle, meaning], topicLabel);
}

function buildPetNewsCards(rows: IngestedRow[] | null, abstractByPmid: Record<string, string>): PetNewsCard[] {
  const petRows = toPetResearchItems(rows, 24);
  if (petRows.length === 0) return [];
  const topics = topTopics(petRows, 5);
  const topicUseCount: Record<PetTopicKey, number> = {
    cat: 0,
    turtle: 0,
    wildlife: 0,
    horse: 0,
    dog: 0,
    bird: 0,
    cattle: 0,
    general: 0,
  };
  const usedPrimary = new Set<string>();
  return topics.slice(0, 4).map((topic, idx) => {
    const groupRows = petRows.filter((r) => (r.condition_or_topic || "Everyday pet care") === topic.topic);
    const sourceRows = uniqueRows(groupRows.length > 0 ? groupRows : petRows, 2);
    const topicSignals = [topic.topic, ...sourceRows.map((row) => `${row.title || ""} ${row.condition_or_topic || ""}`)].join(" ");
    const topicKey = inferPetTopicKeyFromText(topicSignals);
    const useIndex = topicUseCount[topicKey];
    topicUseCount[topicKey] = useIndex + 1;
    const images = petTopicImageSet(topicKey, useIndex + idx, usedPrimary);
    const label = friendlyPetTopic(topic.topic);
    const evidenceSummary = sourceEvidenceSnippet(sourceRows, abstractByPmid);
    const paragraphs = buildPetNewsParagraphs(label, topic.count, sourceRows, evidenceSummary);
    return {
      id: `pet-news-${idx}-${topic.topic}`,
      title: `${label}: what new pet research is saying`,
      summary: `${topic.count} source-backed ${topic.count === 1 ? "update" : "updates"} in this issue.`,
      tip: "If symptoms get worse, your pet is not eating/drinking, or behavior changes quickly, contact your veterinarian.",
      paragraphs,
      sources: sourceRows,
      imageUrl: images.imageUrl,
      backupImageUrl: images.backupImageUrl,
      fallbackImageUrl: images.fallbackImageUrl,
    };
  });
}

export default function App() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [memory, setMemory] = useState<IngestedRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [petRecallRows, setPetRecallRows] = useState<IngestedRow[] | null>(null);
  const [petRecallLoading, setPetRecallLoading] = useState(false);
  const [pubmedAbstracts, setPubmedAbstracts] = useState<Record<string, string>>(() => readPubMedAbstractCache());
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [waitlistError, setWaitlistError] = useState("");
  const [waitlistAlreadyOnList, setWaitlistAlreadyOnList] = useState(false);
  const [ideaText, setIdeaText] = useState("");
  const [ideaEmail, setIdeaEmail] = useState("");
  const [ideaStatus, setIdeaStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [ideaError, setIdeaError] = useState("");
  const [showAllPetResearch, setShowAllPetResearch] = useState(false);
  const [allPetResearchLoading, setAllPetResearchLoading] = useState(false);
  const [allPetResearchError, setAllPetResearchError] = useState("");
  const [allPetResearchRows, setAllPetResearchRows] = useState<IngestedRow[] | null>(null);

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
          : "AnimalMind — Animal Health News";
    document.title = t;
  }, [view]);

  const navigate = (v: "" | "consumer" | "clinical") => {
    window.location.hash = v;
    setView(v);
  };

  const loadData = useCallback(() => {
    setRefreshing(true);
    setPetRecallLoading(true);
    Promise.all([fetchDashboard(), fetchPetRecalls()])
      .then(([dash, recalls]) => {
        setSummary(dash.summary);
        setMemory(dash.ingested);
        setPetRecallRows(recalls);
        setShowAllPetResearch(false);
        setAllPetResearchRows(null);
        setAllPetResearchError("");
      })
      .finally(() => {
        setPetRecallLoading(false);
        setRefreshing(false);
      });
  }, []);

  const toggleAllPetResearch = useCallback(async () => {
    if (showAllPetResearch) {
      setShowAllPetResearch(false);
      return;
    }
    setShowAllPetResearch(true);
    if (allPetResearchRows !== null || allPetResearchLoading) return;
    setAllPetResearchLoading(true);
    setAllPetResearchError("");
    const rows = await fetchAllPetResearch();
    if (rows === null) {
      setAllPetResearchRows([]);
      setAllPetResearchError("Full pet research list is not available yet.");
    } else {
      setAllPetResearchRows(rows);
    }
    setAllPetResearchLoading(false);
  }, [showAllPetResearch, allPetResearchRows, allPetResearchLoading]);

  const handleSubmitIdea = useCallback(async (source: IdeaSource) => {
    const trimmed = ideaText.trim();
    if (!trimmed) {
      setIdeaError("Please describe your idea.");
      setIdeaStatus("error");
      return;
    }
    setIdeaStatus("loading");
    setIdeaError("");
    const result = await submitIdea(trimmed, source, ideaEmail.trim() || undefined);
    if (result.ok) {
      setIdeaStatus("success");
      setIdeaText("");
      setIdeaEmail("");
    } else {
      setIdeaStatus("error");
      setIdeaError(result.error || "Something went wrong.");
    }
  }, [ideaText, ideaEmail]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPetRecallLoading(true);
    Promise.all([fetchDashboard(), fetchPetRecalls()])
      .then(([dash, recalls]) => {
        if (!cancelled) {
          setSummary(dash.summary);
          setMemory(dash.ingested);
          setPetRecallRows(recalls);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setPetRecallLoading(false);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load ingested list if dashboard didn't include it (e.g. API returned summary only)
  useEffect(() => {
    if (memory !== null) return;
    setMemoryLoading(true);
    fetchJsonWithTimeout<any>(`${base}/data/ingested.json`, { cache: "no-store" }, 7000)
      .then((data) => setMemory(Array.isArray(data) ? data : null))
      .finally(() => setMemoryLoading(false));
  }, [memory]);

  const lastUpdated = summary?.lastUpdated
    ? new Date(summary.lastUpdated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const ingestFreshnessLabel = summary?.lastUpdated
    ? `Updated ${relativeTime(summary.lastUpdated)}`
    : "Waiting for first ingest";
  const countMap = summary?.counts ?? {};
  const proSignalCount =
    (countMap.surveillance ?? 0) +
    (countMap.literature ?? 0) +
    (countMap.cancer ?? 0) +
    (countMap.case_data ?? 0) +
    (countMap.clinical ?? 0) +
    (countMap.imaging ?? 0) +
    (countMap.vet_practice ?? 0);

  const editionDate = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const petBriefItems = useMemo(() => toPetBriefItems(memory), [memory]);
  const petArticleSourceRows = useMemo(() => toPetResearchItems(memory, 30), [memory]);
  const petRowsNeedingFetch = useMemo(
    () => petArticleSourceRows.filter((row) => cleanEvidenceText(row.abstract).length === 0),
    [petArticleSourceRows]
  );
  const petPubMedIds = useMemo(() => collectPubMedIds(petRowsNeedingFetch), [petRowsNeedingFetch]);
  const petPubMedIdsKey = petPubMedIds.join(",");
  const missingPetPubMedIds = useMemo(
    () => petPubMedIds.filter((id) => !pubmedAbstracts[id]),
    [petPubMedIdsKey, pubmedAbstracts]
  );
  const missingPetPubMedIdsKey = missingPetPubMedIds.join(",");
  useEffect(() => {
    if (missingPetPubMedIds.length === 0) return;
    let cancelled = false;
    fetchPubMedAbstracts(missingPetPubMedIds)
      .then((fetched) => {
        if (cancelled || Object.keys(fetched).length === 0) return;
        setPubmedAbstracts((prev) => {
          const next = { ...prev, ...fetched };
          writePubMedAbstractCache(next);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [missingPetPubMedIdsKey]);
  const petBriefCount = summary?.counts?.pet_owner ?? petBriefItems.length;
  const recallRows = useMemo(() => {
    const fromDedicated = Array.isArray(petRecallRows) ? petRecallRows : [];
    if (fromDedicated.length > 0) return uniqueRows(sortPetRowsNewestFirst(fromDedicated), 72);
    return uniqueRows(sortPetRowsNewestFirst((memory || []).filter((row) => row.data_type === "recall")), 48);
  }, [memory, petRecallRows]);
  // Pet Safety Dashboard should only show official recall/alert items (no keyword-based fallbacks).
  const activeRecallCount = (Array.isArray(petRecallRows) ? petRecallRows.length : null) ?? summary?.counts?.recall ?? recallRows.length;
  const dogRecallCount = useMemo(
    () => recallRows.reduce((total, row) => total + Number(DOG_SIGNAL_KEYWORDS.test(rowSignalText(row))), 0),
    [recallRows]
  );
  const catRecallCount = useMemo(
    () => recallRows.reduce((total, row) => total + Number(CAT_SIGNAL_KEYWORDS.test(rowSignalText(row))), 0),
    [recallRows]
  );
  const latestPetSafetyReports = recallRows.slice(0, 6);
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
  const petArticlesFromResearch = useMemo(
    () => buildPetArticlesFromResearch(memory, pubmedAbstracts),
    [memory, pubmedAbstracts]
  );
  const allPetResearchList = useMemo(
    () => toPetResearchItems(allPetResearchRows, Number.MAX_SAFE_INTEGER),
    [allPetResearchRows]
  );
  const allPetResearchCount = allPetResearchList.length;
  const petNewsCards = useMemo(() => buildPetNewsCards(memory, pubmedAbstracts), [memory, pubmedAbstracts]);
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
                <AnimalMindLogo className="size-12 text-foreground shrink-0" />
                <span className="text-xl font-semibold tracking-tight">AnimalMind</span>
              </button>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                {BRAND_TAGLINE}
              </p>
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
            <div aria-hidden className="landing-orb landing-orb-a" />
            <div aria-hidden className="landing-orb landing-orb-b" />
            {/* Hero: editorial image + headline */}
            <section className="mb-10 sm:mb-14 landing-rise-in">
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
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1">
                  {ingestFreshnessLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1">
                  Pro signals {proSignalCount}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1">
                  Pet items {petBriefCount}
                </span>
              </div>
              {lastUpdated && (
                <p className="mt-2 text-xs text-muted-foreground">Last ingest: {lastUpdated}</p>
              )}
            </section>

            {/* Two editions: distinct cards with pictures */}
            <p className="section-label mb-4">Our editions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <button
                type="button"
                onClick={() => navigate("clinical")}
                className="group landing-card-rise landing-card-rise-delay-1 text-left rounded-none border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-foreground/20 transition-all min-h-[44px]"
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
                    6-hour intelligence briefs with research, outbreak, drug, and regulatory updates.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {ingestFreshnessLabel} · {proSignalCount} tracked signals
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
                className="group landing-card-rise landing-card-rise-delay-2 text-left rounded-none border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-foreground/20 transition-all min-h-[44px]"
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    {ingestFreshnessLabel} · {petBriefCount} pet-focused items
                  </p>
                  <p className="mt-4 text-sm font-semibold text-foreground flex items-center gap-2">
                    Enter Pet
                    <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                  </p>
                </div>
              </button>
            </div>

            <p className="mt-10 pt-8 border-t border-border text-center text-xs text-muted-foreground max-w-xl mx-auto">
              Animal Health News run by autonomous AI agents. Research and trends validated by humans. Not medical advice.
            </p>
            <p className="mt-4 text-center">
              <a href="#submit-idea" className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline">
                Have feedback? Submit an idea →
              </a>
            </p>

            <section id="submit-idea" aria-labelledby="submit-idea-heading" className="mt-10 pt-8 border-t border-border text-center max-w-xl mx-auto">
              <h2 id="submit-idea-heading" className="text-sm font-semibold text-foreground mb-1">Suggest an improvement</h2>
              <p className="text-sm text-muted-foreground mb-4">
                If you have recommendations to make the platform better, let us know.
              </p>
              {ideaStatus === "success" ? (
                <p className="text-sm text-foreground font-medium">Thanks! We got your idea.</p>
              ) : (
                <form
                  className="flex flex-col gap-3 text-left max-w-md mx-auto"
                  onSubmit={(e) => { e.preventDefault(); handleSubmitIdea("landing"); }}
                >
                  <textarea
                    placeholder="Your idea or recommendation…"
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    disabled={ideaStatus === "loading"}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-y min-h-[80px]"
                    aria-label="Your idea"
                  />
                  <input
                    type="email"
                    placeholder="Your email (optional)"
                    value={ideaEmail}
                    onChange={(e) => setIdeaEmail(e.target.value)}
                    disabled={ideaStatus === "loading"}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    aria-label="Email (optional)"
                  />
                  <Button type="submit" disabled={ideaStatus === "loading"} className="rounded-md shrink-0 w-full sm:w-auto sm:self-center">
                    {ideaStatus === "loading" ? "Sending…" : "Submit an idea"}
                  </Button>
                  {ideaStatus === "error" && ideaError && (
                    <p className="text-sm text-destructive">{ideaError}</p>
                  )}
                </form>
              )}
            </section>
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
                <AnimalMindLogo className="size-10 text-foreground shrink-0" />
                <span className="text-base font-semibold">AnimalMind</span>
              </button>
              <div className="flex items-center gap-4">
                <a href="#pet-safety-dashboard" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Safety dashboard</a>
                <a href="#pet-brief" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Today's brief</a>
                <a href="#submit-idea" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Submit an idea</a>
                <a href="#pet-cta" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Notify me</a>
                <span className="text-sm text-muted-foreground font-medium">AnimalMind Pet</span>
              </div>
            </nav>
          </header>

          <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:py-8 sm:px-6 relative z-1 overflow-x-hidden">
            <section id="pet-safety-dashboard" className="mb-8 rounded-lg border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
                <p className="section-label mb-2">AnimalMind Pet Safety Dashboard</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
                  AnimalMind Pet Safety Dashboard
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Live monitoring of pet-only animal-health recalls from official regulators.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6">
                <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Recalls</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{activeRecallCount}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Dog-Related</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{dogRecallCount}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cat-Related</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{catRecallCount}</p>
                </div>
              </div>
              <div className="border-t border-border px-4 pb-5 pt-3 sm:px-6">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Recent safety reports</p>
                  {lastUpdated && <span className="text-xs text-muted-foreground">As of {lastUpdated}</span>}
                </div>
                {loading || memoryLoading || (petRecallLoading && recallRows.length === 0) ? (
                  <p className="text-sm text-muted-foreground">Loading safety reports…</p>
                ) : latestPetSafetyReports.length > 0 ? (
                  <ul className="space-y-2">
                    {latestPetSafetyReports.map((row, idx) => {
                      const href = safeHref(row.url);
                      const dateLabel = formatIngestedDate(row.published_at ?? row.fetched_at);
                      const title = stripHtmlForDisplay(row.title || row.condition_or_topic || "Pet recall alert");
                      const subtitle =
                        stripHtmlForDisplay(row.condition_or_topic) || "Pet recall alert";
                      return (
                        <li key={`pet-safety-report-${idx}`} className="rounded-md border border-border bg-background px-3 py-2">
                          {href !== "#" ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground hover:text-foreground/90"
                            >
                              <span className="truncate">{title}</span>
                              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                            </a>
                          ) : (
                            <span className="inline-flex w-full items-center text-sm text-muted-foreground">
                              {title}
                            </span>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {subtitle}
                            {dateLabel ? ` · ${dateLabel}` : ""}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No official pet recall alerts are in the current ingest snapshot yet.
                  </p>
                )}
              </div>
            </section>
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
                    <p className="text-sm text-foreground font-medium">{waitlistAlreadyOnList ? "We have you on the list!" : "You’re on the list. We’ll notify you when Pet launches."}</p>
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
                          setWaitlistAlreadyOnList(!!result.alreadyOnList);
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
                        <Card className="border border-border border-l-4 border-l-rose-200 bg-muted/10 overflow-hidden shadow-sm">
                          <div className="border-b border-border bg-gradient-to-r from-rose-50/60 via-amber-50/40 to-sky-50/40 px-4 py-2.5">
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                              <Heart className="size-3.5 text-rose-500" aria-hidden />
                              Pet-friendly brief
                            </p>
                          </div>
                          <CardHeader className="p-4 pb-2">
                            <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">Featured story</Badge>
                            <CardTitle className="text-base font-semibold">{featuredPetNews.title}</CardTitle>
                            <CardDescription className="text-sm">{featuredPetNews.summary}</CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 space-y-3">
                            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                              {featuredPetNews.paragraphs.map((paragraph, idx) => (
                                <p key={`featured-pet-paragraph-${idx}`}>{paragraph}</p>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">{featuredPetNews.tip}</p>
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
                          {morePetNews.map((card) => (
                            <Card key={card.id} className="border border-border border-l-4 border-l-amber-200 bg-muted/10 overflow-hidden">
                              <div className="border-b border-border bg-gradient-to-r from-amber-50/50 via-rose-50/35 to-background px-3 py-2">
                                <p className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                  <Heart className="size-3 text-rose-500" aria-hidden />
                                  Pet-friendly update
                                </p>
                              </div>
                              <CardHeader className="p-3 pb-2">
                                <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">Quick read</Badge>
                                <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                                <CardDescription className="text-xs">{card.summary}</CardDescription>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 space-y-2">
                                <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                                  {card.paragraphs.map((paragraph, paragraphIdx) => (
                                    <p key={`pet-news-paragraph-${card.id}-${paragraphIdx}`}>{paragraph}</p>
                                  ))}
                                </div>
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
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-1">Articles from today's research</h3>
                          <p className="text-xs text-muted-foreground">
                            One article per source—each card is tied to a single research item, written in a clearer pet-owner voice. Tap View source to read the full report.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-md min-h-[40px] shrink-0"
                          disabled={allPetResearchLoading}
                          onClick={toggleAllPetResearch}
                        >
                          {allPetResearchLoading
                            ? "Loading full list…"
                            : showAllPetResearch
                              ? "Hide full research list"
                              : allPetResearchRows
                                ? `View all pet research (${allPetResearchCount})`
                                : "View all pet research"}
                        </Button>
                      </div>
                      {showAllPetResearch && (
                        <div className="mb-4 rounded-md border border-border bg-muted/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">All pet-relevant research</p>
                          {allPetResearchLoading ? (
                            <p className="text-sm text-muted-foreground">Loading the complete pet research list…</p>
                          ) : allPetResearchError ? (
                            <p className="text-sm text-muted-foreground">{allPetResearchError}</p>
                          ) : allPetResearchCount > 0 ? (
                            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                              {allPetResearchList.map((row, idx) => {
                                const href = safeHref(row.url);
                                const dateLabel = formatIngestedDate(row.published_at ?? row.fetched_at);
                                const title = petArticleTitle(row);
                                return (
                                  <li key={`pet-research-all-${idx}`} className="rounded-md border border-border bg-background px-3 py-2">
                                    {href !== "#" ? (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex w-full items-center justify-between gap-2 text-xs font-medium text-foreground hover:text-foreground/90"
                                      >
                                        <span className="truncate">{title}</span>
                                        <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                                      </a>
                                    ) : (
                                      <span className="inline-flex w-full items-center text-xs text-muted-foreground">{title}</span>
                                    )}
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                      {LABELS[row.data_type] ?? row.data_type.replace(/_/g, " ")}
                                      {dateLabel ? ` · ${dateLabel}` : ""}
                                    </p>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">No pet-relevant research items are available yet.</p>
                          )}
                        </div>
                      )}
                      {petArticlesFromResearch.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {petArticlesFromResearch.map((article) => (
                          <Card key={`pet-article-${article.id}`} className="border border-border border-l-4 border-l-sky-200 bg-muted/10 overflow-hidden">
                            <div className="border-b border-border bg-gradient-to-r from-sky-50/55 via-rose-50/35 to-background px-3 py-2">
                              <p className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                <Heart className="size-3 text-rose-500" aria-hidden />
                                Pet-friendly research take
                              </p>
                            </div>
                            <CardHeader className="p-3 pb-2">
                              <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">Article</Badge>
                              <CardTitle className="text-sm font-semibold leading-snug">{article.title}</CardTitle>
                              <CardDescription className="text-xs">{article.summary}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-2">
                              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                                {article.points.map((point, idx) => (
                                  <p key={`pet-point-${article.id}-${idx}`}>{point}</p>
                                ))}
                              </div>
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

            {/* Updates */}
            <section id="pet-updates" aria-labelledby="pet-updates-heading" className="py-12 border-t border-border">
              <h2 id="pet-updates-heading" className="section-label mb-2">Updates</h2>
              <p className="text-lg font-semibold text-foreground mb-1">Get notified</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                We’ll email you when AnimalMind Pet launches and when we add new guidance. No spam.
              </p>
              {waitlistStatus === "success" ? (
                <p className="text-sm text-foreground font-medium">{waitlistAlreadyOnList ? "We have you on the list!" : "You’re on the list. We’ll notify you when we have updates."}</p>
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
                      setWaitlistAlreadyOnList(!!result.alreadyOnList);
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

            <section id="submit-idea" aria-labelledby="submit-idea-heading-pet" className="py-8 border-t border-border text-center">
              <h2 id="submit-idea-heading-pet" className="text-sm font-semibold text-foreground mb-1">Suggest an improvement</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                If you have recommendations to make the platform better, let us know.
              </p>
              {ideaStatus === "success" ? (
                <p className="text-sm text-foreground font-medium">Thanks! We got your idea.</p>
              ) : (
                <form
                  className="flex flex-col gap-3 text-left max-w-md mx-auto"
                  onSubmit={(e) => { e.preventDefault(); handleSubmitIdea("pet"); }}
                >
                  <textarea
                    placeholder="Your idea or recommendation…"
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    disabled={ideaStatus === "loading"}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-y min-h-[80px]"
                    aria-label="Your idea"
                  />
                  <input
                    type="email"
                    placeholder="Your email (optional)"
                    value={ideaEmail}
                    onChange={(e) => setIdeaEmail(e.target.value)}
                    disabled={ideaStatus === "loading"}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    aria-label="Email (optional)"
                  />
                  <Button type="submit" disabled={ideaStatus === "loading"} className="rounded-md shrink-0 w-full sm:w-auto sm:self-center">
                    {ideaStatus === "loading" ? "Sending…" : "Submit an idea"}
                  </Button>
                  {ideaStatus === "error" && ideaError && (
                    <p className="text-sm text-destructive">{ideaError}</p>
                  )}
                </form>
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
            <p className="mt-1">Run by autonomous AI agents. Validated by humans.</p>
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
                <AnimalMindLogo className="size-10 sm:size-12 text-foreground shrink-0" />
                <span className="text-base sm:text-xl font-semibold tracking-tight">AnimalMind Pro</span>
              </button>
              <div className="flex flex-wrap items-center gap-0.5 sm:gap-2 text-sm">
                <a href="#data" className="px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] flex items-center">Digest</a>
                <a href="#pro-cta" className="px-2.5 py-2 rounded-md text-foreground font-medium hover:bg-muted/50 min-h-[44px] flex items-center">Brief</a>
                <a href="#brief-articles" className="hidden sm:flex px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] items-center">Articles</a>
                <a href="#mission" className="px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] flex items-center">Mission</a>
                <a href="#topics" className="hidden sm:flex px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] items-center">Topics</a>
                <a href="#track" className="hidden sm:flex px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] items-center">Sources</a>
                <a href="#submit-idea" className="px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] flex items-center hidden sm:flex">Submit an idea</a>
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
                  <p className="text-sm text-foreground font-medium py-2">{waitlistAlreadyOnList ? "We have you on the list!" : "You’re on the list. We’ll notify you when the daily brief launches."}</p>
                ) : (
                  <a
                    href="#waitlist"
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 hover:border-foreground/30 min-h-[44px]"
                  >
                    Join the updates list
                  </a>
                )}
              </div>
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
                AnimalMind Pro helps teams move from scattered monitoring to a consistent, source-linked operating rhythm.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                {PRO_MISSION_POINTS.map((point) => (
                  <li key={`mission-${point}`}>{point}</li>
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
                      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                        {article.points.map((point, idx) => (
                          <p key={`pro-point-${article.id}-${idx}`}>{point}</p>
                        ))}
                      </div>
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
          <p className="text-lg font-semibold text-foreground mb-1">Get notified</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            We'll email you when AnimalMind Pet launches and when we add new guidance. No spam.
          </p>
          {waitlistStatus === "success" ? (
            <p className="text-sm text-foreground font-medium">{waitlistAlreadyOnList ? "We have you on the list!" : "You're on the list! We'll notify you when we have updates."}</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                type="email"
                placeholder="Your email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const email = waitlistEmail.trim();
                    if (email) {
                      setWaitlistStatus("loading");
                      setWaitlistError("");
                      submitWaitlist(email).then((result) => {
                        if (result.ok) {
                          setWaitlistAlreadyOnList(!!result.alreadyOnList);
                          setWaitlistStatus("success");
                          setWaitlistEmail("");
                        } else {
                          setWaitlistStatus("error");
                          setWaitlistError(result.error || "Something went wrong.");
                        }
                      });
                    }
                  }
                }}
                disabled={waitlistStatus === "loading"}
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                aria-label="Email for updates"
              />
              <Button
                type="button"
                disabled={waitlistStatus === "loading"}
                className="rounded-md shrink-0"
                onClick={async () => {
                  const email = waitlistEmail.trim();
                  if (!email) return;
                  setWaitlistStatus("loading");
                  setWaitlistError("");
                  const result = await submitWaitlist(email);
                  if (result.ok) {
                    setWaitlistAlreadyOnList(!!result.alreadyOnList);
                    setWaitlistStatus("success");
                    setWaitlistEmail("");
                  } else {
                    setWaitlistStatus("error");
                    setWaitlistError(result.error || "Something went wrong.");
                  }
                }}
              >
                {waitlistStatus === "loading" ? "…" : "Notify me"}
              </Button>
            </div>
          )}
          {waitlistStatus === "error" && waitlistError && (
            <p className="mt-2 text-sm text-destructive">{waitlistError}</p>
          )}

          <section id="submit-idea" aria-labelledby="submit-idea-heading-pro" className="pt-10 mt-10 border-t border-border text-center">
            <h2 id="submit-idea-heading-pro" className="section-label mb-1">Suggest an improvement</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              If you have recommendations to make the platform better, let us know.
            </p>
            {ideaStatus === "success" ? (
              <p className="text-sm text-foreground font-medium">Thanks! We got your idea.</p>
            ) : (
              <form
                className="flex flex-col gap-3 text-left max-w-md mx-auto"
                onSubmit={(e) => { e.preventDefault(); handleSubmitIdea("pro"); }}
              >
                <textarea
                  placeholder="Your idea or recommendation…"
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  disabled={ideaStatus === "loading"}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-y min-h-[80px]"
                  aria-label="Your idea"
                />
                <input
                  type="email"
                  placeholder="Your email (optional)"
                  value={ideaEmail}
                  onChange={(e) => setIdeaEmail(e.target.value)}
                  disabled={ideaStatus === "loading"}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  aria-label="Email (optional)"
                />
                <Button type="submit" disabled={ideaStatus === "loading"} className="rounded-md shrink-0 w-full sm:w-auto sm:self-center">
                  {ideaStatus === "loading" ? "Sending…" : "Submit an idea"}
                </Button>
                {ideaStatus === "error" && ideaError && (
                  <p className="text-sm text-destructive">{ideaError}</p>
                )}
              </form>
            )}
          </section>

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
