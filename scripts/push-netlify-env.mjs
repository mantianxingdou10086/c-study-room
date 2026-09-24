/**
 * 把本地 .env.local 里的密钥推到 Netlify 环境变量，并**回读校验**。
 *
 * ## 为什么不用 netlify CLI 的 env 命令
 *
 * 试过两种，都不行：
 *
 *   1. `netlify env:import <file>`
 *      —— 会把导入的值**原样回显**到 stdout（CRON_SECRET / AUTH_SECRET 明文，
 *         只有 DATABASE_URL 里的密码被 Netlify 自己打了码）。
 *      —— 更要命的是它**静默丢变量**：实测 5 个变量只进去了 2 个
 *         （DATABASE_URL / AUTH_SECRET / NEXT_PUBLIC_SITE_URL 全没了），
 *         而命令返回 0、没有任何报错。表现就是线上所有动态路由 500 ——
 *         因为函数里读不到数据库地址和签名密钥。
 *   2. `netlify env:set KEY VALUE`
 *      —— 值会出现在进程命令行里（ps 可见），且 shell 转义容易弄坏密码里的
 *         `$` / `@` / `&`。
 *
 * 所以改成直接调 REST API 逐个 upsert，然后**重新拉取列表核对**。
 * 报告的是「服务端实际有什么」，不是「我以为我设了什么」。
 *
 * ## 与 Vercel 的差别
 *
 *   - AUTH_SECRET 用**新生成的**（不复用 Vercel 那个），两个平台互不通用；
 *   - 多推一个 NEXT_PUBLIC_SITE_URL —— Netlify 没有 VERCEL_URL 这种注入，
 *     不设的话 src/lib/site-url.ts 会退回 localhost（sitemap / robots / OG 会坏）。
 *
 * ## AUTH_SECRET 的持久化
 *
 * 首次运行生成后写进 `.netlify/auth-secret`（该目录已被 .gitignore 忽略），
 * 之后每次运行都复用它。**不要**改成每次随机 —— AUTH_SECRET 是会话 JWT 的
 * 签名密钥，一换就等于把所有已登录用户踢下线。真要轮换请显式传
 * NETLIFY_AUTH_SECRET=xxx。
 *
 * ## scope 必须覆盖 functions
 *
 * SSR 在函数里读环境变量，只给 builds scope 会读不到 —— 所以固定写全
 * builds / functions / post_processing / runtime，并在校验阶段确认 functions
 * 在里面。少一个就是线上 500。
 *
 * 用法：node scripts/push-netlify-env.mjs
 * 环境变量：
 *   NETLIFY_AUTH_TOKEN   —— 覆盖 Netlify 登录凭据
 *   NETLIFY_AUTH_SECRET  —— 覆盖 AUTH_SECRET 的值（不给就用已保存的/新生成）
 *   NETLIFY_SITE_URL     —— 覆盖 NEXT_PUBLIC_SITE_URL
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { join, dirname } from "node:path";

const API = "https://api.netlify.com";
const ACCOUNT_FALLBACK = "mantianxingdou10086";
const SCOPES = ["builds", "functions", "post_processing", "runtime"];
const RAW = ".env.local";
/** 生产 AUTH_SECRET 的本地存档（.netlify/ 已被 .gitignore 忽略） */
const AUTH_SECRET_FILE = join(".netlify", "auth-secret");
const STATE_FILE = join(".netlify", "state.json");
/** Netlify CLI 保存登录凭据的位置 */
const CLI_CONFIG = join(process.env.APPDATA ?? "", "netlify", "Config", "config.json");

const sha1 = (s) => createHash("sha1").update(s).digest("hex");

function authToken() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN;
  const cfg = JSON.parse(readFileSync(CLI_CONFIG, "utf8"));
  const token = Object.values(cfg.users ?? {})[0]?.auth?.token;
  if (!token) throw new Error(`读不到 Netlify 凭据，请先 netlify login（或设 NETLIFY_AUTH_TOKEN）`);
  return token;
}

const TOKEN = authToken();
const HEADERS = { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };

/**
 * 带重试的 fetch。
 *
 * 不是可选项：本机（校园网）到 Netlify / AWS 的这批 IP 会**间歇性连接超时**
 * （实测到 AWS us-east-2 的 blob 存储 28 次里超时 1 次；api.netlify.com 首次
 * 连接 9.2s）。单次失败不代表真的失败，重试即可。
 */
async function api(method, path, body, { attempts = 4 } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: HEADERS,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, body: await res.json().catch(() => null) };
    } catch (e) {
      lastErr = e;
      if (i < attempts) await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw lastErr;
}

/** 极简 .env 解析：KEY=VALUE，去掉可选的成对引号，其余原样保留 */
function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length >= 2 && ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

/**
 * 取生产用的 AUTH_SECRET：显式覆盖 > 本地已保存 > 新生成并保存。
 * 保住「幂等」——重复运行这个脚本不应该把用户踢下线。
 */
function netlifyAuthSecret() {
  if (process.env.NETLIFY_AUTH_SECRET) return process.env.NETLIFY_AUTH_SECRET;
  try {
    const saved = readFileSync(AUTH_SECRET_FILE, "utf8").trim();
    if (saved) return saved;
  } catch {
    // 首次运行，还没有保存过
  }
  const fresh = randomBytes(32).toString("base64url");
  mkdirSync(dirname(AUTH_SECRET_FILE), { recursive: true });
  writeFileSync(AUTH_SECRET_FILE, `${fresh}\n`, { mode: 0o600 });
  return fresh;
}

const local = parseEnv(readFileSync(RAW, "utf8"));

const values = {
  DATABASE_URL: local.DATABASE_URL,
  DIRECT_URL: local.DIRECT_URL,
  CRON_SECRET: local.CRON_SECRET,
  // 生产密钥必须独立：本地 .env.local 的 AUTH_SECRET 只用于开发。
  AUTH_SECRET: netlifyAuthSecret(),
  NEXT_PUBLIC_SITE_URL: process.env.NETLIFY_SITE_URL ?? "https://c-study-room.netlify.app",
};

const missing = Object.entries(values)
  .filter(([, v]) => !v?.trim())
  .map(([k]) => k);
if (missing.length) {
  console.error(`❌ 缺少值: ${missing.join(", ")}（DATABASE_URL / DIRECT_URL / CRON_SECRET 来自 ${RAW}）`);
  process.exit(1);
}

const SITE_ID = JSON.parse(readFileSync(STATE_FILE, "utf8")).siteId;
if (!SITE_ID) {
  console.error(`❌ ${STATE_FILE} 里没有 siteId，先跑 netlify link 或 netlify sites:create`);
  process.exit(1);
}

const siteInfo = await api("GET", `/api/v1/sites/${SITE_ID}`);
const ACCOUNT = siteInfo.body?.account_slug ?? ACCOUNT_FALLBACK;

console.log(`站点: ${SITE_ID}`);
console.log(`账号: ${ACCOUNT}\n`);

// ---- 1. 逐个 upsert ----------------------------------------------------------
// ⚠️ body 必须是**数组**（envelope 格式）。传单个对象会得到
//    HTTP 400 {"error":"param is missing or the value is empty: _json"}，
//    这个报错完全看不出真正原因 —— 格式是从 netlify-cli 源码里
//    dist/utils/env/index.js 的 translateFromMongoToEnvelope 抄来的。
//
// ⚠️ POST 是**创建**语义：键已存在时返回 422（不是幂等的覆盖）。
//    所以先 POST，遇到 422 再「删掉重建」——这也是 netlify-cli 自己的
//    env:import 的做法（先 delete 撞名的再 create）。
//    逐个处理（而不是一次 5 个）是为了让单个失败独立可重试、不牵连其余变量。
let failed = 0;
for (const [key, value] of Object.entries(values)) {
  const envelope = [{ key, scopes: SCOPES, values: [{ context: "all", value }] }];
  const path = `/api/v1/accounts/${ACCOUNT}/env?site_id=${SITE_ID}`;

  let res = await api("POST", path, envelope);
  let note = "";
  if (res.status === 422) {
    // 已存在 → 先删再建
    const del = await api("DELETE", `/api/v1/accounts/${ACCOUNT}/env/${encodeURIComponent(key)}?site_id=${SITE_ID}`);
    res = await api("POST", path, envelope);
    note = `（键已存在，删除后重建；DELETE HTTP ${del.status}）`;
  }

  const ok = res.status === 200 || res.status === 201;
  if (!ok) failed += 1;
  // 只打印名字、长度和哈希，绝不打印值本身
  console.log(
    `${ok ? "  ✅" : "  ❌"} ${key.padEnd(22)} HTTP ${res.status}  (${value.length} 字符, sha1=${sha1(value).slice(0, 8)}) ${note}`,
  );
}

// ---- 2. 回读校验（关键！env:import 就是在这里骗过我的）----------------------
console.log("\n=== 回读校验（服务端实际状态）===");
const listed = await api("GET", `/api/v1/accounts/${ACCOUNT}/env?site_id=${SITE_ID}`);
const byKey = new Map((listed.body ?? []).map((v) => [v.key, v]));

for (const [key, value] of Object.entries(values)) {
  const remote = byKey.get(key);
  if (!remote) {
    failed += 1;
    console.log(`  ❌ ${key.padEnd(22)} 服务端**不存在**这个变量`);
    continue;
  }
  const scopes = remote.scopes ?? [];
  const hasFn = scopes.includes("functions");
  const sameValue = sha1(String(remote.values?.[0]?.value ?? "")) === sha1(value);
  if (!hasFn) failed += 1;
  console.log(
    `  ${hasFn && sameValue ? "✅" : "❌"} ${key.padEnd(22)} scope=[${scopes.join(",")}]` +
      `  值${sameValue ? "一致" : "**不一致**"}${hasFn ? "" : "  ⚠️ 缺 functions scope → 运行时读不到"}`,
  );
}

const extras = [...byKey.keys()].filter((k) => !(k in values));
if (extras.length) console.log(`  ℹ️  服务端还有其它变量: ${extras.join(", ")}`);

if (failed) {
  console.error(`\n❌ 有 ${failed} 项没通过校验，线上很可能 500。请重跑本脚本。`);
  process.exit(1);
}
console.log("\n✅ 全部 5 个变量都已确认落在服务端，且 functions scope 齐全。");
