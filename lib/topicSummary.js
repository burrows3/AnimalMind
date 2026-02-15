const { getIngestedGrouped, getIngestedMeta } = require('./db');
const { TOPIC_NAMES } = require('./agentTopics');

function getTopicSummary() {
  const grouped = getIngestedGrouped();
  const meta = getIngestedMeta();
  const literatureByTopic = grouped.literature || {};

  const topics = TOPIC_NAMES.map((topic) => ({
    topic,
    count: (literatureByTopic[topic] || []).length,
  }));

  const totalItems = topics.reduce((sum, item) => sum + item.count, 0);
  const topicsWithItems = topics.filter((item) => item.count > 0).length;

  return {
    updatedAt: meta.lastFetched || null,
    topics,
    totals: {
      topicCount: topics.length,
      topicsWithItems,
      totalItems,
    },
  };
}

module.exports = {
  getTopicSummary,
};
