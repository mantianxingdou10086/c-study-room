"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProgressProvider, useProgress } from "@/components/learn/progress-ui";

/**
 * 首页「继续学习」卡片。
 *
 * 为什么是客户端组件：进度的唯一来源是 `/api/progress`（和个人会话绑定），
 * 在页面里 `await auth()` 会把首页变成动态渲染、丢掉静态生成。所以首页照旧是
 * 静态的，卡片自己挂 Provider、异步取一次快照补上。
 *
 * 三个状态各说各的话：
 *   加载中 → 「正在读取…」，不摆按钮（免得给已登录的人闪一下登录按钮）
 *   未登录 → 说明登录的好处 + 登录/注册入口
 *   已登录 → 显示上次学到哪一节 + 真实完成度，**不再出现登录/注册**
 */
type Props = {
  /** 讲义已写完的课时数 —— 和 /progress 页同一个分母口径（不是 28 章的规划量） */
  totalLessons: number;
  /** 没有任何记录时的兜底位置，如 "第 1 章 · C 入门" */
  firstChapterLabel: string;
  /** 没有任何记录时的兜底目标（第一节） */
  firstLessonHref: string;
};

export function ContinueLearningCard(props: Props) {
  return (
    <ProgressProvider>
      <CardBody {...props} />
    </ProgressProvider>
  );
}

function CardBody({ totalLessons, firstChapterLabel, firstLessonHref }: Props) {
  const { snapshot, loading } = useProgress();

  if (loading) {
    return (
      <Card className="md:mt-0">
        <CardHeader>
          <CardTitle>继续学习</CardTitle>
          <CardDescription>正在读取你的学习进度…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBlock label={firstChapterLabel} done={0} total={totalLessons} />
        </CardContent>
      </Card>
    );
  }

  const signedIn = snapshot?.signedIn ?? false;
  const resume = signedIn ? (snapshot?.resume ?? null) : null;

  // 完成度用快照里逐章的 done/total 求和：只统计讲义已写完的课时，
  // 和 /progress 页的分母一致，否则进度条永远到不了 100%
  const rows = snapshot?.chapters ?? [];
  const doneRows = rows.reduce((sum, c) => sum + c.done, 0);
  const totalRows = rows.reduce((sum, c) => sum + c.total, 0);
  const done = signedIn ? doneRows : 0;
  const total = totalRows > 0 ? totalRows : totalLessons;

  const [chapterSlug, lessonSlug] = resume?.lessonId.split("/") ?? [];
  const targetHref =
    chapterSlug && lessonSlug ? `/learn/${chapterSlug}/${lessonSlug}` : firstLessonHref;
  const stageLabel = resume
    ? `第 ${resume.chapterOrder} 章 · ${resume.partName}`
    : firstChapterLabel;

  const description = resume
    ? `上次翻到「${resume.lessonTitle}」，接着往下就好。`
    : signedIn
      ? "还没有学习记录。从第 1 章开始，进度会自动存到你的账号里。"
      : "还没有学习记录。登录后这里会显示你上次学到的那一节。";

  return (
    <Card className="md:mt-0">
      <CardHeader>
        <CardTitle>继续学习</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgressBlock label={stageLabel} done={done} total={total} />
        <div className="flex flex-wrap gap-2">
          {signedIn ? (
            <>
              <Button asChild size="sm">
                <Link href={targetHref}>
                  <Play className="h-3.5 w-3.5" />
                  {resume ? "继续上次学习" : "从第 1 章开始"}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/learn">课程地图</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="secondary" size="sm">
                <Link href="/login">登录以存档进度</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/register">注册新账号</Link>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBlock({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">当前阶段</span>
        <span className="font-medium">{label}</span>
      </div>
      <Progress value={done} total={total} className="mt-2" />
      <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
        已完成 {done} / {total} 节
      </p>
    </div>
  );
}