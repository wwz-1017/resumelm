const FEEDBACK_KEY = "resumelm.product-feedback.v1";

export type FeedbackVote = "up" | "down";
export type FeedbackTarget = "ai" | "score" | "export" | "overall";

export type ProductFeedback = {
  id: string;
  sessionId: string;
  target: FeedbackTarget;
  vote: FeedbackVote;
  reason: string;
  note: string;
  createdAt: string;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `feedback-${Date.now()}`;
};

export const readFeedback = (): ProductFeedback[] => {
  const existing = window.localStorage.getItem(FEEDBACK_KEY);
  return existing ? (JSON.parse(existing) as ProductFeedback[]) : [];
};

export const saveFeedback = (feedback: Omit<ProductFeedback, "id" | "createdAt">) => {
  const nextFeedback: ProductFeedback = {
    ...feedback,
    id: createId(),
    createdAt: new Date().toISOString()
  };
  const items = [...readFeedback(), nextFeedback].slice(-200);
  window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items));
  return nextFeedback;
};
