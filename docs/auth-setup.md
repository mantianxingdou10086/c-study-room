# 登录体系：实现决定与踩坑记录（M2）

> 这份文档记录了登录/注册是怎么做的，以及**六个花了很久才定位的坑**。
> 其中三个是产品缺陷（真实用户会踩），三个是测试/环境问题。

---

## 1. 实现决定

| 决定 | 理由 |
|---|---|
| **JWT 会话**，不用数据库会话 | 只有「邮箱+密码」一种登录方式，不需要 OAuth 账号关联，因此不需要 Prisma adapter。JWT 存 cookie，每次请求只解码不查库 |
| **不用 middleware 做路由保护**，在页面里 `await auth()` 判断 | middleware 跑在 Edge Runtime，而 `auth.ts` 要 import Prisma，拆两套配置只为省一次判断不划算。现在受保护的页面只有 `/progress` 和 `/settings` |
| **顶栏登录态是客户端组件**，自己 fetch `/api/auth/session` | 在 layout 里 `await auth()` 会让**所有页面**变成动态渲染（读 cookie 就不能静态生成），而讲义页要 SSG（29 个静态页）。放客户端就没有这个代价 |
| 密码用 **bcryptjs**，代价因子 10 | 纯 JS 实现（无原生编译，Windows 上不会出问题），约 100ms，足够挡离线爆破又不拖慢登录 |
| 邮箱统一 **trim + 转小写**后存储 | 否则 `A@b.com ` 和 `a@b.com` 会是两个账号 |

### 三个安全细节（都是有意为之）

1. **密码上限按字节算（72 字节），不是字符数**。bcrypt 只处理前 72 字节，超出部分**静默忽略**。
   按字符数限制的话，一个 30 字的中文密码（90 字节）会被悄悄截断，用户以为设了长密码其实只生效前 24 个字。
2. **不区分「邮箱不存在」和「密码错误」**，都回同一句话。否则登录接口会变成"邮箱是否已注册"的探测器。
3. **用户不存在时也走一次 bcrypt.compare**（拿一个假哈希比），让两条路径耗时接近，
   避免通过响应时间推断某个邮箱是否已注册。

---

## 2. 三个产品缺陷（真实用户会踩）

### 2.1 hydration 之前点提交 = 浏览器原生 POST，输入全丢

**现象**：慢网络下用户点「登录」，页面刷新一下，输入框清空，什么都没发生。
**根因**：React 接管之前，`<form action={serverAction}>` 只是**普通 HTML 表单**（`action=""`），
点提交会走浏览器原生 POST 到当前 URL。服务端不会有任何日志，极难排查。
**修法**：`useHydrated()` —— hydration 完成前禁用提交按钮（显示「加载中…」）。
**实测**：e2e 里第一次点击就是这样静默失效的，服务端日志干干净净。

### 2.2 登录成功后顶栏还是「登录/注册」

**现象**：登录成功、跳转到 `/learn` 了，但顶栏仍然显示「登录 / 注册」，用户以为没登上。
**根因**：`UserMenu` 挂在 layout 上，客户端跳转时**不会重新挂载**，
它的 `useEffect([])` 只在首次加载时跑过一次（那时还是未登录）。
**修法**：把 `usePathname()` 放进 effect 依赖 —— 跳转后自然重新查一次会话。

### 2.3 错误提示被 Next.js 自己的元素干扰（测试侧，但暴露了语义问题）

`getByRole("alert")` 会同时命中我的错误提示框和 Next.js 的 `__next-route-announcer__`
（它也带 `role="alert"`），导致 Playwright strict mode 报错。
**修法**：给提示框加 `data-testid="form-error"`，测试用它定位。

---

## 3. 三个测试/环境问题（会让人误判"代码坏了"）

### 3.1 断言必须用**同一个 page**

写错过一次：`registerNewUser(page.context())` 这个 helper 内部 `newPage()` 建了新页面，
而断言 `page.waitForURL(...)` 等在**原来那个没用的页面**上 —— 永远等不到跳转。
表现是"注册没反应"，其实是断言看错了对象。

### 3.2 端口被旧服务占着 → 测到的是旧构建

这个坑咬了好几次，症状极具误导性：
- 旧进程占着端口 → 我新起的服务 `EADDRINUSE` **静默退出**（后台进程不报错）
- 于是浏览器请求到的是**旧构建**：静态 chunk 全部 500、新路由 404
- 看起来像"代码坏了"，实际是环境脏

**对策**：
1. `playwright.config.ts` 里 `reuseExistingServer: false` —— 端口被占会**立刻报错**而不是复用旧服务
2. 跑 e2e 前先确认端口空闲（或用完就杀）
3. `webServer.command` 是 `npm run build && npm run start`，保证测的是当前源码

### 3.3 Playwright 默认**不转发** webServer 的 stdout

于是 server action 里 `console.error` 打的东西全看不到，
排查"注册失败"时会被这个默认值坑很久。已在配置里显式设 `stdout: "pipe"` / `stderr: "pipe"`。

---

## 4. 验收

```bash
npx playwright test tests/e2e/auth.spec.ts --workers=1
```

六个用例覆盖：

| 用例 | 验的是什么 |
|---|---|
| 注册成功后自动登录，顶栏显示用户名 | 注册 → 自动登录 → 界面真的变了 |
| **换一个浏览器上下文登录后身份仍在** | **会话在服务端**（不是 localStorage）—— 这是 M4"进度存档"的地基 |
| 密码错误时有明确提示 | 失败路径有可读反馈，且不泄露邮箱是否存在 |
| 重复邮箱注册会被拒绝 | 唯一约束 + 可读提示（P2002 → 人话） |
| 前端校验：两次密码不一致 | 校验在服务端也生效 |
| 退出登录后回到未登录状态 | signOut 清掉会话 |

测试会在真实库里建用户，`afterAll` 按 `e2e-%@example.invalid` 删掉，不留垃圾数据。

**调试用的探针脚本**（都在 `scripts/`，排查时很有用）：
`probe-auth.mjs`（登录/注册全流程）、`probe-register.mjs`、`probe-login.mjs`（含表单 name 自检）、
`probe-auth3.mjs`（复现 e2e 条件）、`inspect-trace.mjs`（解剖 playwright trace.zip 看 POST 状态与响应）。
