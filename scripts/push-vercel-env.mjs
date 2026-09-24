/**
 * 把本地 .env.local 里的密钥推到 Vercel 环境变量。
 *
 * 为什么要专门写个脚本：
 *   1) 值不能出现在终端输出里（对话记录会留存），所以只 echo 变量名；
 *      vercel 通过 stdin 收值，不经过 shell，不会被 shell 展开/转义破坏。
 *   2) `source .env.local` 在 bash 里会让密码中的 $ 被展开，必须自己解析。
 *
 * 用法：node scripts/push-vercel-env.mjs [targets...]   (默认 production)
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const sha1 = (s) => createHash("sha1").update(s).digest("hex");

const RAW = ".env.local";
const KEYS = ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "CRON_SECRET"];
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["production"];

/** 极简 .env 解析：KEY=VALUE，去掉可选的成对引号，保留其余一切原样 */
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

const env = parseEnv(readFileSync(RAW, "utf8"));
const missing = KEYS.filter((k) => !env[k]?.trim());
if (missing.length) {
  console.error(`❌ .env.local 里缺少: ${missing.join(", ")}`);
  process.exit(1);
}

for (const key of KEYS) {
  const value = env[key];
  for (const target of targets) {
    try {
      execFileSync("vercel", ["env", "remove", key, target, "--yes"], {
        stdio: "ignore",
        shell: true,
      });
    } catch {
      // 原本不存在，忽略
    }
    execFileSync("vercel", ["env", "add", key, target], {
      input: value,
      stdio: ["pipe", "ignore", "pipe"],
      shell: true,
    });
    // 只打印名字和长度，绝不打印值本身
    console.log(`✅ ${key} → ${target}  (${value.length} 字符, sha1=${sha1(value).slice(0, 8)})`);
  }
}

console.log("\n=== Vercel 现有环境变量 ===");
console.log(
  execFileSync("vercel", ["env", "ls", "production"], { encoding: "utf8", shell: true }),
);