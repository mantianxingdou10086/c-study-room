import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Dumbbell, Lock } from "lucide-react";
import { EXERCISES } from "@/content/exercises";
import { CHAPTERS } from "@/lib/content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressProvider } from "@/components/learn/progress-ui";
import {
  ChapterExerciseProgress,
  ExercisePassedMark,
  ExerciseSummary,
} from "@/components/exercises/exercise-progress";
import { CONTENT_READY_CHAPTERS } from "@/lib/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "题库",
  description:
    "选择、填空、读程序写结果、动手写代码四种题型，代码题由浏览器里的真 clang 编译器判分。",
};

const KIND_LABEL = {
  MCQ: "选择",
  FILL: "填空",
  OUTPUT: "读程序写结果",
  CODE: "动手写代码",
} as const;

const DIFFICULTY_LABEL = { 1: "随堂", 2: "作业", 3: "挑战" } as const;

export default function ExercisesPage() {
  // 按章分组（只显示已经出了题的章节）
  const byChapter = CHAPTERS.map((chapter) => ({
    chapter,
    exercises: EXERCISES.filter((e) => e.chapterOrder === chapter.order).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  })).filter((g) => g.exercises.length > 0);

  const total = EXERCISES.length;
  const totalXp = EXERCISES.reduce((sum, e) => sum + e.xp, 0);

  return (
    <ProgressProvider>
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">题库</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            四种题型：选择、填空、读程序写结果、动手写代码。
            <strong className="font-medium text-foreground">代码题由浏览器里的真编译器判分</strong>
            ——不是字符串比对，而是真的编译、真的运行。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="primary">共 {total} 题</Badge>
            <Badge>满题 {totalXp} XP</Badge>
          </div>
          <div className="mt-4">
            <ExerciseSummary total={total} />
          </div>
        </header>

        <div className="mt-8 space-y-6">
          {byChapter.map(({ chapter, exercises }) => (
            <Card key={chapter.slug}>
              <CardContent className="p-0">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">
                    {chapter.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold tracking-tight">{chapter.title}</h2>
                    <p className="mt-0.5 text-xs text-subtle-foreground">
                      {exercises.length} 题 ·{" "}
                      {exercises.reduce((s, e) => s + e.xp, 0)} XP
                    </p>
                  </div>
                  <ChapterExerciseProgress
                    exerciseIds={exercises.map((e) => e.id)}
                  />
                </div>

                <ul>
                  {exercises.map((ex) => (
                    <li key={ex.id}>
                      <Link
                        href={`/exercises/${ex.id}`}
                        className="flex items-center gap-3 border-b border-border px-5 py-3 text-sm transition-colors last:border-0 hover:bg-surface-muted"
                      >
                        <ExercisePassedMark exerciseId={ex.id} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-foreground">
                            {ex.prompt.replace(/^[#>\s]*/, "").slice(0, 60)}
                            {ex.prompt.length > 60 ? "…" : ""}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-subtle-foreground">
                            <span className="font-mono">{ex.id}</span>
                            <span>·</span>
                            <span>{KIND_LABEL[ex.kind]}</span>
                            <span>·</span>
                            <span>{DIFFICULTY_LABEL[ex.difficulty as 1 | 2 | 3]}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-subtle-foreground">
                          {ex.xp} XP
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {/* 后续章节还没出题 */}
          <Card className={cn("opacity-70")}>
            <CardContent className="flex items-center gap-3 p-5">
              <Lock className="h-4 w-4 shrink-0 text-subtle-foreground" />
              <p className="text-sm text-muted-foreground">
                第 {CONTENT_READY_CHAPTERS + 1}~28 章的题目还在出。讲义先看着，题会陆续补上。
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 flex items-center gap-2 text-xs text-subtle-foreground">
          <Dumbbell className="h-3.5 w-3.5" />
          提示：先看提示再动手；实在想不出来可以展开参考答案，但那道题就不再计 XP 了。
        </p>
      </div>
    </ProgressProvider>
  );
}
