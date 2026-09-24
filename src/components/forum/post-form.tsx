"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import { createPost } from "@/app/actions/forum";
import { Button } from "@/components/ui/button";
import { EMPTY_FORUM_STATE } from "@/lib/validation/forum";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

/** 发新帖表单。成功后由服务端 action 直接跳转到帖子详情。 */
export function PostForm({
  chapterSlug,
  chapterTitle,
}: {
  chapterSlug?: string;
  chapterTitle?: string;
}) {
  const [state, action, pending] = useActionState(createPost, EMPTY_FORUM_STATE);
  const fe = state.fieldErrors ?? {};
  const ready = useHydrated();

  return (
    <form action={action} data-hydrated={ready ? "true" : undefined} className="space-y-3">
      {chapterSlug && (
        <p className="rounded-lg border border-primary/30 bg-primary-soft px-3 py-2 text-xs text-primary">
          这个帖子会关联到
          {chapterTitle ? `「${chapterTitle}」` : "该章节"}
        </p>
      )}
      {chapterSlug && <input type="hidden" name="chapterSlug" value={chapterSlug} />}

      <div>
        <label htmlFor="post-title" className="text-xs font-medium text-muted-foreground">
          标题
        </label>
        <input
          id="post-title"
          name="title"
          maxLength={80}
          placeholder="例如：printf 里 %d 和 %f 写反了会怎样？"
          aria-invalid={fe.title ? true : undefined}
          aria-describedby={fe.title ? "post-title-error" : undefined}
          className={cn(inputClass, "mt-1.5", fe.title && "border-danger")}
        />
        {fe.title && (
          <p id="post-title-error" className="mt-1 text-xs text-danger">
            {fe.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="post-body" className="text-xs font-medium text-muted-foreground">
          具体问题
        </label>
        <textarea
          id="post-body"
          name="body"
          rows={6}
          maxLength={8000}
          placeholder="把你试过的代码、看到的报错、以及你以为会发生什么写下来 —— 信息越全，越容易被答对。"
          aria-invalid={fe.body ? true : undefined}
          aria-describedby={fe.body ? "post-body-error" : undefined}
          className={cn(inputClass, "mt-1.5", fe.body && "border-danger")}
        />
        {fe.body && (
          <p id="post-body-error" className="mt-1 text-xs text-danger">
            {fe.body}
          </p>
        )}
      </div>

      {state.error && (
        <p
          role="alert"
          data-testid="form-error"
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending || !ready}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "发布中…" : "发布"}
      </Button>
    </form>
  );
}
