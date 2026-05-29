"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Circle,
  CircleUserRound,
  Compass,
  ContactRound,
  Download,
  Dumbbell,
  Eye,
  EyeOff,
  FileText,
  FileUp,
  GraduationCap,
  GripVertical,
  Heart,
  Headphones,
  House,
  IdCard,
  Inbox,
  LayoutTemplate,
  Mail,
  Map,
  MapPinned,
  MapPin,
  Medal,
  MessageSquare,
  Phone,
  Plus,
  RotateCcw,
  Save,
  School,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Trophy,
  Trash2,
  User,
  UserRound,
  X
} from "lucide-react";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/analytics/dashboard";
import { trackEvent } from "@/lib/analytics/track";
import type { AiGatewayResponse, AiPolishVariant, AiTask } from "@/lib/ai/types";
import { downloadResumeWord, printResumePdf } from "@/lib/export/resume-export";
import { saveFeedback, type FeedbackTarget, type FeedbackVote } from "@/lib/feedback/store";
import {
  createDefaultIconSettings,
  createDefaultStyleSettings,
  createEmptyResume,
  normalizeDecorationSettings,
  normalizeIconSettings,
  normalizeModuleOrder,
  normalizePhotoSettings,
  normalizeStyleSettings,
  normalizeTemplateSettings,
  normalizeVisibilitySettings
} from "@/lib/resume-schema/defaults";
import type {
  Education,
  Experience,
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
} from "@/lib/resume-schema/types";
import { isResumeDocument, validateResume } from "@/lib/resume-schema/validate";
import type { ScoreDimension, ScoreReport } from "@/lib/scoring/types";
import { scoreResume } from "@/lib/scoring/engine";
import {
  deleteSavedResume,
  downloadResumeJson,
  duplicateSavedResume,
  getAnonymousSessionId,
  listSavedResumes,
  loadResume,
  resetResume,
  saveResume,
  type SavedResumeItem
} from "@/lib/storage/local-resume-store";

type TemplateId = "useful" | "simple" | "graduate" | "brick" | "leftBlue" | "minimalPm";
type ExperienceSection = "internships" | "projects" | "campusExperience";

const moduleLabels: Record<ResumeModuleId, string> = {
  personalSummary: "个人评价",
  strengths: "个人优势",
  education: "教育经历",
  internships: "实习经历",
  projects: "项目经历",
  campusExperience: "校园经历",
  skills: "技能",
  awards: "奖项"
};

type TemplateModuleConfig = {
  modules: ResumeModuleId[];
  labels: Partial<Record<ResumeModuleId, string>>;
};

const templates: Array<{ id: TemplateId; label: string }> = [
  { id: "useful", label: "好用蓝灰" },
  { id: "simple", label: "简约天蓝" },
  { id: "graduate", label: "应届蓝线" },
  { id: "brick", label: "蓝橙活力" },
  { id: "leftBlue", label: "深蓝左栏" },
  { id: "minimalPm", label: "极简PM" }
];

const templateDescriptions: Record<TemplateId, string> = {
  useful: "蓝灰稳重，适合通用校招投递",
  simple: "天蓝横幅，左栏信息清晰",
  graduate: "蓝线清爽，突出应届生经历",
  brick: "蓝橙曲线，适合活力型校招简历",
  leftBlue: "深蓝左栏，视觉识别更强",
  minimalPm: "极简 PM，适合产品/运营方向"
};

const colorCustomizableTemplateIds: TemplateId[] = ["useful", "simple", "graduate", "leftBlue"];
const templateSupportsColor = (templateId: TemplateId) => colorCustomizableTemplateIds.includes(templateId);

const templateOriginalColors: Record<TemplateId, string> = {
  useful: "#5f7591",
  simple: "#4798bf",
  graduate: "#294864",
  brick: "#174b68",
  leftBlue: "#294864",
  minimalPm: "#111111"
};

const templateColorOptions: Array<{ id: ResumeTemplateColorId; label: string; value: string | null }> = [
  { id: "original", label: "原色", value: null },
  { id: "rose", label: "玫瑰红", value: "#c84d64" },
  { id: "darkBlue", label: "深蓝", value: "#294864" },
  { id: "skyBlue", label: "天蓝", value: "#4798bf" },
  { id: "darkGray", label: "深灰", value: "#4f5a54" },
  { id: "taupe", label: "浅褐", value: "#9b7a5f" },
  { id: "orange", label: "橙黄", value: "#e49b21" }
];

const defaultTemplateModuleConfig: TemplateModuleConfig = {
  modules: ["personalSummary", "strengths", "education", "internships", "projects", "campusExperience", "skills", "awards"],
  labels: {}
};

const templateModuleConfigs: Partial<Record<TemplateId, TemplateModuleConfig>> = {
  brick: {
    modules: ["personalSummary", "education", "internships", "awards"],
    labels: {
      personalSummary: "自我评价",
      education: "教育背景",
      internships: "工作经历",
      awards: "获得荣誉"
    }
  }
};

const getTemplateModuleConfig = (templateId: TemplateId): TemplateModuleConfig =>
  templateModuleConfigs[templateId] ?? defaultTemplateModuleConfig;

const getTemplateModuleLabel = (templateId: TemplateId, moduleId: ResumeModuleId) =>
  getTemplateModuleConfig(templateId).labels[moduleId] ?? moduleLabels[moduleId];

const createTemplateModuleOrder = (templateId: TemplateId): ResumeModuleId[] => {
  const configuredModules = getTemplateModuleConfig(templateId).modules;
  const configuredSet = new Set(configuredModules);

  return [...configuredModules, ...defaultTemplateModuleConfig.modules.filter((moduleId) => !configuredSet.has(moduleId))];
};

const photoTemplateIds: TemplateId[] = ["useful", "simple", "graduate", "brick"];
const templateSupportsPhoto = (templateId: TemplateId) => photoTemplateIds.includes(templateId);

const fontOptions: Array<{ id: ResumeFontId; label: string; value: string }> = [
  { id: "microsoftYahei", label: "微软雅黑", value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { id: "simsun", label: "宋体", value: '"SimSun", "Songti SC", serif' },
  { id: "simhei", label: "黑体", value: '"SimHei", "Microsoft YaHei", sans-serif' },
  { id: "kaiti", label: "楷体", value: '"KaiTi", "STKaiti", serif' },
  { id: "fangsong", label: "仿宋", value: '"FangSong", "STFangsong", serif' },
  { id: "pingfang", label: "苹方", value: '"PingFang SC", "Avenir Next", sans-serif' },
  { id: "times", label: "Times New Roman", value: '"Times New Roman", "Songti SC", serif' },
  { id: "georgia", label: "Georgia", value: 'Georgia, "Times New Roman", serif' }
];

const colorOptions: Array<{ id: ResumeColorId; label: string; value: string }> = [
  { id: "black", label: "黑色", value: "#111111" },
  { id: "darkGray", label: "深灰", value: "#4f5a54" },
  { id: "darkBlue", label: "深蓝", value: "#294864" },
  { id: "mossGreen", label: "墨绿", value: "#314934" }
];

const nameSizeOptions = [24, 28, 32, 36, 38, 40];
const sectionTitleSizeOptions = [13, 14, 15, 16, 18];
const bodySizeOptions = [12, 13, 14, 15, 16];
const headerAlignmentOptions: Array<{ id: ResumeHeaderAlignment; label: string }> = [
  { id: "center", label: "居中" },
  { id: "left", label: "靠左" },
  { id: "right", label: "靠右" }
];

const iconStyleOptions: Record<keyof Omit<ResumeIconSettings, "enabled">, Array<{ id: ResumeIconId; label: string }>> = {
  phone: [
    { id: "none", label: "不放" },
    { id: "phone", label: "电话" },
    { id: "mobile", label: "手机" },
    { id: "hotline", label: "热线" },
    { id: "headset", label: "客服耳机" }
  ],
  email: [
    { id: "none", label: "不放" },
    { id: "email", label: "信封" },
    { id: "inbox", label: "收件箱" },
    { id: "sendMail", label: "发送" },
    { id: "mailBadge", label: "邮件认证" }
  ],
  city: [
    { id: "none", label: "不放" },
    { id: "pin", label: "定位" },
    { id: "mapPin", label: "地图定位" },
    { id: "map", label: "地图" },
    { id: "compass", label: "罗盘" }
  ],
  targetRole: [
    { id: "none", label: "不放" },
    { id: "briefcase", label: "公文包" },
    { id: "idCard", label: "工牌" },
    { id: "building", label: "办公楼" },
    { id: "trend", label: "趋势图" }
  ],
  personalSummary: [
    { id: "none", label: "不放" },
    { id: "user", label: "头像" },
    { id: "maleUser", label: "男头像" },
    { id: "femaleUser", label: "女头像" },
    { id: "profileBadge", label: "证件头像" }
  ],
  strengths: [
    { id: "none", label: "不放" },
    { id: "heart", label: "爱心" },
    { id: "star", label: "星标" },
    { id: "badgeCheck", label: "认证" },
    { id: "sparkles", label: "闪光" }
  ],
  education: [
    { id: "none", label: "不放" },
    { id: "graduation", label: "学士帽" },
    { id: "book", label: "书本" },
    { id: "school", label: "学校" },
    { id: "medal", label: "奖章" }
  ],
  internships: [
    { id: "none", label: "不放" },
    { id: "briefcase", label: "公文包" },
    { id: "idCard", label: "工牌" },
    { id: "building", label: "公司" },
    { id: "trend", label: "成长" }
  ],
  projects: [
    { id: "none", label: "不放" },
    { id: "sparkles", label: "项目亮点" },
    { id: "bookmark", label: "书签" },
    { id: "tag", label: "标签" },
    { id: "dot", label: "圆点" }
  ],
  campusExperience: [
    { id: "none", label: "不放" },
    { id: "star", label: "星标" },
    { id: "heart", label: "爱心" },
    { id: "trophy", label: "奖杯" },
    { id: "activity", label: "活动" }
  ],
  skills: [
    { id: "none", label: "不放" },
    { id: "tag", label: "标签" },
    { id: "sparkles", label: "闪光" },
    { id: "bookmark", label: "书签" },
    { id: "dot", label: "圆点" }
  ],
  awards: [
    { id: "none", label: "不放" },
    { id: "award", label: "奖章" },
    { id: "medal", label: "勋章" },
    { id: "trophy", label: "奖杯" },
    { id: "star", label: "星标" }
  ]
};

const feedbackReasons: Record<FeedbackVote, string[]> = {
  up: ["表达更专业", "关键词更准确", "建议可执行", "导出体验顺畅"],
  down: ["内容空泛", "不符合本人经历", "ATS 建议不实用", "导出不满意"]
};

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

const hasDateRange = (line: string) => /(?:19|20)\d{2}[./-]?\d{0,2}\s*(?:-|–|—|至|到|~)\s*(?:(?:19|20)\d{2}[./-]?\d{0,2}|至今|今)/.test(line);
const isPlainDateOrYear = (line: string) => /^\d{4}([./-]\d{1,2})?([./-]\d{1,2})?\s*$/.test(line.trim());
const stripListMarker = (line: string) => line.replace(/^[•●◆■▪▫◦*·\-\s]+/, "").trim();

const looksLikeDescription = (line: string) =>
  line.length > 22 || /负责|参与|完成|推动|协助|主导|优化|提升|降低|实现|达成|输出|落地|上线|调研|分析[^师]|设计[^师]|开发|协调|组织|管理|跟进|统筹|迭代|交付|评审|维护|撰写|收集|整理|汇总|对接/.test(line) || /[，,。；;]/.test(line);

const looksLikeOrgName = (line: string) =>
  /(公司|大学|学院|团队|部门|实验室|协会|社团|中心|集团|科技|工作室|医院|事务所|研究院)/.test(line) && line.length <= 30;

const looksLikeSchoolName = (line: string) => {
  const t = line.trim();
  if (!t || looksLikeDescription(t) || t.length > 30) return false;
  if (/(大学|学院|学校)$/.test(t)) return true;
  if (/^(University|College)\b/i.test(t)) return true;
  if (/(大学|学院|学校|University|College)/i.test(t)) return true;
  return false;
};

const looksLikeMajorName = (line: string): boolean => {
  const t = line.trim();
  if (!t || t.length > 25 || looksLikeDescription(t)) return false;
  return /(专业|工程|管理|经济|计算机|软件|数据|营销|金融|会计|设计|中文|英语|法学|医学|化学|物理|数学|生物|历史|哲学|新闻|广告|建筑|土木|机械|电子|通信)/.test(t);
};

const firstMatch = (text: string, pattern: RegExp) => text.match(pattern)?.[1]?.trim() ?? "";

const parseDateRange = (text: string) => {
  const match = text.match(/((?:19|20)\d{2}[./-]?\d{0,2})\s*(?:-|–|—|至|到|~)\s*((?:19|20)\d{2}[./-]?\d{0,2}|至今|今)/);
  return { startDate: match?.[1]?.trim() ?? "", endDate: match?.[2]?.trim() ?? "" };
};

const chunkLinesByDate = (lines: string[]) => {
  const chunks: string[][] = [];
  lines.forEach((line) => {
    if (hasDateRange(line) && chunks.length) { chunks.push([line]); return; }
    if (!chunks.length) { chunks.push([line]); return; }
    chunks[chunks.length - 1].push(line);
  });
  return chunks.filter((c) => c.some(Boolean));
};

const createExperienceFromLines = (lines: string[], fallbackTitle: string): Experience[] => {
  if (!lines.length) return [];
  return chunkLinesByDate(lines).map((chunk) => {
    const cl = chunk.map(stripListMarker).filter(Boolean);
    const dr = parseDateRange(cl.join(" "));
    const title = cl.find((l) => !hasDateRange(l) && !isPlainDateOrYear(l) && !looksLikeDescription(l) && !looksLikeOrgName(l)) ?? cl.find((l) => !hasDateRange(l) && !isPlainDateOrYear(l)) ?? fallbackTitle;
    const org = cl.find((l) => l !== title && looksLikeOrgName(l)) ?? "";
    const desc = cl.filter((l) => l !== title && l !== org && !hasDateRange(l)).join("\n");
    return { title: title || fallbackTitle, organization: org, startDate: dr.startDate, endDate: dr.endDate, description: desc };
  });
};

const createEducationFromLines = (lines: string[]): Education[] => {
  if (!lines.length) return [];
  return chunkLinesByDate(lines).map((chunk) => {
    const cl = chunk.map(stripListMarker).filter(Boolean);
    const joined = cl.join(" ");
    const dr = parseDateRange(joined);
    const school = cl.find((l) => looksLikeSchoolName(l)) ?? "";
    const degree = firstMatch(joined, /(本科|硕士|研究生|博士|大专|学士|MBA)/);
    const explicitMajor = firstMatch(joined, /(?:专业|主修)[:：\s]*([^，,。；;\n]+)/);
    const major = explicitMajor || cl.find((l) => l !== school && looksLikeMajorName(l)) || "";
    const hl = cl.filter((l) => l !== school && l !== major && !hasDateRange(l) && l !== degree).join("\n");
    return { school, degree, major, startDate: dr.startDate, endDate: dr.endDate, highlights: hl };
  });
};

const createTemplatePreviewResume = (): ResumeDocument => ({
  ...createEmptyResume(),
  profile: {
    name: "XXX",
    phone: "188-0000-0000",
    email: "xxx@email.com",
    city: "北京市",
    targetRole: "产品经理",
    photo: undefined
  },
  iconSettings: {
    ...createDefaultIconSettings(),
    enabled: true
  },
  styleSettings: {
    ...createDefaultStyleSettings(),
    bodySize: 13
  },
  personalSummary: "校招产品方向，熟悉用户调研、需求分析与原型设计，能将模糊需求转化为清晰方案并协同推进。",
  strengths: ["学习能力强，能快速拆解业务问题并推进落地。", "沟通表达清晰，善于跨团队收集反馈。"],
  education: [
    {
      school: "某某大学",
      degree: "本科",
      major: "工商管理",
      startDate: "2022.09",
      endDate: "2026.06",
      highlights: "主修市场研究、数据分析、产品管理课程，参与多项课程项目。"
    }
  ],
  internships: [
    {
      title: "产品经理实习生",
      organization: "互联网产品团队",
      startDate: "2025.06",
      endDate: "2025.09",
      description: "负责竞品分析、需求文档和功能验收，协同设计、研发推动核心功能迭代上线。"
    }
  ],
  projects: [
    {
      title: "校园求职工具项目",
      organization: "课程项目",
      startDate: "2025.03",
      endDate: "2025.06",
      description: "负责用户访谈、需求拆解和流程设计，整理 120+ 份反馈并优化核心页面转化。"
    }
  ],
  campusExperience: [
    {
      title: "学生会项目负责人",
      organization: "校学生会",
      startDate: "2023.09",
      endDate: "2024.06",
      description: "组织校级活动与跨部门协作，统筹排期、物料、宣传和现场执行。"
    }
  ],
  skills: ["Axure", "Figma", "Excel", "SQL", "用户研究", "竞品分析", "PRD"],
  awards: ["校级奖学金", "创新创业竞赛优秀奖", "优秀学生干部"],
  targetJob: {
    title: "产品经理",
    jdText: ""
  }
});

const maxPhotoSize = 2 * 1024 * 1024;

const getFontValue = (fontId: ResumeFontId) => fontOptions.find((option) => option.id === fontId)?.value ?? fontOptions[0].value;

const getColorValue = (colorId: ResumeColorId) => colorOptions.find((option) => option.id === colorId)?.value ?? colorOptions[0].value;

const getTemplateColorValue = (templateId: TemplateId, settings?: ResumeTemplateSettings) => {
  const normalizedSettings = normalizeTemplateSettings(settings);
  const option = templateColorOptions.find((item) => item.id === normalizedSettings.color);

  return option?.value ?? templateOriginalColors[templateId];
};

const getResumeStyleVars = (settings: ResumeStyleSettings, templateId: TemplateId, templateSettings?: ResumeTemplateSettings) =>
  ({
    "--resume-heading-font": getFontValue(settings.headingFont),
    "--resume-body-font": getFontValue(settings.bodyFont),
    "--resume-name-size": `${settings.nameSize}px`,
    "--resume-section-title-size": `${settings.sectionTitleSize}px`,
    "--resume-body-size": `${settings.bodySize}px`,
    "--resume-name-color": getColorValue(settings.nameColor),
    "--resume-section-title-color": getColorValue(settings.sectionTitleColor),
    "--resume-body-color": getColorValue(settings.bodyColor),
    "--resume-accent-color": getColorValue(settings.accentColor),
    "--template-theme-color": getTemplateColorValue(templateId, templateSettings)
  }) as React.CSSProperties;

const getNameFitStyle = (name: string, settings: ResumeStyleSettings, templateId: TemplateId): React.CSSProperties => {
  const visibleName = name.trim() || "你的姓名";
  const length = Array.from(visibleName).length || 1;
  const constrainedSidebarWidth = templateId === "leftBlue" ? 146 : null;

  if (!constrainedSidebarWidth) {
    return {};
  }

  const fittedSize = Math.min(settings.nameSize, Math.floor((constrainedSidebarWidth / length) * 0.98));

  return {
    fontSize: `${Math.max(10, fittedSize)}px`
  };
};

const getIconNode = (iconId: ResumeIconId, size = 14) => {
  const strokeWidth = 2;

  switch (iconId) {
    case "user":
      return <User size={size} strokeWidth={strokeWidth} />;
    case "maleUser":
      return <UserRound size={size} strokeWidth={strokeWidth} />;
    case "femaleUser":
      return <CircleUserRound size={size} strokeWidth={strokeWidth} />;
    case "profileBadge":
      return <ContactRound size={size} strokeWidth={strokeWidth} />;
    case "work":
    case "briefcase":
      return <BriefcaseBusiness size={size} strokeWidth={strokeWidth} />;
    case "idCard":
      return <IdCard size={size} strokeWidth={strokeWidth} />;
    case "building":
      return <Building2 size={size} strokeWidth={strokeWidth} />;
    case "trend":
      return <TrendingUp size={size} strokeWidth={strokeWidth} />;
    case "education":
    case "graduation":
      return <GraduationCap size={size} strokeWidth={strokeWidth} />;
    case "book":
      return <BookOpen size={size} strokeWidth={strokeWidth} />;
    case "school":
      return <School size={size} strokeWidth={strokeWidth} />;
    case "medal":
      return <Medal size={size} strokeWidth={strokeWidth} />;
    case "award":
      return <Award size={size} strokeWidth={strokeWidth} />;
    case "phone":
      return <Phone size={size} strokeWidth={strokeWidth} />;
    case "mobile":
      return <Smartphone size={size} strokeWidth={strokeWidth} />;
    case "hotline":
      return <Phone size={size} strokeWidth={2.8} />;
    case "headset":
      return <Headphones size={size} strokeWidth={strokeWidth} />;
    case "email":
      return <Mail size={size} strokeWidth={strokeWidth} />;
    case "inbox":
      return <Inbox size={size} strokeWidth={strokeWidth} />;
    case "sendMail":
      return <Send size={size} strokeWidth={strokeWidth} />;
    case "mailBadge":
      return <BadgeCheck size={size} strokeWidth={strokeWidth} />;
    case "address":
    case "pin":
      return <MapPin size={size} strokeWidth={strokeWidth} />;
    case "mapPin":
      return <MapPinned size={size} strokeWidth={strokeWidth} />;
    case "map":
      return <Map size={size} strokeWidth={strokeWidth} />;
    case "compass":
      return <Compass size={size} strokeWidth={strokeWidth} />;
    case "sport":
    case "dumbbell":
      return <Dumbbell size={size} strokeWidth={strokeWidth} />;
    case "trophy":
      return <Trophy size={size} strokeWidth={strokeWidth} />;
    case "activity":
      return <Activity size={size} strokeWidth={strokeWidth} />;
    case "hobby":
    case "heart":
      return <Heart size={size} strokeWidth={strokeWidth} />;
    case "star":
      return <Star size={size} strokeWidth={strokeWidth} />;
    case "badgeCheck":
      return <BadgeCheck size={size} strokeWidth={strokeWidth} />;
    case "other":
    case "sparkles":
      return <Sparkles size={size} strokeWidth={strokeWidth} />;
    case "bookmark":
      return <Bookmark size={size} strokeWidth={strokeWidth} />;
    case "tag":
      return <Tag size={size} strokeWidth={strokeWidth} />;
    case "dot":
      return <Circle size={Math.max(8, size - 3)} fill="currentColor" strokeWidth={strokeWidth} />;
    case "none":
    default:
      return null;
  }
};

function ResumeIcon({ enabled, iconId, size = 14 }: { enabled: boolean; iconId: ResumeIconId; size?: number }) {
  if (!enabled || iconId === "none") return null;

  return (
    <span className="resume-icon" aria-hidden="true">
      {getIconNode(iconId, size)}
    </span>
  );
}

export function ResumeWorkspace() {
  const [resume, setResume] = useState<ResumeDocument>(() => createEmptyResume());
  const [sessionId, setSessionId] = useState("");
  const [aiConfig, setAiConfig] = useState<{ provider: string; apiKey: string; baseUrl: string; model: string }>({ provider: "deepseek", apiKey: "", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" });
  const [saveState, setSaveState] = useState("正在准备本地草稿");
  const [importError, setImportError] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("useful");
  const [isIntroVisible, setIsIntroVisible] = useState(true);
  const [isTemplateStartVisible, setIsTemplateStartVisible] = useState(true);
  const [startScreenView, setStartScreenView] = useState<"resumes" | "templates">("templates");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ resume: ResumeDocument; confidence: Record<string, number> } | null>(null);
  const [currentResumeSource, setCurrentResumeSource] = useState<"template" | "imported">("template");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimizeLoading, setIsOptimizeLoading] = useState(false);

  const [missingFieldsNotice, setMissingFieldsNotice] = useState<string[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!resume.profile.name.trim()) missing.push("姓名");
    if (!resume.profile.targetRole.trim() && !resume.targetJob.title.trim()) missing.push("目标岗位");
    if (!resume.profile.phone.trim()) missing.push("联系方式");
    if (!resume.profile.email.trim()) missing.push("邮箱");
    if (!resume.personalSummary.trim()) missing.push("个人评价");
    if (!resume.strengths.some((s) => s.trim())) missing.push("个人优势");
    if (!resume.education.some((e) => e.school.trim())) missing.push("教育经历");
    if (!resume.internships.some((e) => e.title.trim() || e.description.trim())) missing.push("实习/工作经历");
    if (!resume.projects.some((e) => e.title.trim() || e.description.trim())) missing.push("项目经历");
    if (!resume.campusExperience.some((e) => e.title.trim() || e.description.trim())) missing.push("校园经历");
    if (!resume.skills.some((s) => s.trim())) missing.push("技能");
    if (!resume.awards.some((a) => a.trim())) missing.push("奖项");
    if (!resume.targetJob.jdText.trim()) missing.push("目标 JD");
    return missing;
  };
  const isImportedResume = currentResumeSource === "imported";
  const [aiTask, setAiTask] = useState<AiTask | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiDiagnosis, setAiDiagnosis] = useState<AiGatewayResponse & { task: "diagnose_resume" } | null>(null);
  const diagnosisByModule: Record<string, { severity: string; summary: string } | undefined> = {};
  for (const m of aiDiagnosis?.modules ?? []) { diagnosisByModule[m.moduleId] = m; }
  const [polishDraft, setPolishDraft] = useState<{ moduleId: ResumeModuleId; itemIndex?: number; variants: AiPolishVariant[] } | null>(null);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[] | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [scoreReport, setScoreReport] = useState<ScoreReport | null>(null);
  const [initialScoreReport, setInitialScoreReport] = useState<ScoreReport | null>(null);
  const [scoreError, setScoreError] = useState("");
  const [isScoring, setIsScoring] = useState(false);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [highlightedEditorModule, setHighlightedEditorModule] = useState<ResumeModuleId | null>(null);
  const editorHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const issues = validateResume(resume);
  const iconSettings = normalizeIconSettings(resume.iconSettings);
  const styleSettings = normalizeStyleSettings(resume.styleSettings);
  const visibilitySettings = normalizeVisibilitySettings(resume.visibilitySettings);
  const photoSettings = normalizePhotoSettings(resume.photoSettings);
  const templateSettings = normalizeTemplateSettings(resume.templateSettings);
  const isPhotoSupported = templateSupportsPhoto(templateId);
  const activeModuleConfig = getTemplateModuleConfig(templateId);
  const activeModuleLabels = activeModuleConfig.labels;
  const isModuleInActiveTemplate = (moduleId: ResumeModuleId) => activeModuleConfig.modules.includes(moduleId);

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

  useEffect(
    () => () => {
      if (editorHighlightTimer.current) {
        clearTimeout(editorHighlightTimer.current);
      }
    },
    []
  );

  const updateProfile = (field: keyof ResumeDocument["profile"], value: string) => {
    setResume((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value
      }
    }));
  };

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImportError("图片上传失败：请使用 JPG、PNG 或 WebP 格式。");
      event.target.value = "";
      return;
    }

    if (file.size > maxPhotoSize) {
      setImportError("图片上传失败：图片需小于 2MB。");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setImportError("图片读取失败，请重新选择。");
        return;
      }

      setResume((current) => ({
        ...current,
        profile: {
          ...current.profile,
          photo: {
            dataUrl: reader.result as string,
            fileName: file.name,
            crop: {
              x: 50,
              y: 50,
              zoom: 1
            }
          }
        },
        photoSettings: {
          ...normalizePhotoSettings(current.photoSettings),
          visible: true
        }
      }));
      setImportError("");
    };
    reader.onerror = () => setImportError("图片读取失败，请重新选择。");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const removePhoto = () => {
    setResume((current) => ({
      ...current,
      profile: {
        ...current.profile,
        photo: undefined
      }
    }));
  };

  const updatePhotoSettings = (nextSettings: Partial<ResumePhotoSettings>) => {
    setResume((current) => ({
      ...current,
      photoSettings: {
        ...normalizePhotoSettings(current.photoSettings),
        ...nextSettings
      }
    }));
  };

  const updateDecorationSettings = (nextSettings: Partial<ResumeDecorationSettings>) => {
    setResume((current) => ({
      ...current,
      decorationSettings: {
        ...normalizeDecorationSettings(current.decorationSettings),
        ...nextSettings
      }
    }));
  };

  const updateTemplateSettings = (nextSettings: Partial<ResumeTemplateSettings>) => {
    setResume((current) => ({
      ...current,
      templateSettings: {
        ...normalizeTemplateSettings(current.templateSettings),
        ...nextSettings
      }
    }));
  };

  const updateIconSettings = (nextSettings: Partial<ResumeIconSettings>) => {
    setResume((current) => ({
      ...current,
      iconSettings: {
        ...normalizeIconSettings(current.iconSettings),
        ...nextSettings
      }
    }));
  };

  const updateStyleSettings = (nextSettings: Partial<ResumeStyleSettings>) => {
    setResume((current) => ({
      ...current,
      styleSettings: {
        ...normalizeStyleSettings(current.styleSettings),
        ...nextSettings
      }
    }));
  };

  const focusEditorModule = (moduleId: ResumeModuleId) => {
    const target = document.querySelector<HTMLElement>(`[data-editor-module="${moduleId}"]`);
    if (!target) return;

    const form = target.closest<HTMLElement>(".form");
    if (form) {
      const formRect = form.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextScrollTop = form.scrollTop + targetRect.top - formRect.top - form.clientHeight / 2 + targetRect.height / 2;

      form.scrollTo({
        top: Math.max(0, nextScrollTop),
        behavior: "smooth"
      });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setHighlightedEditorModule(moduleId);

    if (editorHighlightTimer.current) {
      clearTimeout(editorHighlightTimer.current);
    }

    editorHighlightTimer.current = setTimeout(() => {
      setHighlightedEditorModule((current) => (current === moduleId ? null : current));
    }, 1800);
  };

  const getEditorModuleClassName = (moduleId: ResumeModuleId) =>
    `editor-module-anchor ${highlightedEditorModule === moduleId ? "is-highlighted" : ""}`;

  const selectTemplate = (nextTemplateId: TemplateId) => {
    setTemplateId(nextTemplateId);
    setCurrentResumeSource("template");
    setScoreReport(null); setInitialScoreReport(null); setAiDiagnosis(null); setPolishDraft(null); setBestScore(0);
    window.history.pushState({ view: "workspace" }, "");
    setResume((current) => ({
      ...current,
      moduleOrder: createTemplateModuleOrder(nextTemplateId)
    }));
  };

  const toggleVisibility = (section: keyof ResumeVisibilitySettings) => {
    setResume((current) => {
      const currentVisibility = normalizeVisibilitySettings(current.visibilitySettings);

      return {
        ...current,
        visibilitySettings: {
          ...currentVisibility,
          [section]: !currentVisibility[section]
        }
      };
    });
  };

  const swapModules = (sourceModuleId: ResumeModuleId, targetModuleId: ResumeModuleId) => {
    if (sourceModuleId === targetModuleId) return;

    setResume((current) => {
      const currentOrder = normalizeModuleOrder(current.moduleOrder);
      const sourceIndex = currentOrder.indexOf(sourceModuleId);
      const targetIndex = currentOrder.indexOf(targetModuleId);

      if (sourceIndex < 0 || targetIndex < 0) return current;

      const nextOrder = [...currentOrder];
      [nextOrder[sourceIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[sourceIndex]];

      return {
        ...current,
        moduleOrder: nextOrder
      };
    });
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
    setIsImporting(true);
    setImportError("");

    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!isResumeDocument(parsed)) { setImportError("导入失败：不是有效的 ResumeLM 简历 JSON。"); return; }
        setResume({ ...parsed, iconSettings: normalizeIconSettings(parsed.iconSettings), styleSettings: normalizeStyleSettings(parsed.styleSettings), visibilitySettings: normalizeVisibilitySettings(parsed.visibilitySettings), photoSettings: normalizePhotoSettings(parsed.photoSettings), decorationSettings: normalizeDecorationSettings(parsed.decorationSettings), templateSettings: normalizeTemplateSettings(parsed.templateSettings), moduleOrder: normalizeModuleOrder(parsed.moduleOrder) });
      } else if (name.endsWith(".pdf")) {
        setImportError("正在解析 PDF...");
        const pdfjsLib = await import("pdfjs-dist");
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
        const pdf = await (pdfjsLib as any).getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const c = await page.getTextContent(); text += c.items.map((x: any) => x.str).join(" ") + "\n"; }
        setResume(parseResumeText(text, file.name));
      } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
        setImportError(name.endsWith(".docx") ? "正在解析 DOCX..." : "正在解析 DOC...");
        const mammoth = await import("mammoth");
        const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        setResume(parseResumeText(r.value, file.name));
      } else {
        setImportError("不支持的文件格式，请上传 PDF、DOCX 或 JSON。"); return;
      }
      setImportError("");
      setIsIntroVisible(false);
      setIsTemplateStartVisible(false);
      setCurrentResumeSource("imported");
      trackEvent("resume_imported", sessionId, { fileName: file.name });
    } catch (e) {
      setImportError(`导入失败：${e instanceof Error ? e.message : "无法解析文件"}`);
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  // ── Updated parsing: section aliases + multi-entry splitting + confidence + AI fallback ──

  const SECTION_ALIASES: Record<string, string[]> = {
    personalSummary: ["个人评价","自我评价","个人简介","自我介绍","个人总结","职业总结","关于我","Profile","Summary"],
    education: ["教育经历","教育背景","教育情况","学习经历","学习背景","学历背景","学历信息","Education"],
    internships: ["实习经历","工作经历","实践经历","职业经历","工作经验","任职经历","Work Experience","Internship Experience"],
    projects: ["项目经历","项目经验","项目实践","项目展示","科研项目","Project Experience","Projects"],
    campusExperience: ["校园经历","校内经历","社团经历","学生工作","校园实践","Campus Experience","Leadership"],
    skills: ["技能","专业技能","技能证书","技能特长","核心技能","IT技能","Skills","Technical Skills"],
    awards: ["奖项","获奖经历","荣誉奖项","获得荣誉","奖学金","证书","资格证书","Awards","Honors"],
    strengths: ["个人优势","核心优势","个人能力","优势亮点","核心竞争力","亮点总结"]
  };

  const stripNoise = (s: string) => s.replace(/[|｜/·•●◆■□▪▫◦*#_\-—]+/g, "").trim();
  const looksLikeDescription = (s: string) => s.length > 22 && /负责|参与|完成|推动|协助|主导|优化|提升|降低|实现|达成|输出|落地|上线|调研|分析|设计|开发|协调|管理|跟进|统筹|迭代|交付/.test(s);
  const hasDate = (s: string) => /(?:19|20)\d{2}[.\-/\s年]/.test(s);
  const hasOrg = (s: string) => /(公司|集团|科技|网络|信息|银行|证券|基金|实验室|研究院|工作室|团队|部门|中心|事业部|腾讯|阿里|字节|美团|京东|百度|网易|小红书|快手|华为|小米|滴滴|携程|哔哩)/.test(s);
  const hasRole = (s: string) => /(实习|经理|工程师|设计师|运营|开发|产品|助理|专员|主管|总监|负责人|管培|校招)/.test(s);
  const isNewExperienceStart = (line: string, prev?: string): boolean => {
    const t = stripNoise(line);
    let score = 0;
    if (hasDate(t)) score += 3;
    if (hasOrg(t)) score += 2;
    if (hasRole(t)) score += 2;
    if (t.length <= 40 && t.length >= 3) score += 1;
    if (prev && prev.trim() === "") score += 1;
    if (/^[•\-·●▸►▪]\s/.test(line)) score -= 3;
    if (looksLikeDescription(t)) score -= 2;
    return score >= 4;
  };
  const isNewEducationStart = (line: string): boolean => {
    const t = stripNoise(line);
    return hasDate(t) || /(大学|学院|学校|University|College|Institute)/.test(t) || /(本科|硕士|研究生|博士|大专|MBA)/.test(t);
  };
  const splitEntries = (lines: string[], type: "education" | "experience"): string[][] => {
    const entries: string[][] = [];
    let cur: string[] = [];
    for (const line of lines) {
      const isStart = type === "education" ? isNewEducationStart(line) : isNewExperienceStart(line, cur[cur.length - 1]);
      if (isStart && cur.length > 0) { entries.push(cur); cur = [line]; }
      else { cur.push(line); }
    }
    if (cur.length > 0) entries.push(cur);
    return entries;
  };

  const orgDict = ["腾讯","阿里巴巴","字节跳动","美团","京东","百度","网易","小红书","拼多多","快手","蚂蚁集团","华为","小米","滴滴","携程","哔哩哔哩","微软","谷歌","亚马逊","Meta","Apple"];
  const findOrg = (s: string): string => {
    const m1 = s.match(/([\u4e00-\u9fa5A-Za-z·]+(?:公司|集团|科技|网络|信息|银行|证券|基金|实验室|研究院|工作室|团队|部门|中心|事业部))/);
    if (m1) return m1[1];
    for (const o of orgDict) { if (s.includes(o)) return o; }
    return "";
  };

  const DATE_RANGE_RE = /(20\d{2}|19\d{2})[.\-/\s年]*(0?[1-9]|1[0-2])?\s*(?:月)?\s*[-—–~至到]\s*((?:20\d{2}|19\d{2})[.\-/\s年]*(?:0?[1-9]|1[0-2])?|至今|现在|Present|Now)/i;
  const parseDateRange = (s: string) => {
    const m = s.match(DATE_RANGE_RE);
    if (!m) return { startDate: "", endDate: "" };
    const startY = m[1], startM = m[2] ? m[2].padStart(2, "0") : "01";
    const end = m[3];
    const isCurrent = /至今|现在|Present|Now/i.test(end);
    let endDate = isCurrent ? "至今" : "";
    if (!isCurrent && end) {
      const em = end.match(/(20\d{2}|19\d{2})[.\-/\s年]*((0?[1-9]|1[0-2]))?/);
      endDate = em ? `${em[1]}-${em[2] ? em[2].padStart(2, "0") : "01"}` : end;
    }
    return { startDate: `${startY}-${startM}`, endDate };
  };

  const parseResumeText = (text: string, fileName: string): ResumeDocument => {
    const base = createEmptyResume();
    const norm = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    const email = norm.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ?? "";
    const phone = norm.match(/((?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4})/)?.[1] ?? "";
    const name = norm.match(/(?:姓名|名字)[:：\s]*([\u4e00-\u9fa5A-Za-z·]{2,20})/)?.[1] ?? norm.split("\n").find((l: string) => /^[\u4e00-\u9fa5·]{2,6}$/.test(l.trim())) ?? "";
    const targetRole = norm.match(/(?:求职意向|目标岗位|应聘岗位|岗位|职位)[:：\s]*([^\n]+)/)?.[1]?.trim() ?? "";
    const city = norm.match(/(?:城市|地址|现居|所在地)[:：\s]*([^\n，,。；;]+)/)?.[1]?.trim() ?? "";

    // Section detection with alias dictionary
    const sections: Record<string, string[]> = {};
    let currentSection = "general";
    const allLines = norm.split("\n").map((l: string) => l.trim()).filter(Boolean);
    for (const line of allLines) {
      const clean = stripNoise(line);
      let matched = false;
      for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
        if (aliases.some((a) => clean === a || (clean.length <= 20 && clean.startsWith(a)))) {
          currentSection = section; matched = true; break;
        }
      }
      if (!matched) {
        // Generic fallback regex for common patterns
        if (/^(个人评价|自我评价|个人简介|自我介绍)/.test(clean)) { currentSection = "personalSummary"; matched = true; }
        else if (/^(教育经历|教育背景|教育情况|学习经历|学历)/.test(clean)) { currentSection = "education"; matched = true; }
        else if (/^(实习经历|工作经历|实践经历|职业经历|工作经验)/.test(clean)) { currentSection = "internships"; matched = true; }
        else if (/^(项目经历|项目经验|项目展示|科研项目)/.test(clean)) { currentSection = "projects"; matched = true; }
        else if (/^(校园经历|校内经历|社团经历|学生工作)/.test(clean)) { currentSection = "campusExperience"; matched = true; }
        else if (/^(技能|专业技能|技能证书|核心技能)/.test(clean)) { currentSection = "skills"; matched = true; }
        else if (/^(奖项|获奖经历|荣誉奖项|获得荣誉|奖学金)/.test(clean)) { currentSection = "awards"; matched = true; }
        else if (/^(个人优势|核心优势|个人能力|优势亮点)/.test(clean)) { currentSection = "strengths"; matched = true; }
      }
      sections[currentSection] = [...(sections[currentSection] ?? []), line];
    }

    // PersonalSummary + Strengths
    const combinedLines = [...(sections["personalSummary"] ?? []), ...(sections["strengths"] ?? [])];
    const generalLines = sections["general"] ?? [];
    let personalSummary = combinedLines.filter((l: string) => l.length >= 15).join("；").slice(0, 300);
    if (!personalSummary && generalLines.length) {
      personalSummary = generalLines.filter((l: string) => l.length >= 15 && /具备|熟悉|掌握|负责|参与|毕业于|本科|硕士|专业|经验|背景|能力|善于|擅长/.test(l)).slice(0, 3).join("；").slice(0, 300);
    }
    let strengths = nonEmpty(combinedLines.filter((l: string) => l.length >= 2 && l.length <= 25)).slice(0, 6);
    if (!strengths.length && generalLines.length) {
      strengths = generalLines.filter((l: string) => l.length >= 3 && l.length <= 25 && /学习|沟通|协作|执行|领导|组织|分析|创新|逻辑|表达|抗压|团队|管理|数据|编程|设计|英语|细心|耐心/.test(l) && !/\d{4}|公司|大学|学院|学校|电话|邮箱/.test(l)).slice(0, 6);
    }
    if (!strengths.length && personalSummary) {
      strengths = personalSummary.split(/[，,。；;、\n]/).filter((p: string) => p.trim().length >= 4 && p.trim().length <= 25).slice(0, 6);
    }

    // Multi-entry education splitting
    const eduLines = sections["education"] ?? [];
    const eduEntries = splitEntries(eduLines, "education");
    const educationList: Education[] = eduEntries.map((entry) => {
      const joined = entry.join(" ");
      const school = joined.match(/([\u4e00-\u9fa5A-Za-z·]+(?:大学|学院|学校|研究院|University|College|Institute))/)?.[1] ?? "";
      const degree = joined.match(/(本科|硕士|研究生|博士|大专|学士|MBA)/)?.[1] ?? "";
      const major = joined.match(/(?:专业|主修)[:：\s]*([^，,。；;\n]+)/)?.[1] ?? joined.match(/(计算机|软件|数据|营销|金融|会计|设计|中文|英语|法学|医学|化学|物理|数学|生物|历史|哲学|新闻|广告|建筑|土木|机械|电子|通信|管理|经济|工商)/)?.[1] ?? "";
      const dr = parseDateRange(joined);
      return { school, degree, major, startDate: dr.startDate, endDate: dr.endDate, highlights: joined };
    });

    // Multi-entry experience splitting
    const parseEntries = (lines: string[], fallback: string): Experience[] => {
      if (!lines.length) return [];
      const entries = splitEntries(lines, "experience");
      if (entries.length === 1 && entries[0].length >= 1) {
        const joined = entries[0].join(" ");
        const dr = parseDateRange(joined);
        const parts = joined.replace(DATE_RANGE_RE, "").split(/[|｜]/);
        const title = parts[0]?.trim() || fallback;
        const org = findOrg(joined);
        return [{ title, organization: org, startDate: dr.startDate, endDate: dr.endDate, description: joined }];
      }
      return entries.map((entry) => {
        const joined = entry.join(" ");
        const dr = parseDateRange(joined);
        const parts = joined.replace(DATE_RANGE_RE, "").split(/[|｜]/);
        const title = parts[0]?.trim() || fallback;
        const org = findOrg(joined);
        return { title, organization: org, startDate: dr.startDate, endDate: dr.endDate, description: joined };
      });
    };

    const internships = parseEntries(sections["internships"] ?? [], "实习经历");
    const projects = parseEntries(sections["projects"] ?? [], "项目经历");
    const campusExperience = parseEntries(sections["campusExperience"] ?? [], "校园经历");

    // Skills
    const skillText = (sections["skills"] ?? []).join(" ");
    const skills = skillText.split(/[、,，；;|/\s]+/).filter((s: string) => s.length >= 2 && s.length <= 30 && !hasDate(s) && !/^(的|和|与|及|等|或|等)$/.test(s));

    return {
      ...base,
      profile: { ...base.profile, name, phone, email, city, targetRole },
      personalSummary, strengths,
      education: educationList.length ? educationList : [blankEducation()],
      internships: internships.length ? internships : [blankExperience()],
      projects: projects.length ? projects : [blankExperience()],
      campusExperience,
      skills, awards: sections["awards"] ?? [],
      targetJob: { title: targetRole, jdText: "" }
    };
  };

  const createResumeDraft = () => {
    setResume(resetResume());
    trackEvent("resume_created", sessionId);
  };

  const exportResume = () => {
    downloadResumeJson(resume);
    trackEvent("resume_exported", sessionId, { format: "json" });
      };

  const exportWord = () => {
    downloadResumeWord(resume.profile.name);
    trackEvent("export_completed", sessionId, { format: "word" });
      };

  const exportPdf = () => {
    try {
      printResumePdf(resume.profile.name);
      trackEvent("export_completed", sessionId, { format: "pdf" });
          } catch {
      setImportError("PDF 导出窗口被浏览器拦截，请允许弹窗后重试。");
    }
  };

  const saveResumeDraft = () => {
    saveResume(resume);
    trackEvent("resume_saved", sessionId, { trigger: "manual" });
  };

  const runAiAction = async (task: AiTask, sectionId?: ResumeModuleId, itemIndex?: number) => {
    const jdRequired: AiTask[] = ["diagnose_resume", "polish_section", "recommend_keywords", "polish_resume", "rewrite_summary", "rewrite_project"];
    if (jdRequired.includes(task) && !resume.targetJob.jdText.trim()) {
      setAiError("请先填写「目标 JD」模块后再使用此 AI 功能。");
      return;
    }
    const missed = getMissingFields();
    if (missed.length) {
      setAiError(`请先完善以下模块再使用 AI：${missed.slice(0, 3).join("、")}${missed.length > 3 ? `等 ${missed.length} 项` : ""}。可填入"无"表示跳过。`);
      return;
    }

    setAiTask(task);
    setAiError("");

    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, resume, sectionId, itemIndex, providerConfig: { baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey, model: aiConfig.model } }) });
      if (!response.ok) throw new Error("AI request failed");
      const result = (await response.json()) as AiGatewayResponse;

      if (result.task === "generate_resume") setResume(result.resume);
      if (result.task === "polish_resume") { setResume(result.resume); void runScoreAction(); }
      if (result.task === "rewrite_summary") setResume((c) => ({ ...c, personalSummary: result.text }));
      if (result.task === "rewrite_project") setResume((c) => ({ ...c, projects: c.projects.length > 0 ? c.projects.map((p, i) => i === 0 ? { ...p, description: result.text } : p) : [{ title: "校招项目", organization: "项目负责人", startDate: "", endDate: "", description: result.text }] }));
      if (result.task === "recommend_keywords") { const kws = result.keywords.filter((k: string) => !resume.skills.some((s) => s.toLowerCase() === k.toLowerCase())); if (kws.length) { setKeywordSuggestions(kws); setSelectedKeywords(new Set(kws)); } else { setAiError("简历已包含 JD 中所有可识别的关键词，无需补充。"); } }
      if (result.task === "diagnose_resume") setAiDiagnosis(result);
      if (result.task === "polish_section") setPolishDraft({ moduleId: result.moduleId, itemIndex: result.itemIndex, variants: result.variants });
      trackEvent("ai_generated", sessionId, { task, provider: result.provider });
    } catch { setAiError("AI 生成失败，请稍后重试。"); }
    finally { setAiTask(null); }
  };

  const runScoreAction = async () => {
    setIsScoring(true);
    setScoreError("");
    try { const r = scoreResume(resume); const s = Math.max(r.overallScore, bestScore); setBestScore(s); setScoreReport({ ...r, overallScore: s }); if (!initialScoreReport) setInitialScoreReport({ ...r, overallScore: s }); } catch {}
    try {
      const response = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume }) });
      if (!response.ok) throw new Error("Score request failed");
      const report = (await response.json()) as ScoreReport;
      const finalScore = Math.max(report.overallScore, bestScore);
      setBestScore(finalScore);
      setScoreReport({ ...report, overallScore: finalScore });
      if (!initialScoreReport) setInitialScoreReport({ ...report, overallScore: finalScore });
      trackEvent("score_completed", sessionId, { score: finalScore });
    } catch {
      setScoreError("评分失败，请稍后重试。");
    } finally {
      setIsScoring(false);
    }
  };

  const submitFeedback = (target: FeedbackTarget, vote: FeedbackVote, reason: string, note: string) => {
    saveFeedback({
      sessionId,
      target,
      vote,
      reason,
      note
    });
    trackEvent("feedback_submitted", sessionId, { target, vote, reason });
        setFeedbackNotice("反馈已记录，感谢你帮我们校准产品。");
  };

  const startWithTemplate = (nextTemplateId: TemplateId) => {
    selectTemplate(nextTemplateId);
    setIsIntroVisible(false);
    setIsTemplateStartVisible(false);
  };

  const openTemplateLibrary = () => {
    setResume(createEmptyResume());
    setScoreReport(null);
    setInitialScoreReport(null);
    setAiDiagnosis(null);
    setPolishDraft(null);
    setCurrentResumeSource("template");
    window.history.pushState({ view: "templates" }, "");
    setIsIntroVisible(false);
    setIsTemplateStartVisible(true);
  };

  if (isIntroVisible) {
    return (
      <main className="app-shell is-intro">
        <IntroScreen onStart={openTemplateLibrary} onImportFile={importJson} isImporting={isImporting} />
      </main>
    );
  }

  if (isTemplateStartVisible) {
    return (
      <main className="app-shell is-template-start">
        {startScreenView === "resumes" ? (
          <ResumeDashboard onCreateNew={() => { setResume(createEmptyResume()); setCurrentResumeSource("template"); setIsTemplateStartVisible(false); }} onEdit={(item) => { setResume(item.resume); setCurrentResumeSource("template"); setIsTemplateStartVisible(false); }} onSwitchToTemplates={() => setStartScreenView("templates")} />
        ) : (
          <TemplateStartScreen activeTemplateId={templateId} onSelect={startWithTemplate} onSwitchToResumes={() => setStartScreenView("resumes")} />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="editor-topbar">
        <div className="editor-brand">
          <div>
            <span className="eyebrow">ResumeLM</span>
            <h1>AI 校招简历编辑器</h1>
          </div>
          <p>匿名开放使用，左侧填写内容，右侧实时预览产出。</p>
        </div>
        <div className="editor-actions" aria-label="简历操作">
          {!isImportedResume ? (
            <button className="secondary-button" type="button" onClick={() => { setIsTemplateStartVisible(true); setStartScreenView("templates"); }}>
              <ArrowLeft size={17} />
              返回选择简历
            </button>
          ) : null}
          <button className="export-button" type="button" onClick={exportPdf}>
            <Download size={14} />
            导出 PDF
          </button>
          <label className="icon-button" title="导入 JSON">
            <FileUp size={18} />
            <input accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" type="file" onChange={importJson} style={{display:"none"}} />
          </label>
          <button className="icon-button" type="button" title="新建草稿" onClick={createResumeDraft}>
            <RotateCcw size={18} />
          </button>
          <button className="icon-button" type="button" title={saveState} onClick={saveResumeDraft}>
            <Save size={18} />
          </button>
        </div>
      </header>
      {isOptimizeLoading ? (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16,color:"#5b6472" }}>
          <Sparkles size={32} style={{animation:"pulse 1.2s ease-in-out infinite"}} />
          <strong style={{fontSize:16}}>正在准备 AI 优化环境…</strong>
          <p style={{fontSize:13,color:"#8b909a"}}>正在加载诊断引擎和评分模型</p>
        </div>
      ) : (
      <div className={`workspace${isOptimizing || isImportedResume ? " is-optimizing" : ""}`}>
        <aside className="sidebar">
          {importError ? <p className="notice">{importError}</p> : null}

          {aiError ? <p className="notice">{aiError}</p> : null}

          {scoreError ? <p className="notice">{scoreError}</p> : null}

{issues.length > 0 ? <p className="notice">{issues.map((issue) => issue.message).join("，")}。</p> : null}

          <form className="form" onSubmit={(e) => e.preventDefault()}>
            {!isImportedResume ? <IconSettingsPanel settings={iconSettings} onChange={updateIconSettings} /> : null}
            {!isImportedResume ? <StyleSettingsPanel settings={styleSettings} onChange={updateStyleSettings} /> : null}

            <SectionHeading icon={<BriefcaseBusiness size={15} />} title="基础信息" />
            <div className="field-grid two">
              <TextField label="姓名" value={resume.profile.name} onChange={(value) => updateProfile("name", value)} />
              <TextField label="目标岗位" value={resume.profile.targetRole} onChange={(value) => updateProfile("targetRole", value)} />
              <TextField label="联系方式" value={resume.profile.phone} onChange={(value) => updateProfile("phone", value)} />
              <TextField label="邮箱" value={resume.profile.email} onChange={(value) => updateProfile("email", value)} />
              <TextField label="城市" value={resume.profile.city} onChange={(value) => updateProfile("city", value)} />
            </div>
            {isPhotoSupported ? (
              <PhotoUploadPanel
                photo={resume.profile.photo}
                photoSettings={photoSettings}
                onRemove={removePhoto}
                onSettingsChange={updatePhotoSettings}
                onUpload={uploadPhoto}
              />
            ) : null}

            {isModuleInActiveTemplate("personalSummary") ? (
            <div className={getEditorModuleClassName("personalSummary")} data-editor-module="personalSummary">
              <SectionHeading icon={<Sparkles size={15} />} isVisible={visibilitySettings.personalSummary}
                title={activeModuleLabels.personalSummary ?? "个人评价&优势"} visibilityKey="personalSummary"
                onToggleVisibility={toggleVisibility}
                aiLabel={aiTask === "polish_section" ? "生成中" : "AI 润色"}
                onAiAction={() => runAiAction("polish_section", "personalSummary")}
                diagnosis={diagnosisByModule["personalSummary"]}
              />
              <TextAreaField label="概括你的背景、能力和求职方向"
                value={resume.personalSummary}
                onChange={(value) => setResume((current) => ({ ...current, personalSummary: value }))}
              />
              <TextAreaField label="列出与目标岗位相关的核心优势"
                value={resume.strengths.join("\n")}
                onChange={(value) => setResume((current) => ({ ...current, strengths: splitLines(value) }))}
              />
            </div>
            ) : null}

            {isModuleInActiveTemplate("education") ? (
            <div className={getEditorModuleClassName("education")} data-editor-module="education">
              <SectionHeading
                actionLabel="添加"
                icon={<GraduationCap size={15} />}
                isVisible={visibilitySettings.education}
                title={activeModuleLabels.education ?? "教育经历"}
                visibilityKey="education"
                onAction={addEducation}
                onToggleVisibility={toggleVisibility}
              />
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
            </div>
            ) : null}

            {isModuleInActiveTemplate("internships") ? (
            <div className={getEditorModuleClassName("internships")} data-editor-module="internships">
              <ExperienceEditor items={resume.internships} isVisible={visibilitySettings.internships}
                section="internships" title={activeModuleLabels.internships ?? "实习/工作经历"} visibilityKey="internships"
                onAdd={addExperience} onRemove={removeExperience} onToggleVisibility={toggleVisibility} onUpdate={updateExperience}
                aiLabel={aiTask === "polish_section" ? "生成中" : "AI 润色"}
                onAiAction={(idx) => runAiAction("polish_section", "internships", idx)}
                diagnosis={diagnosisByModule["internships"]}
              />
            </div>
            ) : null}
            {isModuleInActiveTemplate("projects") ? (
            <div className={getEditorModuleClassName("projects")} data-editor-module="projects">
              <ExperienceEditor
                items={resume.projects}
                isVisible={visibilitySettings.projects}
                section="projects"
                title={activeModuleLabels.projects ?? "项目经历"}
                visibilityKey="projects"
                onAdd={addExperience} onRemove={removeExperience} onToggleVisibility={toggleVisibility} onUpdate={updateExperience}
                aiLabel={aiTask === "polish_section" ? "生成中" : "AI 润色"}
                onAiAction={(idx) => runAiAction("polish_section", "projects", idx)}
                diagnosis={diagnosisByModule["projects"]}
              />
            </div>
            ) : null}
            {isModuleInActiveTemplate("campusExperience") ? (
            <div className={getEditorModuleClassName("campusExperience")} data-editor-module="campusExperience">
              <ExperienceEditor items={resume.campusExperience} isVisible={visibilitySettings.campusExperience}
                section="campusExperience" title={activeModuleLabels.campusExperience ?? "校园经历"} visibilityKey="campusExperience"
                onAdd={addExperience} onRemove={removeExperience} onToggleVisibility={toggleVisibility} onUpdate={updateExperience}
                aiLabel={aiTask === "polish_section" ? "生成中" : "AI 润色"}
                onAiAction={(idx) => runAiAction("polish_section", "campusExperience", idx)}
                diagnosis={diagnosisByModule["campusExperience"]}
              />
            </div>
            ) : null}

            {isModuleInActiveTemplate("skills") ? (
            <div className={getEditorModuleClassName("skills")} data-editor-module="skills">
              <SectionHeading icon={<Tag size={15} />} isVisible={visibilitySettings.skills}
                title={activeModuleLabels.skills ?? "技能"} visibilityKey="skills"
                onToggleVisibility={toggleVisibility}
                aiLabel={aiTask === "polish_section" ? "生成中" : "AI 润色"}
                onAiAction={() => runAiAction("polish_section", "skills")}
                diagnosis={diagnosisByModule["skills"]}
              />
              <TextAreaField
                label="填写掌握的技能，如 Axure、SQL、用户访谈等"
                value={resume.skills.join("\n")}
                onChange={(value) => setResume((current) => ({ ...current, skills: splitLines(value) }))}
              />
            </div>
            ) : null}
            {isModuleInActiveTemplate("awards") ? (
            <div className={getEditorModuleClassName("awards")} data-editor-module="awards">
              <SectionHeading icon={<Award size={15} />} isVisible={visibilitySettings.awards}
                title={activeModuleLabels.awards ?? "奖项"} visibilityKey="awards"
                onToggleVisibility={toggleVisibility}
                diagnosis={diagnosisByModule["awards"]}
              />
              <TextAreaField
                label="填写获奖经历，如奖学金、竞赛名次等"
                value={resume.awards.join("\n")}
                onChange={(value) => setResume((current) => ({ ...current, awards: splitLines(value) }))}
              />
            </div>
            ) : null}

            <SectionHeading icon={<BriefcaseBusiness size={15} />} title="目标 JD" />
            <TextField label="岗位名称" value={resume.targetJob.title} onChange={(value) => setResume((current) => ({ ...current, targetJob: { ...current.targetJob, title: value } }))} />
            <div className="jd-multi-field">
              <div className="jd-multi-header"><span className="jd-multi-label">JD 原文（可粘贴多个，用 --- 分隔）</span><span className="jd-multi-count">{resume.targetJob.jdText.trim() ? `${resume.targetJob.jdText.split("\n---\n").filter((s: string) => s.trim()).length || 1} 个 JD` : "未填写"}</span></div>
              <TextAreaField label="" value={resume.targetJob.jdText} onChange={(value) => setResume((current) => ({ ...current, targetJob: { ...current.targetJob, jdText: value } }))} />
              <p className="jd-multi-hint">用 --- 分隔不同岗位的 JD，AI 会综合考虑所有岗位做诊断和润色。</p>
            </div>
            {!isImportedResume && !isOptimizing ? (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button className="intro-primary" type="button" disabled={isOptimizeLoading}
                  onClick={() => { const missed = getMissingFields(); if (missed.length) { setMissingFieldsNotice(missed); return; } setIsOptimizeLoading(true); setTimeout(() => { setIsOptimizeLoading(false); setIsOptimizing(true); setMissingFieldsNotice([]); }, 800); }}
                  style={{ padding: "14px 36px", fontSize: 16 }}>
                  <Sparkles size={18} />
                  {isOptimizeLoading ? "正在准备..." : "开始简历优化"}
                </button>
                {missingFieldsNotice.length > 0 ? (
                  <p style={{ margin: "10px 0 0", color: "#d65f5f", fontSize: 12 }}>
                    以下模块尚未填写：{missingFieldsNotice.join("、")}。请填写或填入"无"后重试。
                  </p>
                ) : (
                  <p style={{ margin: "10px 0 0", color: "#8b909a", fontSize: 12 }}>编辑完成后点击此处，AI 将帮你诊断并优化简历</p>
                )}
              </div>
            ) : null}
          </form>

          <div className="status-line">
            <Save size={14} />
            {saveState}
          </div>
        </aside>

        <section className="preview-shell" aria-label={isOptimizing || isImportedResume ? "AI 优化中心" : "简历预览"}>
          {isOptimizing || isImportedResume ? (
            <div style={{ display: "grid", gap: 14, alignContent: "start", padding: "clamp(20px, 3vw, 36px)", height: "100%", overflow: "auto" }}>
              {scoreReport ? <ScoreReportView report={scoreReport} /> : null}
              <section className="ai-config-panel">
                <details>
                  <summary style={{cursor:"pointer",fontSize:13,fontWeight:700,color:"#5b6472",padding:"6px 0"}}>AI 模型配置 ▾</summary>
                  <div style={{display:"grid",gap:10,marginTop:10}}>
                    <p style={{margin:0,color:"#8b909a",fontSize:11,lineHeight:1.6}}>当前：<strong style={{color:"#333"}}>{aiConfig.provider === "deepseek" ? "DeepSeek V4 Pro / Flash" : aiConfig.provider === "openai" ? "ChatGPT (OpenAI)" : aiConfig.provider === "anthropic" ? "Claude (Anthropic)" : aiConfig.provider === "gemini" ? "Gemini (Google)" : aiConfig.provider === "minimax" ? "MiniMax" : aiConfig.provider === "mimo" ? "Mimo" : aiConfig.provider}</strong> · <strong style={{color:"#333"}}>{aiConfig.model}</strong></p>
                    <select value={aiConfig.provider} onChange={(e) => { const p = e.target.value; const presets: Record<string,{baseUrl:string;model:string}> = { openai:{baseUrl:"https://api.openai.com/v1",model:"gpt-4o-mini"}, anthropic:{baseUrl:"https://api.anthropic.com/v1",model:"claude-3-haiku-20240307"}, deepseek:{baseUrl:"https://api.deepseek.com/v1",model:"deepseek-chat"}, gemini:{baseUrl:"https://generativelanguage.googleapis.com/v1beta",model:"gemini-2.0-flash"}, minimax:{baseUrl:"https://api.minimaxi.com/v1",model:"abab6.5s-chat"}, mimo:{baseUrl:"https://api.mimo.run/v1",model:"mimo-chat"} }; const preset = presets[p]; setAiConfig({ provider: p, apiKey: aiConfig.apiKey, baseUrl: preset?.baseUrl ?? aiConfig.baseUrl, model: preset?.model ?? aiConfig.model }); }} style={{padding:"8px 10px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,background:"rgba(255,255,255,0.5)",backdropFilter:"blur(10px)",fontSize:13}}>
                      <option value="deepseek">DeepSeek</option><option value="openai">ChatGPT (OpenAI)</option><option value="anthropic">Claude (Anthropic)</option><option value="gemini">Gemini (Google)</option><option value="minimax">MiniMax</option><option value="mimo">Mimo</option>
                    </select>
                    <input placeholder="API Base URL" value={aiConfig.baseUrl} onChange={(e) => { setAiConfig({...aiConfig, baseUrl: e.target.value}); }} style={{padding:"8px 10px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,background:"rgba(255,255,255,0.5)",backdropFilter:"blur(10px)",fontSize:13}} />
                    <input placeholder="API Key（sk-...）" type="password" value={aiConfig.apiKey} onChange={(e) => { setAiConfig({...aiConfig, apiKey: e.target.value}); }} style={{padding:"8px 10px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,background:"rgba(255,255,255,0.5)",backdropFilter:"blur(10px)",fontSize:13}} />
                    <input placeholder="模型名称（如 deepseek-chat）" value={aiConfig.model} onChange={(e) => { setAiConfig({...aiConfig, model: e.target.value}); }} style={{padding:"8px 10px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,background:"rgba(255,255,255,0.5)",backdropFilter:"blur(10px)",fontSize:13}} />
                  </div>
                </details>
              </section>
              <section className="score-panel">
                <div><span className="eyebrow">ATS / JD 评分</span><p>{isScoring ? "正在重新评分…" : "基于规则引擎检查 ATS 结构、内容完整度、JD 关键词覆盖和表达质量"}</p></div>
                <button disabled={isScoring} type="button" onClick={runScoreAction}><Target size={15} />{isScoring ? "评分中" : scoreReport ? "重新评分" : "生成评分"}</button>
              </section>
              <section className="ai-panel">
                <div><span className="eyebrow">AI 优化中心</span><strong>{aiTask ? "正在生成" : "可用"}</strong></div>
                <p className="ai-panel-intro">先诊断再润色。候选版本会固定显示在这里。</p>
                {!resume.targetJob.jdText.trim() ? <p className="ai-panel-jd-hint">请填写「目标 JD」后再使用 AI 功能。</p> : null}
                {aiError ? <p className="ai-panel-error">{aiError}</p> : null}
                <div className="ai-actions">
                  <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("diagnose_resume")}><Target size={15} />模块级诊断</button>
                  <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("recommend_keywords")}><Sparkles size={15} />JD 关键词补充</button>
                </div>
                <div style={{display:"grid",gap:6,fontSize:11,color:"#8b909a",lineHeight:1.6}}>
                  <span><strong style={{color:"#5b6472"}}>模块级诊断：</strong>逐模块分析简历与 JD 的匹配度，指出缺失关键词和表达问题，诊断结果显示在各模块标题下方。</span>
                  <span><strong style={{color:"#5b6472"}}>JD 关键词补充：</strong>从岗位 JD 中提取技能关键词供你勾选，加入简历可提升 ATS 机器筛选通过率。</span>
                </div>
                <div className="ai-workflow-steps"><span><strong>1</strong>先做模块诊断</span><span><strong>2</strong>在编辑器各模块旁点击 AI 润色</span><span><strong>3</strong>采纳候选后自动评分</span></div>
                {keywordSuggestions ? (
                  <div style={{display:"grid",gap:8,padding:12,border:"1px solid #e4e6ea",borderRadius:12,background:"#fafbfc"}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#333"}}>AI 推荐补充 {keywordSuggestions.length} 个关键词：</span>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {keywordSuggestions.map((kw) => { const sel = selectedKeywords.has(kw); return (
                        <button key={kw} type="button" onClick={() => { const next = new Set(selectedKeywords); sel ? next.delete(kw) : next.add(kw); setSelectedKeywords(next); }}
                          style={{padding:"4px 10px",border:`1px solid ${sel ? "#314934" : "#e0e2e6"}`,borderRadius:999,background:sel?"#eef5eb":"#fff",color:sel?"#314934":"#5b6472",fontSize:12,cursor:"pointer",transition:"all 120ms ease"}}>{kw}{sel ? " ✓" : ""}</button>
                      ); })}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button type="button" onClick={() => { setResume((c) => ({ ...c, skills: Array.from(new Set([...c.skills, ...Array.from(selectedKeywords)])) })); setKeywordSuggestions(null); setSelectedKeywords(new Set()); }} style={{padding:"6px 14px",border:0,borderRadius:8,background:"#101114",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>添加选中 ({selectedKeywords.size})</button>
                      <button type="button" onClick={() => { setKeywordSuggestions(null); setSelectedKeywords(new Set()); }} style={{padding:"6px 14px",border:"1px solid #e0e2e6",borderRadius:8,background:"#fff",color:"#8b909a",fontSize:12,cursor:"pointer"}}>取消</button>
                    </div>
                  </div>
                ) : null}
              </section>
              <div style={{marginTop:8}}>
                {templateSupportsColor(templateId) ? <TemplateColorSwitcher settings={templateSettings} templateId={templateId} onChange={updateTemplateSettings} /> : null}
                <ResumePreview photoSupported={isPhotoSupported} resume={resume} templateId={templateId} onDecorationSettingsChange={updateDecorationSettings} onPhotoSettingsChange={updatePhotoSettings} onSelectModule={focusEditorModule} onSwapModules={swapModules} onToggleVisibility={toggleVisibility} />
              </div>
            </div>
          ) : (
            <>
              {templateSupportsColor(templateId) ? <TemplateColorSwitcher settings={templateSettings} templateId={templateId} onChange={updateTemplateSettings} /> : null}
              <ResumePreview photoSupported={isPhotoSupported} resume={resume} templateId={templateId} onDecorationSettingsChange={updateDecorationSettings} onPhotoSettingsChange={updatePhotoSettings} onSelectModule={focusEditorModule} onSwapModules={swapModules} onToggleVisibility={toggleVisibility} />
            </>
          )}
        </section>
      </div>
      )}
    </main>
  );
}

function ResumeDashboard({ onCreateNew, onEdit, onSwitchToTemplates }: { onCreateNew: () => void; onEdit: (item: SavedResumeItem) => void; onSwitchToTemplates: () => void }) {
  const [savedItems, setSavedItems] = useState<SavedResumeItem[]>([]);
  useEffect(() => { setSavedItems(listSavedResumes()); }, []);
  const handleDelete = (id: string) => { if (confirm("确定要删除这份简历吗？此操作不可撤销。")) { deleteSavedResume(id); setSavedItems((prev) => prev.filter((i) => i.id !== id)); } };
  const handleCopy = (id: string) => { const dup = duplicateSavedResume(id); if (dup) setSavedItems((prev) => [dup, ...prev]); };
  return (
    <section className="template-start-screen" aria-label="简历管理">
      <aside className="template-start-sidebar" aria-label="主导航">
        <div className="template-brand"><strong>ResumeLM</strong></div>
        <nav className="template-start-nav" aria-label="主导航">
          <span className="is-active"><FileText size={18} />我的简历</span>
          <span onClick={onSwitchToTemplates} style={{cursor:"pointer"}}><LayoutTemplate size={18} />简历模板</span>
          <span><Sparkles size={18} />AI 服务</span>
          <span><Settings size={18} />通用设置</span>
        </nav>
      </aside>
      <div className="template-start-main">
        <header className="template-start-toolbar">
          <div><span className="eyebrow">简历管理</span><h1>我的简历</h1><p>管理你创建和导入的所有简历文件。</p></div>
          <div style={{display:"flex",gap:10}}>
            <button className="secondary-button" type="button" onClick={() => {}} style={{display:"inline-flex",alignItems:"center",gap:6}}><FileUp size={16} />导入简历</button>
            <button className="primary-button" type="button" onClick={onCreateNew} style={{display:"inline-flex",alignItems:"center",gap:6}}><Plus size={16} />新建简历</button>
          </div>
        </header>
        <div className="resume-card-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:16,marginTop:20}}>
          <div onClick={onCreateNew} style={{minHeight:340,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,border:"2px dashed #d1d5db",borderRadius:16,background:"#fafbfc",cursor:"pointer",transition:"all 200ms ease"}} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#9ca3af")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}>
            <Plus size={36} color="#9ca3af" /><span style={{fontSize:15,fontWeight:700,color:"#374151"}}>新建简历</span><span style={{fontSize:12,color:"#9ca3af"}}>从空白模板开始创建</span>
          </div>
          {savedItems.map((item) => (
            <div key={item.id} style={{display:"grid",gridTemplateRows:"1fr auto",border:"1px solid #e5e7eb",borderRadius:16,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",overflow:"hidden",transition:"all 200ms ease",cursor:"pointer"}} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; }}>
              <div onClick={() => onEdit(item)} style={{minHeight:240,background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <FileText size={48} color="#cbd5e1" />
              </div>
              <div style={{padding:14,borderTop:"1px solid #f1f5f9"}}>
                <strong style={{fontSize:14,color:"#111827",display:"block",marginBottom:4}}>{item.title}</strong>
                <span style={{fontSize:11,color:"#9ca3af"}}>{item.source === "imported" ? "导入" : "模板"} · {item.updatedAt.slice(0, 10)}</span>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} style={{padding:"4px 10px",border:"1px solid #e5e7eb",borderRadius:6,background:"#fff",fontSize:11,color:"#374151",cursor:"pointer"}}>编辑</button>
                  <button onClick={(e) => { e.stopPropagation(); handleCopy(item.id); }} style={{padding:"4px 10px",border:"1px solid #e5e7eb",borderRadius:6,background:"#fff",fontSize:11,color:"#374151",cursor:"pointer"}}>复制</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={{padding:"4px 10px",border:"1px solid #fecaca",borderRadius:6,background:"#fff",fontSize:11,color:"#dc2626",cursor:"pointer"}}>删除</button>
                </div>
              </div>
            </div>
          ))}
          {savedItems.length === 0 ? <div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:"#9ca3af"}}><FileText size={32} /><p style={{margin:"12px 0 0",fontSize:13}}>暂无简历，点击上方"新建简历"开始</p></div> : null}
        </div>
      </div>
    </section>
  );
}

function TemplateStartScreen({
  activeTemplateId,
  onSelect, onSwitchToResumes
}: {
  activeTemplateId: TemplateId;
  onSelect: (templateId: TemplateId) => void;
  onSwitchToResumes: () => void;
}) {
  return (
    <section className="template-start-screen" aria-label="选择简历模板">
      <aside className="template-start-sidebar" aria-label="主导航">
        <div className="template-brand">
                    <strong>ResumeLM</strong>
        </div>
        <nav className="template-start-nav" aria-label="模板功能">
          <span onClick={onSwitchToResumes} style={{cursor:"pointer"}}><FileText size={18} />我的简历</span>
          <span className="is-active"><LayoutTemplate size={18} />简历模板</span>
          <span><Sparkles size={18} />AI 服务</span>
          <span><Settings size={18} />通用设置</span>
        </nav>
      </aside>

      <div className="template-start-main">
        <header className="template-start-toolbar">
          <div>
            <span className="eyebrow">模板图库</span>
            <h1>模板</h1>
            <p>选择一张版式缩略图进入工作台，草稿内容会保留，进入后仍可继续切换模板。</p>
          </div>
        </header>

        <div className="template-start-grid">
          {templates.map((template) => {
            const isActive = template.id === activeTemplateId;

            return (
              <button
                aria-pressed={isActive}
                className={`template-start-card ${isActive ? "is-active" : ""}`}
                key={template.id}
                type="button"
                onClick={() => onSelect(template.id)}
              >
                <TemplateSnapshot templateId={template.id} />
                <span className="template-start-card-copy">
                  <strong>{template.label}</strong>
                  <span>
                    {templateDescriptions[template.id]}
                    {templateSupportsColor(template.id) ? " · 支持换色" : ""}
                  </span>
                </span>
                {isActive ? <span className="template-start-card-action">当前模板</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function IntroScreen({ onStart, onImportFile, isImporting }: { onStart: () => void; onImportFile: (e: ChangeEvent<HTMLInputElement>) => void; isImporting: boolean }) {
  const introScreenRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const screen = introScreenRef.current;
    if (!screen) return;
    const glow = screen.querySelector<HTMLElement>(".hero-mouse-glow");
    if (!glow) return;
    let raf = 0;
    let cx = 0.5, cy = 0.4;
    const mv = (e: MouseEvent) => {
      const r = screen.getBoundingClientRect();
      const tx = (e.clientX - r.left) / r.width;
      const ty = (e.clientY - r.top) / r.height;
      const anim = () => {
        cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
        glow.style.setProperty("--glow-x", `${cx * 100}%`);
        glow.style.setProperty("--glow-y", `${cy * 100}%`);
        glow.style.setProperty("--glow-opacity", "1");
        if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(anim);
        else raf = 0;
      };
      if (!raf) raf = requestAnimationFrame(anim);
    };
    const lv = () => glow.style.setProperty("--glow-opacity", "0");
    screen.addEventListener("mousemove", mv, { passive: true });
    screen.addEventListener("mouseleave", lv);
    return () => { screen.removeEventListener("mousemove", mv); screen.removeEventListener("mouseleave", lv); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal-on-scroll").forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  return (
    <section className="intro-screen" aria-label="ResumeLM 产品介绍" ref={introScreenRef}>
      <div className="intro-ambient is-top" aria-hidden="true" />
      <div className="intro-ambient is-bottom" aria-hidden="true" />
      <div className="hero-grid-overlay" aria-hidden="true" />
      <div className="hero-mouse-glow" aria-hidden="true" />
      <div className="hero-particles" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} className="hero-particle" style={{
            left: `${8 + (i * 37 + 17) % 84}%`, top: `${12 + (i * 53 + 23) % 76}%`,
            "--size": `${i % 3 === 0 ? 2.2 : i % 5 === 0 ? 4 : 2.8}px`,
            "--color": i % 4 === 0 ? "rgba(160, 180, 200, 0.6)" : i % 4 === 1 ? "rgba(190, 205, 220, 0.5)" : "rgba(210, 220, 235, 0.44)",
            "--glow": `${i % 5 === 0 ? 24 : 12}px`,
            "--duration": `${6 + (i * 3) % 6}s`, "--delay": `${(i * 0.7) % 8}s`,
            "--drift-x": `${(i % 3 - 1) * 28}px`, "--drift-y": `${-130 - (i % 5) * 24}px`,
            "--shimmer": `${2.5 + (i % 3) * 1.2}s`, "--shimmer-delay": `${(i * 0.5) % 3}s`
          } as React.CSSProperties} />
        ))}
      </div>
      <nav className="intro-nav" aria-label="首页导航">
        <div className="intro-brand">
                    <strong>ResumeLM</strong>
        </div>
        <div className="intro-nav-links">
          <span>AI 简历</span>
          <span>模板库</span>
          <span>ATS 评分</span>
        </div>
      </nav>

      <div className="intro-hero">
        <div className="intro-hero-copy">
          <span className="intro-kicker">为校招准备的 AI 简历工作台</span>
          <h1>不止步于简历<br />优化</h1>
          <p>你比自己想象的更优秀</p>
          <div className="intro-actions">
            <label className={`intro-primary${isImporting ? " is-disabled" : ""}`} style={{position:"relative",cursor:isImporting?"wait":"pointer",overflow:"hidden"}}>
              {isImporting ? <Sparkles size={18} style={{animation:"pulse 1s ease-in-out infinite"}} /> : <FileUp size={18} />}
              {isImporting ? "正在导入…" : "导入已有简历"}
              {!isImporting ? <input accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" type="file" onChange={onImportFile} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"}} /> : null}
            </label>
            <button className="intro-secondary" type="button" onClick={onStart}>
              通过模板新建简历
            </button>
          </div>
        </div>
        <div className="intro-showcase" aria-hidden="true">
          <div className="intro-orbit is-one" />
          <div className="intro-orbit is-two" />
          <div className="intro-resume-card">
            <TemplateSnapshot templateId="useful" />
          </div>
          <div className="intro-floating-card is-score">
            <strong>92</strong>
            <span>ATS 匹配分</span>
          </div>
          <div className="intro-floating-card is-ai">
            <Sparkles size={15} />
            <span>AI 润色完成</span>
          </div>
        </div>
      </div>

      <div className="intro-feature-grid reveal-on-scroll">
        <article><span>01</span><h2>先选模板，再进入编辑。</h2><p>像大厂官网一样用图判断风格，避免只看名字选择模板。</p></article>
        <article><span>02</span><h2>AI 帮你把经历写具体。</h2><p>把普通经历改成成果导向表达，补齐关键词和岗位匹配建议。</p></article>
        <article><span>03</span><h2>本地保存，低门槛开放。</h2><p>第一版不强制登录，草稿自动保存在浏览器，随时导出 JSON 备份。</p></article>
      </div>

      <section className="intro-section reveal-on-scroll">
        <div className="intro-section-header">
          <span className="intro-section-kicker">工作流</span>
          <h2>从空白到投递，三步完成</h2>
          <p>不需要从头学怎么写简历，ResumeLM 把每一步都拆好了。</p>
        </div>
        <div className="intro-steps">
          <div className="intro-step"><span className="intro-step-number">1</span><h3>导入或从模板开始</h3><p>上传已有的 Word/PDF 简历，系统自动解析成可编辑字段。也可以从 6 套模板中任选一套快速起步。</p></div>
          <div className="intro-step"><span className="intro-step-number">2</span><h3>AI 逐模块优化</h3><p>每个模块都能独立诊断和润色。AI 会给出 3 个候选版本，你选择最合适的采纳。只优化表达，不改事实。</p></div>
          <div className="intro-step"><span className="intro-step-number">3</span><h3>评分后导出 PDF</h3><p>系统基于 ATS 兼容性、内容完整度、JD 关键词匹配等 6 个维度打分，确认无误后一键导出。</p></div>
        </div>
      </section>

      <section className="intro-section reveal-on-scroll">
        <div className="intro-section-header">
          <span className="intro-section-kicker">AI 能力</span>
          <h2>不只是生成，是完整的简历诊断系统</h2>
          <p>每个建议都基于你的真实经历和岗位 JD，不编造、不虚构。</p>
        </div>
        <div className="intro-ai-grid">
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><Sparkles size={18} /></span><h3>整份简历生成</h3><p>基于基础信息生成结构完整的校招简历初稿，直接进入编辑状态微调。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><FileText size={18} /></span><h3>逐模块润色</h3><p>每个模块独立调用 AI，生成 3 个不同风格候选版本，采纳后才写回工作台。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><Target size={18} /></span><h3>ATS 关键词匹配</h3><p>对照目标 JD 分析关键词覆盖情况，给出可执行的自然补充建议。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><BadgeCheck size={18} /></span><h3>模板级诊断</h3><p>针对个人评价、教育、实习等 8 个模块逐一评分，标注严重程度和改进方向。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><LayoutTemplate size={18} /></span><h3>6 套校招模板</h3><p>从极简 PM 到蓝橙活力，每种风格都支持颜色、字体、图标和布局微调。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><Download size={18} /></span><h3>PDF 导出</h3><p>模板预览即所得，一键导出 PDF，版式稳定可直接投递。</p></div>
        </div>
      </section>

      <section className="intro-section reveal-on-scroll">
        <div className="intro-section-header">
          <span className="intro-section-kicker">评分标准</span>
          <h2>6 大维度，全面评估简历质量</h2>
          <p>每个维度独立打分，帮你精准定位简历薄弱环节。</p>
        </div>
        <div className="intro-ai-grid">
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><Activity size={18} /></span><h3>ATS 兼容 · 25分</h3><p>检测简历能否被主流ATS系统正确解析，包括联系方式、标准章节标签、无图片干扰等。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><BookOpen size={18} /></span><h3>内容完整 · 20分</h3><p>评估各模块填写丰富度，教育经历、实习项目、技能奖项是否充分覆盖。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><Target size={18} /></span><h3>关键词匹配 · 30分</h3><p>对照目标JD提取关键词，检测简历中是否出现对应术语，支持同义词模糊匹配。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><TrendingUp size={18} /></span><h3>成果量化 · 10分</h3><p>统计简历中具体数字、百分比、增长率等量化指标，区分强量化和弱量化表达。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><BadgeCheck size={18} /></span><h3>评价表达 · 10分</h3><p>分析个人评价是否包含背景、能力、目标等关键信号，个人优势是否具体而非泛泛。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><Eye size={18} /></span><h3>可读性 · 5分</h3><p>检查段落长度、行文节奏，避免超长段落降低HR阅读效率。</p></div>
        </div>
      </section>

      <section className="intro-section reveal-on-scroll">
        <div className="intro-section-header">
          <span className="intro-section-kicker">AI 诊断与优化</span>
          <h2>不只是润色，更是逐模块精准诊断</h2>
          <p>AI 会逐一检查每个模块与 JD 的匹配度，告诉你哪里缺关键词、哪里表达不够好。</p>
        </div>
        <div className="intro-ai-grid">
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><Target size={18} /></span><h3>模块级诊断</h3><p>针对 8 大模块逐一分析，用红/黄/绿标注匹配度，诊断结果显示在对应模块标题下方，一目了然。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><Sparkles size={18} /></span><h3>逐模块 AI 润色</h3><p>每个模块独立调用 AI 生成 3 个候选版本，你选择最合适的采纳。只优化表达，不编造事实。</p></div>
          <div className="intro-ai-card"><span className="intro-ai-card-icon"><BadgeCheck size={18} /></span><h3>JD 关键词补充</h3><p>AI 从 JD 中提取技能关键词供你勾选，加入简历可提升 ATS 机器筛选通过率。</p></div>
        </div>
      </section>

      <section className="intro-section reveal-on-scroll intro-cta">
        <h2>开始制作你的第一份简历</h2>
        <p>无需登录，免费使用全部功能。</p>
        <div className="intro-cta-actions">
          <label style={{position:"relative",cursor:isImporting?"wait":"pointer",overflow:"hidden",display:"inline-flex",alignItems:"center",gap:9,minHeight:50,padding:"0 28px",borderRadius:999,fontSize:15,fontWeight:800,background:"#101114",color:"#fff",border:0,opacity:isImporting?0.6:1}}>{isImporting ? <Sparkles size={18} style={{animation:"pulse 1s ease-in-out infinite"}} /> : <FileUp size={18} />}{isImporting ? "正在导入…" : "导入已有简历"}{!isImporting ? <input accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" type="file" onChange={onImportFile} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"}} /> : null}</label>          <button type="button" onClick={onStart}><LayoutTemplate size={18} />从模板新建</button>
        </div>
      </section>

      <footer className="intro-section reveal-on-scroll intro-footer">
        <div className="intro-footer-grid">
          <div className="intro-footer-brand"><strong>ResumeLM</strong><p>AI 智能简历生成与优化平台</p></div>
          <div className="intro-footer-col"><h4>产品</h4><span>模板库</span><span>ATS 评分</span><span>AI 润色</span></div>
          <div className="intro-footer-col"><h4>联系我们</h4><div className="intro-footer-contact"><Mail size={14} /><span>hi@resumelm.com</span></div><p className="intro-footer-contact-note">遇到问题或有任何建议，欢迎随时邮件联系，我们会在 24 小时内回复。</p></div>
        </div>
        <div className="intro-footer-bottom"><span>ResumeLM 第一期 · 匿名开放 · 数据本地保存</span><span>问卷星团队出品</span></div>
      </footer>
    </section>
  );
}

function TemplateGallery({
  activeTemplateId,
  onSelect
}: {
  activeTemplateId: TemplateId;
  onSelect: (templateId: TemplateId) => void;
}) {
  return (
    <section className="template-gallery" aria-label="模板图库">
      <div className="template-gallery-head">
        <div>
          <span className="eyebrow">模板图库</span>
          <strong>看图选择版式</strong>
        </div>
        <LayoutTemplate size={18} />
      </div>
      <div className="template-card-grid">
        {templates.map((template) => {
          const isActive = template.id === activeTemplateId;

          return (
            <button
              aria-pressed={isActive}
              className={`template-card ${isActive ? "is-active" : ""}`}
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
            >
              <TemplateSnapshot templateId={template.id} />
              <span className="template-card-copy">
                <strong>{template.label}</strong>
                <span>
                  {templateDescriptions[template.id]}
                  {templateSupportsColor(template.id) ? " · 支持换色" : ""}
                </span>
              </span>
              {isActive ? <span className="template-card-badge">当前使用</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TemplateSnapshot({ templateId }: { templateId: TemplateId }) {
  const previewResume = createTemplatePreviewResume();

  return (
    <div className="template-snapshot" aria-hidden="true">
      <div className="template-snapshot-canvas">
        <ResumePreview
          isStaticPreview
          photoSupported={templateSupportsPhoto(templateId)}
          resume={previewResume}
          templateId={templateId}
          onDecorationSettingsChange={() => undefined}
          onPhotoSettingsChange={() => undefined}
          onSelectModule={() => undefined}
          onSwapModules={() => undefined}
          onToggleVisibility={() => undefined}
        />
      </div>
    </div>
  );
}

function TemplateColorSwitcher({
  onChange,
  settings,
  templateId
}: {
  onChange: (nextSettings: Partial<ResumeTemplateSettings>) => void;
  settings: ResumeTemplateSettings;
  templateId: TemplateId;
}) {
  const normalizedSettings = normalizeTemplateSettings(settings);

  return (
    <section className="template-color-switcher" aria-label="模板换色">
      <div>
        <span className="eyebrow">模板换色</span>
        <strong>边框与模块标题色</strong>
      </div>
      <div className="template-color-options">
        {templateColorOptions.map((option) => {
          const colorValue = option.value ?? templateOriginalColors[templateId];
          const isActive = option.id === normalizedSettings.color;

          return (
            <button
              aria-label={`切换为${option.label}`}
              aria-pressed={isActive}
              className={isActive ? "is-active" : ""}
              key={option.id}
              title={option.label}
              type="button"
              style={{ "--template-swatch-color": colorValue } as React.CSSProperties}
              onClick={() => onChange({ color: option.id })}
            >
              <span />
              <em>{option.label}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FeedbackPanel({
  onSubmit
}: {
  onSubmit: (target: FeedbackTarget, vote: FeedbackVote, reason: string, note: string) => void;
}) {
  const [target, setTarget] = useState<FeedbackTarget>("overall");
  const [vote, setVote] = useState<FeedbackVote>("up");
  const [reason, setReason] = useState(feedbackReasons.up[0]);
  const [note, setNote] = useState("");

  const updateVote = (nextVote: FeedbackVote) => {
    setVote(nextVote);
    setReason(feedbackReasons[nextVote][0]);
  };

  return (
    <section className="feedback-panel" aria-label="产品反馈">
      <div className="feedback-head">
        <div>
          <span className="eyebrow">产品反馈</span>
          <strong>点赞 / 点踩</strong>
        </div>
        <MessageSquare size={18} />
      </div>
      <div className="feedback-controls">
        <select value={target} onChange={(event) => setTarget(event.target.value as FeedbackTarget)}>
          <option value="overall">整体体验</option>
          <option value="ai">AI 结果</option>
          <option value="score">评分报告</option>
          <option value="export">导出体验</option>
        </select>
        <div className="vote-toggle">
          <button className={vote === "up" ? "active" : ""} type="button" onClick={() => updateVote("up")}>
            <ThumbsUp size={15} />
            赞
          </button>
          <button className={vote === "down" ? "active" : ""} type="button" onClick={() => updateVote("down")}>
            <ThumbsDown size={15} />
            踩
          </button>
        </div>
        <select value={reason} onChange={(event) => setReason(event.target.value)}>
          {feedbackReasons[vote].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <textarea placeholder="补充一句具体感受" value={note} onChange={(event) => setNote(event.target.value)} />
        <button className="primary-button" type="button" onClick={() => onSubmit(target, vote, reason, note)}>
          提交反馈
        </button>
      </div>
    </section>
  );
}

function IconSettingsPanel({
  onChange,
  settings
}: {
  onChange: (nextSettings: Partial<ResumeIconSettings>) => void;
  settings: ResumeIconSettings;
}) {
  const fields: Array<{ key: keyof Omit<ResumeIconSettings, "enabled">; label: string }> = [
    { key: "phone", label: "电话前" },
    { key: "email", label: "邮箱前" },
    { key: "city", label: "地址前" },
    { key: "targetRole", label: "岗位前" },
    { key: "personalSummary", label: "个人评价" },
    { key: "strengths", label: "个人优势" },
    { key: "education", label: "教育经历" },
    { key: "internships", label: "实习经历" },
    { key: "projects", label: "项目经历" },
    { key: "campusExperience", label: "校园经历" },
    { key: "skills", label: "技能" },
    { key: "awards", label: "奖项" }
  ];

  return (
    <section className="icon-settings-panel" aria-label="简历小图标">
      <div className="icon-settings-head">
        <div>
          <span className="eyebrow">简历小图标</span>
          <strong>{settings.enabled ? "已开启" : "未开启"}</strong>
        </div>
        <label className="switch-field">
          <input
            checked={settings.enabled}
            type="checkbox"
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          使用图标
        </label>
      </div>
      <div className="icon-settings-grid">
        {fields.map((field) => (
          <label className="icon-select" key={field.key}>
            <span>{field.label}样式</span>
            <select
              disabled={!settings.enabled}
              value={settings[field.key]}
              onChange={(event) => onChange({ [field.key]: event.target.value as ResumeIconId })}
            >
              {iconStyleOptions[field.key].map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function StyleSettingsPanel({
  onChange,
  settings
}: {
  onChange: (nextSettings: Partial<ResumeStyleSettings>) => void;
  settings: ResumeStyleSettings;
}) {
  return (
    <section className="style-settings-panel" aria-label="简历样式">
      <div className="style-settings-head">
        <div>
          <span className="eyebrow">简历样式</span>
          <strong>常用字体字号颜色</strong>
        </div>
        <LayoutTemplate size={18} />
      </div>
      <div className="style-settings-grid">
        <SelectField
          label="标题字体"
          value={settings.headingFont}
          options={fontOptions}
          onChange={(value) => onChange({ headingFont: value as ResumeFontId })}
        />
        <SelectField
          label="正文字体"
          value={settings.bodyFont}
          options={fontOptions}
          onChange={(value) => onChange({ bodyFont: value as ResumeFontId })}
        />
        <SelectField
          label="基础信息位置"
          value={settings.headerAlignment}
          options={headerAlignmentOptions}
          onChange={(value) => onChange({ headerAlignment: value as ResumeHeaderAlignment })}
        />
        <SelectField
          label="姓名字号"
          value={String(settings.nameSize)}
          options={nameSizeOptions.map((size) => ({ id: String(size), label: `${size}` }))}
          onChange={(value) => onChange({ nameSize: Number(value) })}
        />
        <SelectField
          label="标题字号"
          value={String(settings.sectionTitleSize)}
          options={sectionTitleSizeOptions.map((size) => ({ id: String(size), label: `${size}` }))}
          onChange={(value) => onChange({ sectionTitleSize: Number(value) })}
        />
        <SelectField
          label="正文字号"
          value={String(settings.bodySize)}
          options={bodySizeOptions.map((size) => ({ id: String(size), label: `${size}` }))}
          onChange={(value) => onChange({ bodySize: Number(value) })}
        />
        <SelectField
          label="姓名颜色"
          value={settings.nameColor}
          options={colorOptions}
          onChange={(value) => onChange({ nameColor: value as ResumeColorId })}
        />
        <SelectField
          label="标题颜色"
          value={settings.sectionTitleColor}
          options={colorOptions}
          onChange={(value) => onChange({ sectionTitleColor: value as ResumeColorId })}
        />
        <SelectField
          label="正文颜色"
          value={settings.bodyColor}
          options={colorOptions}
          onChange={(value) => onChange({ bodyColor: value as ResumeColorId })}
        />
        <SelectField
          label="强调色"
          value={settings.accentColor}
          options={colorOptions}
          onChange={(value) => onChange({ accentColor: value as ResumeColorId })}
        />
      </div>
    </section>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  value: string;
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DashboardPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <details className="dashboard-panel" aria-label="BI 看板">
      <summary className="dashboard-summary">
        <span>BI 看板 · 本地运营指标</span>
        <strong>{metrics.positiveRate}% 好评率</strong>
      </summary>
      <div className="dashboard-content">
        <div className="metric-grid">
          <MetricCard label="会话" value={metrics.sessions} />
          <MetricCard label="事件" value={metrics.events} />
          <MetricCard label="AI" value={metrics.aiRuns} />
          <MetricCard label="评分" value={metrics.scores} />
          <MetricCard label="导出" value={metrics.exports} />
          <MetricCard label="赞/踩" value={`${metrics.upVotes}/${metrics.downVotes}`} />
        </div>
        <div className="reason-rank">
          <span>差评原因</span>
          {metrics.topDownReasons.length ? (
            metrics.topDownReasons.map((item) => (
              <strong key={item.reason}>
                {item.reason} · {item.count}
              </strong>
            ))
          ) : (
            <strong>暂无</strong>
          )}
        </div>
      </div>
    </details>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionHeading({
  actionLabel,
  aiLabel, diagnosis, icon, isVisible, onAction, onAiAction, onToggleVisibility, title, visibilityKey
}: {
  actionLabel?: string; aiLabel?: string; diagnosis?: { severity: string; summary: string };
  icon: React.ReactNode; isVisible?: boolean;
  onAction?: () => void; onAiAction?: () => void;
  onToggleVisibility?: (section: keyof ResumeVisibilitySettings) => void;
  title: string; visibilityKey?: keyof ResumeVisibilitySettings;
}) {
  const sevColor = diagnosis?.severity === "high" ? "#d65f5f" : diagnosis?.severity === "medium" ? "#d4a84f" : "#5a8f5a";
  return (
    <div>
      <div className={`section-title ${visibilityKey && !isVisible ? "is-hidden" : ""}`}>
        <span>{icon}{title}</span>
        <div className="section-actions">
        {onAiAction ? <button className="ai-polish-btn" type="button" onClick={onAiAction}><Sparkles size={12} />{aiLabel || "AI 润色"}</button> : null}
        {visibilityKey ? (
          <button
            aria-label={isVisible ? `隐藏${title}` : `显示${title}`}
            className={`visibility-toggle ${isVisible ? "" : "is-off"}`}
            title={isVisible ? "隐藏模块" : "显示模块"}
            type="button"
            onClick={() => onToggleVisibility?.(visibilityKey)}
          >
            {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        ) : null}
        {onAction ? (
          <button className="tiny-action" type="button" onClick={onAction}>
            <Plus size={14} />
            {actionLabel}
          </button>
        ) : null}
        </div>
      </div>
      {diagnosis ? <div style={{fontSize:11,padding:"4px 10px",margin:"4px 0 0",borderRadius:8,background:sevColor+"15",color:sevColor,border:`1px solid ${sevColor}30`}}>{diagnosis.summary}</div> : null}
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

function PhotoUploadPanel({
  onRemove,
  onSettingsChange,
  onUpload,
  photo,
  photoSettings
}: {
  onRemove: () => void;
  onSettingsChange: (nextSettings: Partial<ResumePhotoSettings>) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  photo: ResumeDocument["profile"]["photo"];
  photoSettings: ResumePhotoSettings;
}) {
  return (
    <section className="photo-upload-panel" aria-label="头像上传与裁剪">
      <div className="photo-upload-head">
        <div>
          <span className="eyebrow">头像 / 照片</span>
          <strong>{photo ? "已上传" : "可选上传"}</strong>
        </div>
        <label className="secondary-button photo-upload-button">
          <FileUp size={15} />
          上传图片
          <input accept="image/jpeg,image/png,image/webp" hidden type="file" onChange={onUpload} />
        </label>
      </div>
      <p>支持 JPG、PNG、WebP，2MB 以内。上传后只保存在当前浏览器草稿中。</p>
      {!photoSettings.visible ? (
        <button className="secondary-button" type="button" onClick={() => onSettingsChange({ visible: true })}>
          恢复显示照片
        </button>
      ) : null}
      {photo ? (
        <div className="photo-upload-status">
          <span>{photo.fileName}</span>
          <button className="secondary-button" type="button" onClick={onRemove}>
            删除图片
          </button>
        </div>
      ) : null}
    </section>
  );
}

function RangeField({
  label,
  max,
  min,
  onChange,
  step,
  value
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="range-field">
      <span>
        {label}
        <strong>{Number.isInteger(value) ? value : value.toFixed(2)}</strong>
      </span>
      <input max={max} min={min} step={step} type="range" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ExperienceEditor({
  isVisible, items, onAdd, onRemove, onToggleVisibility, onUpdate, section, title, visibilityKey,
  aiLabel, onAiAction, diagnosis
}: {
  isVisible: boolean; items: Experience[]; onAdd: (section: ExperienceSection) => void;
  onRemove: (section: ExperienceSection, index: number) => void;
  onToggleVisibility: (section: keyof ResumeVisibilitySettings) => void;
  onUpdate: (section: ExperienceSection, index: number, field: keyof Experience, value: string) => void;
  section: ExperienceSection; title: string; visibilityKey: keyof ResumeVisibilitySettings;
  aiLabel?: string; onAiAction?: (index: number) => void; diagnosis?: { severity: string; summary: string };
}) {
  return (
    <>
      <SectionHeading actionLabel="添加" icon={<BriefcaseBusiness size={15} />} isVisible={isVisible}
        title={title} visibilityKey={visibilityKey} onAction={() => onAdd(section)}
        onToggleVisibility={onToggleVisibility}
        aiLabel={aiLabel} onAiAction={onAiAction ? () => onAiAction(0) : undefined}
        diagnosis={diagnosis}
      />
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

function ResumePreview({
  photoSupported,
  isStaticPreview = false,
  onDecorationSettingsChange,
  onPhotoSettingsChange,
  onSelectModule,
  onSwapModules,
  onToggleVisibility,
  resume,
  templateId
}: {
  photoSupported: boolean;
  isStaticPreview?: boolean;
  onDecorationSettingsChange: (nextSettings: Partial<ResumeDecorationSettings>) => void;
  onPhotoSettingsChange: (nextSettings: Partial<ResumePhotoSettings>) => void;
  onSelectModule: (moduleId: ResumeModuleId) => void;
  onSwapModules: (sourceModuleId: ResumeModuleId, targetModuleId: ResumeModuleId) => void;
  onToggleVisibility: (section: keyof ResumeVisibilitySettings) => void;
  resume: ResumeDocument;
  templateId: TemplateId;
}) {
  const [draggingModule, setDraggingModule] = useState<ResumeModuleId | null>(null);
  const [dragOverModule, setDragOverModule] = useState<ResumeModuleId | null>(null);
  const internships = resume.internships.filter(hasExperienceContent);
  const projects = resume.projects.filter(hasExperienceContent);
  const campusExperience = resume.campusExperience.filter(hasExperienceContent);
  const skills = nonEmpty(resume.skills);
  const awards = nonEmpty(resume.awards);
  const iconSettings = normalizeIconSettings(resume.iconSettings);
  const styleSettings = normalizeStyleSettings(resume.styleSettings);
  const visibilitySettings = normalizeVisibilitySettings(resume.visibilitySettings);
  const photoSettings = normalizePhotoSettings(resume.photoSettings);
  const decorationSettings = normalizeDecorationSettings(resume.decorationSettings);
  const templateSettings = normalizeTemplateSettings(resume.templateSettings);
  const moduleOrder = normalizeModuleOrder(resume.moduleOrder);
  const templateModuleConfig = getTemplateModuleConfig(templateId);
  const templateModuleSet = new Set(templateModuleConfig.modules);
  const activeModuleOrder = moduleOrder.filter((moduleId) => templateModuleSet.has(moduleId));
  const iconEnabled = iconSettings.enabled;
  const isPhotoEnabled = photoSupported && photoSettings.visible;
  const displayName = resume.profile.name || "你的姓名";
  const displayTitle = templateId === "brick" ? "个人简历" : displayName;
  const nameFitStyle = getNameFitStyle(displayName, styleSettings, templateId);
  const headerNameStyle = templateId === "brick" ? undefined : nameFitStyle;
  const getModuleLabel = (moduleId: ResumeModuleId) => getTemplateModuleLabel(templateId, moduleId);
  const contactItems = [
    { icon: iconSettings.phone, text: resume.profile.phone || "电话" },
    { icon: iconSettings.email, text: resume.profile.email || "邮箱" },
    { icon: iconSettings.city, text: resume.profile.city || "城市" }
  ];
  const brickInfoItems = [
    { icon: iconSettings.personalSummary, text: `姓名：${displayName}` },
    { icon: iconSettings.targetRole, text: `求职意向：${resume.profile.targetRole || resume.targetJob.title || "产品经理"}` },
    { icon: iconSettings.phone, text: `手机：${resume.profile.phone || "电话"}` },
    { icon: iconSettings.email, text: `邮箱：${resume.profile.email || "邮箱"}` },
    { icon: iconSettings.city, text: `地址：${resume.profile.city || "城市"}` }
  ];
  const headerContactItems = templateId === "brick" ? brickInfoItems : contactItems;
  const targetLabel = templateId === "brick" ? "求职意向" : "目标岗位";
  const startPhotoResize = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = photoSettings.width;
    const startHeight = photoSettings.height;

    const handleMove = (moveEvent: MouseEvent) => {
      onPhotoSettingsChange({
        width: Math.min(180, Math.max(56, startWidth + moveEvent.clientX - startX)),
        height: Math.min(220, Math.max(70, startHeight + moveEvent.clientY - startY))
      });
    };

    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };
  const startNodeDrag = (nodeIndex: number) => (event: React.MouseEvent) => {
    if (isStaticPreview || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const startX = event.clientX; const startY = event.clientY;
    const nodes = decorationSettings.nodes;
    const startNX = nodes[nodeIndex]?.x ?? 0; const startNY = nodes[nodeIndex]?.y ?? 0;
    const handleMove = (e: MouseEvent) => {
      const nextNodes = nodes.map((n, i) => i === nodeIndex ? { x: Math.min(994, Math.max(-200, startNX + e.clientX - startX)), y: Math.min(1323, Math.max(-200, startNY + e.clientY - startY)) } : n);
      onDecorationSettingsChange({ nodes: nextNodes });
    };
    const handleUp = () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
    window.addEventListener("mousemove", handleMove); window.addEventListener("mouseup", handleUp);
  };
  const startPhotoMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const headerElement = event.currentTarget.closest(".resume-head");

    const handleMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
    };

    const handleUp = (upEvent: MouseEvent) => {
      const headerRect = headerElement?.getBoundingClientRect();
      const releaseX = Math.abs(upEvent.clientX - startX) < 4 ? startX : upEvent.clientX;

      if (headerRect) {
        onPhotoSettingsChange({
          position: releaseX < headerRect.left + headerRect.width / 2 ? "left" : "right"
        });
      }

      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };
  const getModuleControls = (moduleId: ResumeModuleId) => (
    isStaticPreview ? null : (
      <ResumeModuleControls
        isVisible={visibilitySettings[moduleId]}
        label={getModuleLabel(moduleId)}
        moduleId={moduleId}
        onToggleVisibility={onToggleVisibility}
      />
    )
  );
  const photoNode = isPhotoEnabled ? (
    <div className="resume-photo-wrap" title="拖动照片到左侧或右侧">
      {isStaticPreview ? null : (
        <button
          aria-label="隐藏照片"
          className="resume-photo-remove"
          title="隐藏照片"
          type="button"
          onClick={() => onPhotoSettingsChange({ visible: false })}
        >
          <X size={13} />
        </button>
      )}
      <div
        className="resume-photo"
        aria-label={resume.profile.photo ? "简历头像" : "照片占位"}
        style={{
          width: photoSettings.width,
          height: photoSettings.height
        }}
        onMouseDown={isStaticPreview ? undefined : startPhotoMove}
      >
        {resume.profile.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Resume exports need a plain img with the local data URL. */
          <img
            alt="简历头像"
            src={resume.profile.photo.dataUrl}
            style={{
              objectPosition: `${resume.profile.photo.crop.x}% ${resume.profile.photo.crop.y}%`,
              transform: `scale(${resume.profile.photo.crop.zoom})`
            }}
          />
        ) : (
          <span className="resume-default-avatar" aria-hidden="true">
            <span className="resume-default-avatar-head" />
            <span className="resume-default-avatar-mouth">3</span>
            <span className="resume-default-avatar-body" />
          </span>
        )}
        {isStaticPreview ? null : <span className="resume-photo-resize" aria-hidden="true" onMouseDown={startPhotoResize} />}
      </div>
    </div>
  ) : null;
  const brickDecorationNode = templateId === "brick" ? (() => {
    const n = decorationSettings.nodes;
    // First segment: n[0] → n[1]
    const path1 = `M ${n[0].x} ${n[0].y} C ${(n[0].x+n[1].x)/2+30} ${n[0].y+40} ${(n[0].x+n[1].x)/2-30} ${n[1].y-40} ${n[1].x} ${n[1].y}`;
    // Second segment: n[1] → n[2]
    const path2 = `M ${n[1].x} ${n[1].y} C ${n[1].x+20} ${(n[1].y+n[2].y)/2-60} ${n[2].x-60} ${(n[1].y+n[2].y)/2+30} ${n[2].x} ${n[2].y}`;
    // Third segment: n[2] → n[3]
    const path3 = `M ${n[2].x} ${n[2].y} C ${n[2].x+40} ${(n[2].y+n[3].y)/2-40} ${n[3].x-30} ${(n[2].y+n[3].y)/2+40} ${n[3].x} ${n[3].y}`;
    // Fourth segment: n[3] → n[4]
    const path4 = `M ${n[3].x} ${n[3].y} C ${n[3].x-20} ${n[3].y+60} ${(n[3].x+n[4].x)/2} ${n[4].y-40} ${n[4].x} ${n[4].y}`;
    const colorAt = (i: number) => i <= 1 ? "is-blue" : "is-gold";
    return (
      <svg aria-label="曲线装饰，可拖动节点调整形状" className="brick-decoration-layer" viewBox="0 0 994 1323" style={{ transform: `translate(${decorationSettings.offsetX}px, ${decorationSettings.offsetY}px)` }}>
        {[path1, path2, path3, path4].map((d, i) => <path key={`hit-${i}`} className="brick-decoration-hit" d={d} />)}
        {n.map((p, i) => <circle key={`hit-${i}`} className="brick-decoration-node-hit" cx={p.x} cy={p.y} r={30} onMouseDown={startNodeDrag(i)} />)}
        {[path1, path2, path3, path4].map((d, i) => <path key={`line-${i}`} d={d} />)}
        {n.map((p, i) => <circle key={`dot-${i}`} className={colorAt(i)} cx={p.x} cy={p.y} r={18} onMouseDown={startNodeDrag(i)} style={{cursor:"grab"}} />)}
      </svg>
    );
  })() : null;
  const sectionRenderers: Record<ResumeModuleId, React.ReactNode> = {
    personalSummary: visibilitySettings.personalSummary ? (
      <ResumeSection controls={getModuleControls("personalSummary")} iconEnabled={iconEnabled} iconId={iconSettings.personalSummary} title={getModuleLabel("personalSummary")}>
        <span>{resume.personalSummary || "概括你的背景、能力和求职方向"}</span>
        {nonEmpty(resume.strengths).length ? <span className="skill-list" style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{nonEmpty(resume.strengths).map((s,i) => <span key={i} style={{padding:"4px 8px",border:"1px solid #dfe4d8",borderRadius:999,background:"#f8faf5",fontSize:12}}>{s}</span>)}</span> : null}
      </ResumeSection>
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("personalSummary")} label={getModuleLabel("personalSummary")} moduleId="personalSummary" />
    ),
    strengths: null as never,
    education: visibilitySettings.education ? (
      <section className="resume-section">
        {getModuleControls("education")}
        <h3>
          <ResumeIcon enabled={iconEnabled} iconId={iconSettings.education} />
          <span className="resume-inline-text">{getModuleLabel("education")}</span>
        </h3>
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
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("education")} label={getModuleLabel("education")} moduleId="education" />
    ),
    internships: visibilitySettings.internships ? (
      <ExperiencePreview
        controls={getModuleControls("internships")}
        fallback="实习经历会展示在这里。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.internships}
        items={internships}
        title={getModuleLabel("internships")}
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("internships")} label={getModuleLabel("internships")} moduleId="internships" />
    ),
    projects: visibilitySettings.projects ? (
      <ExperiencePreview
        controls={getModuleControls("projects")}
        fallback="描述你做了什么、如何做、带来了什么结果。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.projects}
        items={projects}
        title={getModuleLabel("projects")}
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("projects")} label={getModuleLabel("projects")} moduleId="projects" />
    ),
    campusExperience: visibilitySettings.campusExperience ? (
      <ExperiencePreview
        controls={getModuleControls("campusExperience")}
        fallback="学生组织、社团、竞赛或志愿经历。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.campusExperience}
        items={campusExperience}
        title={getModuleLabel("campusExperience")}
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("campusExperience")} label={getModuleLabel("campusExperience")} moduleId="campusExperience" />
    ),
    skills: visibilitySettings.skills ? (
      <TagSection
        controls={getModuleControls("skills")}
        iconEnabled={iconEnabled}
        iconId={iconSettings.skills}
        items={skills.length ? skills : ["数据分析", "用户研究", "文档表达"]}
        title={getModuleLabel("skills")}
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("skills")} label={getModuleLabel("skills")} moduleId="skills" />
    ),
    awards:
      visibilitySettings.awards ? (
        awards.length || templateId === "brick" ? (
          <ListSection
            controls={getModuleControls("awards")}
            iconEnabled={iconEnabled}
            iconId={iconSettings.awards}
            items={awards.length ? awards : ["暂无荣誉"]}
            title={getModuleLabel("awards")}
          />
        ) : null
      ) : (
        <HiddenModulePlaceholder controls={getModuleControls("awards")} label={getModuleLabel("awards")} moduleId="awards" />
      )
  };
  const simpleSidebarModuleIds: ResumeModuleId[] = ["strengths", "skills", "awards"];
  const renderModuleFrame = (moduleId: ResumeModuleId) =>
    sectionRenderers[moduleId] ? (
      <div
        className={`resume-module-frame ${draggingModule === moduleId ? "is-dragging" : ""} ${
          dragOverModule === moduleId && draggingModule !== moduleId ? "is-drop-target" : ""
        }`}
        data-preview-module={moduleId}
        draggable={!isStaticPreview}
        key={moduleId}
        title="拖动这个模块框可以和其他模块交换位置"
        onClick={isStaticPreview ? undefined : () => onSelectModule(moduleId)}
        onDragEnd={() => {
          if (isStaticPreview) return;
          setDraggingModule(null);
          setDragOverModule(null);
        }}
        onDragOver={(event) => {
          if (isStaticPreview) return;
          event.preventDefault();
          setDragOverModule(moduleId);
        }}
        onDragStart={(event) => {
          if (isStaticPreview) return;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", moduleId);
          setDraggingModule(moduleId);
        }}
        onDrop={(event) => {
          if (isStaticPreview) return;
          event.preventDefault();
          const sourceModuleId = event.dataTransfer.getData("text/plain") as ResumeModuleId;
          onSwapModules(sourceModuleId, moduleId);
          setDraggingModule(null);
          setDragOverModule(null);
        }}
      >
        {sectionRenderers[moduleId]}
      </div>
    ) : null;

  if (templateId === "simple") {
    const sidebarModules = activeModuleOrder.filter((moduleId) => simpleSidebarModuleIds.includes(moduleId));
    const mainModules = activeModuleOrder.filter((moduleId) => !simpleSidebarModuleIds.includes(moduleId));

    return (
      <article
        className={`resume-paper template-${templateId} header-align-${styleSettings.headerAlignment}`}
        style={getResumeStyleVars(styleSettings, templateId, templateSettings)}
      >
        <header className={`resume-head ${isPhotoEnabled ? `photo-${photoSettings.position}` : "photo-none"}`}>
          {isPhotoEnabled ? photoNode : null}
          <div className="resume-head-content">
            <h2 style={nameFitStyle}>{displayName}</h2>
            <div className="resume-target">
              <ResumeIcon enabled={iconEnabled} iconId={iconSettings.targetRole} />
              <span className="resume-target-label">目标岗位</span>
              <span className="resume-inline-text">{resume.profile.targetRole || resume.targetJob.title || "产品经理"}</span>
            </div>
          </div>
        </header>

        <aside className="simple-sidebar-panel" aria-label="简约天蓝侧栏信息">
          <section className="simple-profile-card">
            <h3>个人信息</h3>
            <div className="simple-contact-list">
              {contactItems.map((item, index) => (
                <span className="resume-contact-item" key={`${item.icon}-${index}`}>
                  <ResumeIcon enabled={iconEnabled} iconId={item.icon} size={18} />
                  <span className="resume-inline-text">{item.text}</span>
                </span>
              ))}
            </div>
          </section>
          {sidebarModules.map(renderModuleFrame)}
        </aside>

        <div className="simple-main-column">{mainModules.map(renderModuleFrame)}</div>
      </article>
    );
  }

  return (
    <article
      className={`resume-paper template-${templateId} header-align-${styleSettings.headerAlignment}`}
      style={getResumeStyleVars(styleSettings, templateId, templateSettings)}
    >
      {brickDecorationNode}
      <header className={`resume-head ${isPhotoEnabled ? `photo-${photoSettings.position}` : "photo-none"}`}>
        {isPhotoEnabled && photoSettings.position === "left" ? photoNode : null}
        <div className="resume-head-content">
          <h2 style={headerNameStyle}>{displayTitle}</h2>
          <p className="resume-contact-line">
            {headerContactItems.map((item, index) => (
              <span className="resume-contact-item" key={`${item.icon}-${index}`}>
                <ResumeIcon enabled={iconEnabled} iconId={item.icon} />
                <span className="resume-inline-text">{item.text}</span>
              </span>
            ))}
          </p>
          <div className="resume-target">
            <ResumeIcon enabled={iconEnabled} iconId={iconSettings.targetRole} />
            <span className="resume-target-label">{targetLabel}</span>
            <span className="resume-inline-text">{resume.profile.targetRole || resume.targetJob.title || "产品经理"}</span>
          </div>
        </div>
        {isPhotoEnabled && photoSettings.position === "right" ? photoNode : null}
      </header>

      {activeModuleOrder.map(renderModuleFrame)}
    </article>
  );
}

const dimensionLabels: Record<ScoreDimension, string> = {
  ats_compatibility: "ATS 结构",
  content_completeness: "内容完整",
  keyword_match: "关键词匹配",
  quantified_impact: "成果量化",
  summary_strength: "个人优势",
  readability: "可读性"
};

const dimensionMaxScores: Record<ScoreDimension, number> = {
  ats_compatibility: 25,
  content_completeness: 20,
  keyword_match: 30,
  quantified_impact: 10,
  summary_strength: 10,
  readability: 5
};

function ResumeModuleControls({
  isVisible,
  label,
  moduleId,
  onToggleVisibility
}: {
  isVisible: boolean;
  label?: string;
  moduleId: ResumeModuleId;
  onToggleVisibility: (section: keyof ResumeVisibilitySettings) => void;
}) {
  const resolvedLabel = label ?? moduleLabels[moduleId];

  return (
    <div className="resume-edit-controls" aria-label={`${resolvedLabel}模块控制`}>
      <span className="resume-drag-handle" aria-hidden="true" title="拖动模块框调整位置">
        <GripVertical size={13} />
      </span>
      <button
        aria-label={isVisible ? `隐藏${resolvedLabel}` : `显示${resolvedLabel}`}
        className={isVisible ? "" : "is-off"}
        title={isVisible ? "隐藏模块" : "显示模块"}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleVisibility(moduleId);
        }}
      >
        {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
    </div>
  );
}

function HiddenModulePlaceholder({ controls, label, moduleId }: { controls: React.ReactNode; label?: string; moduleId: ResumeModuleId }) {
  const resolvedLabel = label ?? moduleLabels[moduleId];

  return (
    <section className="resume-section resume-hidden-placeholder">
      {controls}
      <span>{resolvedLabel}已隐藏，导出模板后不会显示，点击眼睛恢复</span>
    </section>
  );
}

const sdl: Record<ScoreDimension, string> = { ats_compatibility: "ATS 兼容", content_completeness: "内容完整", keyword_match: "关键词匹配", quantified_impact: "成果量化", summary_strength: "评价表达", readability: "可读性" };
const sdm: Record<ScoreDimension, number> = { ats_compatibility: 25, content_completeness: 20, keyword_match: 30, quantified_impact: 10, summary_strength: 10, readability: 5 };
const sdo: ScoreDimension[] = ["ats_compatibility", "content_completeness", "keyword_match", "quantified_impact", "summary_strength", "readability"];

function BarFill({ pct }: { pct: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  const cls = pct < 40 ? "is-low" : pct < 70 ? "is-mid" : "is-high";
  return <span className={`score-hero-bar-fill ${cls}`} style={{ width: `${w}%` }} />;
}

function ScoreHeroView({ report, initialReport, isScoring, sourceLabel, completedSections, missingCount }: { report: ScoreReport; initialReport: ScoreReport | null; isScoring: boolean; sourceLabel: string; completedSections: number; missingCount: number }) {
  const hasRe = initialReport && initialReport.overallScore !== report.overallScore;
  return (
    <div className="score-hero">
      <div className="score-hero-main">
        <span className="eyebrow">{sourceLabel}</span>
        <div className="score-hero-value"><strong className={isScoring ? "is-pending" : ""}>{isScoring ? "..." : report.overallScore}</strong><span>分</span></div>
        {hasRe ? (<p className="score-hero-compare">原始评分 <strong>{initialReport?.overallScore}</strong> → 最新评分 <strong>{report.overallScore}</strong>{report.overallScore > (initialReport?.overallScore ?? 0) ? <span className="score-hero-up">+{report.overallScore - (initialReport?.overallScore ?? 0)}</span> : null}</p>) : (<p className="score-hero-compare">AI 优化或采纳候选后自动刷新</p>)}
      </div>
      <div className="score-hero-right">
        <div className="score-hero-bars" key={report.generatedAt}>
          {sdo.map((dim) => { const sc = report.dimensionScores[dim] ?? 0; const mx = sdm[dim]; const pct = Math.round((sc / mx) * 100); return (<div key={dim} className="score-hero-bar-row"><span className="score-hero-bar-label">{sdl[dim]}</span><span className="score-hero-bar-track"><BarFill pct={pct} /> </span><span className="score-hero-bar-value">{sc}/{mx}</span></div>); })}
        </div>
        <div className="score-hero-stats"><span><strong>{completedSections}/10</strong><em>已填模块</em></span><span><strong>{missingCount}</strong><em>待补充</em></span></div>
      </div>
    </div>
  );
}

function ScoreReportView({ report }: { report: ScoreReport }) {
  const dimensions = Object.entries(report.dimensionScores) as Array<[ScoreDimension, number]>;

  return (
    <section className="score-report" aria-label="评分报告">
      <div className="score-hero">
        <div>
          <span className="eyebrow">评分报告</span>
          <strong>{report.overallScore}</strong>
        </div>
        <p>基于规则引擎检查 ATS 结构、内容完整度、JD 关键词覆盖和表达质量。</p>
      </div>

      <div className="score-grid">
        {dimensions.map(([dimension, score]) => (
          <div className="score-dimension" key={dimension}>
            <div>
              <span>{dimensionLabels[dimension]}</span>
              <strong>
                {score}/{dimensionMaxScores[dimension]}
              </strong>
            </div>
            <progress max={dimensionMaxScores[dimension]} value={score} />
          </div>
        ))}
      </div>

      <div className="score-columns">
        <KeywordGroup items={report.matchedKeywords} title="已覆盖关键词" />
        <KeywordGroup items={report.missingKeywords} title="建议补充关键词" />
      </div>

      <div className="suggestion-list">
        <h3>改进建议</h3>
        {report.suggestions.length === 0 ? <p>当前简历结构较完整，可以继续根据目标岗位微调措辞。</p> : null}
        {report.suggestions.map((suggestion, index) => (
          <div className="suggestion-item" key={`${suggestion.priority}-${index}`}>
            <span>{suggestion.priority}</span>
            <p>{suggestion.text}</p>
          </div>
        ))}
      </div>
      <div style={{marginTop:12,padding:10,border:"1px solid #e8eaed",borderRadius:10,background:"#fafbfc",fontSize:11,color:"#8b909a",lineHeight:1.7}}>
        <strong style={{color:"#5b6472"}}>优先级说明</strong><br />
        <span style={{color:"#d65f5f"}}>P1</span> 必须修复 — 缺少基础信息、教育经历或任何项目/实习经历，ATS 可能直接筛掉<br />
        <span style={{color:"#d4a84f"}}>P2</span> 重要优化 — JD 关键词覆盖不足、成果量化偏少，影响竞争力但不影响投递<br />
        <span style={{color:"#5a8f5a"}}>P3</span> 锦上添花 — 个人评价可更充实、段落可拆分，修不修都能投
      </div>
    </section>
  );
}

function KeywordGroup({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="keyword-group">
      <h3>{title}</h3>
      <div className="keyword-list">
        {(items.length ? items : ["暂无"]).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function ResumeSection({
  children,
  controls,
  iconEnabled,
  iconId,
  title
}: {
  children: React.ReactNode;
  controls?: React.ReactNode;
  iconEnabled: boolean;
  iconId: ResumeIconId;
  title: string;
}) {
  return (
    <section className="resume-section">
      {controls}
      <h3>
        <ResumeIcon enabled={iconEnabled} iconId={iconId} />
        <span className="resume-inline-text">{title}</span>
      </h3>
      <p>{children}</p>
    </section>
  );
}

function ExperiencePreview({
  controls,
  fallback,
  iconEnabled,
  iconId,
  items,
  title
}: {
  controls?: React.ReactNode;
  fallback: string;
  iconEnabled: boolean;
  iconId: ResumeIconId;
  items: Experience[];
  title: string;
}) {
  return (
    <section className="resume-section">
      {controls}
      <h3>
        <ResumeIcon enabled={iconEnabled} iconId={iconId} />
        <span className="resume-inline-text">{title}</span>
      </h3>
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

function TagSection({
  controls,
  iconEnabled,
  iconId,
  items,
  title
}: {
  controls?: React.ReactNode;
  iconEnabled: boolean;
  iconId: ResumeIconId;
  items: string[];
  title: string;
}) {
  return (
    <section className="resume-section">
      {controls}
      <h3>
        <ResumeIcon enabled={iconEnabled} iconId={iconId} />
        <span className="resume-inline-text">{title}</span>
      </h3>
      <div className="skill-list">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function ListSection({
  controls,
  iconEnabled,
  iconId,
  items,
  title
}: {
  controls?: React.ReactNode;
  iconEnabled: boolean;
  iconId: ResumeIconId;
  items: string[];
  title: string;
}) {
  return (
    <section className="resume-section">
      {controls}
      <h3>
        <ResumeIcon enabled={iconEnabled} iconId={iconId} />
        <span className="resume-inline-text">{title}</span>
      </h3>
      <ul className="resume-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
