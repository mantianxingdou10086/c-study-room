import "server-only";
import { prisma } from "@/lib/db";
import { CHAPTERS, allLessonRoutes, lessonsOfChapter } from "@/lib/content";
import {
  BADGE_BY_CODE,
  dayKey,
  earnedBadges,
  levelFromXp,
  nextStreak,
  type BadgeDef,
} from "@/lib/gamify/xp";

/** "2026-09-24" → 该日零点的 Date（配合 @db.Date 字段用） */
export function dateOnly(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export type AwardOutcome = {
  xp: number;
  level: number;
  streakCurrent: number;
  streakBest: number;
  newBadges: BadgeDef[];
};

/**
 * 统一结算：加 XP → 更新连续打卡 → 累计当日活动 → 结算徽章。
 *
 * 讲义完成和题目通过**都走这里**，不能各写一套 —— 否则将来调 XP 曲线或打卡规则时，
 * 必然出现"改了一处忘了另一处"的漂移。
 */
export async function awardProgress(params: {
  userId: string;
  /** 本次加多少 XP（已经判过幂等，调用方保证不会重复给） */
  xp: number;
  minutes?: number;
  lessonsDone?: number;
  exercisesDone?: number;
  now?: Date;
}): Promise<AwardOutcome | null> {
  const now = params.now ?? new Date();

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { xp: true, streakCurrent: true, streakBest: true, lastActiveDate: true },
  });
  if (!user) return null;

  const todayKey = dayKey(now);
  const streak = nextStreak({
    lastActiveDate: user.lastActiveDate ? dayKey(user.lastActiveDate) : null,
    todayKey,
    current: user.streakCurrent,
    best: user.streakBest,
  });

  const newXp = user.xp + params.xp;
  const level = levelFromXp(newXp);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: params.userId },
      data: {
        xp: newXp,
        level,
        streakCurrent: streak.current,
        streakBest: streak.best,
        lastActiveDate: dateOnly(todayKey),
      },
    }),
    prisma.dailyActivity.upsert({
      where: { userId_date: { userId: params.userId, date: dateOnly(todayKey) } },
      create: {
        userId: params.userId,
        date: dateOnly(todayKey),
        xpEarned: params.xp,
        lessonsDone: params.lessonsDone ?? 0,
        exercisesDone: params.exercisesDone ?? 0,
        minutes: params.minutes ?? 0,
      },
      update: {
        xpEarned: { increment: params.xp },
        lessonsDone: { increment: params.lessonsDone ?? 0 },
        exercisesDone: { increment: params.exercisesDone ?? 0 },
        minutes: { increment: params.minutes ?? 0 },
      },
    }),
  ]);

  // ── 结算徽章 ──────────────────────────────────────────────
  // 判定"某章全部学完"时，只算**已经写完讲义**的课时（否则永远拿不到章节徽章）
  const doneRows = await prisma.lessonProgress.findMany({
    where: { userId: params.userId, status: "DONE" },
    select: { lessonId: true },
  });
  const doneSet = new Set(doneRows.map((r) => r.lessonId));

  const published = allLessonRoutes();
  const chaptersFullyDone = CHAPTERS.filter((c) => {
    const lessons = lessonsOfChapter(c.order).filter((l) =>
      published.some((p) => p.chapter === c.slug && p.lesson === l.slug),
    );
    if (lessons.length === 0) return false;
    return lessons.every((l) => doneSet.has(`${c.slug}/${l.slug}`));
  }).map((c) => c.order);

  const shouldHave = earnedBadges({
    lessonsDone: doneSet.size,
    chaptersFullyDone,
    streakCurrent: streak.current,
    xp: newXp,
  });

  const owned = new Set(
    (
      await prisma.userBadge.findMany({
        where: { userId: params.userId },
        select: { badgeCode: true },
      })
    ).map((b) => b.badgeCode),
  );

  const toAward = shouldHave.filter((code) => !owned.has(code));
  if (toAward.length > 0) {
    await prisma.userBadge.createMany({
      data: toAward.map((code) => ({ userId: params.userId, badgeCode: code })),
      skipDuplicates: true,
    });
  }

  return {
    xp: newXp,
    level,
    streakCurrent: streak.current,
    streakBest: streak.best,
    newBadges: toAward
      .map((code) => BADGE_BY_CODE.get(code))
      .filter((b): b is BadgeDef => Boolean(b)),
  };
}
