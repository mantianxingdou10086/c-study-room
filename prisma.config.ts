import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI 配置（Prisma 7 起连接串不再写在 schema.prisma 里）。
 *
 * 两个容易踩的点：
 *  1. **`.env.local` 不会被自动加载**。Next.js 会读它，但 Prisma CLI 只认 `.env`，
 *     所以要显式 dotenv 指定路径——否则迁移时报 "Environment variable not found"。
 *  2. **迁移用会话模式 pooler（5432）**，也就是 DIRECT_URL。
 *     v7 已经移除了 `datasource.directUrl`，所以这里把 `datasource.url` 指向 DIRECT_URL：
 *     迁移需要长连接和会话级特性，事务模式 pooler（6543）跑迁移会失败。
 *     （为什么不用免费版的「直连」？它只有 IPv6，很多网络连不上。）
 */
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
