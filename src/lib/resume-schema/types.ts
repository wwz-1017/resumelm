export type ResumeProfile = {
  name: string;
  phone: string;
  email: string;
  city: string;
  targetRole: string;
  photo?: ResumePhoto;
};

export type ResumePhoto = {
  dataUrl: string;
  fileName: string;
  crop: {
    x: number;
    y: number;
    zoom: number;
  };
};

export type ResumePhotoSettings = {
  visible: boolean;
  width: number;
  height: number;
  position: "left" | "right";
};

export type ResumeDecorationSettings = {
  offsetX: number;
  offsetY: number;
};

export type ResumeTemplateColorId = "original" | "rose" | "darkBlue" | "skyBlue" | "darkGray" | "taupe" | "orange";

export type ResumeTemplateSettings = {
  color: ResumeTemplateColorId;
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
  | "phone"
  | "mobile"
  | "hotline"
  | "headset"
  | "email"
  | "inbox"
  | "sendMail"
  | "mailBadge"
  | "pin"
  | "map"
  | "mapPin"
  | "compass"
  | "briefcase"
  | "idCard"
  | "building"
  | "trend"
  | "user"
  | "maleUser"
  | "femaleUser"
  | "profileBadge"
  | "heart"
  | "star"
  | "badgeCheck"
  | "work"
  | "education"
  | "address"
  | "sport"
  | "hobby"
  | "other"
  | "graduation"
  | "book"
  | "school"
  | "medal"
  | "award"
  | "dumbbell"
  | "trophy"
  | "activity"
  | "sparkles"
  | "bookmark"
  | "tag"
  | "dot";

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

export type ResumeFontId = "microsoftYahei" | "simsun" | "simhei" | "kaiti" | "fangsong" | "pingfang" | "times" | "georgia";

export type ResumeColorId = "black" | "darkGray" | "darkBlue" | "mossGreen";

export type ResumeHeaderAlignment = "center" | "left" | "right";

export type ResumeStyleSettings = {
  headingFont: ResumeFontId;
  bodyFont: ResumeFontId;
  headerAlignment: ResumeHeaderAlignment;
  nameSize: number;
  sectionTitleSize: number;
  bodySize: number;
  nameColor: ResumeColorId;
  sectionTitleColor: ResumeColorId;
  bodyColor: ResumeColorId;
  accentColor: ResumeColorId;
};

export type ResumeVisibilitySettings = {
  personalSummary: boolean;
  strengths: boolean;
  education: boolean;
  internships: boolean;
  projects: boolean;
  campusExperience: boolean;
  skills: boolean;
  awards: boolean;
};

export type ResumeModuleId = keyof ResumeVisibilitySettings;

export type ResumeDocument = {
  schemaVersion: 1;
  id: string;
  updatedAt: string;
  profile: ResumeProfile;
  iconSettings?: ResumeIconSettings;
  styleSettings?: ResumeStyleSettings;
  visibilitySettings?: ResumeVisibilitySettings;
  photoSettings?: ResumePhotoSettings;
  decorationSettings?: ResumeDecorationSettings;
  templateSettings?: ResumeTemplateSettings;
  moduleOrder?: ResumeModuleId[];
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
