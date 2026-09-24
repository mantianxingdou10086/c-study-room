"use client";

import * as React from "react";

/**
 * M1 调试探针 v2（临时页，M8 清理）。
 * 假设：浏览器里 SDK 用自带的 worker 跑 guest，"Scheduler is dead" = 那些 worker 没起来。
 * 对照实验：
 *   A. 默认（parallelism 默认 2，自托管包）
 *   B. parallelism: 1（尽量不走 worker 线程池）
 *   C. registry 路径（packages: ["clang/clang"]）——排除"自托管包"这个变量
 * 每步都打印 exitCode / reason / stdout / stderr 原文。
 */
const SRC = `#include <stdio.h>\nint main(void){ printf("hi\\n"); return 0; }\n`;

export default function RunnerProbePage() {
  const [lines, setLines] = React.useState<string[]>([]);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const log: string[] = [];
    const push = (s: string) => {
      if (cancelled) return;
      log.push(s);
      setLines([...log]);
      (window as unknown as { __probe?: string[] }).__probe = log;
    };
    const t = () => Math.round(performance.now());

    async function experiment(
      label: string,
      makeWasmer: (mod: typeof import("@wasmer/sdk/browser")) => InstanceType<
        typeof import("@wasmer/sdk/browser").Wasmer
      >,
      selfHosted: boolean,
    ) {
      const t0 = t();
      push(`\n──── ${label} ────`);
      // 自托管加载（同 clang-wasm-engine.ts，绕开打包器对 SDK 内部 worker 的破坏）
      const mod = await (
        new Function("u", "return import(u)") as (
          u: string,
        ) => Promise<typeof import("@wasmer/sdk/browser")>
      )("/wasmer/dist/index.js");
      push(`[${t() - t0}ms] SDK 已从 /wasmer/dist/index.js 加载`);
      try {
        const wasmer = makeWasmer(mod);
        push(`[${t() - t0}ms] wasmer 构造完成，await ready()…`);
        await wasmer.ready();
        push(`[${t() - t0}ms] ready() 返回`);

        let pkg;
        if (selfHosted) {
          const res = await fetch("/toolchain/clang.pkg.gz");
          const gz = new Uint8Array(await res.arrayBuffer());
          const raw = new Uint8Array(
            await new Response(
              new Blob([gz as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip")),
            ).arrayBuffer(),
          );
          pkg = await wasmer.packages.load(raw);
          push(`[${t() - t0}ms] 自托管包已加载`);
        } else {
          pkg = await wasmer.packages.load("clang/clang", {
            onProgress: (p: { download?: { percent?: number | null } }) => {
              if (p?.download?.percent != null && p.download.percent % 10 < 1) {
                push(`[${t() - t0}ms] registry 下载 ${Math.round(p.download.percent)}%`);
              }
            },
          });
          push(`[${t() - t0}ms] registry 包已加载`);
        }

        const sb = await wasmer.sandboxes.create({ packages: [pkg] });
        push(`[${t() - t0}ms] 沙箱已创建`);

        const v = await sb.command("clang", ["--version"]).run({ check: false });
        push(
          `[${t() - t0}ms] clang --version → exit=${v.exitCode} reason=${v.reason} stdout=${JSON.stringify(v.stdout.text())} stderr=${JSON.stringify(v.stderr.text())}`,
        );

        await sb.fs.writeFile("main.c", new TextEncoder().encode(SRC));
        const cc = await sb.command("clang", ["-std=c99", "-O0", "-o", "main.wasm", "main.c"]).run({
          check: false,
        });
        push(
          `[${t() - t0}ms] 编译 → exit=${cc.exitCode} reason=${cc.reason} stderr=${JSON.stringify(cc.stderr.text().slice(0, 300))}`,
        );
        if (cc.exitCode === 0) {
          const bytes = await sb.fs.readFile("main.wasm");
          const app = await wasmer.packages.load(bytes);
          const run = await wasmer.sandboxes.create({ packages: [app] });
          const out = await run.command("main", []).run({ check: false, timeoutMs: 5000 });
          push(`[${t() - t0}ms] ✅ 运行结果 = ${JSON.stringify(out.stdout.text())}  (wasm ${bytes.length}B)`);
          await run.close();
        }
        await sb.close();
        await wasmer.close();
      } catch (e) {
        push(`❌ ${label} 失败: ${(e as Error)?.name}: ${(e as Error)?.message ?? String(e)}`);
      }
    }

    (async () => {
      push(`crossOriginIsolated=${globalThis.crossOriginIsolated}`);
      try {
        await experiment("A. 默认 parallelism + 自托管包", (m) => new m.Wasmer(), true);
        await experiment("B. parallelism:1 + 自托管包", (m) => new m.Wasmer({ parallelism: 1 }), true);
      } catch (e) {
        push(`❌ 外层异常: ${(e as Error)?.message ?? String(e)}`);
      } finally {
        push("\n探针结束");
        if (!cancelled) setDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold">C 运行器浏览器探针 v2</h1>
      <p className="mt-2 text-sm text-muted-foreground" data-testid="probe-done">
        {done ? "DONE" : "RUNNING"}
      </p>
      <pre
        id="log"
        data-testid="probe-log"
        className="mt-4 max-h-[70vh] overflow-auto rounded-xl border border-border bg-code-bg p-4 font-mono text-xs leading-5 whitespace-pre-wrap"
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
}
