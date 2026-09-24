import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 404 页。
 *
 * 比"页面不存在"更有用的做法：**给三条明确的出路** ——
 * 刚学的人多半是输错了讲义地址或点了个过期链接，直接把他送回课程地图，
 * 而不是让他自己找回去。
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start px-4 py-20">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Compass className="h-4 w-4" />
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        这个地址没有对应的页面
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        可能是链接过期了，或者讲义地址打错了。讲义地址长这样：
        <code className="mx-1 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
          /learn/ch01-introducing-c/why-c
        </code>
        ——章节名和课时名都要对。
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/learn">
            <ArrowLeft className="h-4 w-4" />
            去课程地图
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/exercises">去题库</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">回首页</Link>
        </Button>
      </div>
    </div>
  );
}
