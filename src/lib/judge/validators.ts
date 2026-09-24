/**
 * 四种题型的判分器（纯函数，不碰数据库、不碰网络）。
 *
 * 设计原则：**宁可宽松也不要误判**。小白写对了却被判错，比漏判一道题的伤害大得多。
 * 所以：输出比较做规范化（尾空白/末尾换行/CRLF）、浮点题给容差、填空题支持多个等价答案。
 * 代码题的"编译运行"由 c-runner 负责，这里只负责"把 stdout 和期望值比出来"。
 */
import type {
  CodeValidator,
  Exercise,
  FillValidator,
  McqValidator,
  OutputValidator,
} from "@/lib/content/schema";

export interface JudgeResult {
  passed: boolean;
  /** 给用户的反馈，必须是人话 */
  message: string;
  /** 部分正确的情况（例如填空题 3 空对 2 空） */
  partial?: { correct: number; total: number };
}

/** 规范化输出：统一换行、去掉每行尾空白、去掉末尾空行 */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

/** 规范化填空答案：去首尾空白、全角标点转半角、折叠内部空白 */
export function normalizeBlank(s: string): string {
  return s
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\u3000]/g, " ")
    .replace(/[“”‘’]/g, '"')
    .replace(/[，]/g, ",")
    .replace(/[；]/g, ";")
    .replace(/\s+/g, " ")
    .trim();
}

function eq(a: string, b: string, ignoreCase?: boolean): boolean {
  return ignoreCase
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

/** 浮点容差比较：把输出里的数字抽出来按容差比，其余文本严格比 */
export function compareWithTolerance(
  actual: string,
  expected: string,
  tolerance: number,
): boolean {
  const na = actual.match(/-?\d+(\.\d+)?/g) ?? [];
  const ne = expected.match(/-?\d+(\.\d+)?/g) ?? [];
  if (na.length !== ne.length) return false;
  for (let i = 0; i < ne.length; i++) {
    const a = Number(na[i]);
    const e = Number(ne[i]);
    if (Number.isNaN(a) || Number.isNaN(e)) return false;
    if (Math.abs(a - e) > tolerance) return false;
  }
  // 去掉数字后剩下的骨架必须一致（防止"数字对但文字乱"）
  const sa = actual.replace(/-?\d+(\.\d+)?/g, "#");
  const se = expected.replace(/-?\d+(\.\d+)?/g, "#");
  return sa === se;
}

export function judgeMcq(
  v: McqValidator,
  answer: number | null,
): JudgeResult {
  if (answer === null) return { passed: false, message: "还没有选择答案。" };
  if (answer === v.correct) {
    return { passed: true, message: "答对了。" };
  }
  return {
    passed: false,
    message: `选的是第 ${answer + 1} 个，再想想：把每个选项代进条件里推一遍，看哪个能走到你预期的分支。`,
  };
}

export function judgeFill(v: FillValidator, answers: string[]): JudgeResult {
  const total = v.blanks.length;
  let correct = 0;
  const wrongIndexes: number[] = [];
  for (let i = 0; i < total; i++) {
    const got = normalizeBlank(answers[i] ?? "");
    const ok = v.blanks[i].some((cand) =>
      eq(normalizeBlank(cand), got, v.caseSensitive ? false : true),
    );
    if (ok) correct++;
    else wrongIndexes.push(i + 1);
  }
  if (correct === total) return { passed: true, message: "全部填对了。" };
  return {
    passed: false,
    message:
      correct === 0
        ? "还没填对，先看看提示。"
        : `填对了 ${correct}/${total} 个空，第 ${wrongIndexes.join("、")} 个空再检查一下。`,
    partial: { correct, total },
  };
}

export function judgeOutput(
  v: OutputValidator,
  answer: string,
): JudgeResult {
  const got = normalizeOutput(answer);
  const want = normalizeOutput(v.expected);
  if (eq(got, want, v.ignoreCase)) return { passed: true, message: "输出推对了。" };
  if (!got) return { passed: false, message: "还没有填答案。" };
  return {
    passed: false,
    message:
      "和实际输出不一致。逐行推一遍：每个 printf 会打印什么？注意 \\n 会换行，空格也算字符。",
  };
}

/**
 * 代码题：只比 stdout（编译与运行由 c-runner 负责）。
 * `stdout` 为 null 表示编译/运行失败——此时由调用方展示原始诊断。
 */
export function judgeCode(
  v: CodeValidator,
  stdout: string,
): JudgeResult {
  const got = normalizeOutput(stdout);
  for (const candidate of v.expectedStdoutAny) {
    const want = normalizeOutput(candidate);
    if (eq(got, want, v.ignoreCase)) return { passed: true, message: "输出正确。" };
    if (v.floatTolerance != null && compareWithTolerance(got, want, v.floatTolerance)) {
      return { passed: true, message: "输出正确（浮点误差在允许范围内）。" };
    }
  }
  if (!got.trim()) {
    return {
      passed: false,
      message: "程序没有输出。检查 printf 是不是写在会被执行到的分支里。",
    };
  }
  return {
    passed: false,
    message: "输出和期望不一致。把程序的每一行输出和题目要求逐字对照（包括空格和换行）。",
  };
}

/** 统一入口：按题型分发 */
export function judge(
  exercise: Exercise,
  answer: { option?: number | null; blanks?: string[]; text?: string; stdout?: string },
): JudgeResult {
  switch (exercise.kind) {
    case "MCQ":
      return judgeMcq(exercise.validator as McqValidator, answer.option ?? null);
    case "FILL":
      return judgeFill(exercise.validator as FillValidator, answer.blanks ?? []);
    case "OUTPUT":
      return judgeOutput(exercise.validator as OutputValidator, answer.text ?? "");
    case "CODE":
      return judgeCode(exercise.validator as CodeValidator, answer.stdout ?? "");
  }
}
