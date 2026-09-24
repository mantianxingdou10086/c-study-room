/**
 * 时间格式化（统一按中国时区 UTC+8）。
 *
 * 为什么不用 `toLocaleString()`：它取决于**服务器**的时区 ——
 * 本地是 +8、Vercel 是 UTC，同一个帖子在两处显示的时间会差 8 小时，
 * 而且这种 bug 只在部署后才出现，本地永远复现不了。
 * 所以固定偏移，不依赖运行环境。
 */
const CN_OFFSET_MS = 8 * 60 * 60 * 1000;

export function formatDateTime(at: Date): string {
  const cn = new Date(at.getTime() + CN_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${cn.getUTCFullYear()}-${p(cn.getUTCMonth() + 1)}-${p(cn.getUTCDate())} ${p(
    cn.getUTCHours(),
  )}:${p(cn.getUTCMinutes())}`;
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 具体日期 */
export function relativeTime(at: Date, now: Date = new Date()): string {
  const diff = now.getTime() - at.getTime();
  if (diff < 60_000) return "刚刚";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return formatDateTime(at).slice(0, 10);
}
