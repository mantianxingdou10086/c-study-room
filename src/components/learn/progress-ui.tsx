"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Circle, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress";
import { recordLessonVisit } from "@/app/actions/progress";
import type { ProgressSnapshot } from "@/lib/progress";

/**
 * 进度数据的客户端容器。
 *
 * 整个页面只发**一次**请求（`/api/progress`），所有小标记（勾、X/Y 节、继续学习）
 * 都从这个 context 取 —— 否则课程地图会变成每章一个请求。
 * 页面本身保持静态生成，进度在客户端异步补上。
 */
type ProgressContextValue = {
  snapshot: ProgressSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** 本地先改，界面立刻响应（服务端已经写成功了） */
  applyLocalDone: (lessonId: string, done: boolean) => void;
};

const ProgressContext = React.createContext<ProgressContextValue | null>(null);

/** 拉一次快照。抽成模块级函数，effect 与手动刷新共用，避免两处各写一遍 fetch */
async function fetchSnapshot(): Promise<ProgressSnapshot | null> {
  try {
    const r = await fetch("/api/progress", { cache: "no-store" });
    return r.ok ? ((await r.json()) as ProgressSnapshot) : null;
  } catch {
    return null;
  }
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<ProgressSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setSnapshot(await fetchSnapshot());
    setLoading(false);
  }, []);

  // 注意：这里直接内联 fetch，**不要**写成 effect 里调 refresh()——
  // 那会触发 react-hooks/set-state-in-effect 规则（它把 refresh 里的 setState
  // 当成"effect 里同步 setState"）。把 setState 放进 .then 回调就没事。
  React.useEffect(() => {
    let cancelled = false;
    fetchSnapshot().then((data) => {
      if (cancelled) return;
      setSnapshot(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyLocalDone = React.useCallback((lessonId: string, done: boolean) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.doneLessons);
      if (done) set.add(lessonId);
      else set.delete(lessonId);
      return { ...prev, doneLessons: [...set] };
    });
  }, []);

  const value = React.useMemo(
    () => ({ snapshot, loading, refresh, applyLocalDone }),
    [snapshot, loading, refresh, applyLocalDone],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = React.useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress 必须在 ProgressProvider 内使用");
  return ctx;
}

/** 课时行末尾的完成标记（未登录时不渲染，避免占位） */
export function LessonDoneMark({ lessonId }: { lessonId: string }) {
  const { snapshot, loading } = useProgress();
  if (loading || !snapshot?.signedIn) return null;
  const done = snapshot.doneLessons.includes(lessonId);

  return (
    <span
      aria-label={done ? "已完成" : "未完成"}
      title={done ? "已完成" : "未完成"}
      className={cn(
        "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
        done
          ? "border-success/40 bg-success-soft text-success"
          : "border-border text-subtle-foreground",
      )}
    >
      {done ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
    </span>
  );
}

/**
 * 记录「来过这一节」的足迹（不标记完成）。
 *
 * 「继续上次学习」靠的就是这个：只有留下 IN_PROGRESS 记录，课程地图才知道该续哪一节。
 * 服务端那边是幂等的（已有记录就不再写库），所以每次进页面调一次没有负担。
 * 登录后才上报；未登录时什么都不做。
 */
export function RecordLessonVisit({
  chapterSlug,
  lessonSlug,
}: {
  chapterSlug: string;
  lessonSlug: string;
}) {
  const { snapshot, loading } = useProgress();
  const sent = React.useRef(false);

  React.useEffect(() => {
    if (loading || sent.current) return;
    if (!snapshot?.signedIn) return;
    sent.current = true;
    void recordLessonVisit({ chapterSlug, lessonSlug });
  }, [loading, snapshot?.signedIn, chapterSlug, lessonSlug]);

  return null;
}

/** 章节卡片上的环形进度（真实进度；未登录时显示 0，和静态占位一致） */
export function ChapterRing({
  chapterSlug,
  total,
  size = 48,
  className,
}: {
  chapterSlug: string;
  total: number;
  size?: number;
  className?: string;
}) {
  const { snapshot, loading } = useProgress();
  const row = snapshot?.chapters.find((c) => c.slug === chapterSlug);
  const denom = Math.max(row?.total ?? total, 1);
  return (
    <ProgressRing
      value={loading ? 0 : (row?.done ?? 0)}
      total={denom}
      size={size}
      className={className}
    />
  );
}

/** 章节卡片上的「已完成 X/Y 节」 */
export function ChapterProgressLine({ chapterSlug }: { chapterSlug: string }) {
  const { snapshot, loading } = useProgress();
  if (loading || !snapshot?.signedIn) return null;

  const row = snapshot.chapters.find((c) => c.slug === chapterSlug);
  if (!row || row.total === 0) return null;
  const all = row.done === row.total;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        all ? "text-success" : "text-muted-foreground",
      )}
    >
      {all && <Check className="h-3.5 w-3.5" />}
      已完成 {row.done}/{row.total} 节
    </span>
  );
}

/** 「继续上次学习」：有未完成的足迹时才出现 */
export function ResumeButton({ className }: { className?: string }) {
  const { snapshot, loading } = useProgress();
  if (loading || !snapshot?.signedIn || !snapshot.resume) return null;

  // lessonId 形如 "ch01-introducing-c/why-c"
  const [chapterSlug, lessonSlug] = snapshot.resume.lessonId.split("/");
  if (!chapterSlug || !lessonSlug) return null;

  return (
    <Link
      href={`/learn/${chapterSlug}/${lessonSlug}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover",
        className,
      )}
    >
      <Play className="h-4 w-4" />
      继续上次学习
    </Link>
  );
}

/** 徽章墙（设置页/进度页用） */
export function BadgeStrip() {
  const { snapshot, loading } = useProgress();
  if (loading || !snapshot?.signedIn) return null;
  if (snapshot.badges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        还没有徽章。完成第一节课就会拿到第一枚。
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {snapshot.badges.map((b) => (
        <span
          key={b.code}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {b.code}
        </span>
      ))}
    </div>
  );
}
