"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { acceptReply } from "@/app/actions/forum";
import { Button } from "@/components/ui/button";

/** 采纳某条回复（只有楼主会看到这个按钮，权限在服务端再判一次） */
export function AcceptReplyButton({ replyId }: { replyId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const r = await acceptReply(replyId);
      if (!r.ok) setError(r.error ?? "操作失败");
      else router.refresh();
    } catch {
      setError("网络出问题了，稍后再试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={onClick} disabled={pending}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        采纳为答案
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
