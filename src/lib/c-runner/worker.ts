/// <reference lib="webworker" />
/**
 * C 运行器 Worker。
 *
 * 为什么放 Worker 里：无论是 JSCPP 的解释执行，还是 wasmer 的 wasm 实例化，
 * 都可能吃掉几百毫秒到几秒的 CPU。放主线程会冻住整个页面（学生以为网站挂了）。
 * Worker 里跑 + 主线程硬超时 terminate，是"死循环代码不能卡死页面"这条验收项的实现方式。
 */
import type { CEngine } from "./engine";
import type { RunnerRequest, RunnerResponse } from "./protocol";
import type { EngineName } from "./registry";
import { JscppEngine } from "./jscpp-engine";

let jscpp: JscppEngine | null = null;
let clang: CEngine | null = null;

function reply(msg: RunnerResponse) {
  self.postMessage(msg);
}

async function engineFor(
  name: EngineName,
  onProgress?: (ratio: number) => void,
): Promise<CEngine> {
  if (name === "clang-wasm") {
    if (!clang) {
      // 动态 import：不用真编译器的人不必为它付加载成本
      const { ClangWasmEngine } = await import("./clang-wasm-engine");
      clang = new ClangWasmEngine();
    }
    await clang.init(onProgress);
    return clang;
  }
  jscpp ??= new JscppEngine();
  await jscpp.init();
  return jscpp;
}

self.onmessage = async (ev: MessageEvent<RunnerRequest>) => {
  const { id, kind, engine, src, opts } = ev.data;
  const onProgress = (ratio: number) => reply({ id, kind: "progress", ratio });

  try {
    if (kind === "init") {
      await engineFor(engine, onProgress);
      reply({ id, kind: "ready" });
      return;
    }
    const e = await engineFor(engine, onProgress);
    const result = await e.run(src ?? "", opts);
    reply({ id, kind: "result", result });
  } catch (err) {
    reply({
      id,
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
