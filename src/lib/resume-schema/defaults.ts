import type { ResumeDocument, ResumeIconSettings } from "./types";

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
    city: "address",
    targetRole: "work",
    personalSummary: "user",
    strengths: "hobby",
    education: "education",
    internships: "work",
    projects: "other",
    campusExperience: "hobby",
    skills: "other",
    awards: "other"
  };
}
