import { Lock, Sparkles } from "lucide-react";
import { BADGES } from "@/lib/gamify/xp";
import { cn } from "@/lib/utils";

/**
 * 徽章墙。
 *
 * 设计取向：**没拿到的徽章也要显示**，并写清解锁条件 ——
 * 只显示已获得的会让人以为"就这么几个"，把未解锁的摆出来才有目标感。
 * 服务端渲染，不需要客户端 JS。
 */
export function BadgeWall({
  earned,
}: {
  earned: { code: string; awardedAt: Date }[];
}) {
  const earnedMap = new Map(earned.map((b) => [b.code, b.awardedAt]));
  const gotCount = BADGES.filter((b) => earnedMap.has(b.code)).length;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          徽章
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {gotCount} / {BADGES.length}
        </span>
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {BADGES.map((badge) => {
          const at = earnedMap.get(badge.code);
          const got = Boolean(at);
          return (
            <li
              key={badge.code}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3.5 py-3",
                got
                  ? "border-primary/30 bg-primary-soft"
                  : "border-border bg-surface-muted/50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                  got ? "bg-primary text-primary-foreground" : "bg-surface-muted text-subtle-foreground",
                )}
              >
                {got ? (
                  <Sparkles className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    got ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {badge.name}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-subtle-foreground">
                  {badge.description}
                </p>
                {at && (
                  <p className="mt-1 text-[11px] tabular-nums text-success">
                    {at.toISOString().slice(0, 10)} 获得
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
