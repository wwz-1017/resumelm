"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
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
import type { AiGatewayResponse, AiTask } from "@/lib/ai/types";
import { downloadResumeWord, printResumePdf } from "@/lib/export/resume-export";
import { saveFeedback, type FeedbackTarget, type FeedbackVote } from "@/lib/feedback/store";
import {
  createDefaultIconSettings,
  createDefaultStyleSettings,
  createEmptyResume,
  normalizeIconSettings,
  normalizeModuleOrder,
  normalizePhotoSettings,
  normalizeStyleSettings,
  normalizeVisibilitySettings
} from "@/lib/resume-schema/defaults";
import type {
  Education,
  Experience,
  ResumeColorId,
  ResumeDocument,
  ResumeFontId,
  ResumeHeaderAlignment,
  ResumeIconId,
  ResumeIconSettings,
  ResumeModuleId,
  ResumePhotoSettings,
  ResumeStyleSettings,
  ResumeVisibilitySettings
} from "@/lib/resume-schema/types";
import { isResumeDocument, validateResume } from "@/lib/resume-schema/validate";
import type { ScoreDimension, ScoreReport } from "@/lib/scoring/types";
import {
  downloadResumeJson,
  getAnonymousSessionId,
  loadResume,
  resetResume,
  saveResume
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

const templates: Array<{ id: TemplateId; label: string }> = [
  { id: "useful", label: "好用蓝灰" },
  { id: "simple", label: "简约天蓝" },
  { id: "graduate", label: "应届蓝线" },
  { id: "brick", label: "砖红双栏" },
  { id: "leftBlue", label: "深蓝左栏" },
  { id: "minimalPm", label: "极简PM" }
];

const templateDescriptions: Record<TemplateId, string> = {
  useful: "蓝灰稳重，适合通用校招投递",
  simple: "天蓝横幅，左栏信息清晰",
  graduate: "蓝线清爽，突出应届生经历",
  brick: "砖红双栏，适合强调个人信息",
  leftBlue: "深蓝左栏，视觉识别更强",
  minimalPm: "极简 PM，适合产品/运营方向"
};

const photoTemplateIds: TemplateId[] = ["useful", "simple", "graduate"];
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

const getResumeStyleVars = (settings: ResumeStyleSettings) =>
  ({
    "--resume-heading-font": getFontValue(settings.headingFont),
    "--resume-body-font": getFontValue(settings.bodyFont),
    "--resume-name-size": `${settings.nameSize}px`,
    "--resume-section-title-size": `${settings.sectionTitleSize}px`,
    "--resume-body-size": `${settings.bodySize}px`,
    "--resume-name-color": getColorValue(settings.nameColor),
    "--resume-section-title-color": getColorValue(settings.sectionTitleColor),
    "--resume-body-color": getColorValue(settings.bodyColor),
    "--resume-accent-color": getColorValue(settings.accentColor)
  }) as React.CSSProperties;

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
  const [saveState, setSaveState] = useState("正在准备本地草稿");
  const [importError, setImportError] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("useful");
  const [isIntroVisible, setIsIntroVisible] = useState(true);
  const [isTemplateStartVisible, setIsTemplateStartVisible] = useState(true);
  const [aiTask, setAiTask] = useState<AiTask | null>(null);
  const [aiError, setAiError] = useState("");
  const [scoreReport, setScoreReport] = useState<ScoreReport | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [highlightedEditorModule, setHighlightedEditorModule] = useState<ResumeModuleId | null>(null);
  const editorHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const issues = validateResume(resume);
  const iconSettings = normalizeIconSettings(resume.iconSettings);
  const styleSettings = normalizeStyleSettings(resume.styleSettings);
  const visibilitySettings = normalizeVisibilitySettings(resume.visibilitySettings);
  const photoSettings = normalizePhotoSettings(resume.photoSettings);
  const isPhotoSupported = templateSupportsPhoto(templateId);

  useEffect(() => {
    const nextSessionId = getAnonymousSessionId();
    setSessionId(nextSessionId);
    setResume(loadResume());
    trackEvent("workspace_entered", nextSessionId);
    setDashboardMetrics(getDashboardMetrics());
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

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!isResumeDocument(parsed)) {
        setImportError("导入失败：这个 JSON 不是 ResumeLM 简历格式。");
        return;
      }

      setResume({
        ...parsed,
        iconSettings: normalizeIconSettings(parsed.iconSettings),
        styleSettings: normalizeStyleSettings(parsed.styleSettings),
        visibilitySettings: normalizeVisibilitySettings(parsed.visibilitySettings),
        photoSettings: normalizePhotoSettings(parsed.photoSettings),
        moduleOrder: normalizeModuleOrder(parsed.moduleOrder)
      });
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
    setDashboardMetrics(getDashboardMetrics());
  };

  const exportWord = () => {
    downloadResumeWord(resume.profile.name);
    trackEvent("export_completed", sessionId, { format: "word" });
    setDashboardMetrics(getDashboardMetrics());
  };

  const exportPdf = () => {
    try {
      printResumePdf(resume.profile.name);
      trackEvent("export_completed", sessionId, { format: "pdf" });
      setDashboardMetrics(getDashboardMetrics());
    } catch {
      setImportError("PDF 导出窗口被浏览器拦截，请允许弹窗后重试。");
    }
  };

  const saveResumeDraft = () => {
    saveResume(resume);
    trackEvent("resume_saved", sessionId, { trigger: "manual" });
  };

  const runAiAction = async (task: AiTask) => {
    setAiTask(task);
    setAiError("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ task, resume })
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const result = (await response.json()) as AiGatewayResponse;

      if (result.task === "generate_resume") {
        setResume(result.resume);
      }

      if (result.task === "rewrite_summary") {
        setResume((current) => ({ ...current, personalSummary: result.text }));
      }

      if (result.task === "rewrite_project") {
        setResume((current) => ({
          ...current,
          projects:
            current.projects.length > 0
              ? current.projects.map((project, index) => (index === 0 ? { ...project, description: result.text } : project))
              : [
                  {
                    title: "校招项目",
                    organization: "项目负责人",
                    startDate: "",
                    endDate: "",
                    description: result.text
                  }
                ]
        }));
      }

      if (result.task === "recommend_keywords") {
        setResume((current) => ({ ...current, skills: Array.from(new Set([...current.skills, ...result.keywords])) }));
      }

      trackEvent("ai_generated", sessionId, { task, provider: result.provider });
      setDashboardMetrics(getDashboardMetrics());
    } catch {
      setAiError("AI 生成失败，请稍后重试。");
    } finally {
      setAiTask(null);
    }
  };

  const runScoreAction = async () => {
    setIsScoring(true);
    setScoreError("");

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ resume })
      });

      if (!response.ok) {
        throw new Error("Score request failed");
      }

      const report = (await response.json()) as ScoreReport;
      setScoreReport(report);
      trackEvent("score_completed", sessionId, { score: report.overallScore });
      setDashboardMetrics(getDashboardMetrics());
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
    setDashboardMetrics(getDashboardMetrics());
    setFeedbackNotice("反馈已记录，感谢你帮我们校准产品。");
  };

  const startWithTemplate = (nextTemplateId: TemplateId) => {
    setTemplateId(nextTemplateId);
    setIsIntroVisible(false);
    setIsTemplateStartVisible(false);
  };

  const openTemplateLibrary = () => {
    setIsIntroVisible(false);
    setIsTemplateStartVisible(true);
  };

  if (isIntroVisible) {
    return (
      <main className="app-shell is-intro">
        <IntroScreen onStart={openTemplateLibrary} />
      </main>
    );
  }

  if (isTemplateStartVisible) {
    return (
      <main className="app-shell is-template-start">
        <TemplateStartScreen activeTemplateId={templateId} onSelect={startWithTemplate} />
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
          <span className="session-chip" title={sessionId || "匿名会话生成中"}>
            <Sparkles size={14} />
            匿名草稿
          </span>
          <button className="secondary-button" type="button" onClick={() => setIsTemplateStartVisible(true)}>
            <LayoutTemplate size={17} />
            选择模板
          </button>
          <button className="primary-button" type="button" onClick={exportPdf}>
            <Download size={17} />
            导出 PDF
          </button>
          <button className="secondary-button" type="button" onClick={exportWord}>
            <FileText size={17} />
            导出 Word
          </button>
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
      </header>
      <div className="workspace">
        <aside className="sidebar">
          {importError ? <p className="notice">{importError}</p> : null}

          {aiError ? <p className="notice">{aiError}</p> : null}

          {scoreError ? <p className="notice">{scoreError}</p> : null}

          {feedbackNotice ? <p className="success-notice">{feedbackNotice}</p> : null}

          {issues.length > 0 ? <p className="notice">{issues.map((issue) => issue.message).join("，")}。</p> : null}

          <form className="form">
            <section className="ai-panel" aria-label="AI 简历助手">
              <div>
                <span className="eyebrow">AI 简历助手</span>
                <strong>{aiTask ? "正在生成" : "可用"}</strong>
              </div>
              <div className="ai-actions">
                <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("generate_resume")}>
                  <Sparkles size={15} />
                  生成初稿
                </button>
                <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("rewrite_summary")}>
                  <Sparkles size={15} />
                  优化评价
                </button>
                <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("rewrite_project")}>
                  <Sparkles size={15} />
                  润色项目
                </button>
                <button disabled={Boolean(aiTask)} type="button" onClick={() => runAiAction("recommend_keywords")}>
                  <Sparkles size={15} />
                  推荐关键词
                </button>
              </div>
            </section>

            <section className="score-panel" aria-label="简历评分">
              <div>
                <span className="eyebrow">ATS / JD 评分</span>
                <strong>{scoreReport ? `${scoreReport.overallScore} 分` : "未评分"}</strong>
              </div>
              <button disabled={isScoring} type="button" onClick={runScoreAction}>
                <Target size={15} />
                {isScoring ? "评分中" : "生成评分"}
              </button>
            </section>

            <FeedbackPanel onSubmit={submitFeedback} />

            <IconSettingsPanel settings={iconSettings} onChange={updateIconSettings} />

            <StyleSettingsPanel settings={styleSettings} onChange={updateStyleSettings} />

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

            <div className={getEditorModuleClassName("personalSummary")} data-editor-module="personalSummary">
              <SectionHeading
                icon={<Sparkles size={15} />}
                isVisible={visibilitySettings.personalSummary}
                title="个人评价"
                visibilityKey="personalSummary"
                onToggleVisibility={toggleVisibility}
              />
              <TextAreaField
                label="一句话总结"
                value={resume.personalSummary}
                onChange={(value) => setResume((current) => ({ ...current, personalSummary: value }))}
              />
            </div>

            <div className={getEditorModuleClassName("strengths")} data-editor-module="strengths">
              <SectionHeading
                icon={<Heart size={15} />}
                isVisible={visibilitySettings.strengths}
                title="个人优势"
                visibilityKey="strengths"
                onToggleVisibility={toggleVisibility}
              />
              <TextAreaField
                label="个人优势，每行一条"
                value={resume.strengths.join("\n")}
                onChange={(value) => setResume((current) => ({ ...current, strengths: splitLines(value) }))}
              />
            </div>

            <div className={getEditorModuleClassName("education")} data-editor-module="education">
              <SectionHeading
                actionLabel="添加"
                icon={<GraduationCap size={15} />}
                isVisible={visibilitySettings.education}
                title="教育经历"
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

            <div className={getEditorModuleClassName("internships")} data-editor-module="internships">
              <ExperienceEditor
                items={resume.internships}
                isVisible={visibilitySettings.internships}
                section="internships"
                title="实习经历"
                visibilityKey="internships"
                onAdd={addExperience}
                onRemove={removeExperience}
                onToggleVisibility={toggleVisibility}
                onUpdate={updateExperience}
              />
            </div>
            <div className={getEditorModuleClassName("projects")} data-editor-module="projects">
              <ExperienceEditor
                items={resume.projects}
                isVisible={visibilitySettings.projects}
                section="projects"
                title="项目经历"
                visibilityKey="projects"
                onAdd={addExperience}
                onRemove={removeExperience}
                onToggleVisibility={toggleVisibility}
                onUpdate={updateExperience}
              />
            </div>
            <div className={getEditorModuleClassName("campusExperience")} data-editor-module="campusExperience">
              <ExperienceEditor
                items={resume.campusExperience}
                isVisible={visibilitySettings.campusExperience}
                section="campusExperience"
                title="校园经历"
                visibilityKey="campusExperience"
                onAdd={addExperience}
                onRemove={removeExperience}
                onToggleVisibility={toggleVisibility}
                onUpdate={updateExperience}
              />
            </div>

            <div className={getEditorModuleClassName("skills")} data-editor-module="skills">
              <SectionHeading
                icon={<Tag size={15} />}
                isVisible={visibilitySettings.skills}
                title="技能"
                visibilityKey="skills"
                onToggleVisibility={toggleVisibility}
              />
              <TextAreaField
                label="技能，每行一条"
                value={resume.skills.join("\n")}
                onChange={(value) => setResume((current) => ({ ...current, skills: splitLines(value) }))}
              />
            </div>
            <div className={getEditorModuleClassName("awards")} data-editor-module="awards">
              <SectionHeading
                icon={<Award size={15} />}
                isVisible={visibilitySettings.awards}
                title="奖项"
                visibilityKey="awards"
                onToggleVisibility={toggleVisibility}
              />
              <TextAreaField
                label="奖项，每行一条"
                value={resume.awards.join("\n")}
                onChange={(value) => setResume((current) => ({ ...current, awards: splitLines(value) }))}
              />
            </div>

            <SectionHeading icon={<BriefcaseBusiness size={15} />} title="目标 JD" />
            <TextField
              label="岗位名称"
              value={resume.targetJob.title}
              onChange={(value) => setResume((current) => ({ ...current, targetJob: { ...current.targetJob, title: value } }))}
            />
            <TextAreaField
              label="JD 原文"
              value={resume.targetJob.jdText}
              onChange={(value) => setResume((current) => ({ ...current, targetJob: { ...current.targetJob, jdText: value } }))}
            />
          </form>

          <div className="status-line">
            <Save size={14} />
            {saveState}
          </div>
        </aside>

        <section className="preview-shell" aria-label="简历预览">
          {dashboardMetrics ? <DashboardPanel metrics={dashboardMetrics} /> : null}
          {scoreReport ? <ScoreReportView report={scoreReport} /> : null}
          <div className="preview-toolbar">
            <div>
              <span className="eyebrow">实时预览</span>
              <strong>{templates.find((template) => template.id === templateId)?.label}</strong>
            </div>
            <p>点击右侧简历模块可定位左侧表单，拖动模块可调整顺序。</p>
          </div>
          <TemplateGallery activeTemplateId={templateId} onSelect={setTemplateId} />
          <ResumePreview
            photoSupported={isPhotoSupported}
            resume={resume}
            templateId={templateId}
            onPhotoSettingsChange={updatePhotoSettings}
            onSelectModule={focusEditorModule}
            onSwapModules={swapModules}
            onToggleVisibility={toggleVisibility}
          />
        </section>
      </div>
    </main>
  );
}

function TemplateStartScreen({
  activeTemplateId,
  onSelect
}: {
  activeTemplateId: TemplateId;
  onSelect: (templateId: TemplateId) => void;
}) {
  return (
    <section className="template-start-screen" aria-label="选择简历模板">
      <aside className="template-start-sidebar" aria-label="主导航">
        <div className="template-brand">
          <span className="template-brand-mark">R</span>
          <strong>ResumeLM</strong>
        </div>
        <nav className="template-start-nav" aria-label="模板功能">
          <span>
            <FileText size={18} />
            简历
          </span>
          <span className="is-active">
            <LayoutTemplate size={18} />
            模板
          </span>
          <span>
            <Sparkles size={18} />
            AI 配置
          </span>
          <span>
            <Activity size={18} />
            数据看板
          </span>
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
                  <span>{templateDescriptions[template.id]}</span>
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

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="intro-screen" aria-label="ResumeLM 产品介绍">
      <nav className="intro-nav" aria-label="首页导航">
        <div className="intro-brand">
          <span className="template-brand-mark">R</span>
          <strong>ResumeLM</strong>
        </div>
        <div className="intro-nav-links">
          <span>AI 简历</span>
          <span>模板库</span>
          <span>ATS 评分</span>
        </div>
        <button className="intro-nav-button" type="button" onClick={onStart}>
          开始使用
        </button>
      </nav>

      <div className="intro-hero">
        <div className="intro-hero-copy">
          <span className="intro-kicker">为校招准备的 AI 简历工作台</span>
          <h1>从第一份简历，到更像大厂候选人的表达。</h1>
          <p>
            ResumeLM 帮大学生把经历整理成清晰、有重点、可投递的简历。无需登录，打开即可选模板、写内容、AI 优化、评分并导出。
          </p>
          <div className="intro-actions">
            <button className="intro-primary" type="button" onClick={onStart}>
              <Sparkles size={18} />
              开始制作简历
            </button>
            <button className="intro-secondary" type="button" onClick={onStart}>
              查看模板库
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

      <div className="intro-feature-grid">
        <article>
          <span>01</span>
          <h2>先选模板，再进入编辑。</h2>
          <p>像大厂官网一样用图判断风格，避免只看名字选择模板。</p>
        </article>
        <article>
          <span>02</span>
          <h2>AI 帮你把经历写具体。</h2>
          <p>把普通经历改成成果导向表达，补齐关键词和岗位匹配建议。</p>
        </article>
        <article>
          <span>03</span>
          <h2>本地保存，低门槛开放。</h2>
          <p>第一版不强制登录，草稿自动保存在浏览器，随时导出 JSON 备份。</p>
        </article>
      </div>
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
                <span>{templateDescriptions[template.id]}</span>
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
          onPhotoSettingsChange={() => undefined}
          onSelectModule={() => undefined}
          onSwapModules={() => undefined}
          onToggleVisibility={() => undefined}
        />
      </div>
    </div>
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
  icon,
  isVisible,
  onAction,
  onToggleVisibility,
  title,
  visibilityKey
}: {
  actionLabel?: string;
  icon: React.ReactNode;
  isVisible?: boolean;
  onAction?: () => void;
  onToggleVisibility?: (section: keyof ResumeVisibilitySettings) => void;
  title: string;
  visibilityKey?: keyof ResumeVisibilitySettings;
}) {
  return (
    <div className={`section-title ${visibilityKey && !isVisible ? "is-hidden" : ""}`}>
      <span>
        {icon}
        {title}
      </span>
      <div className="section-actions">
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
  isVisible,
  items,
  onAdd,
  onRemove,
  onToggleVisibility,
  onUpdate,
  section,
  title,
  visibilityKey
}: {
  isVisible: boolean;
  items: Experience[];
  onAdd: (section: ExperienceSection) => void;
  onRemove: (section: ExperienceSection, index: number) => void;
  onToggleVisibility: (section: keyof ResumeVisibilitySettings) => void;
  onUpdate: (section: ExperienceSection, index: number, field: keyof Experience, value: string) => void;
  section: ExperienceSection;
  title: string;
  visibilityKey: keyof ResumeVisibilitySettings;
}) {
  return (
    <>
      <SectionHeading
        actionLabel="添加"
        icon={<BriefcaseBusiness size={15} />}
        isVisible={isVisible}
        title={title}
        visibilityKey={visibilityKey}
        onAction={() => onAdd(section)}
        onToggleVisibility={onToggleVisibility}
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
  onPhotoSettingsChange,
  onSelectModule,
  onSwapModules,
  onToggleVisibility,
  resume,
  templateId
}: {
  photoSupported: boolean;
  isStaticPreview?: boolean;
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
  const moduleOrder = normalizeModuleOrder(resume.moduleOrder);
  const iconEnabled = iconSettings.enabled;
  const isPhotoEnabled = photoSupported && photoSettings.visible;
  const contactItems = [
    { icon: iconSettings.phone, text: resume.profile.phone || "电话" },
    { icon: iconSettings.email, text: resume.profile.email || "邮箱" },
    { icon: iconSettings.city, text: resume.profile.city || "城市" }
  ];
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
  const sectionRenderers: Record<ResumeModuleId, React.ReactNode> = {
    personalSummary: visibilitySettings.personalSummary ? (
      <ResumeSection controls={getModuleControls("personalSummary")} iconEnabled={iconEnabled} iconId={iconSettings.personalSummary} title="个人评价">
        {resume.personalSummary || "用 2-3 句话概括你的背景、能力和求职方向。"}
      </ResumeSection>
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("personalSummary")} moduleId="personalSummary" />
    ),
    strengths: visibilitySettings.strengths ? (
      <TagSection
        controls={getModuleControls("strengths")}
        iconEnabled={iconEnabled}
        iconId={iconSettings.strengths}
        items={nonEmpty(resume.strengths).length ? nonEmpty(resume.strengths) : ["学习能力", "项目执行", "沟通协作"]}
        title="个人优势"
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("strengths")} moduleId="strengths" />
    ),
    education: visibilitySettings.education ? (
      <section className="resume-section">
        {getModuleControls("education")}
        <h3>
          <ResumeIcon enabled={iconEnabled} iconId={iconSettings.education} />
          <span className="resume-inline-text">教育经历</span>
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
      <HiddenModulePlaceholder controls={getModuleControls("education")} moduleId="education" />
    ),
    internships: visibilitySettings.internships ? (
      <ExperiencePreview
        controls={getModuleControls("internships")}
        fallback="实习经历会展示在这里。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.internships}
        items={internships}
        title="实习经历"
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("internships")} moduleId="internships" />
    ),
    projects: visibilitySettings.projects ? (
      <ExperiencePreview
        controls={getModuleControls("projects")}
        fallback="描述你做了什么、如何做、带来了什么结果。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.projects}
        items={projects}
        title="项目经历"
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("projects")} moduleId="projects" />
    ),
    campusExperience: visibilitySettings.campusExperience ? (
      <ExperiencePreview
        controls={getModuleControls("campusExperience")}
        fallback="学生组织、社团、竞赛或志愿经历。"
        iconEnabled={iconEnabled}
        iconId={iconSettings.campusExperience}
        items={campusExperience}
        title="校园经历"
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("campusExperience")} moduleId="campusExperience" />
    ),
    skills: visibilitySettings.skills ? (
      <TagSection
        controls={getModuleControls("skills")}
        iconEnabled={iconEnabled}
        iconId={iconSettings.skills}
        items={skills.length ? skills : ["数据分析", "用户研究", "文档表达"]}
        title="技能"
      />
    ) : (
      <HiddenModulePlaceholder controls={getModuleControls("skills")} moduleId="skills" />
    ),
    awards:
      visibilitySettings.awards ? (
        awards.length ? (
          <ListSection controls={getModuleControls("awards")} iconEnabled={iconEnabled} iconId={iconSettings.awards} items={awards} title="奖项" />
        ) : null
      ) : (
        <HiddenModulePlaceholder controls={getModuleControls("awards")} moduleId="awards" />
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
    const sidebarModules = moduleOrder.filter((moduleId) => simpleSidebarModuleIds.includes(moduleId));
    const mainModules = moduleOrder.filter((moduleId) => !simpleSidebarModuleIds.includes(moduleId));

    return (
      <article className={`resume-paper template-${templateId} header-align-${styleSettings.headerAlignment}`} style={getResumeStyleVars(styleSettings)}>
        <header className={`resume-head ${isPhotoEnabled ? `photo-${photoSettings.position}` : "photo-none"}`}>
          {isPhotoEnabled ? photoNode : null}
          <div className="resume-head-content">
            <h2>{resume.profile.name || "你的姓名"}</h2>
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
    <article className={`resume-paper template-${templateId} header-align-${styleSettings.headerAlignment}`} style={getResumeStyleVars(styleSettings)}>
      <header className={`resume-head ${isPhotoEnabled ? `photo-${photoSettings.position}` : "photo-none"}`}>
        {isPhotoEnabled && photoSettings.position === "left" ? photoNode : null}
        <div className="resume-head-content">
          <h2>{resume.profile.name || "你的姓名"}</h2>
          <p className="resume-contact-line">
            {contactItems.map((item, index) => (
              <span className="resume-contact-item" key={`${item.icon}-${index}`}>
                <ResumeIcon enabled={iconEnabled} iconId={item.icon} />
                <span className="resume-inline-text">{item.text}</span>
              </span>
            ))}
          </p>
          <div className="resume-target">
            <ResumeIcon enabled={iconEnabled} iconId={iconSettings.targetRole} />
            <span className="resume-target-label">目标岗位</span>
            <span className="resume-inline-text">{resume.profile.targetRole || resume.targetJob.title || "产品经理"}</span>
          </div>
        </div>
        {isPhotoEnabled && photoSettings.position === "right" ? photoNode : null}
      </header>

      {moduleOrder.map(renderModuleFrame)}
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
  moduleId,
  onToggleVisibility
}: {
  isVisible: boolean;
  moduleId: ResumeModuleId;
  onToggleVisibility: (section: keyof ResumeVisibilitySettings) => void;
}) {
  const label = moduleLabels[moduleId];

  return (
    <div className="resume-edit-controls" aria-label={`${label}模块控制`}>
      <span className="resume-drag-handle" aria-hidden="true" title="拖动模块框调整位置">
        <GripVertical size={13} />
      </span>
      <button
        aria-label={isVisible ? `隐藏${label}` : `显示${label}`}
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

function HiddenModulePlaceholder({ controls, moduleId }: { controls: React.ReactNode; moduleId: ResumeModuleId }) {
  return (
    <section className="resume-section resume-hidden-placeholder">
      {controls}
      <span>{moduleLabels[moduleId]}已隐藏，导出模板后不会显示，点击眼睛恢复</span>
    </section>
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
