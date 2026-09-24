"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "c-study-theme";

/**
 * 主题切换。
 *
 * 刻意不存 React state：主题的真实来源是 <html> 上的 .dark class（首屏由 layout 里的
 * 内联脚本设置），这里只负责改它。用 CSS（dark:hidden / dark:block）决定显示哪个图标，
 * 这样既没有 hydration 不一致，也不需要 effect 里 setState。
 * 默认浅色——只有用户明确点过才写 localStorage。
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 隐私模式下 localStorage 可能不可写，忽略即可
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="切换主题（浅色 / 深色）"
      title="切换主题（浅色 / 深色）"
    >
      <Moon className="h-4 w-4 dark:hidden" />
      <Sun className="hidden h-4 w-4 dark:block" />
    </Button>
  );
}
