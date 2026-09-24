/**
 * C 运行器引擎接口。
 *
 * 为什么要有这层抽象：浏览器里跑 C 有两条技术路线，各有取舍——
 *  - JSCPP：纯 JS 解释器，150KB 级，秒开，但只覆盖 C 的子集（指针/文件 I/O 弱）
 *  - clang→WASM：真编译器，行为与 gcc 一致，但要加载几十 MB 的 toolchain
 * 把两者藏在同一个接口后面，将来换成"服务端 gcc 判题"也只需再实现一个类。
 */

export type RunStage = "init" | "compile" | "run" | "timeout";

export interface RunResult {
  /** 编译并运行成功（退出码 0） */
  ok: boolean;
  stdout: string;
  stderr: string;
  /** 超时或被强杀时为 null */
  exitCode: number | null;
  /** 端到端耗时（毫秒） */
  ms: number;
  /** 失败发生在哪个阶段，UI 靠它决定提示文案 */
  stage: RunStage;
  engine: string;
  /** 输出是否被截断（超过 maxOutBytes） */
  truncated?: boolean;
  /**
   * 需要让用户知道、但不影响结果的说明。
   * 例如 JSCPP 模式下"已把 (void) 改写为 ()"——不能偷偷改代码还不说。
   */
  notes?: string[];
}

export interface RunOptions {
  stdin?: string;
  timeoutMs?: number;
  maxOutBytes?: number;
}

export interface CEngine {
  /** 稳定的机器名，用于日志与选择逻辑 */
  readonly name: string;
  /** 展示给用户的中文名 */
  readonly label: string;
  /** 一句话说明适用场景 */
  readonly description: string;
  /** 首次运行前的准备（加载资源）。可重复调用，必须幂等。 */
  init(onProgress?: (ratio: number) => void): Promise<void>;
  run(src: string, opts?: RunOptions): Promise<RunResult>;
}

export const DEFAULT_TIMEOUT_MS = 5000;
export const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024;

/** 生成一个失败结果，避免每个引擎重复拼字段 */
export function fail(
  engine: string,
  stage: RunStage,
  message: string,
  startedAt: number,
  stdout = "",
): RunResult {
  return {
    ok: false,
    stdout,
    stderr: message,
    exitCode: null,
    ms: Math.round(performance.now() - startedAt),
    stage,
    engine,
  };
}

/**
 * 把引擎抛出的东西变成人能读的文本。
 * JSCPP 抛的是 Error("ERROR: Parsing Failure:\n...")，WASI 抛的是各种字符串。
 */
export function toMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}
