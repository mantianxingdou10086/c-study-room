import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Flag, ListTree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  allLessonRoutes,
  getChapterExercises,
  getLessonBySlugs,
  getNeighbours,
  lessonHref,
  lessonsOfChapter,
} from "@/lib/content";
import { lessonFileName, lessonMdxExists, readLessonMdx } from "@/lib/content/read";
import { extractToc, renderLesson } from "@/lib/mdx";
import { CONTENT_READY_CHAPTERS } from "@/lib/content";
import { LessonCompleteButton } from "@/components/learn/lesson-complete-button";
import {
  LessonDoneMark,
  ProgressProvider,
  RecordLessonVisit,
} from "@/components/learn/progress-ui";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return allLessonRoutes();
}

export async function generateMetadata({
  params,
}: PageProps<"/learn/[chapter]/[lesson]">): Promise<Metadata> {
  const { chapter: chapterSlug, lesson: lessonSlug } = await params;
  const found = getLessonBySlugs(chapterSlug, lessonSlug);
  if (!found) return { title: "课时不存在" };
  return {
    title: `${found.lesson.title} · 第 ${found.chapter.order} 章`,
    description: found.lesson.takeaway,
  };
}

export default async function LessonPage({
  params,
}: PageProps<"/learn/[chapter]/[lesson]">) {
  const { chapter: chapterSlug, lesson: lessonSlug } = await params;
  const found = getLessonBySlugs(chapterSlug, lessonSlug);
  if (!found) notFound();

  const { chapter, lesson } = found;
  const siblings = lessonsOfChapter(chapter.order);
  const { prev, next, index, total } = getNeighbours(chapter.order, lesson.order);
  const chapterExercises = getChapterExercises(chapter.order);
  const lessonExercises = chapterExercises.filter((e) => e.lessonSlug === lesson.slug);

  const fileName = lessonFileName(lesson);
  const hasContent = await lessonMdxExists(chapter.slug, fileName);
  const source = hasContent ? await readLessonMdx(chapter.slug, fileName) : "";
  const content = hasContent ? await renderLesson(source) : null;
  const toc = hasContent ? extractToc(source) : [];

  return (
    <ProgressProvider>
      <RecordLessonVisit chapterSlug={chapter.slug} lessonSlug={lesson.slug} />
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/learn" className="hover:text-foreground">
          课程地图
        </Link>
        <span>/</span>
        <span>
          第 {chapter.order} 章 · {chapter.title}
        </span>
        <span>/</span>
        <span className="text-foreground">{lesson.title}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)_180px]">
        {/* 左：本章课时 */}
        <aside className="hidden lg:block">
          <p className="text-xs font-medium text-muted-foreground">
            第 {chapter.order} 章 · {chapter.title}
          </p>
          <ol className="mt-3 space-y-0.5">
            {siblings.map((l) => {
              const active = l.slug === lesson.slug;
              return (
                <li key={l.slug}>
                  <Link
                    href={lessonHref(chapter, l)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-baseline gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary-soft font-medium text-primary"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    <span className="font-mono text-[11px] tabular-nums">
                      {chapter.order}.{l.order}
                    </span>
                    <span className="min-w-0 flex-1">{l.title}</span>
                    <LessonDoneMark lessonId={`${chapter.slug}/${l.slug}`} />
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 rounded-lg border border-border bg-surface-muted p-3 text-xs leading-relaxed text-muted-foreground">
            本章共 {siblings.length} 节 · 全站第 {index + 1}/{total} 节
          </div>
        </aside>

        {/* 中：讲义正文 */}
        <article className="min-w-0">
          <header className="border-b border-border pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">
                第 {chapter.order}.{lesson.order} 节
              </Badge>
              <Badge>{lesson.kind === "LAB" ? "动手课" : "讲义"}</Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {lesson.minutes} 分钟
              </span>
              <span className="text-xs text-muted-foreground">{lesson.xp} XP</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {lesson.takeaway}
            </p>
          </header>

          <div className="mt-2">
            {content ?? (
              <div className="rounded-xl border border-warning/30 bg-warning-soft p-5">
                <p className="font-medium">这一节的讲义还在编写中</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  第 {chapter.order} 章的整体结构已经定好了（共 {siblings.length} 节），
                  目前正文写到第 {CONTENT_READY_CHAPTERS} 章。
                  在它上线之前，你可以先按下面的目标自学，或者去练习场动手试：
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {chapter.goals.map((g) => (
                    <li key={g} className="flex gap-2">
                      <span className="text-primary">→</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  本节要点：{lesson.takeaway}
                </p>
              </div>
            )}
          </div>

          {/* 本节题目入口 */}
          {lessonExercises.length > 0 && (
            <Card className="mt-8">
              <CardContent className="flex flex-wrap items-center gap-4 p-5">
                <Flag className="h-5 w-5 text-primary" />
                <p className="min-w-0 flex-1 text-sm leading-relaxed">
                  本节有 <strong className="font-medium">{lessonExercises.length}</strong>{" "}
                  道随堂题，已经嵌在上面了。想按题型刷题或看整章的题，去题库。
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/exercises">打开题库</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 上一节 / 下一节。完成标记挂在「下一节」正上方 —— 先标记，再翻页 */}
          <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
            <div className="flex flex-col">
              {prev ? (
                <Link
                  href={lessonHref(prev.chapter, prev.lesson)}
                  className="flex flex-1 items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-surface-muted"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">上一节</span>
                    <span className="block truncate text-sm font-medium">{prev.lesson.title}</span>
                  </span>
                </Link>
              ) : (
                <span className="flex-1" />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <LessonCompleteButton
                chapterSlug={chapter.slug}
                lessonSlug={lesson.slug}
                lessonId={`${chapter.slug}/${lesson.slug}`}
              />
              {next ? (
                <Link
                  href={lessonHref(next.chapter, next.lesson)}
                  className="flex items-center justify-end gap-3 rounded-xl border border-border p-4 text-right transition-colors hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">下一节</span>
                    <span className="block truncate text-sm font-medium">{next.lesson.title}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ) : (
                <span className="flex-1" />
              )}
            </div>
          </div>
        </article>

        {/* 右：目录 */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ListTree className="h-3.5 w-3.5" />
              本节内容
            </p>
            <ul className="mt-3 space-y-1.5 border-l border-border">
              {toc.map((item) => (
                <li key={item.id} className={cn(item.depth === 3 && "pl-3")}>
                  <a
                    href={`#${item.id}`}
                    className="block border-l-2 border-transparent pl-3 text-[13px] leading-relaxed text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-subtle-foreground">
              延伸阅读：原书 PDF 第 {chapter.pdfFrom}~{chapter.pdfTo} 页
            </p>
          </div>
        </aside>
      </div>
      </div>
    </ProgressProvider>
  );
}
