import {
  createEmptyResume,
  normalizeIconSettings,
  normalizeModuleOrder,
  normalizePhotoSettings,
  normalizeStyleSettings,
  normalizeVisibilitySettings
} from "@/lib/resume-schema/defaults";
import type { ResumeDocument } from "@/lib/resume-schema/types";
import { isResumeDocument } from "@/lib/resume-schema/validate";

const RESUME_KEY = "resumelm.resume.v1";
const SESSION_KEY = "resumelm.anonymous-session.v1";

const createSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `anon-${crypto.randomUUID()}`;
  }

  return `anon-${Date.now()}`;
};

export const getAnonymousSessionId = () => {
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const sessionId = createSessionId();
  window.localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
};

export const loadResume = (): ResumeDocument => {
  const raw = window.localStorage.getItem(RESUME_KEY);
  if (!raw) return createEmptyResume();

  try {
    const parsed = JSON.parse(raw);
    return isResumeDocument(parsed)
      ? {
          ...parsed,
          iconSettings: normalizeIconSettings(parsed.iconSettings),
          styleSettings: normalizeStyleSettings(parsed.styleSettings),
          visibilitySettings: normalizeVisibilitySettings(parsed.visibilitySettings),
          photoSettings: normalizePhotoSettings(parsed.photoSettings),
          moduleOrder: normalizeModuleOrder(parsed.moduleOrder)
        }
      : createEmptyResume();
  } catch {
    return createEmptyResume();
  }
};

export const saveResume = (resume: ResumeDocument) => {
  window.localStorage.setItem(
    RESUME_KEY,
    JSON.stringify({
      ...resume,
      updatedAt: new Date().toISOString()
    })
  );
};

export const resetResume = () => {
  const nextResume = createEmptyResume();
  saveResume(nextResume);
  return nextResume;
};

export const downloadResumeJson = (resume: ResumeDocument) => {
  const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `resumelm-${resume.profile.name || "draft"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export type SavedResumeItem = {
  id: string; title: string; source: "template" | "imported"; templateId?: string;
  resume: ResumeDocument; createdAt: string; updatedAt: string;
};

const SAVED_KEY = "resumelm.saved-resumes.v1";

export const listSavedResumes = (): SavedResumeItem[] => {
  try { const raw = localStorage.getItem(SAVED_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
};

const saveItems = (items: SavedResumeItem[]) => { localStorage.setItem(SAVED_KEY, JSON.stringify(items)); };

export const upsertSavedResume = (resume: ResumeDocument, source: "template" | "imported", existingId?: string) => {
  const now = new Date().toISOString();
  const id = existingId || `resume-${Date.now()}`;
  const item: SavedResumeItem = { id, title: resume.profile.name ? `${resume.profile.name}的简历` : "未命名简历", source, resume, createdAt: now, updatedAt: now };
  const items = listSavedResumes().filter((i) => i.id !== id);
  saveItems([item, ...items]);
  return item;
};

export const deleteSavedResume = (id: string) => { saveItems(listSavedResumes().filter((i) => i.id !== id)); };

export const duplicateSavedResume = (id: string): SavedResumeItem | null => {
  const item = listSavedResumes().find((i) => i.id === id);
  if (!item) return null;
  const now = new Date().toISOString();
  const dup: SavedResumeItem = { ...item, id: `resume-${Date.now()}`, title: `${item.title} 副本`, createdAt: now, updatedAt: now };
  saveItems([dup, ...listSavedResumes()]);
  return dup;
};
