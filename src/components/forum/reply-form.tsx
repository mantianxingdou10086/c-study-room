"use client";

import * as React from "react";
import { CornerDownRight, Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import { createReply } from "@/app/actions/forum";
import { Button } from "@/components/ui/button";
import { EMPTY_FORUM_STATE } from "@/lib/validation/forum";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

/**
 * 回复框。
 *
 * 同一个组件两种用法：
 *  - 页面底部：顶层回复（不传 parentId）
 *  - 某条回复下面：楼中楼（传 parentId，默认折叠在"回复"按钮后）
 * 折叠是为了让楼层列表保持可读 —— 每条都展开一个输入框会很吵。
 */
export function ReplyForm({
  postId,
  parentId,
  variant = "top",
  autoFocus = false,
}: {
  postId: string;
  parentId?: string;
  variant?: "top" | "inline";
  autoFocus?: boolean;
}) {
  const [state, action, pending] = useActionState(createReply, EMPTY_FORUM_STATE);
  const [open, setOpen] = React.useState(variant === "top");
  const fe = state.fieldErrors ?? {};
  const ready = useHydrated();

  if (variant === "inline" && !open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="mt-2 h-7 px-2 text-xs"
      >
        <CornerDownRight className="h-3.5 w-3.5" />
        回复这条
      </Button>
    );
  }

  return (
    <form
      action={action}
      data-hydrated={ready ? "true" : undefined}
      className={cn("space-y-2", variant === "inline" && "mt-2")}
    >
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}

      <label htmlFor={`reply-${parentId ?? "top"}`} className="sr-only">
        {parentId ? "回复这条" : "写回复"}
      </label>
      <textarea
        id={`reply-${parentId ?? "top"}`}
        name="body"
        rows={variant === "top" ? 4 : 3}
        maxLength={4000}
        autoFocus={autoFocus}
        placeholder={
          parentId
            ? "回复这条…"
            : "想补充什么、或者有别的解法？贴代码请用三个反引号包起来。"
        }
        aria-invalid={fe.body ? true : undefined}
        className={cn(
          "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20",
          fe.body && "border-danger",
        )}
      />
      {fe.body && <p className="text-xs text-danger">{fe.body}</p>}
      {state.error && (
        <p role="alert" data-testid="form-error" className="text-xs text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !ready}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {pending ? "提交中…" : "回复"}
        </Button>
        {variant === "inline" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8"
          >
            取消
          </Button>
        )}
      </div>
    </form>
  );
}
