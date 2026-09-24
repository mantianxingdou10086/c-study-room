import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Flame, Mail, Trophy, User as UserIcon } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "账号设置" };

/** 时间统一按中国标准时间显示 */
const dateFmt = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "long",
  timeZone: "Asia/Shanghai",
});

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      email: true,
      xp: true,
      level: true,
      streakCurrent: true,
      streakBest: true,
      createdAt: true,
      _count: { select: { progresses: true, submissions: true } },
    },
  });

  // 会话还在但用户已被删除（比如手动清了库）—— 让他重新登录
  if (!user) redirect("/login");

  const rows = [
    { icon: UserIcon, label: "用户名", value: user.username },
    { icon: Mail, label: "邮箱", value: user.email },
    {
      icon: CalendarDays,
      label: "注册时间",
      value: dateFmt.format(user.createdAt),
    },
    {
      icon: Trophy,
      label: "经验值",
      value: `${user.xp} XP · 等级 ${user.level}`,
    },
    {
      icon: Flame,
      label: "连续打卡",
      value: `当前 ${user.streakCurrent} 天 · 最长 ${user.streakBest} 天`,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">账号设置</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        这里的数据都存在服务器上，换设备登录后能看到同样的内容。
      </p>

      <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5">
            <Icon className="h-4 w-4 shrink-0 text-subtle-foreground" />
            <dt className="w-24 shrink-0 text-sm text-muted-foreground">{label}</dt>
            <dd className="min-w-0 flex-1 truncate text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-sm text-muted-foreground">已学课时</p>
          <p className="mt-0.5 text-xl font-semibold">{user._count.progresses}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-sm text-muted-foreground">已提交题目</p>
          <p className="mt-0.5 text-xl font-semibold">{user._count.submissions}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href="/progress">查看学习进度</Link>
        </Button>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" size="sm">
            退出登录
          </Button>
        </form>
      </div>

      <p className="mt-6 text-xs text-subtle-foreground">
        改密码、改邮箱、注销账号会在后续版本加上。
      </p>
    </div>
  );
}
