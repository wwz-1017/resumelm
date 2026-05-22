"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { ChangeEvent, useEffect, useState } from "react";
import {
  Activity,
  Award,
  BadgeCheck,
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Circle,
  CircleUserRound,
  Compass,
  ContactRound,
  Download,
  Dumbbell,
  FileText,
  FileUp,
  GraduationCap,
  Heart,
  Headphones,
  IdCard,
  Inbox,
  LayoutTemplate,
  Mail,
  Map,
  MapPinned,
  MapPin,
  Medal,
  MessageSquare,
  Phone,
  Plus,
  RotateCcw,
  Save,
  School,
  Send,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Trophy,
  Trash2,
  User,
  UserRound
} from "lucide-react";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/analytics/dashboard";
import { trackEvent } from "@/lib/analytics/track";
import type { AiGatewayResponse, AiTask } from "@/lib/ai/types";
import { downloadResumeWord, printResumePdf } from "@/lib/export/resume-export";
import { saveFeedback, type FeedbackTarget, type FeedbackVote } from "@/lib/feedback/store";
import { createEmptyResume, normalizeIconSettings } from "@/lib/resume-schema/defaults";
import type { Education, Experience, ResumeDocument, ResumeIconId, ResumeIconSettings } from "@/lib/resume-schema/types";
import { isResumeDocument, validateResume } from "@/lib/resume-schema/validate";
import type { ScoreDimension, ScoreReport } from "@/lib/scoring/types";
import {
  downloadResumeJson,
  getAnonymousSessionId,
  loadResume,
  resetResume,
  saveResume
} from "@/lib/storage/local-resume-store";

type TemplateId = "useful" | "simple" | "graduate" | "brick" | "leftBlue" | "minimalPm";
type ExperienceSection = "internships" | "projects" | "campusExperience";

const templates: Array<{ id: TemplateId; label: string }> = [
  { id: "useful", label: "好用蓝灰" },
  { id: "simple", label: "简约金灰" },
  { id: "graduate", label: "应届蓝线" },
  { id: "brick", label: "砖红双栏" },
  { id: "leftBlue", label: "深蓝左栏" },
  { id: "minimalPm", label: "极简PM" }
];

const iconStyleOptions: Record<keyof Omit<ResumeIconSettings, "enabled">, Array<{ id: ResumeIconId; label: string }>> = {
  phone: [
    { id: "none", label: "不放" },
    { id: "phone", label: "电话" },
    { id: "mobile", label: "手机" },
    { id: "hotline", label: "热线" },
    { id: "headset", label: "客服耳机" }
  ],
  email: [
    { id: "none", label: "不放" },
    { id: "email", label: "信封" },
    { id: "inbox", label: "收件箱" },
    { id: "sendMail", label: "发送" },
    { id: "mailBadge", label: "邮件认证" }
  ],
  city: [
    { id: "none", label: "不放" },
    { id: "pin", label: "定位" },
    { id: "mapPin", label: "地图定位" },
    { id: "map", label: "地图" },
    { id: "compass", label: "罗盘" }
  ],
  targetRole: [
    { id: "none", label: "不放" },
    { id: "briefcase", label: "公文包" },
    { id: "idCard", label: "工牌" },
    { id: "building", label: "办公楼" },
    { id: "trend", label: "趋势图" }
  ],
  personalSummary: [
    { id: "none", label: "不放" },
    { id: "user", label: "头像" },
    { id: "maleUser", label: "男头像" },
    { id: "femaleUser", label: "女头像" },
    { id: "profileBadge", label: "证件头像" }
  ],
  strengths: [
    { id: "none", label: "不放" },
    { id: "heart", label: "爱心" },
    { id: "star", label: "星标" },
    { id: "badgeCheck", label: "认证" },
    { id: "sparkles", label: "闪光" }
  ],
  education: [
    { id: "none", label: "不放" },
    { id: "graduation", label: "学士帽" },
    { id: "book", label: "书本" },
    { id: "school", label: "学校" },
    { id: "medal", label: "奖章" }
  ],
  internships: [
    { id: "none", label: "不放" },
    { id: "briefcase", label: "公文包" },
    { id: "idCard", label: "工牌" },
    { id: "building", label: "公司" },
    { id: "trend", label: "成长" }
  ],
  projects: [
    { id: "none", label: "不放" },
    { id: "sparkles", label: "项目亮点" },
    { id: "bookmark", label: "书签" },
    { id: "tag", label: "标签" },
    { id: "dot", label: "圆点" }
  ],
  campusExperience: [
    { id: "none", label: "不放" },
    { id: "star", label: "星标" },
    { id: "heart", label: "爱心" },
    { id: "trophy", label: "奖杯" },
    { id: "activity", label: "活动" }
  ],
  skills: [
    { id: "none", label: "不放" },
    { id: "tag", label: "标签" },
    { id: "sparkles", label: "闪光" },
    { id: "bookmark", label: "书签" },
    { id: "dot", label: "圆点" }
  ],
  awards: [
    { id: "none", label: "不放" },
    { id: "award", label: "奖章" },
    { id: "medal", label: "勋章" },
    { id: "trophy", label: "奖杯" },
    { id: "star", label: "星标" }
  ]
};

const feedbackReasons: Record<FeedbackVote, string[]> = {
  up: ["表达更专业", "关键词更准确", "建议可执行", "导出体验顺畅"],
  down: ["内容空泛", "不符合本人经历", "ATS 建议不实用", "导出不满意"]
};

const blankEducation = (): Education => ({
  school: "",
  degree: "",
  major: "",
  startDate: "",
  endDate: "",
  highlights: ""
});

const blankExperience = (): Experience => ({
  title: "",
  organization: "",
  startDate: "",
  endDate: "",
  description: ""
});

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const joinDateRange = (startDate: string, endDate: string) =>
  [startDate, endDate].filter(Boolean).join(" - ");

const nonEmpty = (items: string[]) => items.filter((item) => item.trim());

const hasExperienceContent = (item: Experience) =>
  Boolean(item.title.trim() || item.organization.trim() || item.description.trim());

const getIconNode = (iconId: ResumeIconId, size = 14) => {
  const strokeWidth = 2;

  switch (iconId) {
    case "user":
      return <User size={size} strokeWidth={strokeWidth} />;
    case "maleUser":
      return <UserRound size={size} strokeWidth={strokeWidth} />;
    case "femaleUser":
      return <CircleUserRound size={size} strokeWidth={strokeWidth} />;
    case "profileBadge":
      return <ContactRound size={size} strokeWidth={strokeWidth} />;
    case "work":
    case "briefcase":
      return <BriefcaseBusiness size={size} strokeWidth={strokeWidth} />;
    case "idCard":
      return <IdCard size={size} strokeWidth={strokeWidth} />;
    case "building":
      return <Building2 size={size} strokeWidth={strokeWidth} />;
    case "trend":
      return <TrendingUp size={size} strokeWidth={strokeWidth} />;
    case "education":
    case "graduation":
      return <GraduationCap size={size} strokeWidth={strokeWidth} />;
    case "book":
      return <BookOpen size={size} strokeWidth={strokeWidth} />;
    case "school":
      return <School size={size} strokeWidth={strokeWidth} />;
    case "medal":
      return <Medal size={size} strokeWidth={strokeWidth} />;
    case "award":
      return <Award size={size} strokeWidth={strokeWidth} />;
    case "phone":
      return <Phone size={size} strokeWidth={strokeWidth} />;
    case "mobile":
      return <Smartphone size={size} strokeWidth={strokeWidth} />;
    case "hotline":
      return <Phone size={size} strokeWidth={2.8} />;
    case "headset":
      return <Headphones size={size} strokeWidth={strokeWidth} />;
    case "email":
      return <Mail size={size} strokeWidth={strokeWidth} />;
    case "inbox":
      return <Inbox size={size} strokeWidth={strokeWidth} />;
    case "sendMail":
      return <Send size={size} strokeWidth={strokeWidth} />;
    case "mailBadge":
      return <BadgeCheck size={size} strokeWidth={strokeWidth} />;
    case "address":
    case "pin":
      return <MapPin size={size} strokeWidth={strokeWidth} />;
    case "mapPin":
      return <MapPinned size={size} strokeWidth={strokeWidth} />;
    case "map":
      return <Map size={size} strokeWidth={strokeWidth} />;
    case "compass":
      return <Compass size={size} strokeWidth={strokeWidth} />;
    case "sport":
    case "dumbbell":
      return <Dumbbell size={size} strokeWidth={strokeWidth} />;
    case "trophy":
      return <Trophy size={size} strokeWidth={strokeWidth} />;
    case "activity":
      return <Activity size={size} strokeWidth={strokeWidth} />;
    case "hobby":
    case "heart":
      return <Heart size={size} strokeWidth={strokeWidth} />;
    case "star":
      return <Star size={size} strokeWidth={strokeWidth} />;
    case "badgeCheck":
      return <BadgeCheck size={size} strokeWidth={strokeWidth} />;
    case "other":
    case "sparkles":
      return <Sparkles size={size} strokeWidth={strokeWidth} />;
    case "bookmark":
      return <Bookmark size={size} strokeWidth={strokeWidth} />;
    case "tag":
      return <Tag size={size} strokeWidth={strokeWidth} />;
    case "dot":
      return <Circle size={Math.max(8, size - 3)} fill="currentColor" strokeWidth={strokeWidth} />;
    case "none":
    default:
      return null;
  }
};

function ResumeIcon({ enabled, iconId, size = 14 }: { enabled: boolean; iconId: ResumeIconId; size?: number }) {
  if (!enabled || iconId === "none") return null;

  return (
    <span className="resume-icon" aria-hidden="true">
      {getIconNode(iconId, size)}
    </span>
  );
}

export function ResumeWorkspace() {
  const [resume, setResume] = useState<ResumeDocument>(() => createEmptyResume());
  const [sessionId, setSessionId] = useState("");
  const [saveState, setSaveState] = useState("正在准备本地草稿");
  const [importError, setImportError] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("useful");
  const [aiTask, setAiTask] = useState<AiTask | null>(null);
  const [aiError, setAiError] = useState("");
  const [scoreReport, setScoreReport] = useState<ScoreReport | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const issues = validateResume(resume);
  const iconSettings = normalizeIconSettings(resume.iconSettings);

  useEffect(() => {
    const nextSessionId = getAnonymousSessionId();
    setSessionId(nextSessionId);
    setResume(loadResume());
    trackEvent("workspace_entered", nextSessionId);
    setDashboardMetrics(getDashboardMetrics());
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    saveResume(resume);
    setSaveState(`已自动保存 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
  }, [resume, sessionId]);

  const updateProfile = (field: keyof ResumeDocument["profile"], value: string) => {
    setResume((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value
      }
    }));
  };

  const updateIconSettings = (nextSettings: Partial<ResumeIconSettings>) => {
    setResume((current) => ({
      ...current,
      iconSettings: {
        ...normalizeIconSettings(current.iconSettings),
        ...nextSettings
      }
    }));
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setResume((current) => ({
      ...current,
      education: current.education.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  };

  const addEducation = () => {
    setResume((current) => ({
      ...current,
      education: [...current.education, blankEducation()]
    }));
  };

  const removeEducation = (index: number) => {
    setResume((current) => ({
      ...current,
      education: current.education.length === 1 ? [blankEducation()] : current.education.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const updateExperience = (section: ExperienceSection, index: number, field: keyof Experience, value: string) => {
    setResume((current) => ({
      ...current,
      [section]: current[section].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  };

  const addExperience = (section: ExperienceSection) => {
    setResume((current) => ({
      ...current,
      [section]: [...current[section], blankExperience()]
    }));
  };

  const removeExperience = (section: ExperienceSection, index: number) => {
    setResume((current) => ({
      ...current,
      [section]: current[section].filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!isResumeDocument(parsed)) {
        setImportError("导入失败：这个 JSON 不是 ResumeLM 简历格式。");
        return;
      }

      setResume(parsed);
      setImportError("");
      trackEvent("resume_imported", sessionId, { fileName: file.name });
    } catch {
      setImportError("导入失败：请检查 JSON 文件是否完整。");
    } finally {
      event.target.value = "";
    }
  };

  const createResumeDraft = () => {
    setResume(resetResume());
    trackEvent("resume_created", sessionId);
  };

  const exportResume = () => {
    downloadResumeJson(resume);
    trackEvent("resume_exported", sessionId, { format: "json" });
    setDashboardMetrics(getDashboardMetrics());
  };

  const exportWord = () => {
    downloadResumeWord(resume.profile.name);
    trackEvent("export_completed", sessionId, { format: "word" });
    setDashboardMetrics(getDashboardMetrics());
  };

  const exportPdf = () => {
    try {
      printResumePdf(resume.profile.name);
      trackEvent("export_completed", sessionId, { format: "pdf" });
      setDashboardMetrics(getDashboardMetrics());
    } catch {
      setImportError("PDF 导出窗口被浏览器拦截，请允许弹窗后重试。");
    }
  };

  const saveResumeDraft = () => {
    saveResume(resume);
    trackEvent("resume_saved", sessionId, { trigger: "manual" });
  };

  const runAiAction = async (task: AiTask) => {
    setAiTask(task);
    setAiError("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ task, resume })
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const result = (await response.json()) as AiGatewayResponse;

      if (result.task === "generate_resume") {
        setResume(result.resume);
      }

      if (result.task === "rewrite_summary") {
        setResume((current) => ({ ...current, personalSummary: result.text }));
      }

      if (result.task === "rewrite_project") {
        setResume((current) => ({
          ...current,
          projects:
            current.projects.length > 0
              ? current.projects.map((project, index) => (index === 0 ? { ...project, description: result.text } : project))
              : [
                  {
                    title: "校招项目",
                    organization: "项目负责人",
                    startDate: "",
                    endDate: "",
                    description: result.text
                  }
                ]
        }));
      }

      if (result.task === "recommend_keywords") {
        setResume((current) => ({ ...current, skills: Array.from(new Set([...current.skills, ...result.keywords])) }));
      }

      trackEvent("ai_generated", sessionId, { task, provider: result.provider });
      setDashboardMetrics(getDashboardMetrics());
    } catch {
      setAiError("AI 生成失败，请稍后重试。");
    } finally {
      setAiTask(null);
    }
  };

  const runScoreAction = async () => {
    setIsScoring(true);
    setScoreError("");

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ resume })
      });

      if (!response.ok) {
        throw new Error("Score request failed");
      }

      const report = (await response.json()) as ScoreReport;
      setScoreReport(report);
      trackEvent("score_completed", sessionId, { score: report.overallScore });
      setDashboardMetrics(getDashboardMetrics());
    } catch {
      setScoreError("评分失败，请稍后重试。");
    } finally {
      setIsScoring(false);
    }
  };

  const submitFeedback = (target: FeedbackTarget, vote: FeedbackVote, reason: string, note: string) => {
    saveFeedback({
      sessionId,
      target,
      vote,
      reason,
      note
    });
    trackEvent("feedback_submitted", sessionId, { target, vote, reason });
    setDashboardMetrics(getDashboardMetrics());
    setFeedbackNotice("反馈已记录，感谢你帮我们校准产品。");
  };

  return (
    <main className="app-shell">
      <div className="workspace">
        <aside className="sidebar">
          <header className="brand">
            <div>
              <h1>ResumeLM</h1>
              <p>匿名开放的校招简历工作台，草稿默认保存在当前浏览器。</p>
            </div>
            <span className="session-chip" title={sessionId || "匿名会话生成中"}>
              <Sparkles size={14} />
              匿名草稿
            </span>
          </header>

          <div className="toolbar" aria-label="简历操作">
            <button className="primary-button" type="button" onClick={exportPdf}>
              <Download size={17} />
              导出 PDF
            </button>
            <button className="secondary-button" type="button" onClick={exportWord}>
              <FileText size={17} />
              导出 Word
            </button>
            <button className="primary-button" type="button" onClick={exportResume}>
              <Download size={17} />
              导出 JSON
            </button>
            <label className="icon-button" title="导入 JSON">
              <FileUp size={18} />
              <input accept="application/json" hidden type="file" onChange={importJson} />
            </label>
            <button className="icon-button" type="button" title="新建草稿" onClick={createResumeDraft}>
              <RotateCcw size={18} />
            </button>
            <button className="icon-button" type="button" title={saveState} onClick={saveResumeDraft}>
              <Save size={18} />
            </button>
          </div>

          {importError ? <p className="notice">{importError}</p> : null}

          {aiError ? <p className="notice">{aiError}</p> : null}

          {scoreError ? <p className="notice">{scoreError}</p> : null}

          {feedbackNotice ? <p className="success-notice">{feedbackNotice}</p> : null}

          {issues.length > 0 ? <p className="notice">{issues.map((issue) => issue.message).join("，")}。</p> : null}

          <form className="form">
            <section className="ai-panel" aria-label="AI 简历助手">
              <div>
                <span className="eyebrow">AI 简历助手</span>
                <strong>{aiTask ? "正在生成" : "可用"}</strong>
              </div>
              <div className="ai-actions">
                <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("generate_resume")}>
                  <Sparkles size={15} />
                  生成初稿
                </button>
                <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("rewrite_summary")}>
                  <Sparkles size={15} />
                  优化评价
                </button>
                <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("rewrite_project")}>
                  <Sparkles size={15} />
                  润色项目
                </button>
                <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("recommend_keywords")}>
                  <Sparkles size={15} />
                  推荐关键词
                </button>
              </div>
            </section>

            <section className="score-panel" aria-label="简历评分">
              <div>
                <span className="eyebrow">ATS / JD 评分</span>
                <strong>{scoreReport ? `${scoreReport.overallScore} 分` : "未评分"}</strong>
              </div>
              <button disabled={isScoring} type="button" onClick={runScoreAction}>
                <Target size={15} />
                {isScoring ? "评分中" : "生成评分"}
              </button>
            </section>

            <FeedbackPanel onSubmit={submitFeedback} />

            <IconSettingsPanel settings={iconSettings} onChange={updateIconSettings} />

            <SectionHeading icon={<BriefcaseBusiness size={15} />} title="基础信息" />
            <div className="field-grid two">
              <TextField label="姓名" value={resume.profile.name} onChange={(value) => updateProfile("name", value)} />
              <TextField label="目标岗位" value={resume.profile.targetRole} onChange={(value) => updateProfile("targetRole", value)} />
              <TextField label="联系方式" value={resume.profile.phone} onChange={(value) => updateProfile("phone", value)} />
              <TextField label="邮箱" value={resume.profile.email} onChange={(value) => updateProfile("email", value)} />
              <TextField label="城市" value={resume.profile.city} onChange={(value) => updateProfile("city", value)} />
            </div>

            <SectionHeading icon={<Sparkles size={15} />} title="个人评价" />
            <TextAreaField
              label="一句话总结"
              value={resume.personalSummary}
              onChange={(value) => setResume((current) => ({ ...current, personalSummary: value }))}
            />
            <TextAreaField
              label="个人优势，每行一条"
              value={resume.strengths.join("\n")}
              onChange={(value) => setResume((current) => ({ ...current, strengths: splitLines(value) }))}
            />

            <SectionHeading actionLabel="添加" icon={<GraduationCap size={15} />} title="教育经历" onAction={addEducation} />
            {resume.education.map((item, index) => (
              <EditorBlock key={index} title={`教育经历 ${index + 1}`} onRemove={() => removeEducation(index)}>
                <div className="field-grid two">
                  <TextField label="学校" value={item.school} onChange={(value) => updateEducation(index, "school", value)} />
                  <TextField label="学历" value={item.degree} onChange={(value) => updateEducation(index, "degree", value)} />
                  <TextField label="专业" value={item.major} onChange={(value) => updateEducation(index, "major", value)} />
                  <TextField label="开始时间" value={item.startDate} onChange={(value) => updateEducation(index, "startDate", value)} />
                  <TextField label="结束时间" value={item.endDate} onChange={(value) => updateEducation(index, "endDate", value)} />
                </div>
                <TextAreaField label="亮点" value={item.highlights} onChange={(value) => updateEducation(index, "highlights", value)} />
              </EditorBlock>
            ))}

            <ExperienceEditor
              items={resume.internships}
              section="internships"
              title="实习经历"
              onAdd={addExperience}
              onRemove={removeExperience}
              onUpdate={updateExperience}
            />
            <ExperienceEditor
              items={resume.projects}
              section="projects"
              title="项目经历"
              onAdd={addExperience}
              onRemove={removeExperience}
              onUpdate={updateExperience}
            />
            <ExperienceEditor
              items={resume.campusExperience}
              section="campusExperience"
              title="校园经历"
              onAdd={addExperience}
              onRemove={removeExperience}
              onUpdate={updateExperience}
            />

            <SectionHeading icon={<Sparkles size={15} />} title="技能与奖项" />
            <TextAreaField
              label="技能，每行一条"
              value={resume.skills.join("\n")}
              onChange={(value) => setResume((current) => ({ ...current, skills: splitLines(value) }))}
            />
            <TextAreaField
              label="奖项，每行一条"
              value={resume.awards.join("\n")}
              onChange={(value) => setResume((current) => ({ ...current, awards: splitLines(value) }))}
            />

            <SectionHeading icon={<BriefcaseBusiness size={15} />} title="目标 JD" />
            <TextField
              label="岗位名称"
              value={resume.targetJob.title}
              onChange={(value) => setResume((current) => ({ ...current, targetJob: { ...current.targetJob, title: value } }))}
            />
            <TextAreaField
              label="JD 原文"
              value={resume.targetJob.jdText}
              onChange={(value) => setResume((current) => ({ ...current, targetJob: { ...current.targetJob, jdText: value } }))}
            />
          </form>

          <div className="status-line">
            <Save size={14} />
            {saveState}
          </div>
        </aside>

        <section className="preview-shell" aria-label="简历预览">
          {dashboardMetrics ? <DashboardPanel metrics={dashboardMetrics} /> : null}
          {scoreReport ? <ScoreReportView report={scoreReport} /> : null}
          <div className="preview-toolbar">
            <div>
              <span className="eyebrow">模板预览</span>
              <strong>{templates.find((template) => template.id === templateId)?.label}</strong>
            </div>
            <div className="segmented" aria-label="选择模板">
              {templates.map((template) => (
                <button
                  className={template.id === templateId ? "active" : ""}
                  key={template.id}
                  type="button"
                  onClick={() => setTemplateId(template.id)}
                >
                  <LayoutTemplate size={14} />
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          <ResumePreview resume={resume} templateId={templateId} />
        </section>
      </div>
    </main>
  );
}

function FeedbackPanel({
  onSubmit
}: {
  onSubmit: (target: FeedbackTarget, vote: FeedbackVote, reason: string, note: string) => void;
}) {
  const [target, setTarget] = useState<FeedbackTarget>("overall");
  const [vote, setVote] = useState<FeedbackVote>("up");
  const [reason, setReason] = useState(feedbackReasons.up[0]);
  const [note, setNote] = useState("");

  const updateVote = (nextVote: FeedbackVote) => {
    setVote(nextVote);
    setReason(feedbackReasons[nextVote][0]);
  };

  return (
    <section className="feedback-panel" aria-label="产品反馈">
      <div className="feedback-head">
        <div>
          <span className="eyebrow">产品反馈</span>
          <strong>点赞 / 点踩</strong>
        </div>
        <MessageSquare size={18} />
      </div>
      <div className="feedback-controls">
        <select value={target} onChange={(event) => setTarget(event.target.value as FeedbackTarget)}>
          <option value="overall">整体体验</option>
          <option value="ai">AI 结果</option>
          <option value="score">评分报告</option>
          <option value="export">导出体验</option>
        </select>
        <div className="vote-toggle">
          <button className={vote === "up" ? "active" : ""} type="button" onClick={() => updateVote("up")}>
            <ThumbsUp size={15} />
            赞
          </button>
          <button className={vote === "down" ? "active" : ""} type="button" onClick={() => updateVote("down")}>
            <ThumbsDown size={15} />
            踩
          </button>
        </div>
        <select value={reason} onChange={(event) => setReason(event.target.value)}>
          {feedbackReasons[vote].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <textarea placeholder="补充一句具体感受" value={note} onChange={(event) => setNote(event.target.value)} />
        <button className="primary-button" type="button" onClick={() => onSubmit(target, vote, reason, note)}>
          提交反馈
        </button>
      </div>
    </section>
  );
}

function IconSettingsPanel({
  onChange,
  settings
}: {
  onChange: (nextSettings: Partial<ResumeIconSettings>) => void;
  settings: ResumeIconSettings;
}) {
  const fields: Array<{ key: keyof Omit<ResumeIconSettings, "enabled">; label: string }> = [
    { key: "phone", label: "电话前" },
    { key: "email", label: "邮箱前" },
    { key: "city", label: "地址前" },
    { key: "targetRole", label: "岗位前" },
    { key: "personalSummary", label: "个人评价" },
    { key: "strengths", label: "个人优势" },
    { key: "education", label: "教育经历" },
    { key: "internships", label: "实习经历" },
    { key: "projects", label: "项目经历" },
    { key: "campusExperience", label: "校园经历" },
    { key: "skills", label: "技能" },
    { key: "awards", label: "奖项" }
  ];

  return (
    <section className="icon-settings-panel" aria-label="简历小图标">
      <div className="icon-settings-head">
        <div>
          <span className="eyebrow">简历小图标</span>
          <strong>{settings.enabled ? "已开启" : "未开启"}</strong>
        </div>
        <label className="switch-field">
          <input
            checked={settings.enabled}
            type="checkbox"
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          使用图标
        </label>
      </div>
      <div className="icon-settings-grid">
        {fields.map((field) => (
          <label className="icon-select" key={field.key}>
            <span>{field.label}样式</span>
            <select
              disabled={!settings.enabled}
              value={settings[field.key]}
              onChange={(event) => onChange({ [field.key]: event.target.value as ResumeIconId })}
            >
              {iconStyleOptions[field.key].map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function DashboardPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <details className="dashboard-panel" aria-label="BI 看板">
      <summary className="dashboard-summary">
        <span>BI 看板 · 本地运营指标</span>
        <strong>{metrics.positiveRate}% 好评率</strong>
      </summary>
      <div className="dashboard-content">
        <div className="metric-grid">
          <MetricCard label="会话" value={metrics.sessions} />
          <MetricCard label="事件" value={metrics.events} />
          <MetricCard label="AI" value={metrics.aiRuns} />
          <MetricCard label="评分" value={metrics.scores} />
          <MetricCard label="导出" value={metrics.exports} />
          <MetricCard label="赞/踩" value={`${metrics.upVotes}/${metrics.downVotes}`} />
        </div>
        <div className="reason-rank">
          <span>差评原因</span>
          {metrics.topDownReasons.length ? (
            metrics.topDownReasons.map((item) => (
              <strong key={item.reason}>
                {item.reason} · {item.count}
              </strong>
            ))
          ) : (
            <strong>暂无</strong>
          )}
        </div>
      </div>
    </details>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionHeading({
  actionLabel,
  icon,
  onAction,
  title
}: {
  actionLabel?: string;
  icon: React.ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="section-title">
      <span>
        {icon}
        {title}
      </span>
      {onAction ? (
        <button className="tiny-action" type="button" onClick={onAction}>
          <Plus size={14} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function EditorBlock({ children, onRemove, title }: { children: React.ReactNode; onRemove: () => void; title: string }) {
  return (
    <div className="editor-block">
      <div className="editor-block-head">
        <strong>{title}</strong>
        <button className="ghost-icon" title="删除" type="button" onClick={onRemove}>
          <Trash2 size={15} />
        </button>
      </div>
      {children}
    </div>
  );
}

function TextField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ExperienceEditor({
  items,
  onAdd,
  onRemove,
  onUpdate,
  section,
  title
}: {
  items: Experience[];
  onAdd: (section: ExperienceSection) => void;
  onRemove: (section: ExperienceSection, index: number) => void;
  onUpdate: (section: ExperienceSection, index: number, field: keyof Experience, value: string) => void;
  section: ExperienceSection;
  title: string;
}) {
  return (
    <>
      <SectionHeading icon={<BriefcaseBusiness size={15} />} title={title} actionLabel="添加" onAction={() => onAdd(section)} />
      {items.length === 0 ? <p className="empty-line">暂无内容</p> : null}
      {items.map((item, index) => (
        <EditorBlock key={index} title={`${title} ${index + 1}`} onRemove={() => onRemove(section, index)}>
          <div className="field-grid two">
            <TextField label="名称" value={item.title} onChange={(value) => onUpdate(section, index, "title", value)} />
            <TextField label="组织 / 角色" value={item.organization} onChange={(value) => onUpdate(section, index, "organization", value)} />
            <TextField label="开始时间" value={item.startDate} onChange={(value) => onUpdate(section, index, "startDate", value)} />
            <TextField label="结束时间" value={item.endDate} onChange={(value) => onUpdate(section, index, "endDate", value)} />
          </div>
          <TextAreaField label="描述" value={item.description} onChange={(value) => onUpdate(section, index, "description", value)} />
        </EditorBlock>
      ))}
    </>
  );
}

function ResumePreview({ resume, templateId }: { resume: ResumeDocument; templateId: TemplateId }) {
  const internships = resume.internships.filter(hasExperienceContent);
  const projects = resume.projects.filter(hasExperienceContent);
  const campusExperience = resume.campusExperience.filter(hasExperienceContent);
  const skills = nonEmpty(resume.skills);
  const awards = nonEmpty(resume.awards);
  const iconSettings = normalizeIconSettings(resume.iconSettings);
  const iconEnabled = iconSettings.enabled;
  const contactItems = [
    { icon: iconSettings.phone, text: resume.profile.phone || "电话" },
    { icon: iconSettings.email, text: resume.profile.email || "邮箱" },
    { icon: iconSettings.city, text: resume.profile.city || "城市" }
  ];

  return (
    <article className={`resume-paper template-${templateId}`}>
      <header className="resume-head">
        <div>
          <h2>{resume.profile.name || "你的姓名"}</h2>
          <p className="resume-contact-line">
            {contactItems.map((item, index) => (
              <span className="resume-contact-item" key={`${item.icon}-${index}`}>
                <ResumeIcon enabled={iconEnabled} iconId={item.icon} />
                {item.text}
              </span>
            ))}
          </p>
        </div>
        <div className="resume-photo" aria-hidden="true">
          照片
        </div>
        <div className="resume-target">
          <ResumeIcon enabled={iconEnabled} iconId={iconSettings.targetRole} />
          {resume.profile.targetRole || resume.targetJob.title || "目标岗位"}
        </div>
      </header>

      <ResumeSection iconEnabled={iconEnabled} iconId={iconSettings.personalSummary} title="个人评价">
        {resume.personalSummary || "用 2-3 句话概括你的背景、能力和求职方向。"}
      </ResumeSection>

      <TagSection
        iconEnabled={iconEnabled}
        iconId={iconSettings.strengths}
        items={nonEmpty(resume.strengths).length ? nonEmpty(resume.strengths) : ["学习能力", "项目执行", "沟通协作"]}
        title="个人优势"
      />

      <section className="resume-section">
        <h3>
          <ResumeIcon enabled={iconEnabled} iconId={iconSettings.education} />
          教育经历
        </h3>
        {(resume.education.length ? resume.education : [blankEducation()]).map((item, index) => (
          <div className="resume-item" key={index}>
            <div className="resume-row">
              <strong>{item.school || "学校名称"}</strong>
              <span className="muted">{joinDateRange(item.startDate, item.endDate) || "起止时间"}</span>
            </div>
            <p className="muted">{[item.degree, item.major].filter(Boolean).join(" · ") || "专业 / 学历"}</p>
            <p>{item.highlights || "成绩、奖学金、课程或校园经历亮点。"}</p>
          </div>
        ))}
      </section>

      <ExperiencePreview
        fallback="实习经历会展示在这里。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.internships}
        items={internships}
        title="实习经历"
      />
      <ExperiencePreview
        fallback="描述你做了什么、如何做、带来了什么结果。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.projects}
        items={projects}
        title="项目经历"
      />
      <ExperiencePreview
        fallback="学生组织、社团、竞赛或志愿经历。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.campusExperience}
        items={campusExperience}
        title="校园经历"
      />
      <TagSection
        iconEnabled={iconEnabled}
        iconId={iconSettings.skills}
        items={skills.length ? skills : ["数据分析", "用户研究", "文档表达"]}
        title="技能"
      />
      {awards.length ? <ListSection iconEnabled={iconEnabled} iconId={iconSettings.awards} items={awards} title="奖项" /> : null}
    </article>
  );
}

const dimensionLabels: Record<ScoreDimension, string> = {
  ats_compatibility: "ATS 结构",
  content_completeness: "内容完整",
  keyword_match: "关键词匹配",
  quantified_impact: "成果量化",
  summary_strength: "个人优势",
  readability: "可读性"
};

const dimensionMaxScores: Record<ScoreDimension, number> = {
  ats_compatibility: 25,
  content_completeness: 20,
  keyword_match: 30,
  quantified_impact: 10,
  summary_strength: 10,
  readability: 5
};

function ScoreReportView({ report }: { report: ScoreReport }) {
  const dimensions = Object.entries(report.dimensionScores) as Array<[ScoreDimension, number]>;

  return (
    <section className="score-report" aria-label="评分报告">
      <div className="score-hero">
        <div>
          <span className="eyebrow">评分报告</span>
          <strong>{report.overallScore}</strong>
        </div>
        <p>基于规则引擎检查 ATS 结构、内容完整度、JD 关键词覆盖和表达质量。</p>
      </div>

      <div className="score-grid">
        {dimensions.map(([dimension, score]) => (
          <div className="score-dimension" key={dimension}>
            <div>
              <span>{dimensionLabels[dimension]}</span>
              <strong>
                {score}/{dimensionMaxScores[dimension]}
              </strong>
            </div>
            <progress max={dimensionMaxScores[dimension]} value={score} />
          </div>
        ))}
      </div>

      <div className="score-columns">
        <KeywordGroup items={report.matchedKeywords} title="已覆盖关键词" />
        <KeywordGroup items={report.missingKeywords} title="建议补充关键词" />
      </div>

      <div className="suggestion-list">
        <h3>改进建议</h3>
        {report.suggestions.length === 0 ? <p>当前简历结构较完整，可以继续根据目标岗位微调措辞。</p> : null}
        {report.suggestions.map((suggestion, index) => (
          <div className="suggestion-item" key={`${suggestion.priority}-${index}`}>
            <span>{suggestion.priority}</span>
            <p>{suggestion.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function KeywordGroup({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="keyword-group">
      <h3>{title}</h3>
      <div className="keyword-list">
        {(items.length ? items : ["暂无"]).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function ResumeSection({
  children,
  iconEnabled,
  iconId,
  title
}: {
  children: React.ReactNode;
  iconEnabled: boolean;
  iconId: ResumeIconId;
  title: string;
}) {
  return (
    <section className="resume-section">
      <h3>
        <ResumeIcon enabled={iconEnabled} iconId={iconId} />
        {title}
      </h3>
      <p>{children}</p>
    </section>
  );
}

function ExperiencePreview({
  fallback,
  iconEnabled,
  iconId,
  items,
  title
}: {
  fallback: string;
  iconEnabled: boolean;
  iconId: ResumeIconId;
  items: Experience[];
  title: string;
}) {
  return (
    <section className="resume-section">
      <h3>
        <ResumeIcon enabled={iconEnabled} iconId={iconId} />
        {title}
      </h3>
      {items.length === 0 ? <p>{fallback}</p> : null}
      {items.map((item, index) => (
        <div className="resume-item" key={`${title}-${index}`}>
          <div className="resume-row">
            <strong>{item.title || "名称"}</strong>
            <span className="muted">{joinDateRange(item.startDate, item.endDate)}</span>
          </div>
          {item.organization ? <p className="muted">{item.organization}</p> : null}
          <p>{item.description || fallback}</p>
        </div>
      ))}
    </section>
  );
}

function TagSection({
  iconEnabled,
  iconId,
  items,
  title
}: {
  iconEnabled: boolean;
  iconId: ResumeIconId;
  items: string[];
  title: string;
}) {
  return (
    <section className="resume-section">
      <h3>
        <ResumeIcon enabled={iconEnabled} iconId={iconId} />
        {title}
      </h3>
      <div className="skill-list">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function ListSection({
  iconEnabled,
  iconId,
  items,
  title
}: {
  iconEnabled: boolean;
  iconId: ResumeIconId;
  items: string[];
  title: string;
}) {
  return (
    <section className="resume-section">
      <h3>
        <ResumeIcon enabled={iconEnabled} iconId={iconId} />
        {title}
      </h3>
      <ul className="resume-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
