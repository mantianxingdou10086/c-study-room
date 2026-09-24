/**
 * 运行器客户端：主线程唯一入口。
 *
 * 两条超时防线：
 *  1. 引擎内部超时（clang 用 WASI 的 timeoutMs；JSCPP 用 maxTimeout）——正常路径
 *  2. 主线程硬超时 → terminate 掉 Worker —— 兜底，防止解释器卡在原生代码里不出来
 * 硬超时比内部超时多留 8 秒，让第 1 条防线先起作用（terminate 会丢掉已加载的编译器，
 * 下次要重新加载，所以能不用就不用）。
 */
import type { RunOptions, RunResult } from "./engine";
import { DEFAULT_TIMEOUT_MS } from "./engine";
import type { RunnerRequest, RunnerResponse } from "./protocol";
import type { EngineName } from "./registry";

const HARD_TIMEOUT_GRACE_MS = 8000;

type Pending = {
  resolve: (r: RunnerResponse) => void;
  reject: (e: Error) => void;
  onProgress?: (ratio: number) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class CRunner {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  /** 记录哪些引擎已经就绪，避免重复 init */
  private ready = new Set<EngineName>();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
      name: "c-runner",
    });
    w.onmessage = (ev: MessageEvent<RunnerResponse>) => {
      const msg = ev.data;
      const p = this.pending.get(msg.id);
      if (!p) return;
      if (msg.kind === "progress") {
        p.onProgress?.(msg.ratio);
        return;
      }
      clearTimeout(p.timer);
      this.pending.delete(msg.id);
      p.resolve(msg);
    };
    w.onerror = (ev) => {
      const err = new Error(`运行器 Worker 出错：${ev.message || "未知错误"}`);
      for (const [, p] of this.pending) {
        clearTimeout(p.timer);
        p.reject(err);
      }
      this.pending.clear();
      this.worker = null;
    };
    this.worker = w;
    return w;
  }

  private call(
    req: Omit<RunnerRequest, "id">,
    timeoutMs: number,
    onProgress?: (ratio: number) => void,
  ): Promise<RunnerResponse> {
    const worker = this.ensureWorker();
    const id = ++this.seq;
    return new Promise<RunnerResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        // 兜底：连 Worker 一起干掉，页面绝不能被卡住
        this.worker?.terminate();
        this.worker = null;
        this.ready.clear();
        resolve({
          id,
          kind: "result",
          result: {
            ok: false,
            stdout: "",
            stderr: `程序运行超时（超过 ${timeoutMs} ms）已被强制终止。检查循环有没有正确的结束条件。`,
            exitCode: null,
            ms: timeoutMs,
            stage: "timeout",
            engine: req.engine,
          },
        });
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, onProgress, timer });
      worker.postMessage({ ...req, id } satisfies RunnerRequest);
    });
  }

  /** 预热引擎（下载/加载工具链）。clang-wasm 会通过 onProgress 回报 0~1。 */
  async prepare(
    engine: EngineName,
    onProgress?: (ratio: number) => void,
  ): Promise<void> {
    if (this.ready.has(engine)) return;
    const res = await this.call(
      { kind: "init", engine },
      // 首次要下 34 MB，给足时间
      10 * 60 * 1000,
      onProgress,
    );
    if (res.kind === "error") throw new Error(res.message);
    this.ready.add(engine);
  }

  isReady(engine: EngineName): boolean {
    return this.ready.has(engine);
  }

  async run(
    engine: EngineName,
    src: string,
    opts: RunOptions = {},
  ): Promise<RunResult> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const res = await this.call(
      { kind: "run", engine, src, opts },
      timeoutMs + HARD_TIMEOUT_GRACE_MS,
    );
    if (res.kind === "result") return res.result;
    if (res.kind === "error") {
      return {
        ok: false,
        stdout: "",
        stderr: res.message,
        exitCode: null,
        ms: 0,
        stage: "run",
        engine,
      };
    }
    throw new Error("运行器返回了意外的消息类型");
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
    this.ready.clear();
  }
}
