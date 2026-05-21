import { isResumeDocument } from "@/lib/resume-schema/validate";
import { scoreResume } from "./engine";
import type { ScoreRequestPayload } from "./types";

export const parseScoreRequest = (value: unknown): ScoreRequestPayload | null => {
  if (typeof value !== "object" || value === null) return null;

  const maybePayload = value as Record<string, unknown>;
  if (!isResumeDocument(maybePayload.resume)) {
    return null;
  }

  return {
    resume: maybePayload.resume
  };
};

export const runScore = (payload: ScoreRequestPayload) => scoreResume(payload.resume);
