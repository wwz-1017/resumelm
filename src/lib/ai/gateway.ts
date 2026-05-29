import { isResumeDocument } from "@/lib/resume-schema/validate";
import { mockProvider } from "./providers/mock-provider";
import { openAiCompatibleProvider } from "./providers/openai-compatible-provider";
import { promptTemplates } from "./prompts";
import type { AiGatewayResponse, AiProvider, AiRequestPayload, AiTask } from "./types";

const providers: AiProvider[] = [openAiCompatibleProvider, mockProvider];
const moduleIds = ["personalSummary","strengths","education","internships","projects","campusExperience","skills","awards"] as const;

const isAiTask = (value: unknown): value is AiTask =>
  typeof value === "string" && Object.hasOwn(promptTemplates, value);

const isModuleId = (value: unknown): value is (typeof moduleIds)[number] =>
  typeof value === "string" && moduleIds.includes(value as (typeof moduleIds)[number]);

const isItemIndex = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

export const parseAiRequest = (value: unknown): AiRequestPayload | null => {
  if (typeof value !== "object" || value === null) return null;
  const p = value as Record<string, unknown>;
  if (!isAiTask(p.task) || !isResumeDocument(p.resume)) return null;
  if (p.task === "polish_section" && !isModuleId(p.sectionId)) return null;

  const extractInput = p.task === "extract_resume_fields" && typeof p.extractInput === "object" && p.extractInput !== null
    ? p.extractInput as AiRequestPayload["extractInput"] : undefined;

  const providerConfig = typeof p.providerConfig === "object" && p.providerConfig !== null ? p.providerConfig as AiRequestPayload["providerConfig"] : undefined;

  return {
    task: p.task, resume: p.resume,
    sectionId: isModuleId(p.sectionId) ? p.sectionId : undefined,
    itemIndex: isItemIndex(p.itemIndex) ? p.itemIndex : undefined,
    extractInput, providerConfig
  };
};

export const runAiTask = async (payload: AiRequestPayload): Promise<AiGatewayResponse> => {
  let lastError: unknown;
  for (const provider of providers) {
    try { return await provider.run(payload); }
    catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("AI provider failed");
};
