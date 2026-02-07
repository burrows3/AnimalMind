const AUTONOMOUS_AGENT_TOPICS = [
  // Clinical-Adjacent
  { topic: 'Early Detection of Disease Across Species', query: '("early detection" OR screening OR biomarker OR preclinical)' },
  { topic: 'Decoding Animal Pain and Distress', query: '("pain assessment" OR "pain behavior" OR "pain score" OR distress OR nociception)' },
  { topic: 'Preclinical Disease States', query: '("preclinical" OR subclinical OR "early disease")' },
  { topic: 'Unexplained Recovery and Resilience', query: '("disease resilience" OR recovery OR "protective factor" OR "spontaneous remission")' },
  { topic: 'Microbiome–Behavior–Health Coupling', query: '("microbiome" OR "gut microbiota") AND (behavior OR behaviour OR "stress response")' },
  { topic: 'Biological Timing and Treatment Response', query: '("chronobiology" OR circadian OR "time of day") AND (treatment OR anesthesia OR vaccination)' },
  { topic: 'Non-Linear Dose and Response Effects', query: '("dose response" OR hormesis OR nonlinear OR "non linear")' },
  { topic: 'Emergent Effects of Complex Care Pathways', query: '("care pathway" OR "multimodal" OR "combination therapy" OR "treatment sequence")' },
  { topic: 'Silent or Masked Disease and Distress', query: '("subclinical" OR masked OR "silent disease" OR occult OR stoic)' },
  { topic: 'Unintended Consequences of Standard Care', query: '("adverse effect" OR iatrogenic OR "unintended consequence" OR "long term outcome")' },
  // Research & Discovery
  { topic: 'Unknown Biological Signals', query: '("novel biomarker" OR "unknown biomarker" OR uncharacterized OR omics)' },
  { topic: 'Latent Protective Mechanisms', query: '("protective mechanism" OR "disease resistance" OR tolerance OR "host resilience")' },
  { topic: 'Pain Modulation Beyond Analgesics', query: '("pain modulation" OR "non pharmacologic" OR "non drug" OR "behavioral therapy")' },
  { topic: 'Hidden Costs of Normal Physiology', query: '("chronic stress" OR "low grade inflammation" OR "allostatic load")' },
  { topic: 'Environmental Exposure and Sentinel Signals', query: '("sentinel" OR "environmental exposure" OR bioindicator OR toxicity)' },
  { topic: 'Species-Specific Health Advantages', query: '("comparative physiology" OR "species specific" OR adaptation)' },
  { topic: 'Comparative Physiology at Extremes', query: '("extreme physiology" OR "hypoxia tolerance" OR "thermal tolerance")' },
  { topic: 'Genetic Intervention and Biological Integrity', query: '("gene editing" OR CRISPR OR "genetic intervention" OR germline)' },
  { topic: 'Developmental Programming and Lifelong Health', query: '("developmental programming" OR "early life" OR "in utero" OR maternal)' },
  { topic: 'Unexpected Correlations and Anomalies', query: '("unexpected correlation" OR anomaly OR outlier OR paradoxical)' },
];

const TOPIC_NAMES = AUTONOMOUS_AGENT_TOPICS.map((item) => item.topic);

module.exports = {
  AUTONOMOUS_AGENT_TOPICS,
  TOPIC_NAMES,
};
