import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "danger" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground border-border",
  primary: "bg-primary-soft text-primary border-primary/25",
  success: "bg-success-soft text-success border-success/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  warning: "bg-warning-soft text-warning border-warning/25",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-xs font-medium leading-5",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
