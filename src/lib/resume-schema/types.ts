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

export type ResumeDocument = {
  schemaVersion: 1;
  id: string;
  updatedAt: string;
  profile: ResumeProfile;
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
