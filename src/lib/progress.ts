import "server-only";
import { prisma } from "@/lib/db";
import { CHAPTERS, PARTS, allLessonRoutes, getLessonBySlugs, lessonsOfChapter } from "@/lib/content";
import { xpToNextLevel } from "@/lib/gamify/xp";

export type DailyActivityRow = {
  date: Date;
  xpEarned: number;
  minutes: number;
  lessonsDone: number;
  exercisesDone: number;
};

/**
 * 最近 N 天的学习活动（热力图用）。
 *
 * 抽成函数而不是写在页面里：`Date.now()` 出现在组件渲染期会触发
 * react-hooks/purity 规则（组件必须是纯的）。查询逻辑本来就该待在 lib 里。
 */
export async function loadRecentActivity(
  userId: string,
  days = 84,
): Promise<DailyActivityRow[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return prisma.dailyActivity.findMany({
    where: { userId, date: { gte: cutoff } },
    select: {
      date: true,
      xpEarned: true,
      minutes: true,
      lessonsDone: true,
      exercisesDone: true,
    },
    orderBy: { date: "asc" },
  });
}

/**
 * 一次查出「一个用户的学习进度快照」。
 *
 * 为什么要做成一个快照而不是零散查询：
 * 课程地图要一次知道"哪些课时已完成"才能画勾，逐节查会变成几十次往返。
 * 这里固定 4 次查询，和课时数量无关。
 */
export type ProgressSnapshot = {
  signedIn: boolean;
  /** 已完成的课时 id 列表（"ch01-introducing-c/why-c"） */
  doneLessons: string[];
  /** 每章的完成情况（只统计**讲义已写完**的课时） */
  chapters: { slug: string; order: number; done: number; total: number }[];
  xp: number;
  level: number;
  levelProgress: { current: number; needed: number };
  streakCurrent: number;
  streakBest: number;
  lessonsDone: number;
  exercisesPassed: number;
  /** 已通过的题目 id 列表（题库页要逐题画勾，只有计数不够） */
  passedExercises: string[];
  badges: { code: string; awardedAt: string }[];
  /**
   * "继续上次学习"的目标：最近碰过但还没完成的那一节。
   *
   * 除了 id 还带上课时标题与所属阶段：客户端组件（首页「继续学习」卡片）
   * 要用它们显示"上次学到哪一节"，带上就不用把整套课程数据打进首屏 bundle。
   */
  resume: {
    lessonId: string;
    updatedAt: string;
    /** 课时标题，如 "从源代码到能运行的程序" */
    lessonTitle: string;
    /** 所属章序号，配 partName 显示成"第 1 章 · C 入门" */
    chapterOrder: number;
    /** 所属阶段名，如 "C 入门" */
    partName: string;
  } | null;
};

export const EMPTY_SNAPSHOT: ProgressSnapshot = {
  signedIn: false,
  doneLessons: [],
  chapters: [],
  xp: 0,
  level: 1,
  levelProgress: { current: 0, needed: 50 },
  streakCurrent: 0,
  streakBest: 0,
  lessonsDone: 0,
  exercisesPassed: 0,
  passedExercises: [],
  badges: [],
  resume: null,
};

export async function loadProgressSnapshot(
  userId: string | null | undefined,
): Promise<ProgressSnapshot> {
  if (!userId) return EMPTY_SNAPSHOT;

  const [user, progressRows, passedRows, badgeRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streakCurrent: true, streakBest: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.submission.findMany({
      where: { userId, passed: true },
      select: { exerciseId: true },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeCode: true, awardedAt: true },
      orderBy: { awardedAt: "desc" },
    }),
  ]);

  if (!user) return EMPTY_SNAPSHOT;

  const doneSet = new Set(
    progressRows.filter((r) => r.status === "DONE").map((r) => r.lessonId),
  );

  // 每章的进度：分母只算**讲义已写完**的课时，否则永远到不了 100%
  const published = new Set(allLessonRoutes().map((r) => `${r.chapter}/${r.lesson}`));
  const chapters = CHAPTERS.map((c) => {
    const lessons = lessonsOfChapter(c.order).filter((l) => published.has(`${c.slug}/${l.slug}`));
    return {
      slug: c.slug,
      order: c.order,
      done: lessons.filter((l) => doneSet.has(`${c.slug}/${l.slug}`)).length,
      total: lessons.length,
    };
  }).filter((c) => c.total > 0);

  const resumeRow = progressRows.find((r) => r.status !== "DONE");
  // 拿标题/阶段：lessonId 形如 "ch01-introducing-c/from-source-to-program"
  const resumeHit = (() => {
    if (!resumeRow) return undefined;
    const [chapterSlug, lessonSlug] = resumeRow.lessonId.split("/");
    if (!chapterSlug || !lessonSlug) return undefined;
    return getLessonBySlugs(chapterSlug, lessonSlug);
  })();

  return {
    signedIn: true,
    doneLessons: [...doneSet],
    chapters,
    xp: user.xp,
    level: user.level,
    levelProgress: (() => {
      const p = xpToNextLevel(user.xp);
      return { current: p.current, needed: p.needed };
    })(),
    streakCurrent: user.streakCurrent,
    streakBest: user.streakBest,
    lessonsDone: doneSet.size,
    exercisesPassed: passedRows.length,
    passedExercises: passedRows.map((r) => r.exerciseId),
    badges: badgeRows.map((b) => ({
      code: b.badgeCode,
      awardedAt: b.awardedAt.toISOString(),
    })),
    resume: resumeRow
      ? {
          lessonId: resumeRow.lessonId,
          updatedAt: resumeRow.updatedAt.toISOString(),
          lessonTitle: resumeHit?.lesson.title ?? "",
          chapterOrder: resumeHit?.chapter.order ?? 0,
          partName: resumeHit
            ? (PARTS.find((p) => p.id === resumeHit.chapter.part)?.name ?? "")
            : "",
        }
      : null,
  };
}
