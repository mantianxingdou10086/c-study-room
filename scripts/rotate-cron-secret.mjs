/**
 * 轮换 CRON_SECRET（保活端点 /api/keepalive 的口令）。
 *
 * 为什么要写成脚本：这个值散落在四个地方，手改必漏一个，而漏掉的表现是
 * **静默失效** —— 定时任务 401 了但没人知道，等发现时 Supabase 已经被暂停：
 *   1. `.env.local`          （本机 / 本地开发）
 *   2. Netlify 环境变量       （主力云端定时函数 → /api/keepalive）
 *   3. Vercel 环境变量 + 重新部署（备胎 Cron → /api/keepalive）
 *   4. 本机 Hermes cronjob    （直连数据库，**不用**这个口令，无需处理）
 *
 * 改完 .env.local 后还要跑：
 *   node scripts/push-netlify-env.mjs
 *   node scripts/push-vercel-env.mjs && vercel --prod   # 备胎也要重新部署才生效
 *
 * 用法：
 *   node scripts/rotate-cron-secret.mjs          # 生成新值并写回 .env.local
 *   node scripts/rotate-cron-secret.mjs --show   # 额外打印新值（默认只打印 sha1）
 */

import { randomBytes, createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_FILE = resolve(process.cwd(), ".env.local");
const KEY = "CRON_SECRET";

if (!existsSync(ENV_FILE)) {
  console.error(`✗ 找不到 ${ENV_FILE}`);
  process.exit(1);
}

const secret = randomBytes(32).toString("hex");
const before = readFileSync(ENV_FILE, "utf8");

/** 只替换 `CRON_SECRET=` 这一行，其余内容（含注释、空行）原样保留。 */
const after = new RegExp(`^${KEY}=.*$`, "m").test(before)
  ? before.replace(new RegExp(`^${KEY}=.*$`, "m"), `${KEY}=${secret}`)
  : `${before.replace(/\s*$/, "")}\n${KEY}=${secret}\n`;

writeFileSync(ENV_FILE, after, "utf8");

const fp = createHash("sha1").update(secret).digest("hex").slice(0, 12);
console.log(`✓ 已轮换 ${KEY}`);
console.log(`  写入: ${ENV_FILE}`);
console.log(`  长度: ${secret.length}  指纹: sha1=${fp}`);
if (process.argv.includes("--show")) {
  console.log(`  新值: ${secret}`);
} else {
  console.log("  （值未打印；需要查看时加 --show）");
}
console.log("\n下一步：");
console.log("  node scripts/push-netlify-env.mjs");
console.log("  node scripts/push-vercel-env.mjs && npx vercel --prod");