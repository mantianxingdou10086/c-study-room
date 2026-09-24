/**
 * 数据库端到端验证：确认「应用运行时」那条路径真的能读写。
 *
 * 为什么要单独验：迁移走的是会话模式 pooler（5432），而应用运行时走的是
 * **事务模式 pooler（6543）+ @prisma/adapter-pg（node-postgres）**——两条完全不同的路径。
 * 迁移成功不代表运行时也通。
 *
 * 用法：node scripts/verify-db.mjs
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("缺少 DATABASE_URL");

const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
console.log(`连接串（密码已打码）：${masked}\n`);

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

let ok = true;

// 1) 表是否真的建出来了
console.log("— 1) public schema 里的表 —");
const tables = await prisma.$queryRaw`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`;
console.log("  " + tables.map((t) => t.table_name).join(", "));
const expected = [
  "DailyActivity",
  "LessonProgress",
  "Post",
  "Reply",
  "Submission",
  "User",
  "UserBadge",
  "Vote",
  "_prisma_migrations",
];
const missing = expected.filter((e) => !tables.some((t) => t.table_name === e));
if (missing.length) {
  console.log(`  ❌ 缺表：${missing.join(", ")}`);
  ok = false;
} else {
  console.log("  ✅ 8 张业务表 + 迁移记录表都在");
}

// 2) 写 → 读 → 删（验证运行时真的能写，不只是能连）
console.log("\n— 2) 写入 / 读取 / 删除（用后即删，不留垃圾数据）—");
const email = `verify-${Date.now()}@example.invalid`;
try {
  const created = await prisma.user.create({
    data: { email, username: `verify_${Date.now()}`, passwordHash: "not-a-real-hash" },
    select: { id: true, email: true, xp: true, level: true },
  });
  console.log(`  ✅ 创建用户成功：id=${created.id} xp=${created.xp} level=${created.level}`);

  const read = await prisma.user.findUnique({ where: { email } });
  console.log(`  ✅ 读回成功：${read?.email}（xp=${read?.xp}）`);

  // 顺带验证唯一约束真的生效（重复邮箱应当报 P2002）
  try {
    await prisma.user.create({
      data: { email, username: `dup_${Date.now()}`, passwordHash: "x" },
    });
    console.log("  ❌ 重复邮箱竟然创建成功——唯一约束没生效！");
    ok = false;
  } catch (e) {
    if (e?.code === "P2002") {
      console.log("  ✅ 唯一约束生效（重复邮箱被拒，P2002）");
    } else {
      console.log(`  ⚠️ 重复创建报的错不是 P2002：${e?.code} ${e?.message}`);
    }
  }

  await prisma.user.delete({ where: { email } });
  console.log("  ✅ 删除成功（没留下测试数据）");
} catch (e) {
  console.log(`  ❌ 写入/读取失败：${e?.code ?? ""} ${e?.message}`);
  ok = false;
}

await prisma.$disconnect();

console.log(
  ok
    ? "\n结论：✅ 应用运行时路径（事务模式 pooler + adapter-pg）读写正常。"
    : "\n结论：❌ 有问题，见上面的 ❌。",
);
process.exit(ok ? 0 : 1);
