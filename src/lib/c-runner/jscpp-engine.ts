import type { CEngine, RunOptions, RunResult } from "./engine";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
  fail,
  toMessage,
} from "./engine";

type JscppModule = typeof import("JSCPP");

let cached: JscppModule | null = null;

/** 懒加载：JSCPP 只在真正要跑代码时才进内存 */
async function loadJscpp(): Promise<JscppModule> {
  if (cached) return cached;
  const mod = await import("JSCPP");
  // CJS 包经过打包器的 interop 后，default 可能指向 module.exports 本身
  cached = (mod as unknown as { default?: JscppModule }).default ?? mod;
  return cached;
}

/**
 * C → C++ 兼容改写。
 *
 * 为什么必须做：JSCPP 是 C++ 解释器，`int main(void)` 这种 C 的规范写法它会报
 * "missing declarator for argument"（实测）。而书里每个例子都这么写，
 * 所以快速模式下必须改写，并且**必须告诉用户改了**（notes）。
 *
 * 只处理参数列表里的 void，不碰 `(void) expr` 这种强制类型转换。
 */
export function applyCppCompatShim(src: string): { code: string; notes: string[] } {
  const notes: string[] = [];
  let code = src;

  // 形如 `main(void)` / `int f(void)`
  const withIdent = /(\b[A-Za-z_]\w*\s*)\(\s*void\s*\)/g;
  if (withIdent.test(code)) {
    code = code.replace(withIdent, "$1()");
    notes.push("快速模式已把参数列表里的 (void) 改写为 ()");
  }
  // 形如 `int (*fp)(void)`
  const afterParen = /(\)\s*)\(\s*void\s*\)/g;
  if (afterParen.test(code)) {
    code = code.replace(afterParen, "$1()");
    if (!notes.length) notes.push("快速模式已把参数列表里的 (void) 改写为 ()");
  }

  return { code, notes };
}

/** JSCPP 完全不支持、但学生很可能写到的特性，提前给出人话提示 */
const KNOWN_GAPS: { re: RegExp; message: string }[] = [
  {
    re: /\bstruct\s+\w+\s*\{/,
    message:
      "快速模式不支持结构体定义（第 16 章内容）。切换到「Clang 16（真实编译器）」再运行。",
  },
  {
    re: /\bmalloc\s*\(|\bcalloc\s*\(|\brealloc\s*\(/,
    message: "快速模式不支持 malloc/calloc/realloc。切换到「Clang 16（真实编译器）」再运行。",
  },
];

/**
 * JSCPP 引擎：纯 JavaScript 的 C 解释器。
 * 定位是"秒开模式"：零下载、立刻出结果，代价是只覆盖 C 的子集。
 * 实测边界（8/15 通过）见 docs/runner-spike.md。
 */
export class JscppEngine implements CEngine {
  readonly name = "jscpp";
  readonly label = "JSCPP（秒开模式）";
  readonly description =
    "纯 JS 解释器，零下载立刻可跑，但只支持 C 的子集（无结构体 / malloc）。";

  async init(): Promise<void> {
    await loadJscpp();
  }

  async run(src: string, opts: RunOptions = {}): Promise<RunResult> {
    const startedAt = performance.now();
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxOutBytes = opts.maxOutBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

    const { code, notes } = applyCppCompatShim(src);

    const gap = KNOWN_GAPS.find((g) => g.re.test(code));
    if (gap) {
      return { ...fail(this.name, "compile", gap.message, startedAt), notes };
    }

    let stdout = "";
    let truncated = false;

    try {
      const JSCPP = await loadJscpp();

      // 注意：必须通过 JSCPP.run 调用——launcher 里用了 this.includes
      JSCPP.run(code, opts.stdin ?? "", {
        stdio: {
          write(s: string) {
            if (stdout.length >= maxOutBytes) {
              truncated = true;
              return;
            }
            stdout += s;
            if (stdout.length > maxOutBytes) {
              stdout = stdout.slice(0, maxOutBytes);
              truncated = true;
            }
          },
        },
        // 解释器内部兜底：每执行一条语句检查一次墙钟
        maxTimeout: timeoutMs,
        unsigned_overflow: "ignore",
      });

      return {
        ok: true,
        stdout,
        stderr: "",
        exitCode: 0,
        ms: Math.round(performance.now() - startedAt),
        stage: "run",
        engine: this.name,
        truncated,
        notes,
      };
    } catch (err) {
      const message = toMessage(err);
      // JSCPP 的解析失败 = 我们的"编译错误"；maxTimeout 触发的 = 超时
      const isTimeout = /time limit exceeded/i.test(message);
      const stage = isTimeout ? "timeout" : "compile";
      return {
        ...fail(
          this.name,
          stage,
          isTimeout
            ? `运行超时（超过 ${timeoutMs} ms）。检查循环有没有正确的结束条件。`
            : message,
          startedAt,
          stdout,
        ),
        notes,
      };
    }
  }
}
