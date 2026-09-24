/**
 * 探针 3（M1 spike，一次性）：
 *  a) 编译错误到底从哪个 API 拿（run() 的 stderrText 是空的）
 *  b) 能不能把 registry 下载的 clang 包自托管——用 packages.load(原始字节) 直接加载本地 .bin
 *     如果能，就不必让浏览器在运行时依赖 registry.wasmer.io（国内网络更稳）
 *
 * 运行：node scripts/probe-stderr-and-selfhost.mjs
 */
import { readFile } from "node:fs/promises";
import { Wasmer } from "@wasmer/sdk/node";

const wasmer = new Wasmer({ cache: { directory: ".cache/wasmer" } });

const BAD = `#include <stdio.h>\nint main(void){ printf("oops") return 0; }\n`;
const GOOD = `#include <stdio.h>\nint main(void){ printf("hi\\n"); return 0; }\n`;

console.log("=== a) 编译错误的 stderr 获取方式 ===");
const compiler = await wasmer.sandboxes.create({ packages: ["clang/clang"] });
await compiler.fs.writeFile("bad.c", new TextEncoder().encode(BAD));

// 方式 1：run({check:false}) + stderrText()
const r1 = await compiler.command("clang", ["-o", "bad.wasm", "bad.c"]).run({ check: false });
console.log(`  run()      → exit=${r1.exitCode} stdout=${JSON.stringify(r1.stdout.text())} stderr=${JSON.stringify(r1.stderr.text())}`);

// 方式 2：spawn({stdout:'capture',stderr:'capture'}) + wait()
const p2 = await compiler
  .command("clang", ["-o", "bad.wasm", "bad.c"])
  .spawn({ stdout: "capture", stderr: "capture" });
const r2 = await p2.wait();
console.log(`  spawn()    → exit=${r2.exitCode} stdout=${JSON.stringify(r2.stdout.text())} stderr=${JSON.stringify(r2.stderr.text())}`);

// 方式 3：把 stderr 重定向到 stdout（clang 2>&1）——用 shell 不保证有，先试 clang 的 -fno-color-diagnostics
const r3 = await compiler
  .command("clang", ["-fno-color-diagnostics", "-o", "bad.wasm", "bad.c"])
  .run({ check: false });
console.log(`  无颜色诊断 → exit=${r3.exitCode} stderr=${JSON.stringify((r3.stderr.text()).slice(0, 200))}`);

await compiler.close();

console.log("\n=== b) 自托管：packages.load(本地字节) ===");
const cachePath = ".cache/wasmer/cache-v1/packages/c127b7bfc0041d02c94045f40be7fb4b3eeb98cede25fad96261b7b90a82f405.bin";
const raw = await readFile(cachePath);
console.log(`  本地缓存文件 ${raw.length} 字节（${(raw.length / 1048576).toFixed(1)} MB）`);
try {
  const pkg = await wasmer.packages.load(new Uint8Array(raw));
  console.log(`  ✅ packages.load(本地字节) 成功，命令：${JSON.stringify(pkg.commands ?? "n/a")}`);
  const sandbox = await wasmer.sandboxes.create({ packages: [pkg] });
  await sandbox.fs.writeFile("good.c", new TextEncoder().encode(GOOD));
  const cc = await sandbox.command("clang", ["-o", "good.wasm", "good.c"]).run({ check: false });
  console.log(`  用它编译 → exit=${cc.exitCode}`);
  if (cc.exitCode === 0) {
    const bytes = await sandbox.fs.readFile("good.wasm");
    const app = await wasmer.packages.load(bytes);
    const run = await wasmer.sandboxes.create({ packages: [app] });
    const out = await run.command("main", []).run({ check: false });
    console.log(`  运行结果 → ${JSON.stringify(out.text())}  ← 自托管链路可用`);
    await run.close();
  }
  await sandbox.close();
} catch (e) {
  console.log(`  ❌ 失败：${e?.code ?? ""} ${e?.message ?? e}`);
}

await wasmer.close();
