import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 单例（Prisma 7 + driver adapter）。
 *
 * 为什么这么写：
 *  1. **单例**：开发模式热重载会重复执行模块，每次 new PrismaClient() 都占连接，
 *     很快把 Supabase 免费版的连接数用满（表现为随机超时）。挂到 globalThis 上复用。
 *  2. **必须用 adapter**：Prisma 7 起 PrismaClient 不再自己解析连接串，
 *     要通过 `@prisma/adapter-pg` 传进去（底层是 node-postgres）。
 *     连接串是**事务模式 pooler**（6543），给 Serverless 用的那个。
 *  3. 迁移不走这里——迁移用会话模式 pooler，配置在 prisma.config.ts。
 *
 * 连接串里的 `?pgbouncer=true&connection_limit=1` 是给 Prisma 自带引擎时代的参数，
 * node-postgres 会忽略未知参数，留着无害；真遇到预处理语句问题再加 `statement_cache_size=0`。
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "缺少 DATABASE_URL。本地开发请确认 web/.env.local 存在且包含 DATABASE_URL（模板见 .env.example）。",
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    /**
     * ⚠️ 这里显式关掉证书校验，是**有意的降级**，原因：
     * Supabase 的 Supavisor pooler 下发的证书链里带一张自签根证书
     * （实测：`openssl s_client -starttls postgres` → `Verify return code: 19
     * (self-signed certificate in certificate chain)`，链上 3 张证书），
     * Node 的信任库不认它，于是 node-postgres 直接拒绝连接：
     * `TlsConnectionError: self-signed certificate in certificate chain`。
     *
     * `rejectUnauthorized: false` 仍然**加密**（TLS 照常协商），只是不验证对端身份。
     * 影响：理论上可被中间人冒充服务器。
     * TODO（上线前）：从 Supabase 控制台 Connect → SSL Configuration 下载
     * `prod-ca-2021.crt`，改成 `ssl: { ca: fs.readFileSync("certs/...") }` 做真正的校验。
     */
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * 这里原本有个 `pingDatabase()`（`SELECT 1`），注释说「/api/health 会调它」——
 * 但那个路由从来没建过，函数也无人引用，属于注释在说谎。
 *
 * 探活/保活的职责已经由 `src/app/api/keepalive/route.ts` 承担，而且做得更对：
 *   1. 它读**真实表**（`SELECT 1` 不触达用户表，未必算 Supabase 要求的
 *      "user database activity"，详见该文件顶部注释和 docs/keepalive.md）；
 *   2. 数据库挂掉时显式返回 503，而不是吞成 200 让监控看不出区别。
 * 所以这里不再重复实现一份。
 */
