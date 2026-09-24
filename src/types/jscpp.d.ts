/**
 * JSCPP 2.0.9 没有自带类型声明（package.json 里没有 types 字段，包里也没有 .d.ts）。
 * 这里按 lib/launcher.js 的实际实现补一份最小可用的声明。
 * 参考实现：
 *   function run(code, input, config)
 *   config.stdio = { write(s), drain() }   // drain 返回 stdin 缓冲，只被消费一次
 *   config.maxTimeout                       // 解释器内部按墙钟检查的兜底超时
 */
declare module "JSCPP" {
  export interface JscppConfig {
    stdio?: {
      write?: (s: string) => void;
      drain?: () => string | null;
    };
    includes?: Record<string, unknown>;
    unsigned_overflow?: "error" | "warn" | "ignore";
    maxTimeout?: number;
    debug?: boolean;
  }

  export function run(
    code: string,
    input?: string,
    config?: JscppConfig,
  ): unknown;

  export const includes: Record<string, unknown>;

  const JSCPP: {
    run: typeof run;
    includes: Record<string, unknown>;
  };
  export default JSCPP;
}
