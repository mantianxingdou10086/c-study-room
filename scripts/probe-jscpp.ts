/**
 * JSCPP 能力探针（一次性排查脚本，M1 spike 用）。
 * 目的：搞清 JSCPP 到底能吃哪些教学语法，而不是靠猜。
 * 运行：npx tsx scripts/probe-jscpp.ts
 */
import JSCPP from "JSCPP";

type Probe = { name: string; src: string; stdin?: string; maxTimeout?: number };

const probes: Probe[] = [
  {
    name: "main(void)  ← 书里的标准写法",
    src: `#include <stdio.h>\nint main(void) { printf("hi\\n"); return 0; }\n`,
  },
  {
    name: "main() 空参数",
    src: `#include <stdio.h>\nint main() { printf("hi\\n"); return 0; }\n`,
  },
  {
    name: "main(void) + 头文件后换行",
    src: `#include <stdio.h>\n\nint main(void)\n{\n    printf("hi\\n");\n    return 0;\n}\n`,
  },
  {
    name: "自定义函数 f(void)",
    src: `#include <stdio.h>\nint f(void) { return 7; }\nint main() { printf("%d\\n", f()); return 0; }\n`,
  },
  {
    name: "scanf 读整数",
    src: `#include <stdio.h>\nint main() { int n; scanf("%d", &n); printf("%d\\n", n * 2); return 0; }\n`,
    stdin: "21",
  },
  {
    name: "for(int i=...) 声明在循环里",
    src: `#include <stdio.h>\nint main() { for (int i = 1; i <= 3; i++) printf("%d", i); printf("\\n"); return 0; }\n`,
  },
  {
    name: "浮点 %.2f",
    src: `#include <stdio.h>\nint main() { printf("%.2f\\n", 1.0 / 4); return 0; }\n`,
  },
  {
    name: "数组 + 下标",
    src: `#include <stdio.h>\nint main() { int a[3] = {5, 6, 7}; printf("%d\\n", a[1]); return 0; }\n`,
  },
  {
    name: "指针 + 取地址",
    src: `#include <stdio.h>\nint main() { int x = 3; int *p = &x; *p = 9; printf("%d\\n", x); return 0; }\n`,
  },
  {
    name: "字符串 char[] + strlen",
    src: `#include <stdio.h>\n#include <string.h>\nint main() { char s[] = "hello"; printf("%d\\n", (int) strlen(s)); return 0; }\n`,
  },
  {
    name: "结构体",
    src: `#include <stdio.h>\nstruct P { int x; int y; };\nint main() { struct P p; p.x = 4; p.y = 5; printf("%d\\n", p.x + p.y); return 0; }\n`,
  },
  {
    name: "while(1) 死循环（期望被 maxTimeout 拦住）",
    src: `#include <stdio.h>\nint main() { while (1) { } return 0; }\n`,
    maxTimeout: 1500,
  },
  {
    name: "语法错误（缺分号）",
    src: `#include <stdio.h>\nint main() { printf("oops") return 0; }\n`,
  },
  {
    name: "malloc / free",
    src: `#include <stdio.h>\n#include <stdlib.h>\nint main() { int *p = (int *) malloc(sizeof(int)); *p = 8; printf("%d\\n", *p); free(p); return 0; }\n`,
  },
  {
    name: "位运算",
    src: `#include <stdio.h>\nint main() { printf("%d\\n", 6 & 3); return 0; }\n`,
  },
];

let pass = 0;
for (const p of probes) {
  let out = "";
  const t0 = Date.now();
  try {
    JSCPP.run(p.src, p.stdin ?? "", {
      stdio: { write: (s: string) => (out += s) },
      maxTimeout: p.maxTimeout ?? 4000,
      unsigned_overflow: "ignore",
    });
    pass++;
    console.log(
      `✅ ${p.name}\n   → ${JSON.stringify(out)}  (${Date.now() - t0}ms)`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(
      `❌ ${p.name}\n   → ${JSON.stringify(msg.slice(0, 160))}  (${Date.now() - t0}ms)`,
    );
  }
}
console.log(`\n通过 ${pass}/${probes.length}`);
