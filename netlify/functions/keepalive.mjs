/**
 * Supabase 保活定时任务（Netlify Scheduled Function）。
 *
 * ## 为什么是这样一个「自己调自己」的壳
 *
 * Netlify 的 Next.js 运行时（v5，OpenNext）**不再支持** Next.js 的
 * `export const config = { type: "experimental-scheduled" }` 那套 API route 写法
 * —— 官方迁移指南明确要求改用普通 Netlify Function：
 * https://github.com/netlify/next-scheduled-bg-function-migration
 *
 * 而真正读真实表的逻辑在 `src/app/api/keepalive/route.ts`（Next.js 侧，
 * 那里能直接 import Prisma）。所以这里只做一件事：按点把那个端点叫一遍。
 * 好处是顺便验证了「函数 → 站点 → Prisma → Supavisor pooler → 真实表」整条链路。
 *
 * 调度表达式在 netlify.toml 的 `[functions.keepalive]` 里，按 UTC 解释。
 * 定时函数只在**正式发布（production）的部署**上触发，deploy preview 不会跑。
 *
 * ## 手动验证
 *
 *   netlify functions:invoke keepalive --prod
 *
 * 本地不需要这个壳：`scripts/supabase-keepalive.mjs` 直连数据库，更直接。
 */

const handler = async () => {
  // Netlify 在函数运行时注入 URL（站点主域名）；本地/预览兜底到部署域名。
  const base =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://c-study-room.netlify.app";

  const url = new URL("/api/keepalive", base).toString();

  const headers = {};
  if (process.env.CRON_SECRET) {
    headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
  }

  const res = await fetch(url, { headers, cache: "no-store" });
  const body = (await res.text()).slice(0, 800);

  if (!res.ok) {
    // 显式抛错 → Netlify 会把它记成失败的函数调用，而不是静默通过。
    // 保活任务最怕的就是「静默失效」：数据库被暂停了却没人知道。
    throw new Error(`[keepalive] ${url} → HTTP ${res.status} ${body}`);
  }

  console.log(`[keepalive] OK ${url} → ${res.status} ${body}`);
};

export default handler;
