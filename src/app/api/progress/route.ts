import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadProgressSnapshot } from "@/lib/progress";

/**
 * 当前用户的学习进度快照。
 *
 * 为什么要一个 API 而不是在页面里 `await auth()`：
 * 课程地图和讲义页都要显示进度，但在页面里读会话会让它们变成**动态渲染**，
 * 丢掉静态生成（讲义页有 15 个静态页）。放客户端异步取，页面就能继续静态生成。
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const snapshot = await loadProgressSnapshot(session?.user?.id);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
