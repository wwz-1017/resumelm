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
  const blob = new Blob([JSON.stringify(resume, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `resumelm-${resume.profile.name || "draft"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
