/**
 * 完整链路探针（M1 spike，一次性）：clang 编译 → 取出 wasm → 带 stdin 运行 → 比对输出。
 * 这是 ClangWasmEngine 的最小可行原型，先在 Node 里把语义跑通，再搬到浏览器。
 *
 * 运行：node scripts/probe-clang-pipeline.mjs
 */
import { Wasmer } from "@wasmer/sdk/node";

const wasmer = new Wasmer({ cache: { directory: ".cache/wasmer" } });

const CASES = [
  {
    name: "hello",
    src: `#include <stdio.h>\nint main(void){ printf("hi\\n"); return 0; }\n`,
    stdin: "",
    expect: "hi\n",
  },
  {
    name: "scanf",
    src: `#include <stdio.h>\nint main(void){ int n; scanf("%d", &n); printf("%d\\n", n*2); return 0; }\n`,
    stdin: "21\n",
    expect: "42\n",
  },
  {
    name: "array",
    src: `#include <stdio.h>\nint main(void){ int a[3]={5,6,7}; printf("%d\\n", a[1]); return 0; }\n`,
    stdin: "",
    expect: "6\n",
  },
  {
    name: "struct",
    src: `#include <stdio.h>\nstruct P{int x;int y;};\nint main(void){ struct P p; p.x=4; p.y=5; printf("%d\\n", p.x+p.y); return 0; }\n`,
    stdin: "",
    expect: "9\n",
  },
  {
    name: "compile-error",
    src: `#include <stdio.h>\nint main(void){ printf("oops") return 0; }\n`,
    stdin: "",
    expectsError: true,
  },
];

const t0 = Date.now();
// 一个长驻沙箱专门当编译器用
const compiler = await wasmer.sandboxes.create({ packages: ["clang/clang"] });
console.log(`编译沙箱就绪 (${Date.now() - t0}ms)\n`);

let pass = 0;
for (const c of CASES) {
  const t = Date.now();
  try {
    await compiler.fs.writeFile("main.c", new TextEncoder().encode(c.src));

    const cc = await compiler
      .command("clang", ["-O0", "-o", "main.wasm", "main.c"])
      .run({ check: false });
    const ccErr = cc.stderrText ? cc.stderrText() : "";

    if (cc.exitCode !== 0) {
      if (c.expectsError) {
        pass++;
        console.log(`✅ ${c.name}: 编译失败（符合预期）\n   stderr=${JSON.stringify(ccErr.slice(0, 200))} (${Date.now() - t}ms)`);
      } else {
        console.log(`❌ ${c.name}: 意外编译失败\n   stderr=${JSON.stringify(ccErr.slice(0, 300))}`);
      }
      continue;
    }
    if (c.expectsError) {
      console.log(`❌ ${c.name}: 期望编译失败但成功了`);
      continue;
    }

    const bytes = await compiler.fs.readFile("main.wasm");
    const pkg = await wasmer.packages.load(bytes);
    const runSandbox = await wasmer.sandboxes.create({ packages: [pkg] });
    const out = await runSandbox.command("main", []).run({
      stdin: c.stdin,
      timeoutMs: 5000,
      outputBytes: 64 * 1024,
      check: false,
    });
    const text = out.text();
    await runSandbox.close();

    const ok = text === c.expect;
    if (ok) pass++;
    console.log(
      `${ok ? "✅" : "❌"} ${c.name}: stdout=${JSON.stringify(text)} 期望=${JSON.stringify(c.expect)} ` +
        `wasm=${bytes.length}B exit=${out.exitCode} (${Date.now() - t}ms)`,
    );
  } catch (e) {
    console.log(`❌ ${c.name}: 抛异常 ${e?.code ?? ""} ${e?.message ?? e}`);
  }
}

await compiler.close();
await wasmer.close();
console.log(`\n通过 ${pass}/${CASES.length}`);
