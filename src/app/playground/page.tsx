import type { Metadata } from "next";
import { RunPanel, type Example } from "@/components/code/run-panel";

export const metadata: Metadata = {
  title: "练习场",
  description:
    "在浏览器里直接编译运行 C 代码，不用装编译器。改一改示例，看看会发生什么。",
};

const EXAMPLES: Example[] = [
  {
    id: "hello",
    title: "1. 第一个程序",
    note: "第 1~2 章",
    code: `#include <stdio.h>

int main(void)
{
    printf("Hello, world!\\n");
    return 0;
}
`,
  },
  {
    id: "scanf",
    title: "2. 读入一个整数",
    note: "第 3 章 · 先看右边的输入框",
    stdin: "21\n",
    code: `#include <stdio.h>

int main(void)
{
    int n;

    printf("请输入一个整数：");
    scanf("%d", &n);
    printf("它的两倍是 %d\\n", n * 2);
    return 0;
}
`,
  },
  {
    id: "loop",
    title: "3. 循环与分支",
    note: "第 5~6 章",
    code: `#include <stdio.h>

int main(void)
{
    for (int i = 1; i <= 15; i++) {
        if (i % 15 == 0)      printf("FizzBuzz\\n");
        else if (i % 3 == 0)  printf("Fizz\\n");
        else if (i % 5 == 0)  printf("Buzz\\n");
        else                  printf("%d\\n", i);
    }
    return 0;
}
`,
  },
  {
    id: "array",
    title: "4. 数组与函数",
    note: "第 8~9 章",
    code: `#include <stdio.h>

#define N 5

double average(const int a[], int n);

int main(void)
{
    int scores[N] = {88, 92, 75, 96, 81};

    printf("平均分：%.1f\\n", average(scores, N));
    return 0;
}

double average(const int a[], int n)
{
    int sum = 0;

    for (int i = 0; i < n; i++)
        sum += a[i];
    return (double) sum / n;
}
`,
  },
  {
    id: "struct",
    title: "5. 结构体（秒开模式不支持）",
    note: "第 16 章 · 用来对比两种引擎的差别",
    code: `#include <stdio.h>

struct point { int x; int y; };

int main(void)
{
    struct point p = {3, 4};

    printf("(%d, %d)\\n", p.x, p.y);
    return 0;
}
`,
  },
  {
    id: "timeout",
    title: "6. 死循环（测超时保护）",
    note: "故意写错，看网站会不会卡死",
    code: `#include <stdio.h>

int main(void)
{
    int i = 0;

    while (i < 10) {
        printf("永远不会结束……\\n");
        /* 忘了写 i++ 了 */
    }
    return 0;
}
`,
  },
  {
    id: "error",
    title: "7. 编译错误长什么样",
    note: "第 2 章 · 忘了分号",
    code: `#include <stdio.h>

int main(void)
{
    printf("我忘了分号")
    return 0;
}
`,
  },
];

export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">练习场</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          不用装编译器，改完点「运行」就能看到结果。左边写代码，右边填程序要读的输入。
          想验证自己是否真的理解了，把示例改坏再跑一遍——编译器会告诉你错在哪。
        </p>
      </header>
      <RunPanel examples={EXAMPLES} />
    </div>
  );
}
