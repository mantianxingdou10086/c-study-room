import { describe, expect, it } from "vitest";
import { JscppEngine } from "@/lib/c-runner/jscpp-engine";
import { normalizeOutput, RUNNER_CASES } from "./cases";

/**
 * M1.1 的验收：JSCPP 引擎逐条跑契约用例。
 * 每条用例都打印真实输出，方便人工核对——不允许"看起来应该通过"。
 */
describe("JscppEngine 契约用例", () => {
  const engine = new JscppEngine();

  it("init() 可重复调用且幂等", async () => {
    await engine.init();
    await engine.init();
    expect(engine.name).toBe("jscpp");
  });

  for (const c of RUNNER_CASES) {
    it(`${c.name} — ${c.why}`, async () => {
      const r = await engine.run(c.src, { stdin: c.stdin, timeoutMs: 4000 });
      // 真实结果留痕
      console.log(
        `[jscpp/${c.name}] ok=${r.ok} stage=${r.stage} ms=${r.ms}\n` +
          `  stdout=${JSON.stringify(r.stdout)}\n` +
          (r.stderr ? `  stderr=${JSON.stringify(r.stderr.slice(0, 200))}\n` : ""),
      );

      if (c.expectsError) {
        expect(r.ok).toBe(false);
        expect(r.stage).toBe("compile");
        expect(r.stderr.length).toBeGreaterThan(0);
        return;
      }
      if (c.expectsTimeout) {
        expect(r.ok).toBe(false);
        expect(r.stage).toBe("timeout");
        return;
      }
      expect(normalizeOutput(r.stdout)).toBe(normalizeOutput(c.expect ?? ""));
      expect(r.ok).toBe(true);
    });
  }

  it("输出超过 maxOutBytes 时截断并标记 truncated", async () => {
    const r = await engine.run(
      `#include <stdio.h>
int main(void) {
    for (int i = 0; i < 100000; i++) printf("aaaaaaaaaa\\n");
    return 0;
}
`,
      { maxOutBytes: 1000, timeoutMs: 8000 },
    );
    expect(r.truncated).toBe(true);
    expect(r.stdout.length).toBeLessThanOrEqual(1000);
  });
});
