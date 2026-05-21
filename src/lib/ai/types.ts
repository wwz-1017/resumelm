import type { ResumeDocument } from "@/lib/resume-schema/types";

export type AiTask =
  | "generate_resume"
  | "rewrite_summary"
  | "rewrite_project"
  | "recommend_keywords";

export type AiRequestPayload = {
  task: AiTask;
  resume: ResumeDocument;
};

export type AiGatewayResponse =
  | {
      task: "generate_resume";
      resume: ResumeDocument;
      provider: string;
    }
  | {
      task: "rewrite_summary";
      text: string;
      provider: string;
    }
  | {
      task: "rewrite_project";
      text: string;
      provider: string;
    }
  | {
      task: "recommend_keywords";
      keywords: string[];
      provider: string;
    };

export type AiProvider = {
  name: string;
  run: (payload: AiRequestPayload) => Promise<AiGatewayResponse>;
};
