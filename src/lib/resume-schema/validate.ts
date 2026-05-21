import type { ResumeDocument, ResumeValidationIssue } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isResumeDocument = (value: unknown): value is ResumeDocument => {
  if (!isObject(value)) return false;

  return (
    value.schemaVersion === 1 &&
    typeof value.id === "string" &&
    typeof value.updatedAt === "string" &&
    isObject(value.profile) &&
    typeof value.personalSummary === "string" &&
    Array.isArray(value.strengths) &&
    Array.isArray(value.education) &&
    Array.isArray(value.internships) &&
    Array.isArray(value.projects) &&
    Array.isArray(value.campusExperience) &&
    Array.isArray(value.skills) &&
    Array.isArray(value.awards) &&
    isObject(value.targetJob)
  );
};

export const validateResume = (resume: ResumeDocument): ResumeValidationIssue[] => {
  const issues: ResumeValidationIssue[] = [];

  if (!resume.profile.name.trim()) {
    issues.push({ path: "profile.name", message: "请填写姓名" });
  }

  if (!resume.profile.targetRole.trim() && !resume.targetJob.title.trim()) {
    issues.push({ path: "profile.targetRole", message: "请填写目标岗位" });
  }

  if (!resume.education.some((item) => item.school.trim())) {
    issues.push({ path: "education", message: "至少填写一段教育经历" });
  }

  if (!resume.personalSummary.trim()) {
    issues.push({ path: "personalSummary", message: "建议补充个人评价" });
  }

  if (!resume.strengths.some((item) => item.trim())) {
    issues.push({ path: "strengths", message: "建议补充个人优势" });
  }

  return issues;
};
