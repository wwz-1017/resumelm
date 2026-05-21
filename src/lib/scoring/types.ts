import type { ResumeDocument } from "@/lib/resume-schema/types";

export type ScoreDimension =
  | "ats_compatibility"
  | "content_completeness"
  | "keyword_match"
  | "quantified_impact"
  | "summary_strength"
  | "readability";

export type ScoreIssuePriority = "P1" | "P2" | "P3";

export type ScoreIssue = {
  priority: ScoreIssuePriority;
  title: string;
  detail: string;
};

export type ScoreSuggestion = {
  priority: ScoreIssuePriority;
  text: string;
};

export type ScoreReport = {
  overallScore: number;
  dimensionScores: Record<ScoreDimension, number>;
  issues: ScoreIssue[];
  suggestions: ScoreSuggestion[];
  matchedKeywords: string[];
  missingKeywords: string[];
  generatedAt: string;
};

export type ScoreRequestPayload = {
  resume: ResumeDocument;
};
