import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Wasmer } from "@wasmer/sdk/node";
import { EXERCISES } from "@/content/exercises";
import type { CodeValidator, OutputValidator } from "@/lib/content/schema";
import { normalizeOutput } from "@/lib/judge/validators";

/**
 * 用**真编译器**验证每道题的期望答案。
 *
 * 为什么必须做：期望输出如果是我手写猜的，学生写对了却判错——这是最伤人的 bug。
 * 这个测试把两类题都真的编译运行一遍：
 *  - CODE 题：跑 `referenceCode`（完整参考解）
 *  - OUTPUT 题：从题干里抽出那个可运行的 ```c 代码块直接跑
 * 然后断言 stdout 命中期望值。
 *
 * 前提：本地已有 clang 包缓存（跑过 node scripts/fetch-toolchain.mjs）。
 * 没有缓存就跳过，不阻塞其它测试。
 */
const CACHE = join(process.cwd(), ".cache", "wasmer");
/**
 * 用本地自托管的包，而不是 `packages: ["clang/clang"]`。
 *
 * 后者要先去 registry.wasmer.io 解析「包名 → 哈希」，国内网络直接 `fetch failed`，
 * 于是**整个集成测试连 beforeAll 都过不去**（实测：43 个用例全体 skip，看起来像没写测试）。
 * 用 `packages.load(本地字节)` 完全离线，而且和线上自托管的是同一个包，
 * 验证结果与浏览器里跑的完全一致。
 */
const PKG = join(process.cwd(), ".cache", "toolchain", "clang.pkg");
const hasCache = existsSync(PKG);

/**
 * 从题干里抽出「可运行」的 C 代码块。
 * 约定（由 tests/unit/content/integrity.test.ts 强制）：OUTPUT 题的题干必须**恰好含一个**
 * 带 main 函数的 ```c 块，这样答案才能被机器验证。
 */
export function extractRunnableBlock(prompt: string): string | null {
  const blocks = [...prompt.matchAll(/```c\n([\s\S]*?)```/g)].map((m) => m[1]);
  const runnable = blocks.filter((b) => /int\s+main\s*\(/.test(b));
  return runnable.length === 1 ? runnable[0] : null;
}

const codeExercises = EXERCISES.filter((e) => e.kind === "CODE");
const outputExercises = EXERCISES.filter((e) => e.kind === "OUTPUT");

describe.skipIf(!hasCache)("题库期望答案验证（真实 clang 编译运行）", () => {
  let wasmer: Wasmer;
  let compiler: Awaited<ReturnType<Wasmer["sandboxes"]["create"]>>;

  beforeAll(async () => {
    wasmer = new Wasmer({ cache: { directory: CACHE } });
    const bytes = await readFile(PKG);
    const clangPkg = await wasmer.packages.load(bytes);
    compiler = await wasmer.sandboxes.create({ packages: [clangPkg] });
  }, 300_000);

  afterAll(async () => {
    await compiler?.close();
    await wasmer?.close();
  });

  /** 编译并运行一段 C，返回 { stdout, stderr, exitCode } */
  async function runC(src: string, stdin: string) {
    await compiler.fs.writeFile("main.c", new TextEncoder().encode(src));
    const cc = await compiler
      .command("clang", ["-std=c99", "-O0", "-o", "main.wasm", "main.c"])
      .run({ check: false, timeoutMs: 30_000 });
    if (cc.exitCode !== 0) return { stdout: "", stderr: cc.stderr.text(), exitCode: 1 };
    const wasm = await compiler.fs.readFile("main.wasm");
    const pkg = await wasmer.packages.load(wasm);
    const sb = await wasmer.sandboxes.create({ packages: [pkg] });
    try {
      const out = await sb.command("main", []).run({
        stdin,
        timeoutMs: 10_000,
        check: false,
      });
      return { stdout: out.stdout.text(), stderr: out.stderr.text(), exitCode: out.exitCode };
    } finally {
      await sb.close();
    }
  }

  it("题库里两类可验证的题都存在（否则这个测试是空转）", () => {
    expect(codeExercises.length).toBeGreaterThan(0);
    expect(outputExercises.length).toBeGreaterThan(0);
  });

  for (const ex of codeExercises) {
    it(`CODE ${ex.id}：参考解输出符合期望`, async () => {
      const v = ex.validator as CodeValidator;
      const { stdout, stderr, exitCode } = await runC(ex.referenceCode!, ex.stdin ?? "");
      expect(exitCode, `${ex.id} 的参考解编译/运行失败：\n${stderr}`).toBe(0);
      const candidates = v.expectedStdoutAny.map(normalizeOutput);
      console.log(`[${ex.id}] stdout=${JSON.stringify(stdout)} 期望=${JSON.stringify(candidates)}`);
      expect(
        candidates.includes(normalizeOutput(stdout)),
        `${ex.id}：参考解实际输出 ${JSON.stringify(stdout)} 不在期望列表里`,
      ).toBe(true);
    }, 120_000);
  }

  for (const ex of outputExercises) {
    it(`OUTPUT ${ex.id}：题干里那段代码真的输出期望答案`, async () => {
      const v = ex.validator as OutputValidator;
      const src = extractRunnableBlock(ex.prompt);
      expect(src, `${ex.id} 的题干里找不到唯一可运行的 C 代码块`).toBeTruthy();
      const { stdout, stderr, exitCode } = await runC(src!, ex.stdin ?? "");
      expect(exitCode, `${ex.id} 的题干代码编译/运行失败：\n${stderr}`).toBe(0);
      console.log(`[${ex.id}] stdout=${JSON.stringify(stdout)} 期望=${JSON.stringify(v.expected)}`);
      expect(
        normalizeOutput(stdout),
        `${ex.id}：题干代码实际输出 ${JSON.stringify(stdout)} 与「标准答案」${JSON.stringify(v.expected)} 不一致——快去修题！`,
      ).toBe(normalizeOutput(v.expected));
    }, 120_000);
  }
});

describe.skipIf(hasCache)("题库期望答案验证（已跳过）", () => {
  it("提示：缺少 .cache/toolchain/clang.pkg，先跑 node scripts/fetch-toolchain.mjs", () => {
    console.warn("跳过题库验证：本地没有 clang 包（.cache/toolchain/clang.pkg）");
    expect(true).toBe(true);
  });
});
