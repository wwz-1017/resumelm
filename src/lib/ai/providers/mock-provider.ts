import type { Experience, ResumeDocument, ResumeModuleId } from "@/lib/resume-schema/types";
import type { AiGatewayResponse, AiPolishVariant, AiProvider, AiRequestPayload } from "../types";

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));
const inferRole = (r: ResumeDocument) => r.profile.targetRole || r.targetJob.title || "产品经理实习生";
const inferName = (r: ResumeDocument) => r.profile.name || "同学";
const moduleLabels: Record<ResumeModuleId, string> = {
  personalSummary:"个人评价",strengths:"个人优势",education:"教育经历",internships:"实习经历",
  projects:"项目经历",campusExperience:"校园经历",skills:"技能",awards:"奖项"
};

const buildSummary = (r: ResumeDocument) => {
  const role = inferRole(r);
  const school = r.education.find((e) => e.school)?.school;
  const major = r.education.find((e) => e.major)?.major;
  const bg = [school, major].filter(Boolean).join("，");
  return `${inferName(r)}具备${bg || "校园项目"}背景，关注用户需求、数据分析与产品体验优化。目标应聘${role}，能够将调研、分析和执行落到清晰的项目产出中。`;
};

const buildProjectDesc = (r: ResumeDocument, p?: Experience) => {
  const role = inferRole(r);
  return `围绕${p?.title || "校园项目"}梳理目标用户需求，完成信息收集、问题拆解和方案迭代；通过数据对比和用户反馈验证优化方向，沉淀可复用的分析文档与执行清单，体现与${role}相关的用户洞察、协作推进和结果复盘能力。`;
};

const buildKeywords = (r: ResumeDocument) => {
  const roleText = `${r.profile.targetRole} ${r.targetJob.title} ${r.targetJob.jdText}`.trim();
  if (!roleText) return [];
  const pk = ["用户研究","需求分析","竞品分析","数据分析","原型设计","项目推进"];
  const tk = ["JavaScript","SQL","数据可视化","接口理解","A/B 测试","埋点分析"];
  const ck = ["沟通协作","结构化表达","复盘总结"];
  return unique(/技术|开发|前端|后端|数据|算法/i.test(roleText) ? [...tk,...ck] : [...pk,...ck]);
};

const buildSectionText = (r: ResumeDocument, sid: ResumeModuleId, idx?: number): string => {
  switch (sid) {
    case "personalSummary": return r.personalSummary;
    case "strengths": return r.strengths.join("\n");
    case "education": return typeof idx === "number" ? `${r.education[idx]?.school} ${r.education[idx]?.major}` : r.education.map((e) => `${e.school} ${e.major}`).join("\n");
    case "internships": case "projects": case "campusExperience":
      return typeof idx === "number" ? `${r[sid][idx]?.title} ${r[sid][idx]?.description}` : r[sid].map((e: Experience) => `${e.title} ${e.description}`).join("\n");
    case "skills": return r.skills.join("\n");
    case "awards": return r.awards.join("\n");
    default: return "";
  }
};

const diagnoseResume = (r: ResumeDocument) => {
  const kw = buildKeywords(r);
  const jdText = `${r.targetJob.title} ${r.targetJob.jdText}`;
  const hasJd = jdText.trim().length > 8;
  const modules = (Object.keys(moduleLabels) as ResumeModuleId[]).map((mid) => {
    const txt = buildSectionText(r, mid);
    const missing = kw.filter((k) => !txt.includes(k)).slice(0, 4);
    const isWeak = txt.trim().length < 28 || (hasJd && missing.length >= 3);
    return {
      moduleId: mid, title: moduleLabels[mid],
      severity: (isWeak ? "high" : missing.length ? "medium" : "low") as "high" | "medium" | "low",
      summary: isWeak ? `${moduleLabels[mid]}与目标岗位关联不够清晰` : `${moduleLabels[mid]}已有基础信息`,
      jdAlignment: hasJd ? `建议围绕${inferRole(r)} JD 优先体现${kw.slice(0,3).join("、")}` : "请先填写 JD",
      missingKeywords: missing,
      suggestions: ["保留真实经历，不虚构", missing.length ? `补充关键词：${missing.join("、")}` : "增强成果表达"]
    };
  });
  return { overallSummary: hasJd ? "已结合 JD 完成诊断" : "请先填写 JD 再诊断", modules, priorityModuleIds: modules.filter((m) => m.severity !== "low").map((m) => m.moduleId).slice(0, 4) };
};

const polishSection = (r: ResumeDocument, sid: ResumeModuleId, idx?: number): AiPolishVariant[] => {
  const role = inferRole(r);
  const kw = buildKeywords(r).slice(0, 5);
  const cur = buildSectionText(r, sid, idx).trim();
  const base = cur || (sid === "personalSummary" ? buildSummary(r) : buildProjectDesc(r));
  return [
    { id: "balanced", title: "稳妥专业版", text: `${base}\n围绕${role}突出${kw.slice(0,3).join("、")}`, reason: "适合大多数校招投递", keywords: kw.slice(0,3) },
    { id: "impact", title: "成果导向版", text: `${base}\n补充可验证结果与数据`, reason: "强调动作和结果", keywords: kw.slice(0,4) },
    { id: "ats", title: "关键词增强版", text: `${base}\n融入${kw.join("、")}等关键词`, reason: "提升 ATS 覆盖", keywords: kw }
  ];
};

const generateResume = (r: ResumeDocument): ResumeDocument => {
  const role = inferRole(r);
  const kw = buildKeywords(r);
  return {
    ...r, profile: { ...r.profile, targetRole: role },
    personalSummary: r.personalSummary || buildSummary(r),
    strengths: unique([...r.strengths, "结构化拆解问题", "数据驱动分析", "跨团队沟通推进"]).slice(0, 5),
    skills: unique([...r.skills, ...kw]).slice(0, 10),
    projects: r.projects.length ? r.projects : [{ title: "校招求职项目", organization: "项目负责人", startDate: "", endDate: "", description: buildProjectDesc(r) }]
  };
};

const polishResume = (r: ResumeDocument): ResumeDocument => {
  const g = generateResume(r);
  return { ...g, personalSummary: buildSummary(g), strengths: unique([...g.strengths, "能够将模糊需求拆解为可执行方案", "善于用数据和用户反馈验证优化方向"]).slice(0, 6) };
};

export const mockProvider: AiProvider = {
  name: "mock-provider",
  async run(payload: AiRequestPayload): Promise<AiGatewayResponse> {
    if (payload.task === "generate_resume") return { task: payload.task, resume: generateResume(payload.resume), provider: this.name };
    if (payload.task === "polish_resume") return { task: payload.task, resume: polishResume(payload.resume), provider: this.name };
    if (payload.task === "rewrite_summary") return { task: payload.task, text: buildSummary(payload.resume), provider: this.name };
    if (payload.task === "rewrite_project") return { task: payload.task, text: buildProjectDesc(payload.resume, payload.resume.projects[0]), provider: this.name };
    if (payload.task === "diagnose_resume") return { task: payload.task, ...diagnoseResume(payload.resume), provider: this.name };
    if (payload.task === "polish_section") {
      const sid = payload.sectionId ?? "personalSummary";
      return { task: payload.task, moduleId: sid, itemIndex: payload.itemIndex, variants: polishSection(payload.resume, sid, payload.itemIndex), provider: this.name };
    }
    if (payload.task === "extract_resume_fields") return { task: payload.task, fields: {}, provider: this.name };
    return { task: payload.task, keywords: buildKeywords(payload.resume), provider: this.name };
  }
};
