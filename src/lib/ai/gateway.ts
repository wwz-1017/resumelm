import { isResumeDocument } from "@/lib/resume-schema/validate";
import { mockProvider } from "./providers/mock-provider";
import { promptTemplates } from "./prompts";
import type { AiGatewayResponse, AiProvider, AiRequestPayload, AiTask } from "./types";

const providers: AiProvider[] = [mockProvider];

const isAiTask = (value: unknown): value is AiTask =>
  typeof value === "string" && Object.hasOwn(promptTemplates, value);

export const parseAiRequest = (value: unknown): AiRequestPayload | null => {
  if (typeof value !== "object" || value === null) return null;

  const maybePayload = value as Record<string, unknown>;
  if (!isAiTask(maybePayload.task) || !isResumeDocument(maybePayload.resume)) {
    return null;
  }

  return {
    task: maybePayload.task,
    resume: maybePayload.resume
  };
};

export const runAiTask = async (payload: AiRequestPayload): Promise<AiGatewayResponse> => {
  let lastError: unknown;

  for (const provider of providers) {
    try {
      return await provider.run(payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI provider failed");
};
