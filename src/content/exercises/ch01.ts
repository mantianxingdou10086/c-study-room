/**
 * 第 1 章题库（14 题）。
 *
 * 出题原则（整本题库都遵循）：
 *  - 题干与数据全部原创，不抄录原书习题
 *  - 每题至少一条逐级提示，先给方向再给答案
 *  - CODE 题的期望输出必须是**真实跑出来的**（写题时在练习场跑过），不许手写猜测
 *  - 错也要错得有价值：干扰项要对应真实的典型误解
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 1.1 为什么学 C ────────────────────────────────────────────────
  {
    id: "ch01-why-c-q1",
    chapterOrder: 1,
    lessonSlug: "why-c",
    kind: "MCQ",
    difficulty: 1,
    prompt: "下面哪一条最准确地描述了 C 语言的特点？",
    hints: ["想想「高级语言」和「不替你管内存」这两件事之间的关系。"],
    referenceAnswer: "第 2 个选项：它提供接近高级语言的可读写法，同时把内存管理交给程序员。",
    xp: 5,
    validator: {
      options: [
        "它是一门专门为网页开发设计的语言",
        "它提供接近高级语言的可读写法，同时把内存管理交给程序员",
        "它是所有语言的最终形态，其他语言都被它取代了",
        "它只能在 Linux 上运行",
      ],
      correct: 1,
    },
  },
  {
    id: "ch01-why-c-q2",
    chapterOrder: 1,
    lessonSlug: "why-c",
    kind: "MCQ",
    difficulty: 2,
    prompt: "为什么操作系统内核、嵌入式设备、数据库这类软件至今仍然大量使用 C？",
    hints: [
      "这些软件的共同点是什么？",
      "想想「你能预测这条语句会做什么」和「你几乎不能预测它要花多少时间」的区别。",
    ],
    referenceAnswer:
      "因为 C 编译出的机器码可预测、运行时开销小，而且能直接操作内存与硬件地址。",
    xp: 5,
    validator: {
      options: [
        "因为 C 的语法比其他语言简单",
        "因为 C 有自动垃圾回收，不容易出内存错误",
        "因为它编译出的代码开销小、行为可预测，并且能直接操作内存与硬件",
        "因为写 C 的工资更高",
      ],
      correct: 2,
    },
  },

  // ── 1.2 从源代码到程序 ───────────────────────────────────────────
  {
    id: "ch01-from-source-to-program-q1",
    chapterOrder: 1,
    lessonSlug: "from-source-to-program",
    kind: "MCQ",
    difficulty: 1,
    prompt: "一个 C 程序从源代码变成可执行文件，正确的顺序是？",
    hints: ["先处理 # 开头的指令，再翻译成机器码，最后把用到的库拼进来。"],
    referenceAnswer: "预处理 → 编译 → 链接。",
    xp: 5,
    validator: {
      options: [
        "编译 → 预处理 → 链接",
        "预处理 → 编译 → 链接",
        "链接 → 编译 → 预处理",
        "预处理 → 链接 → 编译",
      ],
      correct: 1,
    },
  },
  {
    id: "ch01-from-source-to-program-q2",
    chapterOrder: 1,
    lessonSlug: "from-source-to-program",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面的程序会输出什么？请**逐字**写出输出内容（注意换行）。

\`\`\`c
#include <stdio.h>

int main(void)
{
    printf("A");
    printf("B\\n");
    printf("C");
    return 0;
}
\`\`\``,
    hints: [
      "printf 不会自动换行，只有 \\n 才会换行。",
      "把三次调用按顺序拼起来：先 A，再 B 和一个换行，最后 C。",
    ],
    referenceAnswer: "AB 换行后是 C，即两行：`AB` 和 `C`。",
    xp: 8,
    validator: { expected: "AB\nC" },
  },
  {
    id: "ch01-from-source-to-program-q3",
    chapterOrder: 1,
    lessonSlug: "from-source-to-program",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "编译时报 `undefined reference to 'printf'`（链接错误）。这说明问题出在哪一步？应该检查什么？",
    hints: [
      "这个报错里出现了 reference（引用）这个词。",
      "printf 不是你自己写的函数，它来自标准库。",
    ],
    referenceAnswer:
      "出在链接阶段：编译器找不到 printf 的实现，通常是漏了 #include <stdio.h> 或没有把标准库链进来。",
    xp: 8,
    validator: {
      blanks: [
        ["链接", "链接阶段", "链接期", "链接这一步"],
        ["stdio.h", "stdio", "<stdio.h>", "#include <stdio.h>"],
      ],
    },
  },

  // ── 1.3 拆开第一个程序 ───────────────────────────────────────────
  {
    id: "ch01-first-program-q1",
    chapterOrder: 1,
    lessonSlug: "first-program",
    kind: "MCQ",
    difficulty: 1,
    prompt: "`int main(void)` 里的 `int` 是在说什么？",
    hints: ["函数名前面的那个东西，描述的通常是它的产物。"],
    referenceAnswer: "它声明 main 函数返回一个整数，这个整数会作为程序的退出状态码交给操作系统。",
    xp: 5,
    validator: {
      options: [
        "声明 main 函数返回一个整数（也就是程序的退出状态码）",
        "声明 main 函数只有一个参数",
        "声明这个程序必须返回 0，否则不能编译",
        "没有含义，写不写都一样",
      ],
      correct: 0,
    },
  },
  {
    id: "ch01-first-program-q2",
    chapterOrder: 1,
    lessonSlug: "first-program",
    kind: "FILL",
    difficulty: 1,
    prompt: "补全这个最小程序：让它打印一行 `hello`（后面要换行）。",
    starterCode: `#include <____>

int main(void)
{
    printf("hello\\n");
    return 0;
}`,
    hints: ["printf 这个函数住在哪个头文件里？", "它是「标准输入输出」的缩写。"],
    referenceAnswer: "#include <stdio.h>",
    xp: 8,
    validator: { blanks: [["stdio.h", "stdio", "<stdio.h>"]] },
  },
  {
    id: "ch01-first-program-q3",
    chapterOrder: 1,
    lessonSlug: "first-program",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序编译能通过吗？如果能，输出什么？如果不能，请写出编译器的报错要点。

\`\`\`c
#include <stdio.h>

int main(void)
{
    printf("start");
    return 0;
    printf("end");
}
\`\`\``,
    hints: [
      "return 在函数里是做什么的？",
      "return 之后的语句还有机会执行吗？",
    ],
    referenceAnswer:
      "能通过编译，输出只有 `start`——return 一执行函数就结束了，后面的 printf 永远不会被执行（有些编译器会警告「unreachable code」）。",
    xp: 8,
    validator: { expected: "start" },
  },

  // ── 1.4 动手：读报错 ─────────────────────────────────────────────
  {
    id: "ch01-lab-read-the-error-q1",
    chapterOrder: 1,
    lessonSlug: "lab-read-the-error",
    kind: "MCQ",
    difficulty: 2,
    prompt:
      "编译器报 `main.c:5:20: error: expected ';' after expression`。最该先看哪里？",
    hints: ["报错里的数字分别是文件名、行号、列号。", "编译器报的位置有时会偏一点，但方向是对的。"],
    referenceAnswer: "先看 main.c 第 5 行（第 20 列附近），检查那一行结尾是不是漏了分号。",
    xp: 5,
    validator: {
      options: [
        "从头把整个程序重读一遍",
        "看 main.c 第 5 行、第 20 列附近，检查是否漏了分号",
        "先把第 20 行注释掉试试",
        "这是编译器的 bug，换个编译器",
      ],
      correct: 1,
    },
  },
  {
    id: "ch01-lab-read-the-error-q2",
    chapterOrder: 1,
    lessonSlug: "lab-read-the-error",
    kind: "CODE",
    difficulty: 2,
    prompt: `下面这段程序**编译不过**。找出并修好错误，让它输出：

\`\`\`
3 + 4 = 7
\`\`\`

\`\`\`c
#include <stdio.h>

int main(void)
{
    printf("%d + %d = %d\\n", 3, 4, 3 + 4)
    return 0;
}
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    printf("%d + %d = %d\\n", 3, 4, 3 + 4)
    return 0;
}
`,
    hints: [
      "编译器会说 expected ';' —— 它期望某个地方有分号。",
      "语句的结尾必须有分号，printf 调用也不例外。",
    ],
    referenceAnswer: "在 printf(...) 那一行末尾补上分号即可。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    printf("%d + %d = %d\\n", 3, 4, 3 + 4);
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["3 + 4 = 7"] },
  },
  {
    id: "ch01-lab-read-the-error-q3",
    chapterOrder: 1,
    lessonSlug: "lab-read-the-error",
    kind: "CODE",
    difficulty: 3,
    prompt: `写一个程序，只打印下面这一行（注意引号、反斜杠和感叹号都要原样输出）：

\`\`\`
C 说："用 \\n 换行"
\`\`\`

提示：反斜杠在字符串里要写成两个才能输出一个。`,
    starterCode: `#include <stdio.h>

int main(void)
{
    printf("TODO\\n");
    return 0;
}
`,
    hints: [
      "想在字符串里输出一个反斜杠，要写两个：\\\\",
      "双引号在字符串里要转义：\\\"",
      "整行内容是：C 说：\"用 \\\\n 换行\"",
    ],
    referenceAnswer: `printf("C 说：\\"用 \\\\n 换行\\"\\n");`,
    referenceCode: `#include <stdio.h>

int main(void)
{
    printf("C 说：\\"用 \\\\n 换行\\"\\n");
    return 0;
}
`,
    xp: 15,
    validator: { expectedStdoutAny: [`C 说："用 \\n 换行"`] },
  },
  {
    id: "ch01-lab-read-the-error-q4",
    chapterOrder: 1,
    lessonSlug: "lab-read-the-error",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "你看到报错 `expected declaration or statement at end of input`（在文件末尾）。这类「跑到文件结尾还缺东西」的报错，最常见的原因是什么？",
    hints: [
      "编译器一路读到文件结尾都没找到它要的东西……它可能在等什么？",
      "回想一下每个函数体的开头和结尾。",
    ],
    referenceAnswer: "花括号没有配对——通常是少写了一个 `}`。",
    xp: 8,
    validator: { blanks: [["}", "右花括号", "花括号", "少了一个}", "缺少右花括号", "少写一个右花括号"]] },
  },
];

export const CHAPTER_01_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
