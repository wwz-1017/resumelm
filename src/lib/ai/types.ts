import type { ResumeDocument, ResumeModuleId } from "@/lib/resume-schema/types";

export type AiTask =
  | "generate_resume"
  | "polish_resume"
  | "rewrite_summary"
  | "rewrite_project"
  | "recommend_keywords"
  | "diagnose_resume"
  | "polish_section"
  | "extract_resume_fields";

export type AiModuleDiagnosis = {
  moduleId: ResumeModuleId; title: string; severity: "high" | "medium" | "low";
  summary: string; jdAlignment: string; missingKeywords: string[]; suggestions: string[];
};

export type AiPolishVariant = {
  id: string; title: string; text: string; reason: string; keywords: string[];
};

export type AiExtractFieldsInput = {
  rawText: string; targetFields: string[]; currentGuess: Record<string, unknown>;
};

export type AiRequestPayload = {
  task: AiTask; resume: ResumeDocument;
  sectionId?: ResumeModuleId; itemIndex?: number;
  extractInput?: AiExtractFieldsInput;
  providerConfig?: { baseUrl?: string; apiKey?: string; model?: string };
};

export type AiGatewayResponse =
  | { task: "generate_resume"; resume: ResumeDocument; provider: string }
  | { task: "polish_resume"; resume: ResumeDocument; provider: string }
  | { task: "rewrite_summary"; text: string; provider: string }
  | { task: "rewrite_project"; text: string; provider: string }
  | { task: "recommend_keywords"; keywords: string[]; provider: string }
  | { task: "diagnose_resume"; overallSummary: string; modules: AiModuleDiagnosis[]; priorityModuleIds: ResumeModuleId[]; provider: string }
  | { task: "polish_section"; moduleId: ResumeModuleId; itemIndex?: number; variants: AiPolishVariant[]; provider: string }
  | { task: "extract_resume_fields"; fields: Record<string, unknown>; provider: string };

export type AiProvider = {
  name: string;
  run: (payload: AiRequestPayload) => Promise<AiGatewayResponse>;
};
