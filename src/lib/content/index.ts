/**
 * 内容查询层（纯函数，客户端也能用）。
 * 所有页面都通过这里拿课程数据，不要直接 import 具体的 content 文件——
 * 这样将来内容从"仓库文件"换成"数据库"时只改这一层。
 */
import { CHAPTERS, CHAPTER_BY_ORDER, CHAPTER_BY_SLUG, PARTS_VALIDATED, chaptersOfPart } from "@/content/curriculum";
import { lessonsOfChapter } from "@/content/lessons";
import { EXERCISE_BY_ID, EXERCISES } from "@/content/exercises";
import { CONTENT_READY_CHAPTERS, EXERCISES_READY_CHAPTERS } from "@/content/status";
import type { Chapter, Exercise, Lesson, Part } from "@/lib/content/schema";
import { lessonMdxPath } from "@/lib/content/schema";

export { CHAPTERS, PARTS_VALIDATED as PARTS, chaptersOfPart, lessonsOfChapter };
export { CONTENT_READY_CHAPTERS, EXERCISES_READY_CHAPTERS };

/** 全站课时按学习顺序拍平（用于"上一节/下一节"跨章跳转） */
const FLAT_LESSONS: { chapter: Chapter; lesson: Lesson }[] = CHAPTERS.flatMap((c) =>
  lessonsOfChapter(c.order).map((lesson) => ({ chapter: c, lesson })),
);

export function getChapterBySlug(slug: string): Chapter | undefined {
  return CHAPTER_BY_SLUG.get(slug);
}

export function getChapterByOrder(order: number): Chapter | undefined {
  return CHAPTER_BY_ORDER.get(order);
}

export function getLessonBySlugs(
  chapterSlug: string,
  lessonSlug: string,
): { chapter: Chapter; lesson: Lesson } | undefined {
  const chapter = CHAPTER_BY_SLUG.get(chapterSlug);
  if (!chapter) return undefined;
  const lesson = lessonsOfChapter(chapter.order).find((l) => l.slug === lessonSlug);
  if (!lesson) return undefined;
  return { chapter, lesson };
}

export function lessonHref(chapter: Chapter, lesson: Lesson): string {
  return `/learn/${chapter.slug}/${lesson.slug}`;
}

/** 上一节 / 下一节（跨章连续，学完最后一节能自然进入下一章） */
export function getNeighbours(chapterOrder: number, lessonOrder: number) {
  const idx = FLAT_LESSONS.findIndex(
    (x) => x.chapter.order === chapterOrder && x.lesson.order === lessonOrder,
  );
  if (idx < 0) return { prev: undefined, next: undefined, index: -1, total: FLAT_LESSONS.length };
  return {
    prev: idx > 0 ? FLAT_LESSONS[idx - 1] : undefined,
    next: idx < FLAT_LESSONS.length - 1 ? FLAT_LESSONS[idx + 1] : undefined,
    index: idx,
    total: FLAT_LESSONS.length,
  };
}

/** 第一节（首页"从第 1 章开始"和"继续学习"的兜底目标） */
export function getFirstLesson() {
  return FLAT_LESSONS[0];
}

export function getLessonExercises(chapterOrder: number, lessonSlug: string): Exercise[] {
  return EXERCISES.filter(
    (e) => e.chapterOrder === chapterOrder && e.lessonSlug === lessonSlug,
  );
}

export function getChapterExercises(chapterOrder: number): Exercise[] {
  return EXERCISES.filter((e) => e.chapterOrder === chapterOrder);
}

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_BY_ID.get(id);
}

export function getMdxPath(chapter: Chapter, lesson: Lesson): string {
  return lessonMdxPath(chapter.slug, lesson);
}

/** 静态生成用：**已经写完讲义**的课时路由（未完成的章节不预渲染，避免构建期读不到文件） */
export function allLessonRoutes(): { chapter: string; lesson: string }[] {
  return FLAT_LESSONS.filter(({ chapter }) => chapter.order <= CONTENT_READY_CHAPTERS).map(
    ({ chapter, lesson }) => ({ chapter: chapter.slug, lesson: lesson.slug }),
  );
}

/** 声明的全部课时路由（含尚未写讲义的），用于 sitemap / 进度统计 */
export function allDeclaredLessonRoutes(): { chapter: string; lesson: string }[] {
  return FLAT_LESSONS.map(({ chapter, lesson }) => ({
    chapter: chapter.slug,
    lesson: lesson.slug,
  }));
}

export function allChapterSlugs(): string[] {
  return CHAPTERS.map((c) => c.slug);
}

export function contentStats() {
  const available = CHAPTERS.filter((c) => c.available);
  const availableLessons = available.flatMap((c) => lessonsOfChapter(c.order));
  return {
    chaptersTotal: CHAPTERS.length,
    chaptersAvailable: available.length,
    /** 已声明但**讲义还没写完**的课时总数（第 1~10 章的规划量） */
    lessonsAvailable: availableLessons.length,
    /** **讲义已经写完**的课时数 —— 进度条的分母应该用这个，否则永远到不了 100% */
    lessonsReady: FLAT_LESSONS.filter(({ chapter }) => chapter.order <= CONTENT_READY_CHAPTERS).length,
    minutesAvailable: availableLessons.reduce((s, l) => s + l.minutes, 0),
    exercisesAvailable: EXERCISES.length,
    parts: PARTS_VALIDATED.length,
  };
}

export type { Chapter, Exercise, Lesson, Part };
