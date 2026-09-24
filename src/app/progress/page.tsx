import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Flame, Target, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { contentStats, getFirstLesson, lessonHref } from "@/lib/content";
import { loadRecentActivity } from "@/lib/progress";
import { BadgeWall } from "@/components/progress/badge-wall";
import { StudyHeatmap } from "@/components/progress/study-heatmap";

export const metadata: Metadata = { title: "学习进度" };

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const [user, doneCount, passedCount, badgeRows, activity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, xp: true, level: true, streakCurrent: true, streakBest: true },
    }),
    prisma.lessonProgress.count({
      where: { userId, status: "DONE" },
    }),
    prisma.submission.count({
      where: { userId, passed: true },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeCode: true, awardedAt: true },
      orderBy: { awardedAt: "desc" },
    }),
    // 热力图只画最近 12 周，不用把全部历史都拉出来
    loadRecentActivity(userId),
  ]);

  if (!user) redirect("/login");

  const stats = contentStats();
  // 分母用"讲义已写完的课时数"，不是"规划中的课时数"—— 否则进度条永远到不了 100%
  const total = stats.lessonsReady;
  const donePercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const first = getFirstLesson();

  const cards = [
    { icon: Trophy, label: "经验值", value: `${user.xp} XP`, sub: `等级 ${user.level}` },
    {
      icon: Target,
      label: "已学课时",
      value: `${doneCount} / ${total}`,
      sub: `规划共 ${stats.lessonsAvailable} 节`,
    },
    { icon: Flame, label: "连续打卡", value: `${user.streakCurrent} 天`, sub: `最长 ${user.streakBest} 天` },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {user.username} 的学习进度
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        这些数字存在服务器上，换浏览器登录后仍然是同一份。
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {cards.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span className="text-sm">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs text-subtle-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">课程完成度</span>
          <span className="text-sm tabular-nums text-muted-foreground">{donePercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${donePercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-subtle-foreground">
          已通过 {passedCount} 道题 · 题库共 {stats.exercisesAvailable} 道
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/learn">
            继续学习
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={lessonHref(first.chapter, first.lesson)}>从第 1 章开始</Link>
        </Button>
      </div>

      <div className="mt-4">
        <StudyHeatmap activity={activity} />
      </div>

      <div className="mt-4">
        <BadgeWall
          earned={badgeRows.map((b) => ({
            code: b.badgeCode,
            awardedAt: b.awardedAt,
          }))}
        />
      </div>

      <p className="mt-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        怎么拿 XP：学完一节课（讲义 10、动手课 20）、首次通过一道题（5~40）。
        连续打卡按**中国时区的自然日**算，每天学一点比一次学很久更容易保住连续天数。
        看参考答案的题不计 XP，但看提示不影响 —— 想不出来先看提示。
      </p>
    </div>
  );
}
