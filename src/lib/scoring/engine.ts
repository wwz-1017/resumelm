import type { ResumeDocument } from "@/lib/resume-schema/types";
import type { ScoreDimension, ScoreIssue, ScoreReport, ScoreSuggestion } from "./types";

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));
const nonEmpty = (items: string[]) => items.filter((i) => i.trim());

const keywordDictionary = [
  "用户研究","需求分析","竞品分析","数据分析","原型设计","项目推进",
  "沟通协作","结构化表达","复盘总结","SQL","JavaScript","React",
  "A/B 测试","埋点分析","数据可视化","产品体验","增长","运营","调研","策略"
];

const synonymGroups: Array<[string, string[]]> = [
  ["用户增长",["DAU","MAU","拉新","留存","促活","增长"]],
  ["需求分析",["需求文档","PRD","MRD","BRD","用户故事","功能规格"]],
  ["原型设计",["Axure","Figma","Sketch","线框图","交互稿","mockup"]],
  ["数据分析",["SQL","Excel","Tableau","看板","报表","指标体系","埋点"]],
  ["项目管理",["排期","迭代","Sprint","甘特图","里程碑","跟进"]],
  ["用户调研",["访谈","问卷","可用性测试","焦点小组","用户画像"]],
  ["A/B 测试",["实验","对照组","灰度","流量分割","abtest"]],
  ["沟通协作",["跨团队","对接","协同","推进","拉通","对齐"]],
  ["数据可视化",["图表","Dashboard","BI","ECharts","看板"]],
  ["复盘总结",["回顾","复盘","SOP","沉淀","经验","方法论"]],
];

const checkSynonymMatch = (kw: string, text: string): boolean => {
  const nk = kw.toLowerCase(), nt = text.toLowerCase();
  if (nt.includes(nk)) return true;
  for (const [gk, syns] of synonymGroups) {
    if (nk !== gk.toLowerCase() && !syns.some((s) => nk === s.toLowerCase())) continue;
    if (syns.some((s) => nt.includes(s.toLowerCase()))) return true;
    if (nt.includes(gk.toLowerCase())) return true;
  }
  return false;
};

const roleKeywordMap: Record<string, string[]> = {
  "产品":["用户研究","需求分析","竞品分析","原型设计","PRD","数据分析","项目推进","A/B 测试","用户访谈","产品体验"],
  "运营":["数据分析","用户增长","活动策划","内容运营","转化率","留存","社群","文案"],
  "开发":["JavaScript","React","Vue","Python","Java","SQL","Git","API","系统设计","性能优化"],
  "前端":["JavaScript","React","Vue","CSS","TypeScript","Webpack","组件化","响应式"],
  "后端":["Java","Python","Go","SQL","Redis","微服务","API","数据库","并发"],
  "数据":["SQL","Python","数据分析","数据可视化","机器学习","A/B 测试","埋点","指标体系","Tableau"],
  "设计":["Figma","Sketch","用户研究","交互设计","原型","设计系统","可用性测试","视觉"],
  "市场":["竞品分析","用户调研","品牌","投放","ROI","转化","活动策划","文案"],
  "测试":["测试用例","自动化","Selenium","性能测试","回归","缺陷管理","质量保障"],
};

const getRoleKeywords = (role: string): string[] => {
  const l = role.toLowerCase();
  for (const [k, v] of Object.entries(roleKeywordMap)) if (l.includes(k.toLowerCase())) return v;
  return keywordDictionary.slice(0, 10);
};

const resumeText = (r: ResumeDocument) =>
  [r.profile.targetRole, r.personalSummary, r.strengths.join(" "),
   r.education.map((e) => `${e.school} ${e.degree} ${e.major} ${e.highlights}`).join(" "),
   r.internships.map((e) => `${e.title} ${e.organization} ${e.description}`).join(" "),
   r.projects.map((e) => `${e.title} ${e.organization} ${e.description}`).join(" "),
   r.campusExperience.map((e) => `${e.title} ${e.organization} ${e.description}`).join(" "),
   r.skills.join(" "), r.awards.join(" ")].join(" ");

const paragraphs = (r: ResumeDocument): string[] =>
  [r.personalSummary, r.internships.map((e) => e.description).join("\n"),
   r.projects.map((e) => e.description).join("\n"), r.campusExperience.map((e) => e.description).join("\n")].filter((p) => p.trim());

const hasAnyExp = (r: ResumeDocument) =>
  [...r.internships, ...r.projects, ...r.campusExperience].some((e) => [e.title, e.organization, e.description].some((v) => v.trim()));

const countStrong = (t: string) => (t.match(/\d+[\s]?%|提升\s?\d+|增长\s?\d+|降低\s?\d+|覆盖\s?\d+|达成\s?\d+|转化\s?\d+|交付\s?\d+|新增\s?\d+|[1-9]\d*[\s]?倍/g) ?? []).length;
const countWeak = (t: string) => {
  const cleaned = t.replace(/\b1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}\b/g, "").replace(/\b\d{4}[./-]\d{1,2}\b/g, "");
  return (cleaned.match(/\d+/g) ?? []).filter((d) => !/^(19|20)\d{2}/.test(d)).length;
};

const extractJdKeywords = (jd: string): string[] => {
  const dict = keywordDictionary.filter((k) => jd.toLowerCase().includes(k.toLowerCase()));
  const eng = jd.match(/[A-Za-z][A-Za-z+#.]{1,}/g) ?? [];
  return Array.from(new Set([...dict, ...eng]));
};

const buildWeights = (jd: string, kws: string[]): Map<string, number> => {
  const w = new Map<string, number>();
  for (const kw of kws) { let c = 0, p = 0; const lk = kw.toLowerCase(), lj = jd.toLowerCase(); while ((p = lj.indexOf(lk, p)) !== -1) { c++; p += lk.length; } w.set(kw, Math.min(1.2, 0.7 + c * 0.15)); }
  return w;
};

// ── Scoring ──

const scoreAts = (r: ResumeDocument): number => {
  const nameOk = /^[\u4e00-\u9fa5A-Za-z·]{2,20}$/.test(r.profile.name.trim());
  const emailOk = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(r.profile.email.trim());
  const phoneOk = /^1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}$/.test(r.profile.phone.trim().replace(/[\s-]/g, ""));
  const contact = (nameOk ? 3 : 1) + (emailOk ? 3 : 1) + (phoneOk ? 3 : 1);
  const ft = resumeText(r).toLowerCase();
  const sections = [/教育经历|教育背景|学历/, /实习经历|工作经历/, /项目经历|项目经验/, /技能|专业技能/, /个人评价|自我评价/];
  const secHits = sections.filter((re) => re.test(ft)).length;
  const secScore = secHits >= 5 ? 8 : secHits >= 3 ? 6 : secHits >= 1 ? 3 : 1;
  const fluff = /^(沟通|学习|努力|认真|负责|细心|耐心|热情|积极|乐观|吃苦耐劳|抗压|执行|协调|团队|上进|勤奋|踏实|稳重|开朗)$/;
  const goodSkills = r.skills.filter((s) => s.trim().length >= 2 && !fluff.test(s.trim()));
  const skillS = goodSkills.length >= 5 ? 4 : goodSkills.length >= 3 ? 3 : goodSkills.length >= 1 ? 2 : 0;
  const hasEdu = r.education.some((e) => e.school.trim());
  return clamp(contact + secScore + skillS + (r.profile.photo ? 0 : 2) + (hasEdu ? 2 : 0), 25);
};

const scoreContent = (r: ResumeDocument): number => {
  let s = 0;
  s += [r.profile.name, r.profile.phone, r.profile.email, r.profile.targetRole].filter((f) => f.trim()).length;
  const psLen = r.personalSummary.trim().length;
  s += psLen >= 100 ? 3 : psLen >= 35 ? 2 : psLen > 0 ? 1 : 0;
  s += Math.min(2, nonEmpty(r.strengths).length);
  const bestEdu = r.education.reduce((b, e) => Math.max(b, [e.school, e.degree, e.major, e.startDate, e.highlights].filter((p) => p.trim()).length), 0);
  s += bestEdu >= 5 ? 3 : bestEdu >= 3 ? 2 : bestEdu >= 1 ? 1 : 0;
  const exp = [...r.internships, ...r.projects, ...r.campusExperience].filter((e) => e.title.trim() && e.description.trim().length >= 15);
  s += exp.length >= 3 ? 3 : exp.length >= 1 ? 2 : 0;
  s += nonEmpty(r.skills).length >= 6 ? 2 : nonEmpty(r.skills).length >= 3 ? 1 : 0;
  s += nonEmpty(r.awards).length >= 2 ? 2 : r.awards.some((a) => a.trim()) ? 1 : 0;
  return clamp(s, 20);
};

const scoreKw = (r: ResumeDocument): { s: number; m: string[]; x: string[] } => {
  const txt = resumeText(r);
  const jd = `${r.targetJob.title} ${r.targetJob.jdText}`.trim();
  const hasJd = jd.length > 5;
  const jdKws = hasJd ? extractJdKeywords(jd) : [];
  const src = jdKws.length >= 3 ? jdKws.slice(0, 18) : getRoleKeywords(r.profile.targetRole || r.targetJob.title);
  const w = hasJd ? buildWeights(jd, src) : new Map<string, number>();
  let wm = 0, wmax = 0;
  const matched: string[] = [], missing: string[] = [];
  for (const kw of src) {
    const wt = w.get(kw) ?? 1; wmax += wt;
    if (txt.toLowerCase().includes(kw.toLowerCase())) { wm += wt; matched.push(kw); }
    else if (hasJd && checkSynonymMatch(kw, txt)) { wm += wt * 0.75; matched.push(kw); }
    else missing.push(kw);
  }
  const ratio = wmax > 0 ? wm / wmax : 0;
  return { s: clamp(src.length >= 3 ? Math.round(ratio * 30) : 12, 30), m: matched, x: missing.slice(0, 12) };
};

const scoreQi = (r: ResumeDocument): number => {
  const desc = [r.personalSummary, ...r.internships.map((e) => e.description), ...r.projects.map((e) => e.description), ...r.campusExperience.map((e) => e.description)].join("\n");
  const strong = countStrong(desc);
  const weak = countWeak(desc);
  return clamp(Math.min(4, strong * 2) + Math.min(6, Math.floor(weak * 0.5)), 10);
};

const scoreSummary = (r: ResumeDocument): number => {
  let s = 0;
  const ps = r.personalSummary.trim();
  s += ps.length >= 120 ? 3 : ps.length >= 60 ? 2 : ps.length >= 35 ? 1 : 0;
  s += /本科|硕士|专业|大学|学院|年|经验/.test(ps) ? 1 : 0;
  s += /产品|运营|开发|设计|数据|市场|前端|后端|测试|实习|岗位|方向/.test(ps) ? 1 : 0;
  s += /熟悉|掌握|具备|能够|善于|擅长|了解/.test(ps) ? 1 : 0;
  s += /目标|希望|期望|致力于|追求|热爱|兴趣/.test(ps) ? 1 : 0;
  const good = nonEmpty(r.strengths).filter((st) => st.length >= 6 && !/^(沟通|学习|努力|认真|细心|耐心)$/.test(st.trim()));
  s += good.length >= 3 ? 3 : good.length >= 1 ? 2 : nonEmpty(r.strengths).length >= 1 ? 1 : 0;
  return clamp(s, 10);
};

const scoreRead = (r: ResumeDocument): number => {
  const ps = paragraphs(r);
  if (!ps.length) return 3;
  const hasLong = ps.some((p) => p.length > 300);
  const avg = ps.reduce((sum, p) => sum + p.length, 0) / ps.length;
  let s = 5;
  if (hasLong) s -= 2; else if (avg > 200) s -= 1;
  if (avg < 40) s -= 1;
  return clamp(s, 5);
};

const collectIssues = (r: ResumeDocument, matched: number, total: number, missing: string[]): ScoreIssue[] => {
  const issues: ScoreIssue[] = [];
  const mp: string[] = [];
  if (!r.profile.name.trim()) mp.push("姓名");
  if (!r.profile.email.trim()) mp.push("邮箱");
  if (!r.profile.phone.trim()) mp.push("电话");
  if (mp.length) issues.push({ priority: "P1", title: "基础联系信息不完整", detail: `缺少${mp.join("、")}。` });
  if (!r.education.some((e) => e.school.trim() && e.major.trim()))
    issues.push({ priority: "P1", title: "教育经历信息不足", detail: "建议补充学校、专业、学历和时间。" });
  if (!hasAnyExp(r))
    issues.push({ priority: "P1", title: "缺少可评估经历", detail: "建议至少补充一段项目、实习或校园经历。" });
  if (missing.length > 0 && total > 0 && matched / Math.max(1, total) < 0.5)
    issues.push({ priority: "P2", title: "JD 关键词覆盖不足", detail: `缺少 ${missing.slice(0, 5).join("、")} 等关键词。` });
  const desc = [r.personalSummary, ...r.internships.map((e) => e.description), ...r.projects.map((e) => e.description)].join("\n");
  if (countStrong(desc) < 1)
    issues.push({ priority: "P2", title: "成果量化表达偏少", detail: "建议加入具体的数字结果，如覆盖率、增长率、交付量。" });
  if (!r.personalSummary.trim())
    issues.push({ priority: "P3", title: "缺少个人评价", detail: "个人评价应包含背景、核心能力和目标岗位相关性。" });
  else if (r.personalSummary.trim().length < 60)
    issues.push({ priority: "P3", title: "个人评价说服力不足", detail: "建议扩充到 60 字以上。" });
  if (nonEmpty(r.strengths).length < 2)
    issues.push({ priority: "P3", title: "个人优势条目偏少", detail: "建议列出 2-4 条与岗位相关的具体优势。" });
  if (paragraphs(r).some((p) => p.length > 300))
    issues.push({ priority: "P3", title: "存在超长段落", detail: "建议拆分为多个短段落，提高可读性。" });
  return issues;
};

const buildSuggestions = (issues: ScoreIssue[], missing: string[]): ScoreSuggestion[] => [
  ...issues.slice(0, 5).map((i) => ({ priority: i.priority, text: i.detail })),
  ...(missing.length ? [{ priority: "P2" as const, text: `优先补充 JD 关键词：${missing.slice(0, 6).join("、")}。` }] : []),
];

export const scoreResume = (r: ResumeDocument): ScoreReport => {
  const kw = scoreKw(r);
  const dims: Record<ScoreDimension, number> = {
    ats_compatibility: scoreAts(r), content_completeness: scoreContent(r),
    keyword_match: kw.s, quantified_impact: scoreQi(r),
    summary_strength: scoreSummary(r), readability: scoreRead(r),
  };
  const issues = collectIssues(r, kw.m.length, kw.m.length + kw.x.length, kw.x);
  return {
    overallScore: Object.values(dims).reduce((sum, s) => sum + s, 0), dimensionScores: dims,
    issues, suggestions: buildSuggestions(issues, kw.x),
    matchedKeywords: kw.m, missingKeywords: kw.x, generatedAt: new Date().toISOString(),
  };
};
