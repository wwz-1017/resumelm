"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { ChangeEvent, useEffect, useState } from "react";
import { Download, FileUp, RotateCcw, Save, Sparkles } from "lucide-react";
import type { ResumeDocument } from "@/lib/resume-schema/types";
import { trackEvent } from "@/lib/analytics/track";
import { createEmptyResume } from "@/lib/resume-schema/defaults";
import { isResumeDocument, validateResume } from "@/lib/resume-schema/validate";
import {
  downloadResumeJson,
  getAnonymousSessionId,
  loadResume,
  resetResume,
  saveResume
} from "@/lib/storage/local-resume-store";

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export function ResumeWorkspace() {
  const [resume, setResume] = useState<ResumeDocument>(() => createEmptyResume());
  const [sessionId, setSessionId] = useState("");
  const [saveState, setSaveState] = useState("正在准备本地草稿");
  const [importError, setImportError] = useState("");
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

  const updateEducation = (field: keyof ResumeDocument["education"][number], value: string) => {
    setResume((current) => ({
      ...current,
      education: [
        {
          ...current.education[0],
          [field]: value
        }
      ]
    }));
  };

  const updateProject = (field: keyof ResumeDocument["projects"][number], value: string) => {
    setResume((current) => ({
      ...current,
      projects: [
        {
          ...current.projects[0],
          [field]: value
        }
      ]
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

          {issues.length > 0 ? (
            <p className="notice">{issues.map((issue) => issue.message).join("，")}。</p>
          ) : null}

          <form className="form">
            <div className="section-title">基础信息</div>
            <label className="field">
              <span>姓名</span>
              <input value={resume.profile.name} onChange={(event) => updateProfile("name", event.target.value)} />
            </label>
            <label className="field">
              <span>目标岗位</span>
              <input
                value={resume.profile.targetRole}
                onChange={(event) => updateProfile("targetRole", event.target.value)}
              />
            </label>
            <label className="field">
              <span>联系方式</span>
              <input value={resume.profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} />
            </label>
            <label className="field">
              <span>邮箱</span>
              <input value={resume.profile.email} onChange={(event) => updateProfile("email", event.target.value)} />
            </label>

            <div className="section-title">个人评价</div>
            <label className="field">
              <span>一句话总结</span>
              <textarea
                value={resume.personalSummary}
                onChange={(event) => setResume((current) => ({ ...current, personalSummary: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>个人优势，每行一条</span>
              <textarea
                value={resume.strengths.join("\n")}
                onChange={(event) => setResume((current) => ({ ...current, strengths: splitLines(event.target.value) }))}
              />
            </label>

            <div className="section-title">教育经历</div>
            <label className="field">
              <span>学校</span>
              <input value={resume.education[0]?.school ?? ""} onChange={(event) => updateEducation("school", event.target.value)} />
            </label>
            <label className="field">
              <span>学历 / 专业</span>
              <input
                value={resume.education[0]?.major ?? ""}
                onChange={(event) => updateEducation("major", event.target.value)}
              />
            </label>
            <label className="field">
              <span>亮点</span>
              <textarea
                value={resume.education[0]?.highlights ?? ""}
                onChange={(event) => updateEducation("highlights", event.target.value)}
              />
            </label>

            <div className="section-title">项目经历</div>
            <label className="field">
              <span>项目名称</span>
              <input value={resume.projects[0]?.title ?? ""} onChange={(event) => updateProject("title", event.target.value)} />
            </label>
            <label className="field">
              <span>项目描述</span>
              <textarea
                value={resume.projects[0]?.description ?? ""}
                onChange={(event) => updateProject("description", event.target.value)}
              />
            </label>
          </form>

          <div className="status-line">
            <Save size={14} />
            {saveState}
          </div>
        </aside>

        <section className="preview-shell" aria-label="简历预览">
          <article className="resume-paper">
            <header className="resume-head">
              <div>
                <h2>{resume.profile.name || "你的姓名"}</h2>
                <p>
                  {[resume.profile.phone, resume.profile.email, resume.profile.city].filter(Boolean).join(" · ") ||
                    "电话 · 邮箱 · 城市"}
                </p>
              </div>
              <div className="resume-target">{resume.profile.targetRole || "目标岗位"}</div>
            </header>

            <ResumeSection title="个人评价">
              {resume.personalSummary || "用 2-3 句话概括你的背景、能力和求职方向。"}
            </ResumeSection>

            <section className="resume-section">
              <h3>个人优势</h3>
              <div className="skill-list">
                {(resume.strengths.filter(Boolean).length ? resume.strengths.filter(Boolean) : ["学习能力", "项目执行", "沟通协作"]).map(
                  (item) => (
                    <span key={item}>{item}</span>
                  )
                )}
              </div>
            </section>

            <section className="resume-section">
              <h3>教育经历</h3>
              <div className="resume-row">
                <strong>{resume.education[0]?.school || "学校名称"}</strong>
                <span className="muted">{resume.education[0]?.major || "专业 / 学历"}</span>
              </div>
              <p>{resume.education[0]?.highlights || "成绩、奖学金、课程或校园经历亮点。"}</p>
            </section>

            <section className="resume-section">
              <h3>项目经历</h3>
              <div className="resume-row">
                <strong>{resume.projects[0]?.title || "项目名称"}</strong>
                <span className="muted">{resume.projects[0]?.organization || "项目角色"}</span>
              </div>
              <p>{resume.projects[0]?.description || "描述你做了什么、如何做、带来了什么结果。"}</p>
            </section>
          </article>
        </section>
      </div>
    </main>
  );
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="resume-section">
      <h3>{title}</h3>
      <p>{children}</p>
    </section>
  );
}
