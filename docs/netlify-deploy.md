# Netlify 部署（主力平台）

- 线上站点：**https://c-study-room.netlify.app**
- 控制台：https://app.netlify.com/projects/c-study-room
- 站点 ID：`b44c76e7-7723-4e77-939b-ce0a4a739498`
- 备用：https://c-study-room.vercel.app（本机直连被墙，见文末）

## 为什么从 Vercel 迁到 Netlify

本机（校园网）到 `vercel.app` 是 **DNS 投毒 + IP 级 RST 双封锁**，只有挂代理的
浏览器能打开 —— 分享链接给同学很不方便。实测 Netlify 直连正常：

| 目标 | 耗时 |
|---|---|
| www.netlify.com | 0.64s |
| app.netlify.com | 0.28s |
| netlify.app CDN | 0.21s |
| api.netlify.com | 1.2s（首次连接 9.2s） |

## 本机前置条件

### Windows 开发者模式

`next build` 会在 `.next/node_modules/` 与 `.next/standalone/.next/node_modules/`
下生成指向真实包的链接。开发者模式会授予普通用户创建符号链接的特权
（否则插件的重建步骤报 `EPERM: operation not permitted, symlink`）。

启用（管理员 / 点一次 UAC）：

```powershell
$p = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock'
New-Item -Path $p -Force | Out-Null
Set-ItemProperty -Path $p -Name AllowDevelopmentWithoutDevLicense -Value 1 -Type DWord
```

图形界面等价路径：设置 → 系统 → 开发者选项 → 开发人员模式。**新进程立即生效，不用重启。**

> 注：`scripts/deref-next-symlinks.mjs` 就位后，插件不再走"重建符号链接"那条路，
> 所以这一步**理论上可能已非必需** —— 但没有实测过（要关掉开发者模式才能验），
> 留着无害，别急着关。

## 日常部署

```bash
cd /d/C语言自学网站创作/web
netlify deploy --build --prod      # 一条命令，不要拆开！
```

### 为什么必须一条命令，不能拆成 build + deploy

插件的生命周期是：

- `onPostBuild` → `publishStaticDir`：把 `.netlify/static` **换进** `.next`
- `onEnd` → `unpublishStaticDir`：再换回来

也就是说**构建和上传必须在同一个进程里**。单独跑 `netlify build` 会在结束时把目录
换回去，再 `netlify deploy --no-build` 上传的就只剩空壳（症状：静态资源全 404，
`clang.pkg.gz` 打不开，但首页居然还能显示）。

另外 `netlify deploy` 现在**默认就带构建**（等于 `--build`），所以也别想用"省略
--build"来绕过构建。

### 构建命令里那一步不能删

`netlify.toml` 的 `build.command` 是：

```
npm run build && node scripts/deref-next-symlinks.mjs
```

第二步**不是可选的** —— 删掉线上所有依赖数据库的动态路由都会 500。原因见下面第 1 条。

## 环境变量

```bash
node scripts/push-netlify-env.mjs   # 改过密钥才需要跑
```

| 变量 | 来源 | 用途 |
|---|---|---|
| `DATABASE_URL` | .env.local | Supabase pooler 连接串（运行时） |
| `DIRECT_URL` | .env.local | 直连串（迁移用） |
| `AUTH_SECRET` | 脚本新生成，存 `.netlify/auth-secret` | NextAuth 签名 |
| `CRON_SECRET` | .env.local | 保活端点口令 |
| `NEXT_PUBLIC_SITE_URL` | 脚本固定写死 | sitemap / robots / OG 的绝对地址 |

⚠️ `AUTH_SECRET` 是 Netlify 独立的一份，**不复用 Vercel 那个**。脚本把它存在
`.netlify/auth-secret`，重复运行会复用 —— 否则每跑一次就把所有已登录用户踢下线。

脚本会**回读校验**（重新拉列表核对 key、值、scope），报告的是服务端实际状态。

### 为什么不用 `netlify env:import`（踩过）

两个原因，第二个很致命：

1. 它会把导入的值**原样回显**到 stdout（`CRON_SECRET` / `AUTH_SECRET` 明文，
   只有 `DATABASE_URL` 里的密码被 Netlify 自己打了码）。
2. **它会静默丢变量。** 实测 5 个变量只进去了 2 个
   （`DATABASE_URL` / `AUTH_SECRET` / `NEXT_PUBLIC_SITE_URL` 全没了），
   而命令返回 0、没有任何报错。表现就是线上所有动态路由 500 ——
   因为函数里读不到数据库地址和签名密钥。它的实现是"先删同名再创建"，
   中途被网络打断就只剩残缺状态。

自己调 API 时注意：`createEnvVars` 的 body 是**数组**（envelope 格式），
传单个对象会得到 `HTTP 400 {"error":"param is missing or the value is empty: _json"}`，
这个报错完全看不出真正原因。格式抄自 netlify-cli 的
`dist/utils/env/index.js` → `translateFromMongoToEnvelope`。另外 POST 是**创建**
语义，键已存在时返回 422，需要"删掉重建"。

## 保活定时任务

`netlify/functions/keepalive.mjs`，每 6 小时（`0 */6 * * *`，UTC）调一次
`/api/keepalive`。构建日志里能看到注册结果：

```
functions:
  keepalive:
    schedule: 0 */6 * * *
```

Next Runtime v5 **不再支持** Next 的 `experimental-scheduled` API route，
定时任务必须写成普通 Netlify Function —— 所以它是一个「自己调自己」的壳。
详见 `docs/keepalive.md`。

验证方式（带口令应 200 并返回真实表计数；口令从 .env.local 读，不经过命令行）：

```bash
cd /d/C语言自学网站创作/web
node -e "
const fs=require('fs');
const env={};
for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=/^\s*([A-Za-z_]\w*)\s*=\s*(.*)\$/.exec(l);if(m)env[m[1]]=m[2].trim().replace(/^[\"']|[\"']\$/g,'');}
(async()=>{
  const b='https://c-study-room.netlify.app/api/keepalive';
  console.log('无口令:', (await fetch(b)).status, '(应 401)');
  const r=await fetch(b,{headers:{authorization:'Bearer '+env.CRON_SECRET}});
  console.log('带口令:', r.status, '(应 200)');
  console.log(await r.text());
})();
"
```

## 踩过的坑

### 1. 符号链接指向 Windows 绝对路径（最耗时，症状最具误导性）

**症状**：部署成功、首页和所有静态页正常，但**所有依赖数据库的动态路由 500**
（`/login`、`/forum`、`/progress`、`/settings`、`/api/keepalive`），
响应体只有一句 `Internal Server Error`。

**根因**：`next build` 为被外部化的包在 `.next/node_modules/` 下生成链接：

```
.next/node_modules/@prisma/client-2c3a283f134fdcb6
  -> D:\C语言自学网站创作\web\node_modules\@prisma\client     ← Windows 绝对路径
```

而 `@netlify/plugin-nextjs` 复制 node_modules 时用
`cp(..., { verbatimSymlinks: true })` —— **照抄链接文本**，不做解引用。
上传到 Linux 容器后是 `/var/task/...`，链接指向不存在的 Windows 路径：

```
Failed to load external module @prisma/client-2c3a283f134fdcb6:
  Error: Cannot find module '@prisma/client-2c3a283f134fdcb6'
```

**为什么极难排查**：环境变量、blob 上下文、函数注册形态（都是
`runtimeAPIVersion=2`）、静态资源全部正常，很容易误判成 Prisma、Blobs、
Next 版本或 Netlify 平台问题。

**修法**：`scripts/deref-next-symlinks.mjs` 在构建命令里、插件复制**之前**
把链接换成实体副本。目标目录**必须包含 `.next/standalone`**：

```js
const ROOTS = [".next/standalone", ".next/node_modules"];
```

因为插件复制的源头是 standalone 产物（`dist/build/content/server.js`）：

```js
const srcDir = join(ctx.standaloneDir, ctx.nextDistDir);
```

只修 `.next/node_modules` 是**没用的** —— 脚本会报告"替换 3 个"全部成功，
部署后动态路由依然 500。（这个坑实际踩过一次。）

当前涉及 3 个包：`@prisma/client`、`pg`、`shiki`。

### 2. 静态资源缺 COOP/COEP，运行器的 Worker 被浏览器拦掉

**症状**：页面正常，但点「运行」后提示「编译器没能准备好 / 运行器 Worker 出错：未知错误」。

**根因**：`next.config.ts` 里的 `/:path*` 规则只覆盖**页面路由**（走服务端处理器，
头由 Next 运行时加）。`/_next/static/*` 和 `/wasmer/*` 是从 CDN 直发的静态文件，
运行时不给它们加头 —— 实测线上这些响应**完全没有 COOP/COEP**，而本地
`next start` 是有的。于是 Worker 脚本在 `require-corp` 的页面里因缺头被拦：

```
net::ERR_BLOCKED_BY_RESPONSE  /_next/static/chunks/turbopack-worker-*.js
```

**修法**：在 `netlify.toml` 里给这两类路径补 `[[headers]]`（见文件内注释）。
只对静态资源生效，不碰 HTML 路由，避免与运行时重复下发 COOP/COEP
（重复值会被浏览器判为无效）。

**验证**：本地 `next start` 跑同一段 C 代码是通的
（`运行结束（退出码 0）· 684 ms · clang-wasm · 1+2+...+10 = 55`），
对比线上即可定位到平台差异。

### 3. blob 上传：一个连接超时就中止整个部署

**症状**：`netlify deploy` 报 `Failed while uploading blobs to deploy store`，
错误体是空对象 `{}`，看不到任何原因。

**根因**：部署存储走 **AWS us-east-2** 的签名 URL，从本机（校园网）到那批 IP
**间歇性连接超时**（实测 28 个 blob 里 27 成功、1 超时）。而 `@netlify/build`
的实现是"任何一个失败就 `stopQueue` 中止整个部署"。

**修法**：`scripts/patch-netlify-cli.mjs` 给单次 `blobStore.set` 加上最多 6 次、
递增退避的重试。**升级 netlify-cli 后需要重新运行本脚本**（幂等，已打过会跳过）。

### 4. Windows 上 `fs.cpSync` 在源路径含中文时崩溃

`D:\C语言自学网站创作\...` → 进程异常退出 `0xC0000409`（栈缓冲区溢出），
**没有任何错误信息**。实测同样两个目录：纯 ASCII 路径正常、含中文的源路径必崩。

所以 `deref-next-symlinks.mjs` 里用 `readdirSync` + `copyFileSync` 手写递归
（走另一条底层实现）。npm 自己也是这么干的，所以 npm 一直没问题。

### 5. 新站点默认开启访问保护（SSO）

新建站点会继承账号级的 `site_sso_login: true`，任何访客都被重定向到
`app.netlify.com/edge-access` —— 直接把"分享给同学"的意义抹掉。

**修法**（API，只关站点级；`sso_login_context` 不能设 `"off"`，枚举不含该值）：

```
PATCH /api/v1/sites/<site_id>   body: {"sso_login": false}
```

⚠️ 账号级默认值仍是 `site_sso_login: true`，**以后新建站点还会默认开启**，
需要重复这一步。

### 6. 发布体积虚高 106 MB

`fetch-toolchain.mjs` 原来把 105.6 MB 的原始 `clang.pkg` 写在 `public/toolchain/`，
而浏览器只取 `.gz`；Netlify 会把 `public/` 整个复制进发布目录上传。
已挪到 `.cache/toolchain/`，发布体积 146 MB → 40 MB。

### 7. 其他零碎

- **`netlify env:list`** 在 TTY 下问 "Show values? (y/N)"，会挂住非交互调用；
  `--json` 返回的是 `{KEY: "明文值"}` 而不是元数据，只能取 `Object.keys()`。
- **`shell: true` + 超时会留孤儿进程**：杀掉的是 cmd.exe 外壳，真正的 CLI
  继续挂着（实测卡出过 3 个僵尸 node 进程）。脚本改成 `process.execPath` +
  `netlify-cli/bin/run.js` 直调。
- **`netlify api` 子命令在本机间歇性挂死**（同样的命令在 bash 里直接跑有时也会），
  脚本里都加了超时 + 重试，或改用自己 fetch API。
- **extensions 403**：构建时 `@netlify/config` 会去 `api.netlifysdk.com` 拉站点
  extensions，偶发 403（瞬时，同一时刻 curl 同一端点是 200），但 CLI 遇到它会
  **卡死几分钟**。`netlify build --offline` 能跳过（`offline: true` 时直接
  `return []`），但 `deploy` 不支持该参数，所以只能重试。
- **Next 的私有目录**：`_` 开头的目录（如 `src/app/api/_diag/`）**不参与路由**，
  访问会拿到 404 页面。临时诊断路由起名要避开下划线。
- **`NEXT_PUBLIC_SITE_URL` 缺省会退回 `http://localhost:3100`**（sitemap / robots /
  OG 全错），Netlify 上必须显式设。`src/lib/site-url.ts` 现在也认 Netlify
  注入的 `URL`。
- **`publish = ".next"` 不是问题**：`netlify.toml` 里写 `.next` 是对的，
  插件会把 `.netlify/static` 换进去（不要改成 `.netlify/static`）。

## 排查手段（下次再用得上）

- **拿不到函数日志**：免费版 `netlify logs` 返回 "No logs found"，
  Netlify 公开 API 也没有函数日志端点。Next 生产模式又把错误换成
  "Internal Server Error"。可用的办法：
  1. 在 `src/instrumentation.ts` 里用 `onRequestError` 捕获真实堆栈；
  2. 把结果塞进 `globalThis`，由一条诊断路由读回（同一 Lambda 实例内有效）；
  3. 或转发到普通 Netlify Function 再写进 Blobs（跨实例）。
- **本地复现打包产物**：`.netlify/functions-internal/___netlify-server-handler/`
  就是完整的函数包，可以直接 `import` 它的 `___netlify-server-handler.mjs`
  在本地调 handler，能拿到线上一样的堆栈。
- **对比本地与线上**：本地 `npx next start -p 3100` 是重要的对照组
  （静态资源的头、Prisma、运行器都在这里能跑通）。
- **API 直查部署状态**：`GET /api/v1/sites/<id>/deploys?per_page=N`；
  卡住的部署要**先 cancel 再 delete**（`state=new/uploading` 时直接 DELETE 会 405）。

## 回滚 / 备用 Vercel

`vercel.json` 保留未动，Vercel 那边仍可部署（`vercel --prod`）。两个平台环境
变量各自独立（`AUTH_SECRET` 不同），互不影响。

## 相关文件

- `netlify.toml` — 构建命令、发布目录、Node 版本、静态资源隔离头、定时函数 schedule
- `netlify/functions/keepalive.mjs` — 保活定时函数
- `scripts/deref-next-symlinks.mjs` — **去掉 Windows 绝对路径符号链接（关键）**
- `scripts/push-netlify-env.mjs` — 推环境变量并回读校验
- `scripts/rotate-cron-secret.mjs` — 轮换 CRON_SECRET
- `scripts/patch-netlify-cli.mjs` — 给 CLI 的 blob 上传加重试
- `scripts/fetch-toolchain.mjs` — 抓 clang 工具链
- `.netlify/state.json` — CLI 关联状态（siteId），已被 .gitignore 忽略
