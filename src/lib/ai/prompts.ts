import type { AiTask } from "./types";

export const promptTemplates: Record<AiTask, string> = {
  generate_resume:
    "基于校招候选人的基础信息生成中文简历初稿，输出必须符合 ResumeLM 标准 JSON。",
  rewrite_summary:
    "将个人评价改写为 2-3 句中文校招简历表述，强调背景、能力和目标岗位相关性。",
  rewrite_project:
    "将项目经历改写为成果导向表达，突出动作、方法、结果和岗位相关关键词。",
  recommend_keywords:
    "根据目标岗位和简历内容推荐适合 ATS 与校招筛选的技能关键词。"
};
