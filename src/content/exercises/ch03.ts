/**
 * 第 3 章题库（15 题）。
 *
 * 这一章的题围绕四件事出：
 *  1. 转换说明选错（%d 配 double、%c 配整数）——不报错但输出垃圾
 *  2. 宽度与精度（%5d、%.3f、%-6d）——表格对齐全靠它
 *  3. scanf 的真实行为（读到非数字就停、%c 会读到换行符）
 *  4. 输出格式也是题目的一部分（多一个空格就是错）
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 3.1 printf 的转换说明 ────────────────────────────────────────
  {
    id: "ch03-printf-conversions-q1",
    chapterOrder: 3,
    lessonSlug: "printf-conversions",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`printf(\"%c%c\\n\", 'A', 66);` 会输出什么？",
    hints: [
      "`%c` 要的是「一个字符」，而字符在 C 里其实就是小整数。",
      "查一下 ASCII 表：大写字母 A 是 65，那 66 是谁？",
    ],
    referenceAnswer:
      "输出 `AB`。`%c` 会把参数当成字符编码来解释，66 对应的字符就是 'B'。",
    xp: 5,
    validator: {
      options: ["AB", "A66", "A B", "编译错误"],
      correct: 0,
    },
  },
  {
    id: "ch03-printf-conversions-q2",
    chapterOrder: 3,
    lessonSlug: "printf-conversions",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `同一个变量，用两种转换说明打印，输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int n = 65;

    printf("%d %c\\n", n, n);
    return 0;
}
\`\`\``,
    hints: [
      "同一个值 65，用 %d 解释是数字，用 %c 解释是字符。",
      "65 对应 ASCII 表里的大写 A。",
    ],
    referenceAnswer: "输出 `65 A`。同一串比特，用不同的转换说明去解释，得到不同的显示结果。",
    xp: 8,
    validator: { expected: "65 A" },
  },
  {
    id: "ch03-printf-conversions-q3",
    chapterOrder: 3,
    lessonSlug: "printf-conversions",
    kind: "FILL",
    difficulty: 1,
    prompt:
      "在 printf 的格式串里：想打印一个 `double`，用（1）____；想打印一个 `char`，用（2）____；想打印一个字符串，用（3）____。",
    hints: ["三个占位符分别对应浮点、字符、字符串。"],
    referenceAnswer: "%f（或 %lf）/ %c / %s",
    xp: 8,
    validator: {
      blanks: [["%f", "%lf"], ["%c"], ["%s"]],
    },
  },

  // ── 3.2 宽度、精度与对齐 ─────────────────────────────────────────
  {
    id: "ch03-width-precision-align-q1",
    chapterOrder: 3,
    lessonSlug: "width-precision-align",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`printf(\"%5d|\", 42);` 会输出什么？",
    hints: [
      "`5` 是「最小总宽度」，不是「最多打印 5 位」。",
      "宽度不够时会补空格；默认补在左边还是右边？",
    ],
    referenceAnswer:
      "输出 `   42|`：42 只占 2 个字符，所以左边补 3 个空格凑够 5 个字符宽（默认右对齐）。",
    xp: 5,
    validator: {
      options: [
        "42   |（数字后面补空格）",
        "   42|（数字前面补空格，总宽 5）",
        "42|（宽度不够就忽略）",
        "00042|（自动补零）",
      ],
      correct: 1,
    },
  },
  {
    id: "ch03-width-precision-align-q2",
    chapterOrder: 3,
    lessonSlug: "width-precision-align",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    printf("%.3f\\n", 2.0 / 3);
    return 0;
}
\`\`\``,
    hints: [
      "2.0 / 3 是 0.666666……，但只保留 3 位小数。",
      "保留位数会四舍五入，不是直接截断。",
    ],
    referenceAnswer: "输出 `0.667`。第 4 位是 6，进位后末位从 6 变 7。",
    xp: 8,
    validator: { expected: "0.667" },
  },
  {
    id: "ch03-width-precision-align-q3",
    chapterOrder: 3,
    lessonSlug: "width-precision-align",
    kind: "FILL",
    difficulty: 2,
    prompt: "`printf(\"%-6d|\", 42);` 里的减号 `-` 表示（____）对齐。",
    hints: ["默认是右对齐（数字靠右、空格补在左边）。减号就是把它反过来。"],
    referenceAnswer: "左对齐（42 靠左，空格补在右边，得到 `42    |`）。",
    xp: 8,
    validator: { blanks: [["左", "左对齐", "向左"]] },
  },

  // ── 3.3 scanf 到底怎么读输入 ─────────────────────────────────────
  {
    id: "ch03-scanf-deep-q1",
    chapterOrder: 3,
    lessonSlug: "scanf-deep",
    kind: "MCQ",
    difficulty: 3,
    prompt:
      "用户输入 `12abc` 回车，而程序执行的是 `scanf(\"%d\", &n);`。变量 `n` 会变成多少？",
    hints: [
      "scanf 按格式说明去「匹配」字符：%d 只认数字、正负号和空白。",
      "读到不认识的字符时它会停下，并把那个字符留在输入缓冲区里。",
    ],
    referenceAnswer:
      "`n` 是 `12`。scanf 读到 `a` 就停了——它不会报错，`abc` 会留在缓冲区里，等着被下一次读取碰到。",
    xp: 8,
    validator: {
      options: [
        "12（读到 a 就停止，abc 留在缓冲区）",
        "0（因为有非法字符，整个读入失败）",
        "12abc 会被当成一个数",
        "程序会崩溃",
      ],
      correct: 0,
    },
  },
  {
    id: "ch03-scanf-deep-q2",
    chapterOrder: 3,
    lessonSlug: "scanf-deep",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `程序连续读了两次整数，而用户输入的是两行。输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int a, b;

    scanf("%d", &a);
    scanf("%d", &b);
    printf("%d\\n", a * b);
    return 0;
}
\`\`\`

（用户输入：第一行 \`3\`，第二行 \`4\`）`,
    stdin: "3\n4",
    hints: [
      "%d 会自动跳过前面的空白字符——包括空格、Tab 和换行。",
      "所以分两次 scanf 读、用一行输入 `3 4` 读，效果是一样的。",
    ],
    referenceAnswer: "输出 `12`。两次 scanf 各自跳过了换行，分别读到 3 和 4。",
    xp: 8,
    validator: { expected: "12" },
  },
  {
    id: "ch03-scanf-deep-q3",
    chapterOrder: 3,
    lessonSlug: "scanf-deep",
    kind: "FILL",
    difficulty: 3,
    prompt:
      "在 scanf 里读一个 `double`，格式串必须写（____）——写成 `%f` 是不对的（这是 scanf 和 printf 的一个著名不一致）。",
    hints: [
      "scanf 需要知道要读多大的数据，double 比 float 大。",
      "在 % 和 f 之间加一个字母。",
    ],
    referenceAnswer: "`%lf`（l 表示 long，即更大精度的浮点）。printf 里 double 用 %f 就行，但 scanf 必须用 %lf。",
    xp: 8,
    validator: { blanks: [["%lf", "%Lf"]] },
  },

  // ── 3.4 输入输出的五个经典坑 ─────────────────────────────────────
  {
    id: "ch03-io-pitfalls-q1",
    chapterOrder: 3,
    lessonSlug: "io-pitfalls",
    kind: "MCQ",
    difficulty: 3,
    prompt: `先读一个整数、再读一个字符：

\`\`\`c
int n;
char ch;
scanf("%d", &n);
scanf("%c", &ch);
\`\`\`

用户输入 \`5\` 然后按回车。变量 \`ch\` 会读到什么？`,
    hints: [
      "用户输入的数字后面还跟着一个「看不见」的字符。",
      "%d 读完 5 就停下了，但它不会把后面的东西也吃掉。",
    ],
    referenceAnswer:
      "`ch` 会读到回车（换行符 `'\\n'`）。因为 `%d` 读完 5 就停了，换行符还在缓冲区里，被 `%c` 原样读走——所以程序看起来「跳过了」这次输入。",
    xp: 8,
    validator: {
      options: [
        "用户接下来输入的那个字符",
        "回车（换行符），所以这次输入看起来被跳过了",
        "0",
        "程序会崩溃",
      ],
      correct: 1,
    },
  },
  {
    id: "ch03-io-pitfalls-q2",
    chapterOrder: 3,
    lessonSlug: "io-pitfalls",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入两个整数（空格分隔），输出它们的**平均分**，保留 2 位小数。

输入 \`85 92\`，输出 \`88.50\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int a, b;

    scanf("%d %d", &a, &b);
    /* 注意：平均分要用浮点算，否则小数部分会丢 */
    return 0;
}
`,
    stdin: "85 92",
    hints: [
      "`(a + b) / 2` 是整数除法，结果是 88，不是 88.5。",
      "写成 `(a + b) / 2.0` 就会按浮点算。",
      '输出用 `printf("%.2f\\n", ...)`。',
    ],
    referenceAnswer: "`double avg = (a + b) / 2.0;` 然后按两位小数输出。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int a, b;
    double avg;

    scanf("%d %d", &a, &b);
    avg = (a + b) / 2.0;
    printf("%.2f\\n", avg);
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["88.50"] },
  },
  {
    id: "ch03-io-pitfalls-q3",
    chapterOrder: 3,
    lessonSlug: "io-pitfalls",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "用 `scanf(\"%c\", &ch)` 读字符时，如果前面刚用 scanf 读过数字，`ch` 很可能读到的是（____）而不是你想要的字符。",
    hints: ["想想上一条选择题里那个「看不见」的字符。"],
    referenceAnswer: "回车（换行符 `'\\n'`）。要读字符前先「吃掉」它，或者用 `\" %c\"`（% 前面加一个空格）让 scanf 先跳过空白。",
    xp: 8,
    validator: {
      blanks: [["换行符", "回车", "换行", "\\n", "'\\n'", "回车换行", "回车符"]],
    },
  },

  // ── 3.5 动手：做一张对齐的成绩单 ─────────────────────────────────
  {
    id: "ch03-lab-report-card-q1",
    chapterOrder: 3,
    lessonSlug: "lab-report-card",
    kind: "CODE",
    difficulty: 3,
    prompt: `读入三个整数成绩，输出一行：三个成绩各占 4 个字符宽（右对齐），
然后输出「平均」和平均分（保留 1 位小数）。

输入 \`88 92 75\`，输出（注意每列宽度）：

\`\`\`
  88  92  75 平均 85.0
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int a, b, c;

    scanf("%d %d %d", &a, &b, &c);
    /* 用 %4d 控制宽度，平均分用 %.1f */
    return 0;
}
`,
    stdin: "88 92 75",
    hints: [
      "宽度用 `%4d`：不足 4 位时左边补空格。",
      "平均分：`(a + b + c) / 3.0`，再按 `%.1f` 输出。",
      '整体是一个 printf：`printf("%4d%4d%4d 平均 %.1f\\n", a, b, c, avg);`',
    ],
    referenceAnswer:
      "`printf(\"%4d%4d%4d 平均 %.1f\\n\", a, b, c, avg);` —— 关键是 %4d 和 3.0。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int a, b, c;
    double avg;

    scanf("%d %d %d", &a, &b, &c);
    avg = (a + b + c) / 3.0;
    printf("%4d%4d%4d 平均 %.1f\\n", a, b, c, avg);
    return 0;
}
`,
    xp: 15,
    validator: { expectedStdoutAny: ["  88  92  75 平均 85.0"] },
  },
  {
    id: "ch03-lab-report-card-q2",
    chapterOrder: 3,
    lessonSlug: "lab-report-card",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `左右对齐对比，输出什么？（用 \`|\` 标出边界）

\`\`\`c
#include <stdio.h>

int main(void)
{
    printf("%-6s|%6s|\\n", "abc", "abc");
    return 0;
}
\`\`\``,
    hints: [
      "`%-6s` 左对齐：先放 abc，再补 3 个空格。",
      "`%6s` 右对齐：先补 3 个空格，再放 abc。",
    ],
    referenceAnswer: "输出 `abc   |   abc|`（左边那格 abc 后面补空格，右边那格 abc 前面补空格）。",
    xp: 10,
    validator: { expected: "abc   |   abc|" },
  },
  {
    id: "ch03-lab-report-card-q3",
    chapterOrder: 3,
    lessonSlug: "lab-report-card",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入一个小数，把它用三种精度打印在同一行，用 \`|\` 分隔：整数形式、保留 2 位、保留 4 位。

输入 \`3.14159\`，输出：

\`\`\`
3|3.14|3.1416|
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    double x;

    scanf("%lf", &x);
    /* 三种精度用 %.0f %.2f %.4f，中间用 | 分隔 */
    return 0;
}
`,
    stdin: "3.14159",
    hints: [
      "注意读 double 要用 `%lf`，打印可以用 `%f` 系列。",
      "`%.0f` 会四舍五入到整数；`%.4f` 保留 4 位。",
      '最后别忘行尾的 `|` 和 `\\n`。',
    ],
    referenceAnswer: '`printf("%.0f|%.2f|%.4f|\\n", x, x, x);`',
    referenceCode: `#include <stdio.h>

int main(void)
{
    double x;

    scanf("%lf", &x);
    printf("%.0f|%.2f|%.4f|\\n", x, x, x);
    return 0;
}
`,
    xp: 15,
    validator: { expectedStdoutAny: ["3|3.14|3.1416|"] },
  },
];

export const CHAPTER_03_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
