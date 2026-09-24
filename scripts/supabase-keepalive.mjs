#!/usr/bin/env node
/**
 * Supabase 免费版保活 —— 本机高频层。
 *
 * ## 为什么需要两层
 * Supabase 免费版项目闲置 1 周即被暂停，判定依据是 **user database activity**
 * （官方文档原文，见 src/app/api/keepalive/route.ts 顶部注释）。
 * 云端那层是 Vercel Cron 打 `/api/keepalive`，但 **Vercel Hobby 的 cron
 * 每天只能跑一次**（更密的表达式会直接部署失败），而且它依赖 Vercel 侧一切正常。
 * 所以本机再加一层：每 8 小时直连 Supabase 读一次真实表。
 *
 * 两层是**互补**的，不是冗余：
 *   - 你电脑关机/放假回家 → 云端那层继续保活
 *   - Vercel cron 配错、被暂停、构建失败 → 本机这层继续保活
 *
 * ## 设计要点
 *   - **必须读真实表**。`SELECT 1` 不触达用户表，未必算 activity；
 *     ping 健康检查端点更是完全不算。社区里有人每天 500~700 次 API 请求
 *     仍被暂停，就是因为那些请求没打到数据库。
 *   - **走和线上同一条链路**：Supavisor pooler(6543) + ssl rejectUnauthorized:false
 *     （与 src/lib/db.ts 一致）。这样这个脚本顺带也是生产链路的心跳探测。
 *   - **静默成功**：成功时不输出任何东西（配合 Hermes cronjob 的
 *     no_agent 模式 = 无事发生就不打扰你）。失败才出声。
 *
 * ## 用法
 *   node scripts/supabase-keepalive.mjs             # 静默；仅失败时输出
 *   node scripts/supabase-keepalive.mjs --verbose   # 无论成败都打印状态
 *   node scripts/supabase-keepalive.mjs --weekly    # 周一额外报一次平安（cronjob 用）
 */

import { readFileSync } from "node:fs";
import { Client } from "pg";

const VERBOSE = process.argv.includes("--verbose");
const WEEKLY = process.argv.includes("--weekly");

/**
 * 从 .env.local 取值。
 *
 * ⚠️ 不用 `source .env.local`：连接串里的密码可能含 `$`、反引号等，
 * bash 会在双引号里做展开，静默改坏连接串（然后表现为莫名其妙的认证失败）。
 * 这里按 KEY=VALUE 精确切分，只去掉最外层成对的引号，不做任何展开。
 */
function readEnvLocal(key) {
  let raw;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return undefined;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m || m[1] !== key) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
      (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return undefined;
}

const connectionString = process.env.DATABASE_URL ?? readEnvLocal("DATABASE_URL");

if (!connectionString) {
  console.error(
    "[keepalive] 找不到 DATABASE_URL（环境变量和 web/.env.local 里都没有），无法保活。",
  );
  process.exit(1);
}

/**
 * 真实表读取。三个计数各走一次查询，确保确实触达用户表。
 * 表名是 Prisma 默认的模型名（schema.prisma 里没有 @@map），所以要加双引号。
 */
const QUERY = `
  SELECT
    (SELECT count(*) FROM "User")           AS users,
    (SELECT count(*) FROM "Post")           AS posts,
    (SELECT count(*) FROM "LessonProgress") AS progress
`;

const client = new Client({
  connectionString,
  // 与 src/lib/db.ts 保持一致：Supabase pooler 证书链含自签根，Node 信任库不认。
  ssl: { rejectUnauthorized: false },
  // 保活不需要长连接，早点放弃，避免挂住 cron。
  connectionTimeoutMillis: 15_000,
  statement_timeout: 15_000,
});

const isMonday = new Date().getUTCDay() === 1;

try {
  await client.connect();
  const { rows } = await client.query(QUERY);
  const r = rows[0] ?? {};

  if (VERBOSE || (WEEKLY && isMonday)) {
    console.log(
      `[keepalive] OK  ${new Date().toISOString()}  ` +
        `users=${r.users} posts=${r.posts} progress=${r.progress}`,
    );
  }
  // 成功且非 verbose/非周一 → 不输出任何东西 = Hermes 静默，不打扰。
} catch (e) {
  console.error(
    `[keepalive] 失败 ${new Date().toISOString()}\n` +
      `  ${e instanceof Error ? e.message : String(e)}\n` +
      `  影响：Supabase 免费版项目若持续 7 天无数据库活动会被暂停，\n` +
      `        届时线上讨论区/进度/登录全部报错。`,
  );
  process.exitCode = 1;
} finally {
  // 连不上时 close() 也可能抛，吞掉——真正的原因已经在上面报过了。
  await client.end().catch(() => {});
}
