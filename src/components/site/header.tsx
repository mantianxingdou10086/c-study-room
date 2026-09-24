"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { cn, SITE_NAME } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  // 点任意链接就收起移动端面板（不用 effect 里 setState，避免级联渲染）
  const close = React.useCallback(() => setOpen(false), []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground"
          >
            C
          </span>
          <span className="hidden sm:inline">{SITE_NAME}</span>
          <span className="sm:hidden">C 语言自习室</span>
        </Link>

        <nav aria-label="主导航" className="ml-4 hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.hint}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    isActive(item.href)
                      ? "bg-primary-soft font-medium text-primary"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "收起菜单" : "展开菜单"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="移动端导航"
          className="border-t border-border bg-surface md:hidden"
        >
          <ul className="mx-auto grid w-full max-w-6xl gap-1 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex items-baseline justify-between rounded-lg px-3 py-2.5 text-sm",
                    isActive(item.href)
                      ? "bg-primary-soft font-medium text-primary"
                      : "text-foreground hover:bg-surface-muted",
                  )}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-subtle-foreground">
                    {item.hint}
                  </span>
                </Link>
              </li>
            ))}
            <li className="mt-1 border-t border-border pt-2">
              <Link
                href="/login"
                onClick={close}
                className="block rounded-lg px-3 py-2.5 text-sm hover:bg-surface-muted"
              >
                登录
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
