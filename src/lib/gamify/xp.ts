/**
 * 激励系统的纯函数：经验值、等级、连续打卡。
 *
 * 为什么全部做成纯函数：这些规则将来一定会调（加内容、改曲线、加徽章），
 * 而它们又是"看起来对但很容易差一两天"的那种逻辑（尤其是连续打卡）。
 * 纯函数 + 单测，改起来才敢改。
 */

/** 一节课给多少 XP：动手课比概念课值钱 */
export const LESSON_XP = { READING: 10, LAB: 20 } as const;

export function lessonXp(kind: "READING" | "LAB"): number {
  return LESSON_XP[kind];
}

/**
 * 升到第 n 级所需的**累计** XP：25 × (n-1) × n
 *
 *  1 级 0 · 2 级 50 · 3 级 150 · 4 级 300 · 5 级 500 · 6 级 750 · 10 级 2250
 *
 * 前几级很快（新手期要即时反馈），后面逐渐拉长（不然内容量撑不住）。
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * level;
}

/** 当前等级（满足累计门槛的最高一级） */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

/** 距离下一级还差多少 XP；已满级（这里不设上限，返回到下一级所需） */
export function xpToNextLevel(xp: number): { current: number; needed: number; level: number } {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - base, needed: next - base };
}

// ─────────────────────── 连续打卡 ───────────────────────

/**
 * 把时间点换算成「中国标准时间（UTC+8）的自然日」。
 *
 * ⚠️ 必须固定时区，不能用服务器的本地时区：Vercel 跑在 UTC，
 * 那样中国用户晚上 8 点之后的学习会被算到"第二天"，打卡会莫名其妙断掉。
 * 返回 'YYYY-MM-DD' 字符串，方便直接比较。
 */
export function dayKey(at: Date): string {
  const cn = new Date(at.getTime() + 8 * 60 * 60 * 1000);
  return cn.toISOString().slice(0, 10);
}

/** 两个日期间隔几天（按自然日算） */
export function daysBetween(fromKey: string, toKey: string): number {
  const a = Date.parse(`${fromKey}T00:00:00Z`);
  const b = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * 更新连续打卡天数。
 *
 *  - 今天已经打过卡（lastActiveDate 就是今天）→ 不变（幂等，同一天多次学习不重复累加）
 *  - 上次是昨天 → +1
 *  - 中间断过（或从没打过）→ 重置为 1
 */
export function nextStreak(params: {
  lastActiveDate: string | null;
  todayKey: string;
  current: number;
  best: number;
}): { current: number; best: number; isNewDay: boolean } {
  const { lastActiveDate, todayKey, current, best } = params;

  if (lastActiveDate === todayKey) {
    return { current, best, isNewDay: false };
  }

  const gap = lastActiveDate === null ? Number.POSITIVE_INFINITY : daysBetween(lastActiveDate, todayKey);
  const next = gap === 1 ? current + 1 : 1;

  return { current: next, best: Math.max(best, next), isNewDay: true };
}

// ─────────────────────── 徽章 ───────────────────────

export type BadgeCode =
  | "first-run"
  | "first-lesson"
  | "chapter-1-done"
  | "streak-3"
  | "streak-7"
  | "xp-500"
  | "quiz-perfect-10";

export type BadgeDef = {
  code: BadgeCode;
  name: string;
  description: string;
};

/** 徽章定义写在代码里，数据库只记「谁在什么时候拿到了哪个」 */
export const BADGES: BadgeDef[] = [
  { code: "first-run", name: "第一个程序跑通了", description: "在练习场成功运行了第一段 C 代码" },
  { code: "first-lesson", name: "开张", description: "完成第一节讲义" },
  { code: "chapter-1-done", name: "第 1 章通关", description: "完成第 1 章的全部课时" },
  { code: "streak-3", name: "连学三天", description: "连续 3 天学习" },
  { code: "streak-7", name: "连学一周", description: "连续 7 天学习" },
  { code: "xp-500", name: "500 XP", description: "累计获得 500 经验值" },
  { code: "quiz-perfect-10", name: "十连对", description: "连续 10 道题一次通过" },
];

export const BADGE_BY_CODE = new Map(BADGES.map((b) => [b.code, b]));

/** 根据当前状态算出「应该拥有哪些徽章」——纯函数，方便单测与重算 */
export function earnedBadges(state: {
  lessonsDone: number;
  chaptersFullyDone: number[];
  streakCurrent: number;
  xp: number;
}): BadgeCode[] {
  const out: BadgeCode[] = [];
  if (state.lessonsDone >= 1) out.push("first-lesson");
  if (state.chaptersFullyDone.includes(1)) out.push("chapter-1-done");
  if (state.streakCurrent >= 3) out.push("streak-3");
  if (state.streakCurrent >= 7) out.push("streak-7");
  if (state.xp >= 500) out.push("xp-500");
  return out;
}
