/**
 * 引擎注册表与选择逻辑。
 *
 * 选择策略（依据 docs/runner-spike.md 的实测数据）：
 *  - 默认用 clang-wasm（真编译器）：教学正确性优先——书里每个例子都写 `int main(void)`，
 *    而 JSCPP 是 C++ 解释器，直接不认这个写法（实测 2:10 missing declarator for argument）。
 *  - JSCPP 作为"秒开"备选：工具链还没下完、或离线时用，代价是兼容性改写与能力缺口。
 */
import type { CEngine } from "./engine";
import { JscppEngine } from "./jscpp-engine";
import { ClangWasmEngine } from "./clang-wasm-engine";

export type EngineName = "clang-wasm" | "jscpp";

export const DEFAULT_ENGINE: EngineName = "clang-wasm";

export const ENGINE_INFO: Record<
  EngineName,
  { label: string; description: string; downloadMB: number; accuracy: "real" | "approximate" }
> = {
  "clang-wasm": {
    label: "Clang 16（真实编译器）",
    description: "与 gcc 一致：支持 (void)、结构体、指针、malloc。首次约 34 MB，之后走缓存。",
    downloadMB: 34,
    accuracy: "real",
  },
  jscpp: {
    label: "JSCPP（秒开模式）",
    description:
      "零下载立刻能跑，但只支持 C 的子集：不支持结构体与 malloc，(void) 会被自动改写。",
    downloadMB: 0,
    accuracy: "approximate",
  },
};

let clang: ClangWasmEngine | null = null;
let jscpp: JscppEngine | null = null;

export function getEngine(name: EngineName): CEngine {
  if (name === "clang-wasm") {
    clang ??= new ClangWasmEngine();
    return clang;
  }
  jscpp ??= new JscppEngine();
  return jscpp;
}
