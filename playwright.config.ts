import { defineConfig, devices } from "@playwright/test";

/**
 * 首屏要下 34 MB 的 clang 工具链并在 wasm 里实例化，所以超时给得很宽松。
 *
 * ⚠️ `reuseExistingServer: false` + 构建后再启动，是为了避免一个**会污染验证结果的坑**：
 * 如果复用一个早前启动的 `next start`，它服务的可能是**旧构建**——
 * 于是 e2e 测的是过期产物，新路由 404、测试挂到超时，而你会以为是自己代码写错了。
 * 宁可每次多花十几秒构建，也要保证"测的就是当前源码"。
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 300_000,
  /**
   * 默认断言超时故意设短：定位器写错时应该 20 秒就失败，而不是干等 4 分钟
   * （第一版设成 240s，一个写错的 getByRole 就让整套测试挂满 4 分钟）。
   * 真正需要长等待的地方（首次下载 34MB 工具链）在那个用例里单独传 timeout。
   */
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 300_000,
    /**
     * ⚠️ 把服务端 stdout 转发出来。默认 Playwright **不转发** webServer 的输出，
     * 于是 server action 里 `console.error` 打的东西全看不到 ——
     * 排查"注册失败"这类问题时会被这个默认值坑很久。
     */
    stdout: "pipe",
    stderr: "pipe",
  },
});
