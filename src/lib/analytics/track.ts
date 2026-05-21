const ANALYTICS_KEY = "resumelm.analytics-events.v1";

export type AnalyticsEventName =
  | "ai_generated"
  | "workspace_entered"
  | "resume_created"
  | "resume_imported"
  | "resume_exported"
  | "resume_saved"
  | "score_completed";

export type AnalyticsEvent = {
  id: string;
  name: AnalyticsEventName;
  sessionId: string;
  createdAt: string;
  properties?: Record<string, string | number | boolean>;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `event-${Date.now()}`;
};

export const trackEvent = (
  name: AnalyticsEventName,
  sessionId: string,
  properties?: AnalyticsEvent["properties"]
) => {
  if (!sessionId) return;

  const existing = window.localStorage.getItem(ANALYTICS_KEY);
  const events = existing ? (JSON.parse(existing) as AnalyticsEvent[]) : [];

  events.push({
    id: createId(),
    name,
    sessionId,
    createdAt: new Date().toISOString(),
    properties
  });

  window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-200)));
};
