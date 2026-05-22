import type { ResumeDocument, ResumeIconId, ResumeIconSettings } from "./types";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `resume-${Date.now()}`;
};

export const createEmptyResume = (): ResumeDocument => ({
  schemaVersion: 1,
  id: createId(),
  updatedAt: new Date().toISOString(),
  profile: {
    name: "",
    phone: "",
    email: "",
    city: "",
    targetRole: ""
  },
  iconSettings: createDefaultIconSettings(),
  personalSummary: "",
  strengths: ["", "", ""],
  education: [
    {
      school: "",
      degree: "",
      major: "",
      startDate: "",
      endDate: "",
      highlights: ""
    }
  ],
  internships: [],
  projects: [
    {
      title: "",
      organization: "",
      startDate: "",
      endDate: "",
      description: ""
    }
  ],
  campusExperience: [],
  skills: [],
  awards: [],
  targetJob: {
    title: "",
    jdText: ""
  }
});

export function createDefaultIconSettings(): ResumeIconSettings {
  return {
    enabled: false,
    phone: "phone",
    email: "email",
    city: "pin",
    targetRole: "briefcase",
    personalSummary: "user",
    strengths: "heart",
    education: "graduation",
    internships: "briefcase",
    projects: "sparkles",
    campusExperience: "star",
    skills: "tag",
    awards: "award"
  };
}

export function normalizeIconSettings(settings?: Partial<ResumeIconSettings>): ResumeIconSettings {
  const defaults = createDefaultIconSettings();
  const next = { ...defaults, ...settings };
  const legacyMap: Partial<Record<ResumeIconId, ResumeIconId>> = {
    address: "pin",
    work: "briefcase",
    education: "graduation",
    hobby: "heart",
    other: "sparkles",
    sport: "dumbbell"
  };

  return {
    ...next,
    phone: legacyMap[next.phone] ?? next.phone,
    email: legacyMap[next.email] ?? next.email,
    city: legacyMap[next.city] ?? next.city,
    targetRole: legacyMap[next.targetRole] ?? next.targetRole,
    personalSummary: legacyMap[next.personalSummary] ?? next.personalSummary,
    strengths: legacyMap[next.strengths] ?? next.strengths,
    education: legacyMap[next.education] ?? next.education,
    internships: legacyMap[next.internships] ?? next.internships,
    projects: legacyMap[next.projects] ?? next.projects,
    campusExperience: legacyMap[next.campusExperience] ?? next.campusExperience,
    skills: legacyMap[next.skills] ?? next.skills,
    awards: legacyMap[next.awards] ?? next.awards
  };
}
