import type { Exercise } from "@/lib/content/schema";

/**
 * 题目的「客户端可见」投影。
 *
 * ⚠️ 关键设计：**答案绝不下发到浏览器**。
 * 题目内容虽然存在仓库里（可 git diff），但仓库是服务端的，只要不把字段塞进 props，
 * 它就不会进客户端 bundle。所以这里**故意丢掉**：
 *   - validator.correct / blanks / expectedStdoutAny / expected
 *   - referenceAnswer / referenceCode
 *
 * 代码题的特殊之处：代码必须在浏览器里跑（clang 是 WASM），所以判题顺序是
 * **客户端跑出 stdout → 把 stdout 交给服务端 → 服务端拿它和标准答案比对**。
 * 这样标准答案始终留在服务端。
 */
export type PublicExercise = {
  id: string;
  chapterOrder: number;
  lessonSlug?: string;
  kind: Exercise["kind"];
  /** 1=随堂 2=作业 3=挑战 */
  difficulty: number;
  prompt: string;
  starterCode?: string;
  /** 代码题喂给 scanf 的固定输入 */
  stdin?: string;
  hints: string[];
  xp: number;
  /** MCQ 的选项文本（不含正确答案） */
  options?: string[];
  /** FILL 的空数（渲染几个输入框） */
  blankCount?: number;
  /** 有没有参考答案可展开（展开后该题不再给 XP） */
  hasReferenceAnswer: boolean;
};

export function toPublicExercise(ex: Exercise): PublicExercise {
  const v = ex.validator as Record<string, unknown>;

  return {
    id: ex.id,
    chapterOrder: ex.chapterOrder,
    lessonSlug: ex.lessonSlug,
    kind: ex.kind,
    difficulty: ex.difficulty,
    prompt: ex.prompt,
    starterCode: ex.starterCode,
    stdin: ex.stdin,
    hints: ex.hints,
    xp: ex.xp,
    options: ex.kind === "MCQ" ? (v.options as string[]) : undefined,
    blankCount:
      ex.kind === "FILL" ? ((v.blanks as string[][]) ?? []).length : undefined,
    hasReferenceAnswer: Boolean(ex.referenceAnswer),
  };
}
