import type { Experience, ResumeDocument } from "@/lib/resume-schema/types";
import type { AiGatewayResponse, AiProvider, AiRequestPayload } from "../types";

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const inferRole = (resume: ResumeDocument) =>
  resume.profile.targetRole || resume.targetJob.title || "产品经理实习生";

const inferName = (resume: ResumeDocument) => resume.profile.name || "同学";

const buildSummary = (resume: ResumeDocument) => {
  const role = inferRole(resume);
  const school = resume.education.find((item) => item.school)?.school;
  const major = resume.education.find((item) => item.major)?.major;
  const background = [school, major].filter(Boolean).join("，");

  return `${inferName(resume)}具备${background || "校园项目"}背景，关注用户需求、数据分析与产品体验优化。目标应聘${role}，能够将调研、分析和执行落到清晰的项目产出中。`;
};

const buildProjectDescription = (resume: ResumeDocument, project?: Experience) => {
  const role = inferRole(resume);
  const title = project?.title || "校园项目";

  return `围绕${title}梳理目标用户需求，完成信息收集、问题拆解和方案迭代；通过数据对比和用户反馈验证优化方向，沉淀可复用的分析文档与执行清单，体现与${role}相关的用户洞察、协作推进和结果复盘能力。`;
};

const buildKeywords = (resume: ResumeDocument) => {
  const roleText = `${resume.profile.targetRole} ${resume.targetJob.title} ${resume.targetJob.jdText}`;
  const productKeywords = ["用户研究", "需求分析", "竞品分析", "数据分析", "原型设计", "项目推进"];
  const techKeywords = ["JavaScript", "SQL", "数据可视化", "接口理解", "A/B 测试", "埋点分析"];
  const commonKeywords = ["沟通协作", "结构化表达", "复盘总结"];

  if (/技术|开发|前端|后端|数据|算法/i.test(roleText)) {
    return unique([...techKeywords, ...commonKeywords]);
  }

  return unique([...productKeywords, ...commonKeywords]);
};

const generateResume = (resume: ResumeDocument): ResumeDocument => {
  const role = inferRole(resume);
  const summary = buildSummary(resume);
  const keywords = buildKeywords(resume);

  return {
    ...resume,
    profile: {
      ...resume.profile,
      targetRole: role
    },
    personalSummary: resume.personalSummary || summary,
    strengths: unique([
      ...resume.strengths,
      "结构化拆解问题",
      "数据驱动分析",
      "跨团队沟通推进"
    ]).slice(0, 5),
    projects:
      resume.projects.length > 0
        ? resume.projects.map((project, index) =>
            index === 0
              ? {
                  ...project,
                  title: project.title || "校招求职项目",
                  organization: project.organization || "项目负责人",
                  description: project.description || buildProjectDescription(resume, project)
                }
              : project
          )
        : [
            {
              title: "校招求职项目",
              organization: "项目负责人",
              startDate: "",
              endDate: "",
              description: buildProjectDescription(resume)
            }
          ],
    skills: unique([...resume.skills, ...keywords]).slice(0, 10)
  };
};

export const mockProvider: AiProvider = {
  name: "mock-provider",
  async run(payload: AiRequestPayload): Promise<AiGatewayResponse> {
    if (payload.task === "generate_resume") {
      return {
        task: payload.task,
        resume: generateResume(payload.resume),
        provider: this.name
      };
    }

    if (payload.task === "rewrite_summary") {
      return {
        task: payload.task,
        text: buildSummary(payload.resume),
        provider: this.name
      };
    }

    if (payload.task === "rewrite_project") {
      return {
        task: payload.task,
        text: buildProjectDescription(payload.resume, payload.resume.projects[0]),
        provider: this.name
      };
    }

    return {
      task: payload.task,
      keywords: buildKeywords(payload.resume),
      provider: this.name
    };
  }
};
