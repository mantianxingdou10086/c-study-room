/**
 * 把 @wasmer/sdk 的浏览器运行时原样拷进 public/wasmer/，绕开打包器。
 *
 * 为什么必须这么做（实测教训）：
 *   SDK 内部用 `new URL("./browser-worker.js", import.meta.url)` 起自己的 worker，
 *   而那个 worker 还要 import `./host-filesystem.js`、`./node-compat.js`、
 *   `./capi-worker-bridge.js`、`./node-network-rpc.js`。
 *   交给 Turbopack 打包时，它只发出了 browser-worker.js 一个文件，其余四个 404，
 *   结果是：命令能"跑"但立刻 exit=1，随后抛
 *   `WasmerError: … the thread pool is shut down: Scheduler is dead`。
 *   原样自托管后，import.meta.url 指向 /wasmer/dist/index.js，
 *   所有相对依赖都能按真实文件布局找到。
 *
 * 用法：node scripts/vendor-wasmer-sdk.mjs
 * 产物：public/wasmer/dist/**、public/wasmer/pkg/**
 */
import { cp, mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const SRC = join(process.cwd(), "node_modules", "@wasmer", "sdk");
const OUT = join(process.cwd(), "public", "wasmer");

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(SRC))) {
  throw new Error("找不到 node_modules/@wasmer/sdk，先 npm install");
}

const pkgJson = JSON.parse(await readFile(join(SRC, "package.json"), "utf8"));

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// 保留 dist/ 与 pkg/ 的相对位置：dist/index.js 里写的是 new URL("../pkg/wasmer_sdk_js.js", import.meta.url)
await cp(join(SRC, "dist"), join(OUT, "dist"), { recursive: true });
await cp(join(SRC, "pkg"), join(OUT, "pkg"), { recursive: true });

await writeFile(
  join(OUT, "meta.json"),
  JSON.stringify(
    {
      package: "@wasmer/sdk",
      version: pkgJson.version,
      entry: "/wasmer/dist/index.js",
      vendoredAt: new Date().toISOString(),
      why: "SDK 内部 worker 的相对依赖必须保持真实文件布局，见 scripts/vendor-wasmer-sdk.mjs 注释",
    },
    null,
    2,
  ),
);

const { execSync } = await import("node:child_process");
console.log("已自托管 @wasmer/sdk", pkgJson.version, "→ public/wasmer/");
console.log(execSync(`du -sh "${OUT}" 2>/dev/null || echo ""`).toString().trim());
