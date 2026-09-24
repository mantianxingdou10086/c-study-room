# 数据库接入：Prisma 7 + Supabase 踩坑记录

> M2 的交付说明。这份文档记录了**实测踩到的每一个坑**，因为其中好几个的错误信息
> 极具误导性（比如明明网络通却报 "Can't reach database server"）。

---

## 1. 最终配置

| 用途 | 用哪个端点 | 端口 | 在哪配 |
|---|---|---|---|
| 应用运行时 | **事务模式 pooler**（Supavisor） | **6543** | `.env.local` 的 `DATABASE_URL` |
| Prisma 迁移 | **会话模式 pooler** | **5432** | `.env.local` 的 `DIRECT_URL` |
| ~~直连~~ | `db.<ref>.supabase.co` | 5432 | ❌ 免费版只有 **IPv6**，不用 |

实测本机**有** IPv6 出口（直连也能通），但校园网/其他机器不一定有 —— 所以统一走 IPv4 的 pooler 更稳。

### 连接串的四个要点

```
postgresql://postgres.<project-ref>:<密码>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

1. **密码里的特殊字符必须 URL 编码**：`@` → `%40`。不编码的话 `@` 会被当成主机分隔符，
   报错信息完全不提密码，极难定位。（本项目的密码就含 `@`）
2. **用户名是 `postgres.<project-ref>`**，不是 `postgres`。pooler 靠这个后缀查租户，
   ref 错一个字母 → `tenant/user postgres.xxx not found`。
3. `?pgbouncer=true&connection_limit=1` —— 事务模式 pooler 不支持预处理语句，
   Serverless 上不加会随机报错 / 连接数耗尽。
4. 迁移那条要 `?sslmode=require`（见 §3.3）。

---

## 2. Prisma 7 的三个破坏性变更

装 `prisma` 时注意：**`latest` 标签指向预发布版**（实测装到 `8.0.0-rc.15`），
而 `@prisma/client` 的 `latest` 是稳定版 `7.10.0` —— 两者必须一致，
所以要用 `prisma@7.10.0` 精确锁定（稳定版在 `prev` 标签上）。

| 变更 | 旧写法 | v7 写法 |
|---|---|---|
| 连接串位置 | schema 里 `url = env(...)` / `directUrl` | **`prisma.config.ts`**（`directUrl` 已被移除） |
| 客户端连接 | `new PrismaClient()` 自动读 env | **必须传 adapter**：`new PrismaClient({ adapter })` |
| CLI 参数 | `prisma db execute --url <url>` | `--url` 已移除，只能从配置文件读 |
| diff 参数 | `--to-schema-datamodel` | `--to-schema` |

```ts
// prisma.config.ts —— 注意 .env.local 不会被自动加载，必须显式指定
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";
loadEnv({ path: ".env.local" });
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DIRECT_URL") },  // 迁移走会话模式 pooler
});
```

---

## 3. 三个把错误信息读歪的坑

### 3.1 `migrate dev` 报 P1001，但网络明明是通的

**现象**：`npx prisma migrate dev` → `P1001: Can't reach database server at ...:5432`，
但同一个地址用 node-postgres 连得好好的，TCP 检查也是 50ms 就通。

**根因**：`migrate dev` 需要一个**影子数据库**（临时建一个库来检测漂移）。
Supabase 免费版的 `postgres` 角色没有建库权限，而 pooler 连一个不存在的库时
报的错就是 P1001 —— 看起来像网络问题，其实是权限问题。

**解法**：绕开影子库，用 diff + deploy（Supabase 上的标准做法）：

```bash
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script \
  > prisma/migrations/0001_init/migration.sql
npx prisma migrate deploy
```

**代价**：`migrate dev` 的"改 schema 自动生成迁移"用不了了。改 schema 后要手动重跑上面两条
（`--from-empty` 换成 `--from-migrations prisma/migrations` 才是增量）。
这个代价可以接受：本项目的数据模型基本一次成型。

### 3.2 报 P1001 的另一半原因：偶发

排查过程中同一条件出现过「一次失败、两次成功」。Supavisor 会短暂拒绝连接，
所以**P1001 不能只看一次**。判断方法：连试 2~3 次，稳定失败才是真问题。

### 3.3 应用运行时连不上：`self-signed certificate in certificate chain`

**现象**：迁移成功，但应用侧（`@prisma/adapter-pg` → node-postgres）报
`TlsConnectionError: self-signed certificate in certificate chain`。

**根因**：用 `openssl s_client -connect ...:5432 -starttls postgres -showcerts` 抓到证书链，
**3 张证书，验证结果 `Verify return code: 19 (self-signed certificate in certificate chain)`** ——
Supabase 的 pooler 链里带一张自签根证书，Node 的信任库不认。

**当前解法**（`src/lib/db.ts`）：`ssl: { rejectUnauthorized: false }` —— 仍然加密，只是不验证对端身份。
**这是有意的降级**，代码里留了 TODO：从 Supabase 控制台 Connect → SSL Configuration 下载
`prod-ca-2021.crt`，改成 `ssl: { ca: ... }` 做真校验。

> 注意：**迁移那条路不受影响**（Prisma 引擎在 `sslmode=require` 下不校验证书链），
> 只有 node-postgres 这条路需要处理。

---

## 4. 验收命令

```bash
node scripts/verify-db.mjs      # 表结构 + 写/读/唯一约束/删 全链路
node scripts/check-supabase-connectivity.mjs   # 不需要密码的网络预检
node scripts/diagnose-db-connection.mjs        # 对比不同 ref / 端点的报错
node scripts/supabase-keepalive.mjs --verbose  # 保活（顺带探活生产链路，见 keepalive.md）
```

`verify-db.mjs` 的实测输出：

```
— 1) public schema 里的表 —
  DailyActivity, LessonProgress, Post, Reply, Submission, User, UserBadge, Vote, _prisma_migrations
  ✅ 8 张业务表 + 迁移记录表都在
— 2) 写入 / 读取 / 删除 —
  ✅ 创建用户成功：id=... xp=0 level=1
  ✅ 唯一约束生效（重复邮箱被拒，P2002）
  ✅ 删除成功（没留下测试数据）
```

---

## 5. 数据模型的设计决定

**数据库里没有 Chapter / Lesson / Exercise 表** —— 课程内容存在仓库里（见 `content-pipeline.md`）。
进度和提交用**字符串 id** 引用内容（`lessonId = "ch01-introducing-c/why-c"`），不做外键。
好处：改内容不用动数据库，也不会出现"仓库与库里的 id 漂移"。

三个为业务服务的细节：

1. **`Submission` 用 `@@unique([userId, exerciseId])`** —— 一题一条"当前状态"记录，
   所以 **XP 发放天然幂等**：重复提交同一题不会重复加分，不需要额外的去重逻辑。
2. **`Vote` 是多态设计**（`targetType + targetId`），因此**故意不与 Post/Reply 建关系字段**——
   Prisma 要求关系必须双向，多态做不到。点赞数走 `@@index([targetType, targetId])`。
3. **`DailyActivity` 每天一行**（按 UTC+8 自然日），连续打卡、热力图、排行榜都从它算，
   不用扫全量提交记录。
