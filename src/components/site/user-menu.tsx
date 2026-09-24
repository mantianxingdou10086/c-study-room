"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

type SessionUser = { id: string; username: string; email?: string | null };

/**
 * 顶栏的登录态区域。
 *
 * 为什么是**客户端**组件、自己 fetch `/api/auth/session`，而不是在 layout 里
 * `await auth()` 然后往下传：
 * 在 layout 里读 session 会让**所有页面**都变成动态渲染（读 cookie 就不能静态生成），
 * 而我们的课程讲义页是要 SSG 的（29 个静态页）。放客户端就没有这个代价。
 *
 * ⚠️ 依赖 `pathname` 重新拉取，这一步不能省：
 * 这个组件挂在 layout 上，客户端跳转时**不会重新挂载**。
 * 登录成功后 server action 会跳到 /learn，如果 effect 只跑一次，
 * 顶栏会一直停在"登录/注册"（实测就是这么坏的：登录成功了但界面没变，
 * 用户会以为没登上）。把 pathname 放进依赖，跳转后自然重新查一次。
 */
export function UserMenu() {
  const [user, setUser] = React.useState<SessionUser | null | undefined>(undefined);
  const pathname = usePathname();

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setUser(data?.user ? (data.user as SessionUser) : null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // 还没拿到结果：占位，避免布局跳动
  if (user === undefined) {
    return <div className="h-8 w-20" aria-hidden />;
  }

  if (!user) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/login">登录</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">注册</Link>
        </Button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button asChild variant="ghost" size="sm" className="max-w-[10rem]">
        <Link href="/settings" title={user.email ?? undefined}>
          <UserIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{user.username}</span>
        </Link>
      </Button>
      <form action={logoutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="退出登录"
          title="退出登录"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
