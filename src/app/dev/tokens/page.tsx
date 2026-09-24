import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, ProgressRing } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "设计令牌自检",
  robots: { index: false, follow: false },
};

/**
 * M0.3 的验收页：把按钮/卡片/徽章/进度条的全部状态渲染一遍，
 * 人工确认配色是蓝灰冷色调、默认浅色、深色可切换。
 * M8 清理阶段会删掉这个页面。
 */
export default function TokensPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">设计令牌自检</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          蓝 + 灰冷色调，默认浅色。全站唯一暖色是「警告」（只用于提示/错题）。
          点右上角月亮图标可切深色，两个主题都要看一遍。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>按钮</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button>主要按钮</Button>
          <Button variant="secondary">次要按钮</Button>
          <Button variant="ghost">幽灵按钮</Button>
          <Button variant="success">通过</Button>
          <Button variant="danger">错误</Button>
          <Button disabled>禁用</Button>
          <Button size="sm">小号</Button>
          <Button size="lg">大号</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>徽章 / 标签</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge>中性</Badge>
          <Badge tone="primary">阶段 1</Badge>
          <Badge tone="success">已通过</Badge>
          <Badge tone="warning">提示</Badge>
          <Badge tone="danger">编译错误</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress value={0} total={10} showLabel />
          <Progress value={3} total={10} showLabel />
          <Progress value={10} total={10} showLabel />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <ProgressRing value={0} total={10} />
              <span className="text-sm text-muted-foreground">未开始</span>
            </div>
            <div className="flex items-center gap-3">
              <ProgressRing value={6} total={10} />
              <span className="text-sm text-muted-foreground">进行中</span>
            </div>
            <div className="flex items-center gap-3">
              <ProgressRing value={10} total={10} />
              <span className="text-sm text-muted-foreground">已完成</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>文字层级</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold tracking-tight">一级标题 28px</p>
          <p className="text-base font-semibold">二级标题 16px</p>
          <p className="text-sm">正文 14px：这段是正文，用的是 --foreground。</p>
          <p className="text-sm text-muted-foreground">
            次要文字 14px：用于说明、辅助信息。
          </p>
          <p className="text-xs text-subtle-foreground">最弱文字 12px：时间戳一类。</p>
          <p className="font-mono text-sm">printf(&quot;%d\n&quot;, 42);</p>
        </CardContent>
      </Card>
    </div>
  );
}
