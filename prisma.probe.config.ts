import { defineConfig } from "prisma/config";

/**
 * 连接探针用的临时配置（诊断 P1001 用，不属于应用运行时）。
 * 从环境变量 PROBE_URL 读连接串，这样可以不改 .env.local 就试各种 sslmode：
 *
 *   PROBE_URL="postgresql://...?sslmode=require" \
 *     npx prisma db execute --config prisma.probe.config.ts --stdin <<< "select 1"
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.PROBE_URL ?? "",
  },
});
