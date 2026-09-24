/**
 * 连接前预检：不需要密码也能验证「路通不通」。
 * 用法：node scripts/check-supabase-connectivity.mjs
 *
 * 检查四件事：
 *  1. 项目 ref 是否真实存在（直连域名能解析出来 → ref 没抄错）
 *  2. pooler 域名解析（必须是 IPv4，免费版直连只有 IPv6）
 *  3. 两个 pooler 端口（6543 事务模式 / 5432 会话模式）能不能建 TCP 连接
 *  4. 会话模式能不能完成 TLS 握手（Postgres 要求 TLS，握手成功说明链路是通的）
 *
 * 注意：用 `dns.lookup`（走系统解析器）而不是 `dns.resolve`（自己发 DNS 查询）——
 * 实测本机对后者返回 ECONNREFUSED，那是 DNS 查询被拒，不代表网络不通。
 */
import net from "node:net";
import tls from "node:tls";
import dns from "node:dns/promises";

const REF = process.env.SUPABASE_REF ?? "frryvviaanwltgvrdbbz";
const HOST =
  process.env.SUPABASE_POOLER_HOST ?? "aws-0-ap-southeast-1.pooler.supabase.com";

async function lookup(host) {
  try {
    const r = await dns.lookup(host, { all: true });
    return r.map((x) => `${x.address} (IPv${x.family})`).join(", ");
  } catch (e) {
    return `解析失败：${e.code ?? e.message}`;
  }
}

function tcpCheck(host, port, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const sock = net.connect({ host, port });
    const done = (ok, note) => {
      sock.destroy();
      resolve({ ok, ms: Date.now() - t0, note });
    };
    sock.setTimeout(timeoutMs);
    sock.on("connect", () => done(true, "TCP 已连接"));
    sock.on("timeout", () => done(false, "超时"));
    sock.on("error", (e) => done(false, e.code ?? e.message));
  });
}

function tlsCheck(host, port, timeoutMs = 10_000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const sock = tls.connect({ host, port, servername: host, rejectUnauthorized: false });
    const done = (ok, note) => {
      sock.destroy();
      resolve({ ok, ms: Date.now() - t0, note });
    };
    sock.setTimeout(timeoutMs);
    sock.on("secureConnect", () => done(true, `TLS 握手成功（${sock.getProtocol() ?? "?"}）`));
    sock.on("timeout", () => done(false, "超时"));
    sock.on("error", (e) => done(false, e.code ?? e.message));
  });
}

console.log(`项目 ref = ${REF}`);
console.log(`pooler   = ${HOST}\n`);

console.log("— 1) 校验项目 ref（直连域名解析）—");
console.log(`  db.${REF}.supabase.co → ${await lookup(`db.${REF}.supabase.co`)}`);

console.log("\n— 2) pooler 域名解析 —");
console.log(`  ${HOST} → ${await lookup(HOST)}`);

console.log("\n— 3) 端口连通性 —");
for (const [port, label] of [
  [6543, "事务模式（给 DATABASE_URL）"],
  [5432, "会话模式（给 DIRECT_URL）"],
]) {
  const r = await tcpCheck(HOST, port);
  console.log(`  ${port} ${label} → ${r.ok ? "✅" : "❌"} ${r.note}（${r.ms}ms）`);
}

console.log("\n— 4) TLS 握手（5432）—");
const t = await tlsCheck(HOST, 5432);
console.log(`  → ${t.ok ? "✅" : "❌"} ${t.note}（${t.ms}ms）`);

console.log(
  "\n结论：6543 与 5432 都是 ✅ 就说明这台机器到 Supabase 的网络路径是通的，" +
    "剩下只差正确的密码；若为 ❌，则要先解决网络（换网络/开代理）再谈密码。",
);
