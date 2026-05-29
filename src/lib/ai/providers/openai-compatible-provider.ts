import type { ResumeDocument, ResumeModuleId } from "@/lib/resume-schema/types";
import { promptTemplates } from "../prompts";
import type { AiGatewayResponse, AiModuleDiagnosis, AiPolishVariant, AiProvider, AiRequestPayload } from "../types";

type ChatCompletionResponse = { choices?: Array<{ message?: { content?: string } }> };

const endpoint = process.env.AI_GATEWAY_BASE_URL ?? "https://api.openai.com/v1";
const apiKey = process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY;
const model = process.env.AI_GATEWAY_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const providerName = process.env.AI_GATEWAY_PROVIDER_NAME ?? "openai-compatible";
const moduleIds: ResumeModuleId[] = ["personalSummary","strengths","education","internships","projects","campusExperience","skills","awards"];
const moduleLabels: Record<ResumeModuleId, string> = {
  personalSummary:"个人评价",strengths:"个人优势",education:"教育经历",internships:"实习经历",
  projects:"项目经历",campusExperience:"校园经历",skills:"技能",awards:"奖项"
};

const pickResumeForPrompt = (resume: ResumeDocument) => ({
  profile: resume.profile, personalSummary: resume.personalSummary, strengths: resume.strengths,
  education: resume.education, internships: resume.internships, projects: resume.projects,
  campusExperience: resume.campusExperience, skills: resume.skills, awards: resume.awards, targetJob: resume.targetJob
});

const pickSectionTargetForPrompt = (payload: AiRequestPayload) => {
  if (typeof payload.itemIndex !== "number" || !payload.sectionId) return undefined;
  if (payload.sectionId === "education") return payload.resume.education[payload.itemIndex];
  if (payload.sectionId === "internships" || payload.sectionId === "projects" || payload.sectionId === "campusExperience")
    return payload.resume[payload.sectionId][payload.itemIndex];
  return undefined;
};

const extractJson = (content: string) => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const c = fenced ?? content;
  const s = c.indexOf("{"), e = c.lastIndexOf("}");
  if (s < 0 || e < s) throw new Error("No JSON in model response");
  return JSON.parse(c.slice(s, e + 1)) as unknown;
};

const ensureResume = (value: unknown, fallback: ResumeDocument): ResumeDocument => {
  const c = value as Partial<ResumeDocument>;
  return { ...fallback, ...c, schemaVersion: 1, id: fallback.id, updatedAt: new Date().toISOString(),
    profile: { ...fallback.profile, ...(c.profile ?? {}) },
    targetJob: { ...fallback.targetJob, ...(c.targetJob ?? {}) } };
};

const getOutputContract = (payload: AiRequestPayload) => {
  if (payload.task === "recommend_keywords") return "返回 {\"keywords\": string[]}";
  if (payload.task === "rewrite_summary" || payload.task === "rewrite_project") return "返回 {\"text\": string}";
  if (payload.task === "diagnose_resume") return "返回 {\"overallSummary\": string, \"modules\": Array<{\"moduleId\": ResumeModuleId, \"title\": string, \"severity\": \"high\"|\"medium\"|\"low\", \"summary\": string, \"jdAlignment\": string, \"missingKeywords\": string[], \"suggestions\": string[]}>, \"priorityModuleIds\": ResumeModuleId[]}";
  if (payload.task === "polish_section") return "返回 3 个候选版本 {\"moduleId\": ResumeModuleId, \"itemIndex\": number|undefined, \"variants\": Array<{\"id\": string, \"title\": string, \"text\": string, \"reason\": string, \"keywords\": string[]}>}";
  if (payload.task === "extract_resume_fields") return "返回 {\"fields\": {\"<fieldName>\": <提取结果>}}。提取结果格式参考 currentGuess";
  return "返回 {\"resume\": ResumeDocument}";
};

const normalizeDiagnosis = (parsed: Record<string, unknown>) => {
  const modules = Array.isArray(parsed.modules) ? parsed.modules.map((item): AiModuleDiagnosis | null => {
    const c = item as Partial<AiModuleDiagnosis>;
    if (!c.moduleId || !moduleIds.includes(c.moduleId)) return null;
    return { moduleId: c.moduleId, title: typeof c.title === "string" ? c.title : moduleLabels[c.moduleId],
      severity: c.severity === "high" || c.severity === "medium" || c.severity === "low" ? c.severity : "medium",
      summary: typeof c.summary === "string" ? c.summary : "", jdAlignment: typeof c.jdAlignment === "string" ? c.jdAlignment : "",
      missingKeywords: Array.isArray(c.missingKeywords) ? c.missingKeywords.filter((x): x is string => typeof x === "string") : [],
      suggestions: Array.isArray(c.suggestions) ? c.suggestions.filter((x): x is string => typeof x === "string") : [] };
  }).filter((x): x is AiModuleDiagnosis => Boolean(x)) : [];
  const priority = Array.isArray(parsed.priorityModuleIds) ? parsed.priorityModuleIds.filter((x): x is ResumeModuleId => moduleIds.includes(x as ResumeModuleId)) : modules.filter((m) => m.severity !== "low").map((m) => m.moduleId);
  return { overallSummary: typeof parsed.overallSummary === "string" ? parsed.overallSummary : "已完成模块级诊断。", modules, priorityModuleIds: priority };
};

const normalizePolishVariants = (parsed: Record<string, unknown>, fallbackModuleId: ResumeModuleId) => {
  const variants = Array.isArray(parsed.variants) ? parsed.variants.map((item, i): AiPolishVariant | null => {
    const c = item as Partial<AiPolishVariant>;
    if (typeof c.text !== "string" || !c.text.trim()) return null;
    return { id: typeof c.id === "string" ? c.id : `v-${i+1}`, title: typeof c.title === "string" ? c.title : `候选${i+1}`,
      text: c.text, reason: typeof c.reason === "string" ? c.reason : "", keywords: Array.isArray(c.keywords) ? c.keywords.filter((x): x is string => typeof x === "string") : [] };
  }).filter((x): x is AiPolishVariant => Boolean(x)) : [];
  return { moduleId: moduleIds.includes(parsed.moduleId as ResumeModuleId) ? parsed.moduleId as ResumeModuleId : fallbackModuleId,
    itemIndex: typeof parsed.itemIndex === "number" && parsed.itemIndex >= 0 ? parsed.itemIndex : undefined, variants: variants.slice(0, 3) };
};

const callModel = async (payload: AiRequestPayload) => {
  const ep = payload.providerConfig?.baseUrl || endpoint;
  const key = payload.providerConfig?.apiKey || apiKey;
  const mdl = payload.providerConfig?.model || model;
  if (!key) throw new Error("Missing AI API key");
  const res = await fetch(`${ep.replace(/\/$/, "")}/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: mdl, temperature: payload.task === "extract_resume_fields" ? 0.1 : 0.35,
      response_format: { type: "json_object" },
      messages: payload.task === "extract_resume_fields" && payload.extractInput ? [
        { role: "system", content: "你是简历解析助手。只返回严格 JSON，从原始简历文本提取 targetFields 中指定的字段。找不到就留空，不编造。" },
        { role: "user", content: ["提取 " + payload.extractInput.targetFields.join("、") + "：", "", "原始文本：", payload.extractInput.rawText, "", "返回格式：", JSON.stringify({ fields: payload.extractInput.currentGuess })].join("\n") }
      ] : [
        { role: "system", content: "你是 ResumeLM 的中文校招简历润色助手。只返回严格 JSON，不要 Markdown。不得虚构学校、公司、奖项、日期和成果数字。" },
        { role: "user", content: JSON.stringify({ instruction: promptTemplates[payload.task], outputContract: getOutputContract(payload), sectionId: payload.sectionId, itemIndex: payload.itemIndex, selectedItem: pickSectionTargetForPrompt(payload), resume: pickResumeForPrompt(payload.resume) }) }
      ]
    })
  });
  if (!res.ok) throw new Error(`AI provider failed: ${res.status}`);
  const data = (await res.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned empty content");
  return extractJson(content);
};

export const openAiCompatibleProvider: AiProvider = {
  name: providerName,
  async run(payload: AiRequestPayload): Promise<AiGatewayResponse> {
    const parsed = (await callModel(payload)) as Record<string, unknown>;
    if (payload.task === "generate_resume" || payload.task === "polish_resume")
      return { task: payload.task, resume: ensureResume(parsed.resume ?? parsed, payload.resume), provider: this.name };
    if (payload.task === "recommend_keywords")
      return { task: payload.task, keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((x): x is string => typeof x === "string") : [], provider: this.name };
    if (payload.task === "diagnose_resume")
      return { task: payload.task, ...normalizeDiagnosis(parsed), provider: this.name };
    if (payload.task === "polish_section") {
      const sid = payload.sectionId ?? "personalSummary";
      const n = normalizePolishVariants(parsed, sid);
      return { task: payload.task, ...n, itemIndex: payload.itemIndex ?? n.itemIndex, provider: this.name };
    }
    if (payload.task === "extract_resume_fields") {
      const f = (parsed.fields as Record<string, unknown>) ?? parsed;
      return { task: payload.task, fields: typeof f === "object" && f !== null ? f as Record<string, unknown> : {}, provider: this.name };
    }
    return { task: payload.task, text: typeof parsed.text === "string" ? parsed.text : "", provider: this.name };
  }
};
