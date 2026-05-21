"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { ChangeEvent, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Download,
  FileUp,
  GraduationCap,
  LayoutTemplate,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2
} from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";
import { createEmptyResume } from "@/lib/resume-schema/defaults";
import type { Education, Experience, ResumeDocument } from "@/lib/resume-schema/types";
import { isResumeDocument, validateResume } from "@/lib/resume-schema/validate";
import {
  downloadResumeJson,
  getAnonymousSessionId,
  loadResume,
  resetResume,
  saveResume
} from "@/lib/storage/local-resume-store";

type TemplateId = "classic" | "compact" | "project";
type ExperienceSection = "internships" | "projects" | "campusExperience";

const templates: Array<{ id: TemplateId; label: string }> = [
  { id: "classic", label: "标准" },
  { id: "compact", label: "极简" },
  { id: "project", label: "项目" }
];

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

export function ResumeWorkspace() {
  const [resume, setResume] = useState<ResumeDocument>(() => createEmptyResume());
  const [sessionId, setSessionId] = useState("");
  const [saveState, setSaveState] = useState("正在准备本地草稿");
  const [importError, setImportError] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("classic");
  const issues = validateResume(resume);

  useEffect(() => {
    const nextSessionId = getAnonymousSessionId();
    setSessionId(nextSessionId);
    setResume(loadResume());
    trackEvent("workspace_entered", nextSessionId);
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
  };

  const saveResumeDraft = () => {
    saveResume(resume);
    trackEvent("resume_saved", sessionId, { trigger: "manual" });
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

          {issues.length > 0 ? <p className="notice">{issues.map((issue) => issue.message).join("，")}。</p> : null}

          <form className="form">
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

  return (
    <article className={`resume-paper template-${templateId}`}>
      <header className="resume-head">
        <div>
          <h2>{resume.profile.name || "你的姓名"}</h2>
          <p>
            {[resume.profile.phone, resume.profile.email, resume.profile.city].filter(Boolean).join(" · ") ||
              "电话 · 邮箱 · 城市"}
          </p>
        </div>
        <div className="resume-target">{resume.profile.targetRole || resume.targetJob.title || "目标岗位"}</div>
      </header>

      <ResumeSection title="个人评价">{resume.personalSummary || "用 2-3 句话概括你的背景、能力和求职方向。"}</ResumeSection>

      <TagSection items={nonEmpty(resume.strengths).length ? nonEmpty(resume.strengths) : ["学习能力", "项目执行", "沟通协作"]} title="个人优势" />

      <section className="resume-section">
        <h3>教育经历</h3>
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

      <ExperiencePreview fallback="实习经历会展示在这里。" items={internships} title="实习经历" />
      <ExperiencePreview fallback="描述你做了什么、如何做、带来了什么结果。" items={projects} title="项目经历" />
      <ExperiencePreview fallback="学生组织、社团、竞赛或志愿经历。" items={campusExperience} title="校园经历" />
      <TagSection items={skills.length ? skills : ["数据分析", "用户研究", "文档表达"]} title="技能" />
      {awards.length ? <ListSection items={awards} title="奖项" /> : null}
    </article>
  );
}

function ResumeSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="resume-section">
      <h3>{title}</h3>
      <p>{children}</p>
    </section>
  );
}

function ExperiencePreview({ fallback, items, title }: { fallback: string; items: Experience[]; title: string }) {
  return (
    <section className="resume-section">
      <h3>{title}</h3>
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

function TagSection({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="resume-section">
      <h3>{title}</h3>
      <div className="skill-list">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function ListSection({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="resume-section">
      <h3>{title}</h3>
      <ul className="resume-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
