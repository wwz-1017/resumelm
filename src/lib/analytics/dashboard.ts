import { readAnalyticsEvents } from "./track";
import { readFeedback } from "@/lib/feedback/store";

export type DashboardMetrics = {
  sessions: number;
  events: number;
  aiRuns: number;
  scores: number;
  exports: number;
  upVotes: number;
  downVotes: number;
  positiveRate: number;
  topDownReasons: Array<{ reason: string; count: number }>;
};

const countByReason = (reasons: string[]) => {
  const counts = reasons.reduce<Record<string, number>>((result, reason) => {
    result[reason] = (result[reason] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);
};

export const getDashboardMetrics = (): DashboardMetrics => {
  const events = readAnalyticsEvents();
  const feedback = readFeedback();
  const voteCount = feedback.length;
  const upVotes = feedback.filter((item) => item.vote === "up").length;
  const downVotes = feedback.filter((item) => item.vote === "down").length;
  const sessions = new Set(events.map((event) => event.sessionId)).size;

  return {
    sessions,
    events: events.length,
    aiRuns: events.filter((event) => event.name === "ai_generated").length,
    scores: events.filter((event) => event.name === "score_completed").length,
    exports: events.filter((event) => event.name === "export_completed").length,
    upVotes,
    downVotes,
    positiveRate: voteCount ? Math.round((upVotes / voteCount) * 100) : 0,
    topDownReasons: countByReason(feedback.filter((item) => item.vote === "down").map((item) => item.reason))
  };
};
