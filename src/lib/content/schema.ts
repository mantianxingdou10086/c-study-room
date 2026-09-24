/**
 * 课程内容的数据模型。
 *
 * 架构决定（相对原计划的一处简化，记录在 plan 里）：
 * **课程内容 100% 存在仓库里，是唯一事实来源；数据库只存用户的动态数据**（进度、提交、帖子、徽章授予）。
 * 好处：改内容 = 改文件 + 部署（不需要 seed 同步）；内容能进 git 做 review 和 diff；
 * 少一整套"仓库 ↔ 数据库"的一致性维护。代价：内容改动需要重新部署（但内容本来就是开发者写的，可接受）。
 */
import { z } from "zod";

export const PART_IDS = [
  "FOUNDATION",
  "BUILDING_BLOCKS",
  "ORGANIZING",
  "POINTERS",
  "ENGINEERING",
] as const;

export const partSchema = z.object({
  id: z.enum(PART_IDS),
  name: z.string().min(1),
  chapterRange: z.string().min(1),
  detail: z.string().min(1),
});

export const chapterSchema = z.object({
  order: z.number().int().min(1).max(28),
  slug: z.string().regex(/^ch\d{2}-[a-z0-9-]+$/, "slug 形如 ch04-expressions"),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  part: z.enum(PART_IDS),
  /** 对应原书 PDF 页码区间（实测边界，仅作"延伸阅读"指引，不含原文） */
  pdfFrom: z.number().int().positive(),
  pdfTo: z.number().int().positive(),
  /** 面向小白的一句话说明这一章要解决什么问题 */
  summary: z.string().min(1),
  /** 学完能做到什么（3~4 条，动词开头） */
  goals: z.array(z.string().min(1)).min(2).max(5),
  /** MVP 是否已交付内容 */
  available: z.boolean(),
});

export const LESSON_KINDS = ["READING", "LAB"] as const;

export const lessonSchema = z.object({
  chapterOrder: z.number().int().min(1).max(28),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().min(1),
  title: z.string().min(1),
  kind: z.enum(LESSON_KINDS),
  /** 预计时长（分钟），用于"今天学 20 分钟"这类目标 */
  minutes: z.number().int().min(5).max(90),
  /** 完成奖励经验值 */
  xp: z.number().int().min(5).max(50),
  /** 这一节的"一句话结论"，同时用于课程地图的悬浮提示 */
  takeaway: z.string().min(1),
});

export const EXERCISE_KINDS = ["MCQ", "FILL", "CODE", "OUTPUT"] as const;

const mcqValidator = z.object({
  options: z.array(z.string().min(1)).min(2).max(6),
  correct: z.number().int().min(0),
});

const fillValidator = z.object({
  /** 每个空的候选答案（任一命中即算对） */
  blanks: z.array(z.array(z.string().min(1)).min(1)).min(1),
  /** 比较时是否区分大小写，默认 false */
  caseSensitive: z.boolean().optional(),
});

const codeValidator = z.object({
  /** 期望的标准输出；多解时给多个候选（任一命中即算对） */
  expectedStdoutAny: z.array(z.string()).min(1),
  /** 是否忽略大小写 */
  ignoreCase: z.boolean().optional(),
  /** 浮点比较容差（对"打印平均值"这类题有用） */
  floatTolerance: z.number().optional(),
});

const outputValidator = z.object({
  expected: z.string(),
  ignoreCase: z.boolean().optional(),
});

export const exerciseSchema = z
  .object({
    /** 全局唯一，形如 ch04-03-q2；数据库里的提交记录引用它（字符串，不是外键） */
    id: z.string().regex(/^ch\d{2}-[a-z0-9-]+-q\d+$/, "id 形如 ch04-03-q2"),
    chapterOrder: z.number().int().min(1).max(28),
    /** 关联到课时 slug；不填表示"整章综合练习" */
    lessonSlug: z.string().optional(),
    kind: z.enum(EXERCISE_KINDS),
    /** 1=随堂 2=作业 3=挑战 */
    difficulty: z.number().int().min(1).max(3),
    prompt: z.string().min(1),
    /** 代码题的起始代码 / 填空题的骨架 */
    starterCode: z.string().optional(),
    /** 代码题喂给 scanf 的固定输入 */
    stdin: z.string().optional(),
    /** 逐级提示，点一次显示一条 */
    hints: z.array(z.string().min(1)).min(1),
    /** 可展开的参考答案（看过之后该题不再给 XP） */
    referenceAnswer: z.string().min(1),
    /**
     * 代码题的**完整可编译参考解**。
     * 这不是给人看的散文，而是给机器用的：tests/integration 会用它真的编译运行一遍，
     * 断言 stdout 命中 expectedStdoutAny —— 防止把期望输出手写错。
     */
    referenceCode: z.string().optional(),
    xp: z.number().int().min(5).max(40),
    validator: z.union([
      mcqValidator,
      fillValidator,
      codeValidator,
      outputValidator,
    ]),
  })
  .superRefine((ex, ctx) => {
    // 结构性约束：题型与校验器必须配套，否则判题时会静默判错
    const v = ex.validator as Record<string, unknown>;
    if (ex.kind === "MCQ" && !("options" in v)) {
      ctx.addIssue({ code: "custom", message: `${ex.id}: MCQ 需要 options/correct` });
    }
    if (ex.kind === "FILL" && !("blanks" in v)) {
      ctx.addIssue({ code: "custom", message: `${ex.id}: FILL 需要 blanks` });
    }
    if (ex.kind === "CODE") {
      if (!("expectedStdoutAny" in v)) {
        ctx.addIssue({ code: "custom", message: `${ex.id}: CODE 需要 expectedStdoutAny` });
      }
      if (!ex.starterCode) {
        ctx.addIssue({ code: "custom", message: `${ex.id}: CODE 必须有 starterCode` });
      }
      if (!ex.referenceCode) {
        ctx.addIssue({
          code: "custom",
          message: `${ex.id}: CODE 必须有 referenceCode（集成测试要真的跑它来验证期望输出）`,
        });
      }
    }
    if (ex.kind === "OUTPUT" && !("expected" in v)) {
      ctx.addIssue({ code: "custom", message: `${ex.id}: OUTPUT 需要 expected` });
    }
  });

export type Part = z.infer<typeof partSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];
export type LessonKind = (typeof LESSON_KINDS)[number];
export type McqValidator = z.infer<typeof mcqValidator>;
export type FillValidator = z.infer<typeof fillValidator>;
export type CodeValidator = z.infer<typeof codeValidator>;
export type OutputValidator = z.infer<typeof outputValidator>;

/** 课时在仓库里的 MDX 路径：content/<chapter-slug>/<order>-<lesson-slug>.mdx */
export function lessonMdxPath(chapterSlug: string, lesson: Lesson): string {
  return `content/${chapterSlug}/${String(lesson.order).padStart(2, "0")}-${lesson.slug}.mdx`;
}
