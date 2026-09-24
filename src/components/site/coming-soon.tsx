import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 未实现页面的占位。明确写"什么时候来"，比一个空白页友好。
 */
export function ComingSoon({
  title,
  milestone,
  description,
}: {
  title: string;
  milestone: string;
  description: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Construction className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <p className="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-xs text-muted-foreground">
            计划在 <span className="font-medium text-foreground">{milestone}</span> 交付
          </p>
          <div className="flex gap-2 pt-1">
            <Button asChild variant="secondary" size="sm">
              <Link href="/">回到首页</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/playground">先去练习场写点 C</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
