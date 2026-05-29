import type { AiTask } from "./types";

export const promptTemplates: Record<AiTask, string> = {
  generate_resume:
    "基于校招候选人的基础信息生成中文简历初稿，输出必须符合 ResumeLM 标准 JSON。",
  polish_resume:
    "对整份中文校招简历进行 AI 润色和问题修复，保留事实，不虚构经历，优化表达、关键词、成果导向和 ATS 友好度，输出必须符合 ResumeLM 标准 JSON。",
  rewrite_summary:
    "将个人评价改写为 2-3 句中文校招简历表述，强调背景、能力和目标岗位相关性。",
  rewrite_project:
    "将项目经历改写为成果导向表达，突出动作、方法、结果和岗位相关关键词。",
  recommend_keywords:
    "根据目标岗位和简历内容推荐适合 ATS 与校招筛选的技能关键词。",
  diagnose_resume:
    "同时基于简历内容与目标岗位 JD（可能包含多个岗位描述，用 --- 分隔）做模块级诊断。逐个模块指出与 JD 的匹配度、缺失关键词、表达问题和最高优先级改进建议。综合考虑所有 JD 的共同要求和差异化需求。不得虚构事实，只能指出需要用户补充的信息。",
  polish_section:
    "基于用户指定模块或指定条目、整份简历上下文与目标岗位 JD（可能包含多个岗位描述），生成 3 个可采纳的中文润色候选版本。指定 itemIndex 时只改写该条目的亮点或描述，不要合并其他条目。必须保留用户事实，不新增不存在的学校、公司、奖项、时间和成果数字；如果需要数字，只能写成可替换提示或更中性的表达。",
  extract_resume_fields:
    "从原始简历文本中提取指定字段的结构化信息。只提取 targetFields 中列出的字段，不得虚构学校、公司、奖项、日期和数字。如果原文找不到对应信息，该字段留空或给空数组，切勿编造。"
};
