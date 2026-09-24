# M1 Spike：浏览器里到底能不能真的跑 C？

> 这是 M1 的交付物之一：**用实测数据决定默认引擎**，而不是靠猜。
> 所有数字都来自本机实跑，命令写在每节末尾，可复现。

结论先说：**能。而且用的是真正的 clang 16**（不是"差不多能跑"的解释器）。但代价是一次性 34 MB 下载。

---

## 1. 候选方案与实测结果

| 方案 | 能不能跑 `int main(void)`（书里的标准写法） | 结构体 | malloc | 死循环可拦 | 体积 | 结论 |
|---|---|---|---|---|---|---|
| **JSCPP 2.0.9**（纯 JS 解释器） | ❌ 原生不支持，需改写 | ❌ | ❌ | ✅ 1501ms 拦住 | 150 KB | 只能当"秒开模式" |
| **clang/clang @ Wasmer registry**（clang 16.0.0 → wasm32-wasi） | ✅ | ✅ | ✅（`-std=c99`） | ✅ | 105.6 MB 原始 / 32.5 MB gzip | **默认引擎** |
| `clang-wasm`（npm） | — | — | — | — | 97 KB | ❌ 是本地 CLI 包装器，不是浏览器 wasm |
| `wasm-clang`（npm） | — | — | — | — | — | ❌ 不存在（404） |
| `jscpp`（小写，npm） | — | — | — | — | — | ❌ 不存在；真名是大写 `JSCPP` |

## 2. JSCPP 的真实能力边界（8/15，逐条实测）

`node scripts/probe-jscpp.ts` 的输出：

| 用例 | 结果 |
|---|---|
| `int main(void)` | ❌ `2:10 missing declarator for argument` |
| `int main()` | ✅ `hi` |
| 自定义函数 `int f(void)` | ❌ `2:7 missing declarator for argument` |
| `scanf("%d", &n)` | ✅ `42` |
| `for (int i = 1; i <= 3; i++)` | ✅ `123` |
| `printf("%.2f", 1.0/4)` | ✅ `0.25` |
| 数组 + 下标 | ✅ `6` |
| 指针 `int *p = &x; *p = 9;` | ✅ `9` |
| `char s[]="hello"` + `strlen` | ✅ `5` |
| **结构体** | ❌ `type struct P is not defined` |
| **malloc / free** | ❌ `variable malloc does not exist` |
| 位运算 `6 & 3` | ✅ `2` |
| `while(1){}` | ✅ 被 `maxTimeout` 拦住（`Time limit exceeded`，1501ms） |
| 缺分号的语法错误 | ✅ 抛 `ERROR: Parsing Failure`（可映射为"编译错误"） |

**关键发现：** JSCPP 是 **C++ 解释器**，所以 C 的规范写法 `int main(void)` 直接不认——而 K.N.King 书里每个例子都这么写。这决定了它不能当默认引擎。

**处理方式：** 加一层 `applyCppCompatShim()`，只把**参数列表里**的 `(void)` 改写为 `()`（不碰 `(void) expr` 这种强制类型转换），并且**把改写这件事显示给用户**（`RunResult.notes`）——偷偷改学生的代码比报错更糟。加上这层改写后，JSCPP 的 7 条契约用例全部通过（见 `tests/unit/c-runner/engine-contract.test.ts`，9/9）。

## 3. clang → WASM 的完整链路（Node 侧实测）

`node scripts/probe-clang-pipeline.mjs`：**5/5 通过**

| 用例 | 编译产物 | 运行结果 | 耗时（已缓存） |
|---|---|---|---|
| hello | 47 KB | `hi\n` ✅ | 892 ms |
| scanf（stdin=`21`） | 100 KB | `42\n` ✅ | 1413 ms |
| array | 47 KB | `6\n` ✅ | 1000 ms |
| **struct** | 47 KB | `9\n` ✅ | 635 ms |
| 缺分号 | — | 编译失败（符合预期）✅ | 483 ms |

链路（每一步都实测过）：

```
写 main.c 进沙箱  →  clang -std=c99 -O0 -o main.wasm main.c
                 →  fs.readFile("main.wasm") 取出字节
                 →  wasmer.packages.load(bytes) 得到可执行包
                 →  新沙箱 command("main").run({ stdin, timeoutMs, outputBytes })
```

包内可用的命令：`clang`、`clang-16`、`lld`、`llvm-ar`、`llvm-nm`、`wasm-ld`
（`clang --version` → `clang version 16.0.0 … Target: wasm32-unknown-wasi`）

### 踩到的坑（都已解决，写在这里免得重踩）

1. **`output.text()` 在非 0 退出码时会抛异常**，即使传了 `check:false`。
   要拿 stdout 用 `output.stdout.text()`，拿 stderr 用 `output.stderr.text()`。
2. **编译错误的原文在 `stderr`**：`bad.c:2:31: error: expected ';' after expression` + 插入符 + `1 error generated.`
   —— 这正是 M5「把 gcc 报错翻译成人话」要解析的输入。
3. **`onProgress` 的 `percent` 可能是 `null`**，类型上不能声明成 `number | undefined`。
4. **页面必须 cross-origin isolated**（`Cross-Origin-Opener-Policy: same-origin` +
   `Cross-Origin-Embedder-Policy: require-corp`），否则 WASIX 的 worker 起不来。已写进 `next.config.ts`。
5. **105 MB 的 wasm 不要在同步路径上实例化**（Chrome 禁止主线程同步编译 >4 KB 的 wasm 模块），
   所以引擎跑在 Web Worker 里。

## 3.5 浏览器侧实测（Chromium，生产构建）

`node scripts/run-browser-probe.mjs` 打开 `/dev/runner-probe` 的实测日志：

```
crossOriginIsolated=true
[107ms]  SDK 已从 /wasmer/dist/index.js 加载
[224ms]  wasmer ready()
[2443ms] 自托管包已加载（34 MB gzip → 105.6 MB → packages.load）
[2599ms] clang --version → exit=0  stdout="clang version 16.0.0 … Target: wasm32-unknown-wasi"
[3053ms] 编译 → exit=0
[3060ms] ✅ 运行结果 = "hi\n"  (wasm 47333B)
```

**首次全流程约 3.0 秒**（本机 localhost 取包；真实网络下主要瓶颈是那 34 MB 下载）。
第二次运行（热态）：加载 0.8s + 编译运行 0.3s。

## 3.6 ⚠️ 最大的坑：打包器把 SDK 内部的 worker 依赖吃掉了

这是整个 M1 里唯一"看起来完全无法解释"的故障，记录下来免得重踩。

**症状：** 浏览器里命令"跑"了但立刻返回 `exit=1` 且 stdout/stderr 全空，
第二条命令直接抛：

```
WasmerError: command execution failed: unable to spawn the command:
Initialization function failed - the thread pool is shut down: Scheduler is dead
```

**排查过程：** 探针页逐步打印 + Playwright 记录网络失败请求，发现：

```
[worker+] /_next/static/media/browser-worker.0vewoqxt-m52c.js      ← 起来了
[http 404] /_next/static/media/node-compat.js        ← 但它的依赖全 404
[http 404] /_next/static/media/host-filesystem.js
[http 404] /_next/static/media/capi-worker-bridge.js
[http 404] /_next/static/media/node-network-rpc.js
```

**根因：** `@wasmer/sdk` 用 `new URL("./browser-worker.js", import.meta.url)` 起自己的 worker，
而那个 worker 还要 import 同目录的 4 个模块。Turbopack 只把 `browser-worker.js` 当"媒体资源"发出去了，
其余 4 个没有。worker 启动即失败 → 线程池死掉 → 所有命令都 spawn 不出来。
（Node 侧完全正常，因为 Node 直接读真实文件布局——所以这个问题只在打包后出现。）

**解法：** 把 SDK 的浏览器运行时**原样自托管**，让 `import.meta.url` 指向真实文件：

```
node scripts/vendor-wasmer-sdk.mjs
  → public/wasmer/dist/**   （含 browser-worker.js / host-filesystem.js / node-compat.js …）
  → public/wasmer/pkg/**    （含 wasmer_sdk_js_bg.wasm 4.8 MB）
```

加载方式改为运行时动态 import，并用 `new Function` 把说明符藏起来，避免打包器改写：

```ts
const dynamicImport = new Function("u", "return import(u)");
const mod = await dynamicImport("/wasmer/dist/index.js");
```

好处有三：修掉了这个 bug；SDK 不再进客户端 bundle；以后升级 SDK 只需重跑 vendor 脚本。

## 3.7 端到端验收（`npx playwright test tests/e2e/playground.spec.ts`，生产构建）

**6/6 通过**，全部是在真实 Chromium 里、跑真实 clang 产出的结果：

| 用例 | 实测输出 |
|---|---|
| 页面隔离 + 默认引擎 | `crossOriginIsolated=true`，默认引擎 `clang-wasm` |
| hello | `"Hello, world!\n"`，首次（含工具链）**3.4s**，第二次 **0.2s** |
| scanf（stdin=21） | `"请输入一个整数：它的两倍是 42\n"` |
| 结构体 | clang → `"(3, 4)\n"`；秒开模式 → `"快速模式不支持结构体定义（第 16 章内容）…"` |
| 编译错误 | `main.c:5:30: error: expected ';' after expression` + 插入符 + `1 error generated.` |
| 死循环 | 运行 2.0s 时页面 `readyState=complete`（**没冻结**），8.5s 被超时拦住 |

> 每个用例是独立 context（无 HTTP 缓存共享），所以每次都重新走一遍 34 MB → 3.4s。
> 真实用户第二次访问走浏览器缓存，接近 0.2s 那条。

## 4. 自托管工具链（解决国内网络与第三方依赖）

registry 的包体可以**离线自托管**：`wasmer.packages.load(<本地字节>)` 直接吃 105.6 MB 的包文件，
命令列表与在线加载完全一致，编译运行结果一致（实测输出 `hi`）。

```
node scripts/fetch-toolchain.mjs
  → public/toolchain/clang.pkg      105.6 MB  原始
  → public/toolchain/clang.pkg.gz    32.5 MB  浏览器用 DecompressionStream 解压
  → public/toolchain/meta.json       体积 / sha256 / 版本，供前端展示"要下多少"
```

- 体积：gzip -6 → 32.5 MB；brotli -q 11 → 21.4 MB（若要更省流量，改用 `.br` + `Content-Encoding: br`）
- 运行时只依赖自己的域名（`NEXT_PUBLIC_CLANG_PKG_URL` 可指向任意 CDN），不再跨境访问 registry.wasmer.io
- 这两个文件已加入 `.gitignore`：**体积太大不进版本库**，部署时靠构建步骤或 CDN

## 5. 引擎选择策略（最终）

| | 默认引擎 `clang-wasm` | 备选 `jscpp` |
|---|---|---|
| 定位 | 教学与判题的**权威结果** | 零下载的**即时反馈** |
| 触发条件 | 默认 | 用户手动切换 / 工具链下载失败时自动建议 |
| 首次成本 | 32.5 MB（一次性，之后走浏览器缓存） | 0 |
| 每次运行 | 0.5~1.5 s（编译 + 运行） | 10~50 ms |
| 能力 | 完整 C99 | C 子集（无结构体/malloc），`(void)` 被改写 |

**为什么默认不是"快的那个"：** 这是一个教 C 的站点，判题正确性 > 首屏速度。
如果学生写的 `int main(void)` 在某个引擎下跑不通、或者结构体代码给出错误结果，
那这个站点就是在教错东西。32.5 MB 一次性的代价，用进度条 + 明确的文案（"只需一次，之后走缓存"）来消化。

## 6. 复现命令

```bash
cd web
node scripts/probe-jscpp.ts                      # JSCPP 能力边界
node scripts/probe-wasmer.mjs                    # registry 里有没有 clang
node scripts/probe-clang-pipeline.mjs            # clang 编译→运行完整链路（Node）
node scripts/probe-stderr-and-selfhost.mjs       # stderr 获取方式 + 自托管可行性
node scripts/fetch-toolchain.mjs                 # 抓取并自托管 clang 工具链（34 MB gzip）
node scripts/vendor-wasmer-sdk.mjs               # 自托管 @wasmer/sdk 浏览器运行时（必须，见 3.6）
npm run build && npx next start -p 3100          # 起生产构建
PROBE_URL=http://127.0.0.1:3100/dev/runner-probe node scripts/run-browser-probe.mjs
npx vitest run tests/unit/c-runner               # 引擎契约测试（15/15）
npx playwright test tests/e2e/playground.spec.ts # 浏览器内真实编译运行（6/6）
```

## 7. 遗留问题（交给后续里程碑）

- **首屏 32.5 MB 对校园网是否可接受？** 需要真实用户测。若不行，退路是：默认 JSCPP + 后台静默预取工具链。
- **Vercel 在中国大陆的访问质量**：`*.vercel.app` 常见被墙/极慢。部署阶段（M8）要评估换 Cloudflare Pages
  或国内对象存储托管静态资源 + 工具链包。
- **brotli 传输**：目前用 gzip（`DecompressionStream` 原生支持）。换 `.br` 能再省 11 MB，但要靠服务器
  下发 `Content-Encoding: br`，需要按托管平台配置。

---

## 8. 结论

**M1 的目标达成：浏览器里能跑真正的 C 编译器，且有可复现的证据链。**
默认引擎定为 `clang-wasm`（真编译器），`jscpp` 作为零下载的即时备选。
代价与风险已量化：首访 34 MB、每次运行 0.2~1.5s、需要 COOP/COEP、两处（SDK 运行时与 clang 包）必须自托管。
