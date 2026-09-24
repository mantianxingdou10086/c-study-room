/**
 * 解剖 playwright trace.zip，找出 POST 请求到底返回了什么。
 * 用法：node scripts/inspect-trace.mjs <trace.zip>
 *
 * trace 里的 network 事件是 NDJSON，字段名被压缩过（type/method/url/status），
 * 这里只挑我们关心的打出来。
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const zip = process.argv[2];
if (!zip) throw new Error("用法：node scripts/inspect-trace.mjs <trace.zip>");

const dir = mkdtempSync(join(tmpdir(), "trace-"));
// git-bash 里的 GNU tar 不认 zip，用 PowerShell 的 Expand-Archive
execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dir}' -Force"`,
  { stdio: "inherit" },
);

const files = readdirSync(dir).filter((f) => f.endsWith(".network"));
console.log(`找到 ${files.length} 个 network 记录文件\n`);

const requests = new Map();
for (const f of files) {
  const text = readFileSync(join(dir, f), "utf8");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const p = e.params ?? {};
    // request 事件带 method/url，response 事件带 status
    if (p.method && p.url) {
      requests.set(e.params.request?.url ?? p.url, { method: p.method, url: p.url });
    }
  }
}

// 换一种更稳的方式：把所有事件按顺序打印出与 POST 相关的
for (const f of files) {
  const text = readFileSync(join(dir, f), "utf8");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const snap = e.snapshot;
    if (!snap?.request || snap.request.method !== "POST") continue;
    console.log("══ POST", snap.request.url);
    console.log("   耗时:", snap.time, "ms");
    console.log("   状态:", snap.response?.status, snap.response?.statusText ?? "");
    const post = snap.request.postData?.text ?? "";
    if (post) {
      console.log("   请求体:", String(post).slice(0, 500));
    }
    // 把整条 snapshot 落盘，便于 grep 里面的 RSC 载荷
    const dump = join(dir, "post-snapshot.json");
    writeFileSync(dump, JSON.stringify(snap, null, 2));
    const s = JSON.stringify(snap);
    for (const key of ["fieldErrors", "已经被注册", "注册失败", "NEXT_REDIRECT", "邮箱或密码"]) {
      const i = s.indexOf(key);
      if (i >= 0) {
        console.log(`   命中「${key}」：`, s.slice(Math.max(0, i - 120), i + 120));
      }
    }
    console.log();
  }
}
