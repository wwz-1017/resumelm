import type {
  ResumeColorId,
  ResumeDecorationSettings,
  ResumeDocument,
  ResumeFontId,
  ResumeHeaderAlignment,
  ResumeIconId,
  ResumeIconSettings,
  ResumeModuleId,
  ResumePhotoSettings,
  ResumeStyleSettings,
  ResumeTemplateColorId,
  ResumeTemplateSettings,
  ResumeVisibilitySettings
} from "./types";

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
    targetRole: "",
    photo: undefined
  },
  iconSettings: createDefaultIconSettings(),
  styleSettings: createDefaultStyleSettings(),
  visibilitySettings: createDefaultVisibilitySettings(),
  photoSettings: createDefaultPhotoSettings(),
  decorationSettings: createDefaultDecorationSettings(),
  templateSettings: createDefaultTemplateSettings(),
  moduleOrder: createDefaultModuleOrder(),
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

export function createDefaultStyleSettings(): ResumeStyleSettings {
  return {
    headingFont: "georgia",
    bodyFont: "pingfang",
    headerAlignment: "center",
    nameSize: 38,
    sectionTitleSize: 15,
    bodySize: 14,
    nameColor: "black",
    sectionTitleColor: "mossGreen",
    bodyColor: "black",
    accentColor: "mossGreen"
  };
}

const fontIds: ResumeFontId[] = ["microsoftYahei", "simsun", "simhei", "kaiti", "fangsong", "pingfang", "times", "georgia"];
const colorIds: ResumeColorId[] = ["black", "darkGray", "darkBlue", "mossGreen"];
const headerAlignments: ResumeHeaderAlignment[] = ["center", "left", "right"];
const nameSizes = [24, 28, 32, 36, 38, 40];
const sectionTitleSizes = [13, 14, 15, 16, 18];
const bodySizes = [12, 13, 14, 15, 16];

const pickOption = <T>(value: unknown, options: T[], fallback: T): T => (options.includes(value as T) ? (value as T) : fallback);

export function normalizeStyleSettings(settings?: Partial<ResumeStyleSettings>): ResumeStyleSettings {
  const defaults = createDefaultStyleSettings();
  const next = { ...defaults, ...settings };

  return {
    headingFont: pickOption(next.headingFont, fontIds, defaults.headingFont),
    bodyFont: pickOption(next.bodyFont, fontIds, defaults.bodyFont),
    headerAlignment: pickOption(next.headerAlignment, headerAlignments, defaults.headerAlignment),
    nameSize: pickOption(next.nameSize, nameSizes, defaults.nameSize),
    sectionTitleSize: pickOption(next.sectionTitleSize, sectionTitleSizes, defaults.sectionTitleSize),
    bodySize: pickOption(next.bodySize, bodySizes, defaults.bodySize),
    nameColor: pickOption(next.nameColor, colorIds, defaults.nameColor),
    sectionTitleColor: pickOption(next.sectionTitleColor, colorIds, defaults.sectionTitleColor),
    bodyColor: pickOption(next.bodyColor, colorIds, defaults.bodyColor),
    accentColor: pickOption(next.accentColor, colorIds, defaults.accentColor)
  };
}

export function createDefaultVisibilitySettings(): ResumeVisibilitySettings {
  return {
    personalSummary: true,
    strengths: true,
    education: true,
    internships: true,
    projects: true,
    campusExperience: true,
    skills: true,
    awards: true
  };
}

export function normalizeVisibilitySettings(settings?: Partial<ResumeVisibilitySettings>): ResumeVisibilitySettings {
  return {
    ...createDefaultVisibilitySettings(),
    ...settings
  };
}

export function createDefaultModuleOrder(): ResumeModuleId[] {
  return ["education", "awards", "personalSummary", "internships", "projects", "campusExperience", "skills"];
}

export function normalizeModuleOrder(order?: ResumeModuleId[]): ResumeModuleId[] {
  const defaults = createDefaultModuleOrder();
  const validIds = new Set(defaults);
  const uniqueOrder = (order ?? []).filter((moduleId, index, currentOrder) => validIds.has(moduleId) && currentOrder.indexOf(moduleId) === index);
  const missingIds = defaults.filter((moduleId) => !uniqueOrder.includes(moduleId));

  return [...uniqueOrder, ...missingIds];
}

export function createDefaultPhotoSettings(): ResumePhotoSettings {
  return {
    visible: true,
    width: 88,
    height: 110,
    position: "right"
  };
}

export function normalizePhotoSettings(settings?: Partial<ResumePhotoSettings>): ResumePhotoSettings {
  const defaults = createDefaultPhotoSettings();
  const next = { ...defaults, ...settings };

  return {
    visible: typeof next.visible === "boolean" ? next.visible : defaults.visible,
    width: Math.min(180, Math.max(56, Number.isFinite(next.width) ? next.width : defaults.width)),
    height: Math.min(220, Math.max(70, Number.isFinite(next.height) ? next.height : defaults.height)),
    position: next.position === "left" || next.position === "right" ? next.position : defaults.position
  };
}

export function createDefaultDecorationSettings(): ResumeDecorationSettings {
  return {
    offsetX: 0,
    offsetY: 0,
    nodes: [
      { x: 80, y: 180 },
      { x: 80, y: 380 },
      { x: 720, y: 580 },
      { x: 720, y: 780 },
      { x: 600, y: 950 }
    ]
  };
}

export function normalizeDecorationSettings(settings?: Partial<ResumeDecorationSettings>): ResumeDecorationSettings {
  const defaults = createDefaultDecorationSettings();
  const next = { ...defaults, ...settings };

  return {
    offsetX: Math.min(900, Math.max(-900, Number.isFinite(next.offsetX) ? next.offsetX : defaults.offsetX)),
    offsetY: Math.min(900, Math.max(-900, Number.isFinite(next.offsetY) ? next.offsetY : defaults.offsetY)),
    nodes: (next.nodes ?? defaults.nodes).map((node, i) => {
      const fallback = defaults.nodes[i] ?? defaults.nodes[0];
      return {
        x: Math.min(994, Math.max(-200, Number.isFinite(node?.x) ? node.x : fallback.x)),
        y: Math.min(1323, Math.max(-200, Number.isFinite(node?.y) ? node.y : fallback.y))
      };
    })
  };
}

export function createDefaultTemplateSettings(): ResumeTemplateSettings {
  return {
    color: "original"
  };
}

const templateColorIds: ResumeTemplateColorId[] = ["original", "rose", "darkBlue", "skyBlue", "darkGray", "taupe", "orange"];

export function normalizeTemplateSettings(settings?: Partial<ResumeTemplateSettings>): ResumeTemplateSettings {
  const defaults = createDefaultTemplateSettings();
  const next = { ...defaults, ...settings };

  return {
    color: pickOption(next.color, templateColorIds, defaults.color)
  };
}
