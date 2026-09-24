"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getLessonBySlugs } from "@/lib/content";
import { lessonXp } from "@/lib/gamify/xp";
import { awardProgress } from "@/lib/gamify/award";

export type ProgressResult = {
  ok: boolean;
  error?: string;
  done?: boolean;
  /** 本次实际加到的 XP（重复标记为 0） */
  xpGained?: number;
  xp?: number;
  level?: number;
  streak?: number;
  newBadges?: { code: string; name: string }[];
};

/**
 * 标记 / 取消标记「本课已学完」。
 *
 * 幂等设计：XP 只在**第一次**完成时发放（靠 LessonProgress.xpAwarded 判断），
 * 所以"取消完成 → 再标记完成"刷不出 XP，重复点击也不会重复加分。
 * 取消完成时**不追回**已发的 XP —— 学生确实学过了，追回只会让人恼火。
 */
export async function setLessonDone(input: {
  chapterSlug: string;
  lessonSlug: string;
  done: boolean;
  secondsSpent?: number;
}): Promise<ProgressResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "请先登录，进度才能存到服务器上" };

  const found = getLessonBySlugs(input.chapterSlug, input.lessonSlug);
  if (!found) return { ok: false, error: "课时不存在" };
  const { chapter, lesson } = found;

  const lessonId = `${chapter.slug}/${lesson.slug}`;
  const seconds = Math.max(0, Math.min(input.secondsSpent ?? 0, 6 * 60 * 60));
  const now = new Date();

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { xpAwarded: true, completedAt: true },
  });

  // ── 取消完成 ─────────────────────────────────────────────
  if (!input.done) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        chapterOrder: chapter.order,
        status: "IN_PROGRESS",
        secondsSpent: seconds,
      },
      update: {
        status: "IN_PROGRESS",
        completedAt: null,
        secondsSpent: { increment: seconds },
      },
    });
    revalidatePath("/learn");
    revalidatePath("/progress");
    return { ok: true, done: false, xpGained: 0 };
  }

  // ── 标记完成 ─────────────────────────────────────────────
  const firstTime = !existing?.xpAwarded;
  const gain = firstTime ? lessonXp(lesson.kind) : 0;

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      chapterOrder: chapter.order,
      status: "DONE",
      completedAt: now,
      xpAwarded: true,
      secondsSpent: seconds,
    },
    update: {
      status: "DONE",
      // 保留第一次的完成时间（不要因为重复点击而刷新）
      completedAt: existing?.completedAt ?? now,
      xpAwarded: true,
      secondsSpent: { increment: seconds },
    },
  });

  // 加 XP / 打卡 / 当日活动 / 徽章全部交给共用结算（和"题目通过"走同一套规则）
  const outcome = await awardProgress({
    userId,
    xp: gain,
    minutes: gain > 0 ? lesson.minutes : 0,
    lessonsDone: gain > 0 ? 1 : 0,
  });
  if (!outcome) return { ok: false, error: "账号不存在" };

  revalidatePath("/learn");
  revalidatePath("/progress");
  revalidatePath("/settings");

  return {
    ok: true,
    done: true,
    xpGained: gain,
    xp: outcome.xp,
    level: outcome.level,
    streak: outcome.streakCurrent,
    newBadges: outcome.newBadges.map((b) => ({ code: b.code, name: b.name })),
  };
}

/**
 * 记录一次「访问了这节课」（不标记完成，只留下足迹用于"继续上次学习"）。
 * 故意做得很轻：只在还没有记录时插入一条，已有记录不更新（避免每次浏览都写库）。
 */
export async function recordLessonVisit(input: {
  chapterSlug: string;
  lessonSlug: string;
}): Promise<{ ok: boolean }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false };

  const found = getLessonBySlugs(input.chapterSlug, input.lessonSlug);
  if (!found) return { ok: false };

  const lessonId = `${found.chapter.slug}/${found.lesson.slug}`;
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { id: true },
  });
  if (existing) return { ok: true };

  await prisma.lessonProgress.create({
    data: {
      userId,
      lessonId,
      chapterOrder: found.chapter.order,
      status: "IN_PROGRESS",
    },
  });
  return { ok: true };
}
