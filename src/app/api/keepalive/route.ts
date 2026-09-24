import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Supabase 保活端点（同时兼作健康检查）。
 *
 * ## 为什么需要它
 * Supabase 免费版项目的暂停规则（官方原文）：
 *
 * > A Free plan project is considered inactive if it does not receive sufficient
 * > **user database activity** over the past week. Typically **a few user requests
 * > to the database each day** over the previous week is enough to keep the project
 * > from being paused.
 *
 * 三个容易踩空的点：
 *   1. 关键词是 **database activity**。ping 首页、ping `/auth/v1/health`、
 *      ping 任何不碰数据库的端点**都不算**。社区里有人每天 500~700 次 API 请求
 *      仍被暂停，就是因为那些请求没打到数据库。
 *   2. `SELECT 1` 也未必够 —— 它不触达任何用户表。所以这里读**真实表**。
 *   3. 光靠这一层不够：Vercel Hobby 的 cron **每天只能跑一次**，
 *      所以本机还有一层高频补强（`scripts/supabase-keepalive.mjs`）。
 *
 * ## 鉴权
 * 设了 `CRON_SECRET` 环境变量时，要求 `Authorization: Bearer <CRON_SECRET>`。
 * Vercel Cron 会自动带上这个头（官方约定），所以云端定时调用无需额外配置。
 * 未设 `CRON_SECRET` 时放行 —— 方便外部 uptime 监控接入，也避免
 * "密钥配错 → cron 静默 401 → 保活失效"这种最难查的故障。
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const provided = request.headers.get("authorization");
    if (provided !== `Bearer ${secret}`) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const startedAt = Date.now();

  try {
    /**
     * 读真实表 —— 这才是 Supabase 认定的 "user database activity"。
     * 同时顺手验证 Prisma → Supavisor pooler(6543) 这条链路是活的。
     */
    const [users, posts, progress] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.lessonProgress.count(),
    ]);

    return NextResponse.json(
      {
        ok: true,
        at: new Date().toISOString(),
        ms: Date.now() - startedAt,
        db: { users, posts, progress },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    /**
     * 数据库挂了要显式 503，不能吞成 200 —— 否则监控看不出区别，
     * 而且 Supabase 恢复前这个端点会一直"绿"。
     */
    return NextResponse.json(
      {
        ok: false,
        at: new Date().toISOString(),
        ms: Date.now() - startedAt,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
