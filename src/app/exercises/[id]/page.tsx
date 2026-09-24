import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { EXERCISE_BY_ID, EXERCISES } from "@/content/exercises";
import { toPublicExercise } from "@/lib/exercises/public";
import {
  CHAPTERS,
  allLessonRoutes,
  getLessonBySlugs,
  lessonHref,
  lessonsOfChapter,
} from "@/lib/content";
import { Practice, type InitialState } from "@/components/exercises/practice";

/**
 * 单题练习页。
 *
 * 这一页是**动态渲染**的（要读当前用户的做题记录），和讲义页不同 —— 讲义页是静态的。
 * 代价可以接受：练习页本来就是"一人一份状态"的页面。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ex = EXERCISE_BY_ID.get(id);
  return { title: ex ? `第 ${ex.chapterOrder} 章练习` : "练习" };
}

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = EXERCISE_BY_ID.get(id);
  if (!exercise) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const submission = userId
    ? await prisma.submission.findUnique({
        where: { userId_exerciseId: { userId, exerciseId: id } },
        select: {
          passed: true,
          attempts: true,
          usedHint: true,
          viewedAnswer: true,
          xpAwarded: true,
          code: true,
          answer: true,
        },
      })
    : null;

  const answer = (submission?.answer ?? null) as {
    option?: number | null;
    blanks?: string[] | null;
    text?: string | null;
  } | null;

  const initial: InitialState = submission
    ? {
        passed: submission.passed,
        attempts: submission.attempts,
        usedHint: submission.usedHint,
        viewedAnswer: submission.viewedAnswer,
        xpAwarded: submission.xpAwarded,
        code: submission.code,
        option: answer?.option ?? null,
        blanks: answer?.blanks ?? null,
        text: answer?.text ?? null,
      }
    : null;

  // 回讲义的链接：优先回到这道题挂的那一节，否则回到本章第一节
  const chapter = CHAPTERS.find((c) => c.order === exercise.chapterOrder);
  const published = allLessonRoutes();
  const linked =
    chapter && exercise.lessonSlug
      ? getLessonBySlugs(chapter.slug, exercise.lessonSlug)
      : null;
  const fallback =
    chapter &&
    lessonsOfChapter(chapter.order).find((l) =>
      published.some((p) => p.chapter === chapter.slug && p.lesson === l.slug),
    );
  const back =
    linked ?? (chapter && fallback ? { chapter, lesson: fallback } : null);

  // 同章其它题，方便连续刷
  const siblings = EXERCISES.filter(
    (e) => e.chapterOrder === exercise.chapterOrder,
  ).sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav aria-label="面包屑" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/exercises" className="hover:text-foreground">
          题库
        </Link>
        <span>/</span>
        <span>
          第 {exercise.chapterOrder} 章{chapter ? ` · ${chapter.title}` : ""}
        </span>
        <span>/</span>
        <span className="font-mono text-foreground">{exercise.id}</span>
      </nav>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        第 {exercise.chapterOrder} 章练习
      </h1>

      <div className="mt-6">
        {userId ? (
          <Practice
            exercise={toPublicExercise(exercise)}
            initial={initial}
            backHref={back ? lessonHref(back.chapter, back.lesson) : "/learn"}
            backLabel={
              back ? `第 ${chapter?.order} 章「${back.lesson.title}」` : "课程地图"
            }
          />
        ) : (
          <div className="rounded-xl border border-border bg-surface-muted p-5 text-sm">
            <p className="text-muted-foreground">
              做题需要登录：判题和「哪道题过了」都要记在你的账号上，换设备也还在。
            </p>
            <Link
              href="/login"
              className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              去登录
            </Link>
          </div>
        )}
      </div>

      {/* 同章题目导航 */}
      {siblings.length > 1 && (
        <nav className="mt-10 border-t border-border pt-5">
          <p className="text-xs font-medium text-muted-foreground">
            本章共 {siblings.length} 题
          </p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {siblings.map((e, i) => (
              <li key={e.id}>
                <Link
                  href={`/exercises/${e.id}`}
                  aria-current={e.id === exercise.id ? "page" : undefined}
                  className={
                    e.id === exercise.id
                      ? "flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-primary"
                      : "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }
                >
                  {e.id === exercise.id ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Circle className="h-3 w-3 shrink-0" />
                  )}
                  <span className="font-mono text-[11px]">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{e.prompt.slice(0, 28)}…</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="mt-8">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          回到题库
        </Link>
      </p>
    </div>
  );
}
