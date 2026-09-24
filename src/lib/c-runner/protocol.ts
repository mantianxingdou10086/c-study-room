import type { RunResult, RunOptions } from "./engine";
import type { EngineName } from "./registry";

/** 主线程 → Worker */
export type RunnerRequest = {
  id: number;
  kind: "init" | "run";
  engine: EngineName;
  src?: string;
  opts?: RunOptions;
};

/** Worker → 主线程 */
export type RunnerResponse =
  | { id: number; kind: "ready" }
  | { id: number; kind: "progress"; ratio: number }
  | { id: number; kind: "result"; result: RunResult }
  | { id: number; kind: "error"; message: string };
