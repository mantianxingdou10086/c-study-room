import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Circle, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChapterProgressLine,
  ChapterRing,
  LessonDoneMark,
  ProgressProvider,
  ResumeButton,
} from "@/components/learn/progress-ui";
import {
  CONTENT_READY_CHAPTERS,
  PARTS,
  chaptersOfPart,
  contentStats,
  lessonHref,
  lessonsOfChapter,
} from "@/lib/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "课程地图",
  description:
    "28 章、五个阶段，每节 15~30 分钟。先学概念，再动手写——按顺序走完就是一条完整的 C 语言路线。",
};

const KIND_LABEL = { READING: "讲义", LAB: "动手" } as const;

export default function LearnPage() {
  const stats = contentStats();
  const totalHours = Math.round((stats.minutesAvailable / 60) * 10) / 10;

  return (
    <ProgressProvider>
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">课程地图</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          按 K.N.King 的教学顺序组织成五个阶段。已经上线的是前 {stats.chaptersAvailable} 章
          （{stats.lessonsAvailable} 节，合计约 {totalHours} 小时）；后面章节的骨架先列出来，
          内容在陆续补。每节课都是同一个节奏：一句话结论 → 可运行的例子 → 规则拆解 → 常见坑 → 随堂检测。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="primary">已上线 {stats.chaptersAvailable}/{stats.chaptersTotal} 章</Badge>
          <Badge>课时 {stats.lessonsAvailable}</Badge>
          <Badge>题目 {stats.exercisesAvailable}</Badge>
          <Badge>五阶段路线</Badge>
        </div>
        <ResumeButton className="mt-5" />
      </header>

      <div className="mt-8 space-y-10">
        {PARTS.map((part, partIndex) => {
          const chapters = chaptersOfPart(part.id);
          const isPartReady = chapters.some((c) => c.available);
          return (
            <section key={part.id} aria-labelledby={`part-${part.id}`}>
              <div className="flex items-baseline gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary-soft text-xs font-semibold text-primary">
                  {partIndex + 1}
                </span>
                <h2 id={`part-${part.id}`} className="text-lg font-semibold tracking-tight">
                  {part.name}
                </h2>
                <span className="text-xs text-subtle-foreground">{part.chapterRange}</span>
                {!isPartReady && <Badge>内容待补</Badge>}
              </div>
              <p className="mt-2 pl-9 text-sm leading-relaxed text-muted-foreground">
                {part.detail}
              </p>

              <div className="mt-4 space-y-3 pl-0 sm:pl-9">
                {chapters.map((chapter) => {
                  const lessons = lessonsOfChapter(chapter.order);
                  const hasContent = chapter.order <= CONTENT_READY_CHAPTERS;
                  return (
                    <Card
                      key={chapter.slug}
                      className={cn(!chapter.available && "opacity-70")}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-wrap items-start gap-4 p-5">
                          <ChapterRing
                            chapterSlug={chapter.slug}
                            total={Math.max(lessons.length, 1)}
                            size={48}
                            className={cn(!hasContent && "opacity-40")}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold tracking-tight">
                                第 {chapter.order} 章 · {chapter.title}
                              </h3>
                              {!chapter.available ? (
                                <Badge>
                                  <Lock className="h-3 w-3" />
                                  即将上线
                                </Badge>
                              ) : !hasContent ? (
                                <Badge tone="warning">讲义编写中</Badge>
                              ) : (
                                <Badge tone="success">可学习</Badge>
                              )}
                              <ChapterProgressLine chapterSlug={chapter.slug} />
                            </div>
                            <p className="mt-1 text-xs text-subtle-foreground">
                              {chapter.subtitle} · 原书 PDF 第 {chapter.pdfFrom}~{chapter.pdfTo} 页
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {chapter.summary}
                            </p>
                          </div>
                        </div>

                        {chapter.available && lessons.length > 0 && (
                          <ul className="border-t border-border">
                            {lessons.map((lesson) => {
                              const ready = chapter.order <= CONTENT_READY_CHAPTERS;
                              const inner = (
                                <>
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-subtle-foreground">
                                    {lesson.order}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                                  <span className="shrink-0 text-[11px] text-subtle-foreground">
                                    {KIND_LABEL[lesson.kind]}
                                  </span>
                                  <span className="shrink-0 text-[11px] text-subtle-foreground tabular-nums">
                                    {lesson.minutes} 分钟
                                  </span>
                                  {ready && (
                                    <LessonDoneMark
                                      lessonId={`${chapter.slug}/${lesson.slug}`}
                                    />
                                  )}
                                  {ready ? (
                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
                                  ) : (
                                    <Circle className="h-3 w-3 shrink-0 text-border-strong" />
                                  )}
                                </>
                              );
                              return (
                                <li key={lesson.slug}>
                                  {ready ? (
                                    <Link
                                      href={lessonHref(chapter, lesson)}
                                      title={lesson.takeaway}
                                      className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-surface-muted"
                                    >
                                      {inner}
                                    </Link>
                                  ) : (
                                    <div className="flex cursor-not-allowed items-center gap-3 px-5 py-2.5 text-sm text-muted-foreground">
                                      {inner}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <Card className="mt-10">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
            不知道从哪开始？直接进{" "}
            <Link href="/learn/ch01-introducing-c/why-c" className="text-primary underline underline-offset-2">
              第 1 章第 1 节
            </Link>
            ，15 分钟读完。想先动手写代码，就去{" "}
            <Link href="/playground" className="text-primary underline underline-offset-2">
              练习场
            </Link>
            。
          </p>
        </CardContent>
      </Card>
      </div>
    </ProgressProvider>
  );
}
