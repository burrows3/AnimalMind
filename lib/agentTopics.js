const AUTONOMOUS_AGENT_TOPICS = [
  // Clinical-Adjacent
  { topic: 'Early Detection of Disease Across Species', query: 'early detection disease animal veterinary' },
  { topic: 'Decoding Animal Pain and Distress', query: 'animal pain distress behavior biomarkers' },
  { topic: 'Preclinical Disease States', query: 'preclinical disease animal veterinary' },
  { topic: 'Unexplained Recovery and Resilience', query: 'animal recovery resilience veterinary' },
  { topic: 'Microbiome–Behavior–Health Coupling', query: 'microbiome animal behavior health' },
  { topic: 'Biological Timing and Treatment Response', query: 'chronobiology veterinary anesthesia vaccination' },
  { topic: 'Non-Linear Dose and Response Effects', query: 'dose response veterinary non-linear' },
  { topic: 'Emergent Effects of Complex Care Pathways', query: 'veterinary care pathway outcomes' },
  { topic: 'Silent or Masked Disease and Distress', query: 'masked pain disease animal stoic' },
  { topic: 'Unintended Consequences of Standard Care', query: 'veterinary practice long-term effects' },
  // Research & Discovery
  { topic: 'Unknown Biological Signals', query: 'biomarker animal health uncharacterized' },
  { topic: 'Latent Protective Mechanisms', query: 'disease resistance animal natural' },
  { topic: 'Pain Modulation Beyond Analgesics', query: 'pain modulation animal non-drug' },
  { topic: 'Hidden Costs of Normal Physiology', query: 'stress inflammation animal cumulative' },
  { topic: 'Environmental Exposure and Sentinel Signals', query: 'sentinel animal environmental exposure' },
  { topic: 'Species-Specific Health Advantages', query: 'comparative physiology animal adaptation' },
  { topic: 'Comparative Physiology at Extremes', query: 'extreme environment animal physiology' },
  { topic: 'Genetic Intervention and Biological Integrity', query: 'gene editing animal health' },
  { topic: 'Developmental Programming and Lifelong Health', query: 'early life exposure animal disease' },
  { topic: 'Unexpected Correlations and Anomalies', query: 'veterinary anomaly correlation biology' },
];

const TOPIC_NAMES = AUTONOMOUS_AGENT_TOPICS.map((item) => item.topic);

module.exports = {
  AUTONOMOUS_AGENT_TOPICS,
  TOPIC_NAMES,
};
