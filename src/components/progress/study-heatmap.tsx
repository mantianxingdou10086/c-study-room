import { dayKey } from "@/lib/gamify/xp";
import { cn } from "@/lib/utils";

/**
 * 学习热力图（最近 12 周）。
 *
 * 服务端渲染，零客户端 JS。
 *
 * 无障碍：热力图是**纯颜色编码**，读屏软件读不出来，所以整块标成 `role="img"` +
 * 一句汇总的 aria-label，格子本身 aria-hidden；同时下面给一句文字总结。
 * 这是热力图这类可视化的标准做法（GitHub 的贡献图也是这样）。
 */
const WEEKS = 12;
const CELL = "h-3 w-3 rounded-[3px]";

/**
 * 生成热力图的日期网格（纯函数，单独可测）。
 *
 * 这个函数被写错过一次，而且错得很隐蔽：当时是"把游标退到本周周一，再往前铺 84 格"，
 * 结果网格的最后一格是本周周一 —— **今天根本不在网格里**，界面显示"0 天有学习记录"，
 * 但汇总里的 XP 又是对的（因为汇总来自原始数据，不走网格）。
 *
 * 正确做法：从**本周周一往前推 (weeks-1) 周**开始，铺 weeks*7 格，
 * 这样最后一格是本周周日，今天必然落在网格内。
 */
export function buildHeatmapGrid(
  todayKey: string,
  weeks = WEEKS,
): { key: string; inFuture: boolean }[] {
  const monday = new Date(`${todayKey}T00:00:00.000Z`);
  const dow = (monday.getUTCDay() + 6) % 7; // 周一=0
  monday.setUTCDate(monday.getUTCDate() - dow); // 退到本周周一
  monday.setUTCDate(monday.getUTCDate() - (weeks - 1) * 7); // 再往前 (weeks-1) 周

  const out: { key: string; inFuture: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, inFuture: key > todayKey });
  }
  return out;
}

/** 颜色深浅按当天的 XP 分档；不依赖色相，只用同一主色的透明度 */
function levelOf(xp: number): 0 | 1 | 2 | 3 {
  if (xp <= 0) return 0;
  if (xp < 10) return 1;
  if (xp < 30) return 2;
  return 3;
}

const LEVEL_CLASS = {
  0: "bg-surface-muted border border-border",
  1: "bg-primary/25",
  2: "bg-primary/55",
  3: "bg-primary/90",
} as const;

export function StudyHeatmap({
  activity,
}: {
  activity: { date: Date; xpEarned: number; minutes: number; lessonsDone: number; exercisesDone: number }[];
}) {
  const byDay = new Map(
    activity.map((a) => [dayKey(a.date), a]),
  );

  // 从"今天"往前铺 12 周，按周一对齐（列=周，行=周一~周日）
  const todayKey = dayKey(new Date());
  const days = buildHeatmapGrid(todayKey, WEEKS);

  const activeDays = days.filter((d) => !d.inFuture && (byDay.get(d.key)?.xpEarned ?? 0) > 0).length;
  const totalXp = activity.reduce((s, a) => s + a.xpEarned, 0);
  const totalMinutes = activity.reduce((s, a) => s + a.minutes, 0);

  // 不足 1 小时就说分钟 —— "约 0 小时"这种说法很别扭
  const timeText =
    totalMinutes >= 60
      ? `${Math.round(totalMinutes / 60)} 小时`
      : `${totalMinutes} 分钟`;
  const summary = `最近 ${WEEKS} 周：${activeDays} 天有学习记录，共 ${totalXp} XP、${timeText}`;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">学习热力图</h2>
        <span className="text-xs text-muted-foreground">最近 {WEEKS} 周</span>
      </div>

      <div className="mt-4 flex gap-3">
        {/* 星期标签 */}
        <div className="flex flex-col gap-[3px] pt-[2px] text-[9px] leading-3 text-subtle-foreground">
          <span className="h-3">一</span>
          <span className="h-3" />
          <span className="h-3">三</span>
          <span className="h-3" />
          <span className="h-3">五</span>
          <span className="h-3" />
          <span className="h-3">日</span>
        </div>

        <div
          role="img"
          aria-label={summary}
          className="grid grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto"
        >
          {days.map(({ key, inFuture }) => {
            const row = byDay.get(key);
            const xp = row?.xpEarned ?? 0;
            return (
              <span
                key={key}
                aria-hidden="true"
                title={
                  inFuture
                    ? ""
                    : `${key}：${xp} XP${row?.lessonsDone ? ` · ${row.lessonsDone} 节课` : ""}${
                        row?.exercisesDone ? ` · ${row.exercisesDone} 道题` : ""
                      }`
                }
                className={cn(CELL, inFuture ? "bg-transparent" : LEVEL_CLASS[levelOf(xp)])}
              />
            );
          })}
        </div>
      </div>

      {/* 文字总结（读屏可读，也让人不用数格子） */}
      <p className="mt-3 text-xs text-muted-foreground">{summary}</p>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-subtle-foreground">
        <span>少</span>
        <span className={cn(CELL, LEVEL_CLASS[0])} />
        <span className={cn(CELL, LEVEL_CLASS[1])} />
        <span className={cn(CELL, LEVEL_CLASS[2])} />
        <span className={cn(CELL, LEVEL_CLASS[3])} />
        <span>多</span>
      </div>
    </section>
  );
}
