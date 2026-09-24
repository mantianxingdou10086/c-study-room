# Supabase 保活方案（Keep-Alive）

线上站点：https://c-study-room.netlify.app （主力，见 docs/netlify-deploy.md）
　　　　　https://c-study-room.vercel.app （备胎，本机直连被墙）

## 为什么需要

Supabase 免费版项目**闲置 1 周即被自动暂停**，判定依据是官方文档所说的
**user database activity**：

> A Free plan project is considered inactive if it does not receive sufficient
> user database activity over the past week. Typically a few user requests to
> the database each day over the previous week is enough to keep the project
> from being paused.

关键：**ping 健康检查端点或网站首页不算**，必须是真实的数据库读写。
（社区有案例：每天数百次 API 请求仍被暂停，因为那只是网关流量，没落到数据库。）

## 两层设计

| 层 | 位置 | 频率 | 存活条件 |
|---|---|---|---|
| 云端（主力） | Netlify 定时函数 → `/api/keepalive` | 每 6 小时（4 次/天） | 不依赖本机开机 |
| 云端（备胎） | Vercel Cron → `/api/keepalive` | 每天 1 次（03:00 UTC） | 同上 |
| 本机 | Hermes cronjob → `scripts/supabase-keepalive.mjs` | 每 8 小时（3 次/天） | 需要电脑开着 |

各层都是**真实表读取**（`User` / `Post` / `LessonProgress`），多层叠加是冗余而非必需
—— 任意一层活着就不会被暂停。

### 云端层：Netlify（主力）

- 文件：`netlify/functions/keepalive.mjs`，调度写在 `netlify.toml` 的
  `[functions.keepalive] schedule = "0 */6 * * *"`（**UTC**，即北京时间
  08:00 / 14:00 / 20:00 / 02:00）。
- **为什么不用 Next 的定时 API route**：Next.js 运行时 v5（OpenNext）已废弃
  `export const config = { type: "experimental-scheduled" }`，官方要求改用普通
  Netlify Function。所以这个函数只干一件事：fetch 自己站点的 `/api/keepalive`，
  真正的读表逻辑仍在 `src/app/api/keepalive/route.ts`（那边才能 import Prisma）。
- 定时函数只在**正式发布**的部署上触发；`netlify functions:invoke keepalive --prod`
  可手动跑一次。
- 失败时函数**显式抛错**（不是静默返回）—— 保活最怕的就是「静默失效」，
  数据库被暂停了却没人知道。

### 云端层：Vercel（备胎，仍保留）

- `vercel.json` → `crons: [{ path: "/api/keepalive", schedule: "0 3 * * *" }]`
- **Hobby 硬限制：cron 只能每天 1 次，更频繁的表达式会导致部署失败。**
  这也是 Netlify 那边直接上 4 次/天的原因（Netlify 没这个限制）。
- Vercel 会自动给 cron 请求带上 `Authorization: Bearer $CRON_SECRET`。
- 手动验证：Vercel 控制台 Cron 页面点 **Run**。

### 本机层

- 直连 Supabase pooler 读真实表（**不走 HTTP**，所以不受 vercel.app 被墙影响；
  迁移到 Netlify 后本机其实也能直接访问 netlify.app 了）。
- 成功静默；周一输出一次报平安；失败输出告警并 exit 1。
- 手动跑：`node scripts/supabase-keepalive.mjs --verbose`
- 注意：Hermes cronjob 的 `script` 只把 `.sh`/`.bash` 交给 bash，其它扩展名一律用
  Python 执行，所以必须经 `~/.hermes/scripts/supabase-keepalive.sh` 外壳转发。

## 真被暂停了怎么恢复

Supabase 控制台 → 项目 → **Restore project**（免费版可恢复，数据保留一段时间）。
恢复后等几分钟再访问线上站点。

## 彻底免除暂停

升级 Supabase **Pro**（约 $25/月）可关闭自动暂停。免费版没有这个开关。

## 相关文件

- `src/app/api/keepalive/route.ts`
- `vercel.json`（crons 字段）
- `scripts/supabase-keepalive.mjs`
- `~/.hermes/scripts/supabase-keepalive.sh`（Hermes cronjob 入口）