import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 进度条。value/total 为 0 时也渲染一条空槽，避免"看起来没加载"。
 */
export function Progress({
  value,
  total = 100,
  className,
  showLabel = false,
  label,
}: {
  value: number;
  total?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
}) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.max(0, (value / total) * 100));
  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "完成进度"}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken border border-border"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {value} / {total}
        </p>
      )}
    </div>
  );
}

/** 环形进度（用于章节卡） */
export function ProgressRing({
  value,
  total = 100,
  size = 44,
  strokeWidth = 4,
  className,
}: {
  value: number;
  total?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.max(0, (value / total) * 100));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("-rotate-90", className)}
      role="img"
      aria-label={`完成 ${Math.round(pct)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (pct / 100) * c}
      />
    </svg>
  );
}
