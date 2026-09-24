import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** 登录/注册页共用的外壳：居中卡片 + 顶部站名 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground"
          >
            C
          </span>
          一个普通的 C 语言自习室
        </Link>
        <h1 className={cn("mt-5 text-2xl font-semibold tracking-tight")}>{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        {children}
      </div>

      <p className="mt-5 text-center text-xs text-subtle-foreground">
        我们只存你的邮箱和密码哈希，不收集其他信息。
      </p>
    </div>
  );
}
