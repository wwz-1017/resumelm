import type { ResumeDocument } from "@/lib/resume-schema/types";
import type { ScoreDimension, ScoreIssue, ScoreReport, ScoreSuggestion } from "./types";

const keywordDictionary = [
  "用户研究",
  "需求分析",
  "竞品分析",
  "数据分析",
  "原型设计",
  "项目推进",
  "沟通协作",
  "结构化表达",
  "复盘总结",
  "SQL",
  "JavaScript",
  "React",
  "A/B 测试",
  "埋点分析",
  "数据可视化",
  "产品体验",
  "增长",
  "运营",
  "调研",
  "策略"
];

const dimensionWeights: Record<ScoreDimension, number> = {
  ats_compatibility: 25,
  content_completeness: 20,
  keyword_match: 30,
  quantified_impact: 10,
  summary_strength: 10,
  readability: 5
};

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value)));

const resumeText = (resume: ResumeDocument) =>
  [
    resume.profile.targetRole,
    resume.personalSummary,
    resume.strengths.join(" "),
    resume.education.map((item) => `${item.school} ${item.degree} ${item.major} ${item.highlights}`).join(" "),
    resume.internships.map((item) => `${item.title} ${item.organization} ${item.description}`).join(" "),
    resume.projects.map((item) => `${item.title} ${item.organization} ${item.description}`).join(" "),
    resume.campusExperience.map((item) => `${item.title} ${item.organization} ${item.description}`).join(" "),
    resume.skills.join(" "),
    resume.awards.join(" ")
  ].join(" ");

const extractKeywords = (jdText: string) => {
  const matchedByDictionary = keywordDictionary.filter((keyword) =>
    jdText.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
  );
  const englishTokens = jdText.match(/[A-Za-z][A-Za-z+#.]{1,}/g) ?? [];
  const chineseTokens = jdText.match(/[\u4e00-\u9fa5]{2,6}/g) ?? [];

  return Array.from(new Set([...matchedByDictionary, ...englishTokens, ...chineseTokens])).slice(0, 18);
};

const hasAnyExperience = (resume: ResumeDocument) =>
  [...resume.internships, ...resume.projects, ...resume.campusExperience].some((item) =>
    [item.title, item.organization, item.description].some((value) => value.trim())
  );

const countQuantifiedSentences = (text: string) => {
  const matches = text.match(/\d+|%|提升|增长|降低|节省|覆盖|完成|交付/g);
  return matches?.length ?? 0;
};

const collectIssues = (
  resume: ResumeDocument,
  matchedKeywords: string[],
  missingKeywords: string[],
  text: string
): ScoreIssue[] => {
  const issues: ScoreIssue[] = [];

  if (!resume.profile.name || !resume.profile.email || !resume.profile.phone) {
    issues.push({
      priority: "P1",
      title: "基础联系信息不完整",
      detail: "ATS 和人工筛选都依赖姓名、电话和邮箱，建议先补齐基础信息。"
    });
  }

  if (!resume.education.some((item) => item.school && item.major)) {
    issues.push({
      priority: "P1",
      title: "教育经历信息不足",
      detail: "校招简历里教育背景权重较高，建议补充学校、专业、学历和时间。"
    });
  }

  if (!hasAnyExperience(resume)) {
    issues.push({
      priority: "P1",
      title: "缺少可评估经历",
      detail: "建议至少补充一段项目、实习或校园经历，说明行动和结果。"
    });
  }

  if (missingKeywords.length > matchedKeywords.length) {
    issues.push({
      priority: "P2",
      title: "JD 关键词覆盖不足",
      detail: `当前缺少 ${missingKeywords.slice(0, 5).join("、")} 等关键词，可结合真实经历自然补充。`
    });
  }

  if (countQuantifiedSentences(text) < 2) {
    issues.push({
      priority: "P2",
      title: "成果量化表达偏少",
      detail: "建议在项目或实习描述中加入规模、频次、转化、效率或结果数据。"
    });
  }

  if (!resume.personalSummary || resume.personalSummary.length < 35) {
    issues.push({
      priority: "P3",
      title: "个人评价说服力不足",
      detail: "个人评价应包含背景、核心能力和目标岗位相关性，避免只写泛泛而谈的性格描述。"
    });
  }

  return issues;
};

const buildSuggestions = (issues: ScoreIssue[], missingKeywords: string[]): ScoreSuggestion[] => [
  ...issues.slice(0, 4).map((issue) => ({
    priority: issue.priority,
    text: issue.detail
  })),
  ...(missingKeywords.length
    ? [
        {
          priority: "P2" as const,
          text: `优先补充与 JD 相关的关键词：${missingKeywords.slice(0, 6).join("、")}。`
        }
      ]
    : [])
];

export const scoreResume = (resume: ResumeDocument): ScoreReport => {
  const text = resumeText(resume);
  const jdKeywords = extractKeywords(`${resume.targetJob.title} ${resume.targetJob.jdText}`);
  const sourceKeywords = jdKeywords.length ? jdKeywords : keywordDictionary.slice(0, 10);
  const lowerResumeText = text.toLocaleLowerCase();
  const matchedKeywords = sourceKeywords.filter((keyword) =>
    lowerResumeText.includes(keyword.toLocaleLowerCase())
  );
  const missingKeywords = sourceKeywords.filter((keyword) => !matchedKeywords.includes(keyword)).slice(0, 12);

  const hasContact = Boolean(resume.profile.name && resume.profile.email && resume.profile.phone);
  const hasEducation = resume.education.some((item) => item.school && item.major);
  const hasSummary = resume.personalSummary.length >= 35;
  const hasStrengths = resume.strengths.filter(Boolean).length >= 2;
  const hasSkills = resume.skills.filter(Boolean).length >= 3;
  const quantifiedCount = countQuantifiedSentences(text);
  const longParagraphPenalty = text.split(/\n+/).some((paragraph) => paragraph.length > 220) ? 1 : 0;

  const dimensionScores: Record<ScoreDimension, number> = {
    ats_compatibility: clamp(
      (hasContact ? 8 : 2) + (hasEducation ? 7 : 2) + (hasAnyExperience(resume) ? 6 : 1) + (hasSkills ? 4 : 1),
      dimensionWeights.ats_compatibility
    ),
    content_completeness: clamp(
      (hasContact ? 4 : 1) + (hasEducation ? 5 : 1) + (hasAnyExperience(resume) ? 6 : 1) + (hasSummary ? 3 : 1) + (hasStrengths ? 2 : 0),
      dimensionWeights.content_completeness
    ),
    keyword_match: clamp(
      sourceKeywords.length ? (matchedKeywords.length / sourceKeywords.length) * dimensionWeights.keyword_match : 12,
      dimensionWeights.keyword_match
    ),
    quantified_impact: clamp(quantifiedCount * 2.5, dimensionWeights.quantified_impact),
    summary_strength: clamp((hasSummary ? 7 : 3) + (hasStrengths ? 3 : 1), dimensionWeights.summary_strength),
    readability: clamp(5 - longParagraphPenalty, dimensionWeights.readability)
  };

  const issues = collectIssues(resume, matchedKeywords, missingKeywords, text);

  return {
    overallScore: Object.values(dimensionScores).reduce((sum, score) => sum + score, 0),
    dimensionScores,
    issues,
    suggestions: buildSuggestions(issues, missingKeywords),
    matchedKeywords,
    missingKeywords,
    generatedAt: new Date().toISOString()
  };
};
