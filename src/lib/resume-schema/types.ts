export type ResumeProfile = {
  name: string;
  phone: string;
  email: string;
  city: string;
  targetRole: string;
};

export type Education = {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  highlights: string;
};

export type Experience = {
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type ResumeIconId =
  | "none"
  | "user"
  | "work"
  | "education"
  | "phone"
  | "email"
  | "address"
  | "sport"
  | "hobby"
  | "other";

export type ResumeIconSettings = {
  enabled: boolean;
  phone: ResumeIconId;
  email: ResumeIconId;
  city: ResumeIconId;
  targetRole: ResumeIconId;
  personalSummary: ResumeIconId;
  strengths: ResumeIconId;
  education: ResumeIconId;
  internships: ResumeIconId;
  projects: ResumeIconId;
  campusExperience: ResumeIconId;
  skills: ResumeIconId;
  awards: ResumeIconId;
};

export type ResumeDocument = {
  schemaVersion: 1;
  id: string;
  updatedAt: string;
  profile: ResumeProfile;
  iconSettings?: ResumeIconSettings;
  personalSummary: string;
  strengths: string[];
  education: Education[];
  internships: Experience[];
  projects: Experience[];
  campusExperience: Experience[];
  skills: string[];
  awards: string[];
  targetJob: {
    title: string;
    jdText: string;
  };
};

export type ResumeValidationIssue = {
  path: string;
  message: string;
};
