/**
 * 引擎契约用例：任何 CEngine 实现都必须通过这一组。
 * 这些用例刻意选的是教学前 10 章真正会用到的语法，
 * 而不是"能跑通 Hello World 就算过"。
 */
export interface RunnerCase {
  name: string;
  /** 这条用例在讲什么 */
  why: string;
  src: string;
  stdin?: string;
  /** 期望的标准输出（精确匹配，测试里会做尾空白规范化） */
  expect?: string;
  /** 期望失败（编译错误） */
  expectsError?: boolean;
  /** 期望超时 */
  expectsTimeout?: boolean;
}

export const RUNNER_CASES: RunnerCase[] = [
  {
    name: "hello",
    why: "最基本的 printf + 头文件包含",
    src: `#include <stdio.h>
int main(void) {
    printf("hi\\n");
    return 0;
}
`,
    expect: "hi\n",
  },
  {
    name: "scanf",
    why: "从 stdin 读一个整数（教学里最常见的输入方式）",
    src: `#include <stdio.h>
int main(void) {
    int n;
    scanf("%d", &n);
    printf("%d\\n", n * 2);
    return 0;
}
`,
    stdin: "21",
    expect: "42\n",
  },
  {
    name: "loop",
    why: "for 循环 + 变量作用域",
    src: `#include <stdio.h>
int main(void) {
    for (int i = 1; i <= 3; i++) printf("%d", i);
    printf("\\n");
    return 0;
}
`,
    expect: "123\n",
  },
  {
    name: "float",
    why: "浮点运算与格式控制 %.2f",
    src: `#include <stdio.h>
int main(void) {
    printf("%.2f\\n", 1.0 / 4);
    return 0;
}
`,
    expect: "0.25\n",
  },
  {
    name: "array",
    why: "数组定义与下标访问",
    src: `#include <stdio.h>
int main(void) {
    int a[3] = {5, 6, 7};
    printf("%d\\n", a[1]);
    return 0;
}
`,
    expect: "6\n",
  },
  {
    name: "compile-error",
    why: "语法错误必须被识别成「编译错误」，而不是静默通过或卡死",
    src: `#include <stdio.h>
int main(void) {
    printf("oops")
    return 0;
}
`,
    expectsError: true,
  },
  {
    name: "infinite-loop",
    why: "死循环必须被超时机制拦住（不能冻结页面）",
    src: `#include <stdio.h>
int main(void) {
    while (1) { }
    return 0;
}
`,
    expectsTimeout: true,
  },
];

/** 输出规范化：只比内容，不比结尾换行和行尾空格 */
export function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n+$/, "");
}
