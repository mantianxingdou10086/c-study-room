import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名，后面的覆盖前面的同类属性 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 把秒数格式化成"12 分钟""1 小时 5 分"这种小白看得懂的写法 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} 秒`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} 小时` : `${h} 小时 ${rest} 分`;
}

/** 站点名（多处复用，改这里即可） */
export const SITE_NAME = "一个普通的 C 语言自习室";
export const SITE_TAGLINE = "跟着 K.N.King 的思路，从零把 C 语言啃下来";
