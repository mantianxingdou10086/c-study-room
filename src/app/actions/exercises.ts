"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { EXERCISE_BY_ID } from "@/content/exercises";
import { judge } from "@/lib/judge/validators";
import { awardProgress } from "@/lib/gamify/award";

export type SubmitResult = {
  ok: boolean;
  error?: string;
  /** 判题结论；message 是给人看的话（判分器保证） */
  passed?: boolean;
  message?: string;
  /** 部分正确（例如填空 3 空对 2 空） */
  partial?: { correct: number; total: number };
  /** 本次是否首次通过并拿到 XP */
  xpGained?: number;
  xp?: number;
  level?: number;
  streak?: number;
  newBadges?: { code: string; name: string }[];
  /** 第几次提交 */
  attempts?: number;
};

/**
 * 提交一道题的答案。
 *
 * 判题在**服务端**做（标准答案不下发浏览器，见 lib/exercises/public.ts）。
 * 代码题的 stdout 由浏览器跑出来再传上来 —— 学生理论上可以伪造 stdout 骗过判题，
 * 但这是他自己网站上的自学进度，作弊只坑自己，不值得为它上更重的方案。
 */
export async function submitExercise(input: {
  exerciseId: string;
  /** MCQ 选项下标 */
  option?: number | null;
  /** FILL 每空的答案 */
  blanks?: string[];
  /** OUTPUT 题用户输入的输出文本 */
  text?: string;
  /** CODE 题在浏览器里跑出来的 stdout */
  stdout?: string;
  /** CODE 题的源码（存档用） */
  code?: string;
  usedHint?: boolean;
  viewedAnswer?: boolean;
}): Promise<SubmitResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "请先登录后再提交" };

  const exercise = EXERCISE_BY_ID.get(input.exerciseId);
  if (!exercise) return { ok: false, error: "题目不存在" };

  const verdict = judge(exercise, {
    option: input.option ?? null,
    blanks: input.blanks ?? [],
    text: input.text ?? "",
    stdout: input.stdout ?? "",
  });

  const existing = await prisma.submission.findUnique({
    where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
  });

  const attempts = (existing?.attempts ?? 0) + 1;
  const alreadyPassed = existing?.passed ?? false;
  const alreadyPaid = (existing?.xpAwarded ?? 0) > 0;

  // ⚠️「看过参考答案」以**服务端的记录**为准，绝不信客户端传上来的值。
  // 客户端没有理由主动承认自己看过答案 —— 信它就等于这条规则不存在。
  const viewedAnswer =
    (existing?.viewedAnswer ?? false) || (input.viewedAnswer ?? false);

  // XP 只在**首次通过**时发；看过参考答案则不给（提示不影响，鼓励先看提示）
  const xpGained =
    verdict.passed && !alreadyPaid && !viewedAnswer ? exercise.xp : 0;

  await prisma.submission.upsert({
    where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
    create: {
      userId,
      exerciseId: exercise.id,
      chapterOrder: exercise.chapterOrder,
      kind: exercise.kind,
      passed: verdict.passed,
      attempts: 1,
      answer: {
        option: input.option ?? null,
        blanks: input.blanks ?? null,
        text: input.text ?? null,
      },
      code: input.code ?? null,
      stdout: input.stdout ?? null,
      usedHint: input.usedHint ?? false,
      viewedAnswer,
      xpAwarded: xpGained,
    },
    update: {
      // passed 只增不减：通过之后再练一次不该把成绩抹掉
      passed: alreadyPassed || verdict.passed,
      attempts: { increment: 1 },
      answer: {
        option: input.option ?? null,
        blanks: input.blanks ?? null,
        text: input.text ?? null,
      },
      code: input.code ?? null,
      stdout: input.stdout ?? null,
      usedHint: input.usedHint ?? existing?.usedHint ?? false,
      viewedAnswer,
      xpAwarded: { increment: xpGained },
    },
  });

  let award: Awaited<ReturnType<typeof awardProgress>> = null;
  if (xpGained > 0) {
    award = await awardProgress({
      userId,
      xp: xpGained,
      exercisesDone: 1,
      // 做题按每题 3 分钟估，只用于"本周学了多久"的粗略统计
      minutes: 3,
    });
    revalidatePath("/progress");
    revalidatePath("/exercises");
  }

  return {
    ok: true,
    passed: verdict.passed,
    message: verdict.message,
    partial: verdict.partial,
    xpGained,
    attempts,
    xp: award?.xp,
    level: award?.level,
    streak: award?.streakCurrent,
    newBadges: award?.newBadges.map((b) => ({ code: b.code, name: b.name })),
  };
}

/**
 * 展开参考答案。
 *
 * 为什么单独做成一次请求而不是直接当 prop 传下去：
 *  1. 传 prop 就等于把答案写进浏览器 bundle，谁都能翻出来 —— 那"看答案不给 XP"就没意义了；
 *  2. "看过答案"这件事必须在**服务端**记下来，否则刷新页面就洗白了。
 */
export async function revealReferenceAnswer(
  exerciseId: string,
): Promise<{ ok: boolean; error?: string; answer?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "请先登录" };

  const exercise = EXERCISE_BY_ID.get(exerciseId);
  if (!exercise) return { ok: false, error: "题目不存在" };

  await prisma.submission.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: {
      userId,
      exerciseId,
      chapterOrder: exercise.chapterOrder,
      kind: exercise.kind,
      viewedAnswer: true,
      attempts: 0,
    },
    update: { viewedAnswer: true },
  });

  return { ok: true, answer: exercise.referenceAnswer };
}
