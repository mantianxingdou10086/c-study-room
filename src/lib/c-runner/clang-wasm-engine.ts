/**
 * Clang 16 → WebAssembly 引擎（真编译器）。
 *
 * 实测事实（见 docs/runner-spike.md）：
 *  - registry 包 `clang/clang` 是 clang 16.0.0，target wasm32-unknown-wasi，
 *    内含 clang / clang-16 / lld / llvm-ar / llvm-nm / wasm-ld
 *  - 流程：把 main.c 写进沙箱 → clang 编译出 main.wasm → 读回字节 →
 *    packages.load(bytes) 得到可执行包 → 新沙箱里跑，stdin 直接喂字符串
 *  - 105.6 MB 原始包，gzip 后 33.9 MB；一次性下载，之后走浏览器缓存
 *  - 编译错误从 `output.stderr.text()` 拿（注意：`output.text()` 会在非 0 退出时抛错）
 *  - 页面必须 cross-origin isolated（COOP/COEP，见 next.config.ts）
 */
import type { CEngine, RunOptions, RunResult } from "./engine";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
  fail,
  toMessage,
} from "./engine";

/** 自托管包地址；也可指向 CDN。gzip 版由浏览器 DecompressionStream 解压。 */
const PKG_URL =
  process.env.NEXT_PUBLIC_CLANG_PKG_URL ?? "/toolchain/clang.pkg.gz";
/** 找不到自托管包时，是否回退到 registry.wasmer.io */
const ALLOW_REGISTRY_FALLBACK = true;

const enc = new TextEncoder();

/**
 * SDK 自托管地址。
 *
 * 为什么不用 `import("@wasmer/sdk/browser")`：实测交给 Turbopack 打包时，
 * SDK 内部的 worker 会找不到 `host-filesystem.js` / `node-compat.js` /
 * `capi-worker-bridge.js` / `node-network-rpc.js`（全部 404），
 * 表现是命令静默 exit=1，然后抛
 * `WasmerError: … the thread pool is shut down: Scheduler is dead`。
 * 改成从 public/wasmer/ 加载原始文件布局后一切正常（见 docs/runner-spike.md）。
 */
const SDK_URL =
  process.env.NEXT_PUBLIC_WASMER_SDK_URL ?? "/wasmer/dist/index.js";

type WasmerModule = typeof import("@wasmer/sdk/browser");
type WasmerInstance = InstanceType<WasmerModule["Wasmer"]>;

let sdkPromise: Promise<WasmerModule> | null = null;

async function loadSdk(): Promise<WasmerModule> {
  sdkPromise ??= (async () => {
    // 用 new Function 把说明符彻底藏起来，避免打包器改写这个运行时 URL
    const dynamicImport = new Function("u", "return import(u)") as (
      u: string,
    ) => Promise<WasmerModule>;
    return dynamicImport(SDK_URL);
  })();
  return sdkPromise;
}

async function fetchWithProgress(
  url: string,
  onProgress?: (ratio: number) => void,
): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const total = Number(res.headers.get("content-length") ?? 0);
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.(1);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total > 0) onProgress?.(Math.min(1, got / total));
  }
  const out = new Uint8Array(got);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** gzip → 原始字节（浏览器原生 DecompressionStream） */
async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export class ClangWasmEngine implements CEngine {
  readonly name = "clang-wasm";
  readonly label = "Clang 16（真实编译器）";
  readonly description =
    "与 gcc 行为一致的真正编译器：支持指针、结构体、malloc。首次使用需下载约 34 MB 工具链。";

  private wasmer: WasmerInstance | null = null;
  private compiler: Awaited<ReturnType<WasmerInstance["sandboxes"]["create"]>> | null =
    null;
  private initPromise: Promise<void> | null = null;
  /** 记录包体大小，UI 用它提示"要下多少" */
  lastLoadInfo: { source: "self-hosted" | "registry"; bytes: number } | null = null;

  async init(onProgress?: (ratio: number) => void): Promise<void> {
    if (this.compiler) return;
    // 并发调用只跑一次
    this.initPromise ??= this.doInit(onProgress).catch((e) => {
      this.initPromise = null;
      throw e;
    });
    return this.initPromise;
  }

  private async doInit(onProgress?: (ratio: number) => void): Promise<void> {
    const mod = await loadSdk();
    const wasmer = new mod.Wasmer();
    this.wasmer = wasmer;

    let pkg: Awaited<ReturnType<WasmerInstance["packages"]["load"]>> | null = null;

    // 1) 优先自托管：一次性下载 + 浏览器缓存
    try {
      onProgress?.(0);
      const gz = await fetchWithProgress(PKG_URL, (r) => onProgress?.(r * 0.9));
      const raw = await gunzip(gz);
      pkg = await wasmer.packages.load(raw);
      this.lastLoadInfo = { source: "self-hosted", bytes: gz.length };
      onProgress?.(0.95);
    } catch {
      pkg = null;
    }

    // 2) 回退 registry（自托管包没准备好时仍能用）
    if (!pkg) {
      if (!ALLOW_REGISTRY_FALLBACK) {
        throw new Error(
          `没能加载自托管编译器包（${PKG_URL}）。请先运行 node scripts/fetch-toolchain.mjs`,
        );
      }
      pkg = await wasmer.packages.load("clang/clang", {
        // 只关心百分比；SDK 的 PackageLoadProgress 里 percent 可能是 null
        onProgress: (p: { download?: { percent?: number | null } }) => {
          if (p?.download?.percent != null) onProgress?.(p.download.percent / 100);
        },
      });
      this.lastLoadInfo = { source: "registry", bytes: -1 };
    }

    this.compiler = await wasmer.sandboxes.create({ packages: [pkg] });
    onProgress?.(1);
  }

  async run(src: string, opts: RunOptions = {}): Promise<RunResult> {
    const startedAt = performance.now();
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxOutBytes = opts.maxOutBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

    if (!this.compiler || !this.wasmer) {
      return fail(
        this.name,
        "init",
        "编译器还没准备好，请先调用 init()。",
        startedAt,
      );
    }

    try {
      await this.compiler.fs.writeFile("main.c", enc.encode(src));

      // ---- 编译 ----
      const cc = await this.compiler
        .command("clang", ["-std=c99", "-O0", "-o", "main.wasm", "main.c"])
        .run({ check: false, timeoutMs: 20_000, outputBytes: maxOutBytes });

      if (cc.exitCode !== 0) {
        const diag = cc.stderr.text().trim();
        return fail(
          this.name,
          "compile",
          diag || `clang 退出码 ${cc.exitCode}`,
          startedAt,
        );
      }

      // ---- 取出产物并执行 ----
      const wasm = await this.compiler.fs.readFile("main.wasm");
      const app = await this.wasmer.packages.load(wasm);
      const sb = await this.wasmer.sandboxes.create({ packages: [app] });

      try {
        const out = await sb.command("main", []).run({
          stdin: opts.stdin ?? "",
          timeoutMs,
          outputBytes: maxOutBytes,
          check: false,
        });

        const reason = String(out.reason ?? "");
        const timedOut = /timeout|timed out/i.test(reason);
        return {
          ok: out.exitCode === 0 && !timedOut,
          stdout: out.stdout.text(),
          stderr: out.stderr.text(),
          exitCode: timedOut ? null : out.exitCode,
          ms: Math.round(performance.now() - startedAt),
          stage: timedOut ? "timeout" : "run",
          engine: this.name,
          truncated: out.stdout.truncated || out.stderr.truncated,
        };
      } finally {
        await sb.close();
      }
    } catch (e) {
      const message = toMessage(e);
      const timedOut = /timeout|timed out/i.test(message);
      return fail(
        this.name,
        timedOut ? "timeout" : "run",
        timedOut
          ? `运行超时（超过 ${timeoutMs} ms）。检查循环有没有正确的结束条件。`
          : message,
        startedAt,
      );
    }
  }
}
