"use client";

import * as React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProgress } from "@/components/learn/progress-ui";

/** 题目行的通过标记（未登录时不渲染） */
export function ExercisePassedMark({ exerciseId }: { exerciseId: string }) {
  const { snapshot, loading } = useProgress();
  if (loading || !snapshot?.signedIn) return null;
  const passed = snapshot.passedExercises.includes(exerciseId);

  return (
    <span
      aria-label={passed ? "已通过" : "未通过"}
      title={passed ? "已通过" : "未通过"}
      className={cn(
        "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
        passed
          ? "border-success/40 bg-success-soft text-success"
          : "border-border text-subtle-foreground",
      )}
    >
      {passed ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
    </span>
  );
}

/** 题库页顶部的「已通过 X/Y 题」 */
export function ExerciseSummary({ total }: { total: number }) {
  const { snapshot, loading } = useProgress();
  if (loading) return null;
  if (!snapshot?.signedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        登录后这里会显示你的通过情况（共 {total} 题）。
      </p>
    );
  }
  const done = snapshot.exercisesPassed;
  return (
    <p className="text-sm">
      <span className="font-medium text-foreground tabular-nums">
        {done} / {total}
      </span>{" "}
      <span className="text-muted-foreground">题已通过</span>
      {done === total && total > 0 && (
        <span className="ml-2 text-success">全部通关 🎉</span>
      )}
    </p>
  );
}

/** 每章的通过情况（挂在章节标题旁） */
export function ChapterExerciseProgress({
  exerciseIds,
}: {
  exerciseIds: string[];
}) {
  const { snapshot, loading } = useProgress();
  if (loading || !snapshot?.signedIn) return null;
  const passed = new Set(snapshot.passedExercises);
  const done = exerciseIds.filter((id) => passed.has(id)).length;
  const all = done === exerciseIds.length && exerciseIds.length > 0;

  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        all ? "text-success" : "text-subtle-foreground",
      )}
    >
      {all && <Check className="mr-0.5 inline h-3.5 w-3.5" />}
      {done}/{exerciseIds.length}
    </span>
  );
}
