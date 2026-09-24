"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { setLessonDone } from "@/app/actions/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProgress } from "./progress-ui";

/**
 * 「标记本课已学完」。
 *
 * 未登录时不显示按钮，而是给一句明确的引导 —— 这样用户不会点了没反应
 * 才意识到要登录（进度必须存在服务器上，匿名没法存）。
 */
export function LessonCompleteButton({
  chapterSlug,
  lessonSlug,
  lessonId,
}: {
  chapterSlug: string;
  lessonSlug: string;
  lessonId: string;
}) {
  const { snapshot, loading, applyLocalDone } = useProgress();
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // 记一下进入这一页的时间，用来上报"停留时长"。
  // 不能在 useRef(Date.now()) 里直接取：那是渲染期调用不纯函数（React 19 的 purity 规则会拦），
  // 而且并发渲染下可能被调用多次。放 effect 里赋值才是对的。
  const enteredAt = React.useRef<number | null>(null);
  React.useEffect(() => {
    enteredAt.current = Date.now();
  }, []);

  if (loading) {
    return <div className="h-10" aria-hidden />;
  }

  if (!snapshot?.signedIn) {
    return (
      <div className="rounded-xl border border-border bg-surface-muted/60 px-3.5 py-3 text-sm">
        <p className="text-muted-foreground">
          登录后可以把「学完了」存到服务器上，换设备也还在。
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-2.5">
          <Link href="/login">去登录</Link>
        </Button>
      </div>
    );
  }

  const done = snapshot.doneLessons.includes(lessonId);

  async function toggle() {
    setPending(true);
    setError(null);
    setMessage(null);
    const since = enteredAt.current;
    const secondsSpent = since ? Math.round((Date.now() - since) / 1000) : 0;
    try {
      const res = await setLessonDone({
        chapterSlug,
        lessonSlug,
        done: !done,
        secondsSpent,
      });
      if (!res.ok) {
        setError(res.error ?? "操作失败，请稍后再试");
        return;
      }
      applyLocalDone(lessonId, !done);

      if (done) {
        setMessage("已取消完成标记（XP 不会追回）");
      } else if (res.xpGained) {
        const bits = [`+${res.xpGained} XP`];
        if (res.level) bits.push(`等级 ${res.level}`);
        if (res.streak) bits.push(`连续 ${res.streak} 天`);
        if (res.newBadges?.length) {
          bits.push(`新徽章「${res.newBadges.map((b) => b.name).join("、")}」`);
        }
        setMessage(bits.join(" · "));
      } else {
        setMessage("已记录（这一节的 XP 之前已经发过了）");
      }
    } catch {
      setError("网络出问题了，稍后再试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant={done ? "secondary" : "primary"}
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={toggle}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : done ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {pending ? "记录中…" : done ? "已完成（点此取消）" : "标记本课已学完"}
      </Button>

      {message && (
        <p
          role="status"
          className={cn(
            "mt-2 rounded-lg border px-3 py-2 text-xs",
            "border-success/30 bg-success-soft text-success",
          )}
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
