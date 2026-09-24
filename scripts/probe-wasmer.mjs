/**
 * Wasmer registry 探针（M1 spike，一次性）。
 * 问题：浏览器里有没有"真编译器"可用？Wasmer registry 里的 clang 能不能编译 C？
 * 先用 Node 入口验证 registry 包是否存在、能不能跑（Node 与浏览器共用同一 registry 与包格式）。
 *
 * 运行：node scripts/probe-wasmer.mjs
 */
import { Wasmer } from "@wasmer/sdk/node";

const CANDIDATES = ["clang/clang", "wasmer/clang", "llvm/clang"];

const wasmer = new Wasmer({ cache: { directory: ".cache/wasmer" } });

async function tryPackage(spec) {
  const t0 = Date.now();
  process.stdout.write(`\n=== ${spec} ===\n`);
  try {
    const sandbox = await wasmer.sandboxes.create({
      packages: [spec],
      files: {
        "main.c": `#include <stdio.h>\nint main(void){ printf("hi\\n"); return 0; }\n`,
      },
    });
    process.stdout.write(`  沙箱创建成功 (${Date.now() - t0}ms)\n`);

    // 1) clang 自报版本
    try {
      const v = await sandbox.command("clang", ["--version"]).run({ check: false });
      process.stdout.write(`  clang --version → ${JSON.stringify(v.text().slice(0, 200))}\n`);
    } catch (e) {
      process.stdout.write(`  clang --version 失败: ${e?.message ?? e}\n`);
    }

    // 2) 试着把 C 编成 wasm
    try {
      const c = await sandbox
        .command("clang", ["-O1", "-o", "main.wasm", "main.c"])
        .run({ check: false });
      process.stdout.write(
        `  clang -o main.wasm → exit=${c.exitCode} stdout=${JSON.stringify(c.text().slice(0, 300))} stderr=${JSON.stringify(c.stderrText?.().slice(0, 300) ?? "")}\n`,
      );
    } catch (e) {
      process.stdout.write(`  编译失败: ${e?.message ?? e}\n`);
    }

    await sandbox.close();
    return true;
  } catch (e) {
    process.stdout.write(`  ❌ 加载失败: ${e?.code ?? ""} ${e?.message ?? e}\n`);
    return false;
  }
}

for (const spec of CANDIDATES) {
  await tryPackage(spec);
}

await wasmer.close();
process.stdout.write("\n完成。\n");
