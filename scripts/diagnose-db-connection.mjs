/**
 * 连接诊断：找出 P1001 的真正原因。
 * 用法：node scripts/diagnose-db-connection.mjs
 *
 * 思路：pooler 是按**用户名里的 project ref** 去查租户的。
 *  - ref 错 → pooler 直接断连（表现为 P1001，看起来像"连不上"）
 *  - ref 对但密码错 → 明确的 "password authentication failed"
 * 所以对比不同 ref 的报错信息，就能判断到底是哪个错了。
 *
 * 密码不写在本文件里，从 .env.local 的 DATABASE_URL 里解析出来。
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8");
const m = /DATABASE_URL="([^"]+)"/.exec(env);
if (!m) throw new Error("没在 .env.local 里找到 DATABASE_URL");

const parsed = new URL(m[1]);
const password = decodeURIComponent(parsed.password);
const [userPart] = parsed.username.split(".");
console.log(`用户名前缀 = ${userPart}`);
console.log(`密码长度 = ${password.length}（不回显内容）`);
console.log(`pooler 主机 = ${parsed.hostname}:${parsed.port}\n`);

const REFS = [
  ["贴给我的（frryvvi a anwltgvrdbbz）", "frryvviaanwltgvrdbbz"],
  ["截图 OCR 读出的（frryvvj aanwltgvrdbbz）", "frryvvjaanwltgvrdbbz"],
];

const HOST = parsed.hostname;

async function tryConnect(label, connectionString, ssl) {
  const t0 = Date.now();
  const client = new pg.Client({ connectionString, ssl, connectionTimeoutMillis: 12_000 });
  try {
    await client.connect();
    const r = await client.query("select current_user, current_database(), version()");
    console.log(`  ✅ ${label}`);
    console.log(`     current_user=${r.rows[0].current_user}`);
    console.log(`     ${String(r.rows[0].version).slice(0, 60)}`);
    await client.end();
    return true;
  } catch (e) {
    console.log(`  ❌ ${label}`);
    console.log(`     code=${e.code ?? "-"} message=${e.message}`);
    return false;
  } finally {
    console.log(`     （${Date.now() - t0}ms）`);
  }
}

console.log("— 1) 用不同的 project ref 试 pooler（会话模式 5432）—");
for (const [label, ref] of REFS) {
  const url = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${HOST}:5432/postgres`;
  await tryConnect(label, url, { rejectUnauthorized: false });
}

console.log("\n— 2) 试事务模式端口 6543（同一个 ref）—");
{
  const ref = REFS[0][1];
  const url = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${HOST}:6543/postgres`;
  await tryConnect("事务模式 6543", url, { rejectUnauthorized: false });
}

console.log("\n— 3) 试直连（免费版是 IPv6，看本机有没有 IPv6 出口）—");
for (const [, ref] of REFS) {
  const url = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
  await tryConnect(`直连 ${ref}`, url, { rejectUnauthorized: false });
}
