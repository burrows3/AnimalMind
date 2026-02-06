function priorArtScout(signal) {
  return {
    signal_id: signal.signal_id,
    related_patents: [],
    overlap_assessment: 'low',
    white_space_notes: 'Patent search not yet enabled in MVP.',
    disclaimer: 'Not legal advice.',
  };
}

module.exports = {
  priorArtScout,
};
