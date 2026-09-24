/**
 * 第 2 章题库（15 题）。
 *
 * 这一章的出题重点是"变量到底是什么"：值传递（b = a 之后改 a 不影响 b）、
 * 以及 printf/scanf 的分工（printf 要值，scanf 要地址）。
 * 最后三题是一组**对照实验**：同一个公式用 int 和用 double 算，结果不同——
 * 让学生在题目里亲自撞一次整数除法这堵墙。
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 2.1 变量：给数据起个名字 ─────────────────────────────────────
  {
    id: "ch02-variables-and-assignment-q1",
    chapterOrder: 2,
    lessonSlug: "variables-and-assignment",
    kind: "MCQ",
    difficulty: 1,
    prompt: "哪一句**同时**完成了「声明一个整型变量」和「把它初始化为 10」？",
    hints: ["声明是「告诉编译器我要一个盒子」，初始化是「第一次往盒子里放东西」。"],
    referenceAnswer: "`int x = 10;` —— 一行里先声明再初始化。",
    xp: 5,
    validator: {
      options: ["int x; x = 10;", "int x = 10;", "x = 10;", "int 10 = x;"],
      correct: 1,
    },
  },
  {
    id: "ch02-variables-and-assignment-q2",
    chapterOrder: 2,
    lessonSlug: "variables-and-assignment",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int a = 3;
    int b = a;
    a = 7;
    printf("%d %d\\n", a, b);
    return 0;
}
\`\`\``,
    hints: [
      "`int b = a;` 这一句执行时，a 的值是多少？",
      "把 a 的值「抄」进 b 之后，两个变量就互不相干了。",
    ],
    referenceAnswer:
      "输出 `7 3`。`b = a` 是把 a 当时的**值**（3）复制给 b；之后改 a 不会影响 b。",
    xp: 8,
    validator: { expected: "7 3" },
  },
  {
    id: "ch02-variables-and-assignment-q3",
    chapterOrder: 2,
    lessonSlug: "variables-and-assignment",
    kind: "FILL",
    difficulty: 1,
    prompt: "在 `int count = 0;` 这一句里，`int` 表示数据的（1）____，`count` 是（2）____，`0` 是它的（3）____。",
    hints: ["三个空分别对应「装什么」「叫什么」「一开始装了什么」。"],
    referenceAnswer: "类型 / 变量名（标识符）/ 初始值",
    xp: 8,
    validator: {
      blanks: [
        ["类型", "数据类型"],
        ["变量名", "名字", "标识符", "变量名（标识符）"],
        ["初始值", "初值", "初始的值"],
      ],
    },
  },

  // ── 2.2 把结果打印出来 ───────────────────────────────────────────
  {
    id: "ch02-printf-basics-q1",
    chapterOrder: 2,
    lessonSlug: "printf-basics",
    kind: "MCQ",
    difficulty: 1,
    prompt: '`printf("总共 %d 个\\n", 5);` 会输出什么？',
    hints: ["%d 是一个「占位符」，它会被后面的参数替换掉。", "\\n 是换行，不会原样打印出来。"],
    referenceAnswer: "输出「总共 5 个」再换行。",
    xp: 5,
    validator: {
      options: [
        "总共 %d 个",
        "总共 5 个（然后换行）",
        "总共 5 个\\n（把 \\n 也原样打印出来）",
        "编译错误",
      ],
      correct: 1,
    },
  },
  {
    id: "ch02-printf-basics-q2",
    chapterOrder: 2,
    lessonSlug: "printf-basics",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序会打印几行？内容分别是什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int x = 4;
    int y = 6;
    printf("%d+%d=%d\\n", x, y, x + y);
    printf("x=%d, y=%d\\n", x, y);
    return 0;
}
\`\`\``,
    hints: [
      "两次 printf 各有一个 \\n，所以各占一行。",
      "第一个 printf 的三个 %d 按顺序被 x、y、x+y 填上。",
    ],
    referenceAnswer: "两行：先 `4+6=10`，再 `x=4, y=6`。",
    xp: 8,
    validator: { expected: "4+6=10\nx=4, y=6" },
  },
  {
    id: "ch02-printf-basics-q3",
    chapterOrder: 2,
    lessonSlug: "printf-basics",
    kind: "FILL",
    difficulty: 2,
    prompt: "想在屏幕上打印出一个**字面的百分号**（比如「完成度 80%」），在格式串里要写成什么？",
    hints: [
      "`%` 在 printf 的格式串里有特殊含义——它后面通常跟着转换说明。",
      "和 `\\\\` 打印一个反斜杠是一个道理：重复一次。",
    ],
    referenceAnswer: "写成 `%%`，例如 `printf(\"完成度 80%%\\n\");`",
    xp: 8,
    validator: { blanks: [["%%", "％％"]] },
  },

  // ── 2.3 让用户输入数据 ───────────────────────────────────────────
  {
    id: "ch02-scanf-basics-q1",
    chapterOrder: 2,
    lessonSlug: "scanf-basics",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`scanf(\"%d\", &n);` 里那个 `&` 是干什么的？为什么 printf 不需要它？",
    hints: [
      "printf 要把值**送出去**，scanf 要把值**收进来**。",
      "收进来之前，它得知道该放到哪块内存里。",
    ],
    referenceAnswer:
      "`&` 取出变量 n 的地址，告诉 scanf「读到的数放到这里」。printf 只需要值本身，不需要知道变量住在哪。",
    xp: 5,
    validator: {
      options: [
        "& 是「按位与」运算符，用在这里是为了提速",
        "& 取变量地址，告诉 scanf 把读到的值存到哪；printf 只要值，不要地址",
        "& 表示这个变量是全局变量",
        "加不加都一样，只是习惯写法",
      ],
      correct: 1,
    },
  },
  {
    id: "ch02-scanf-basics-q2",
    chapterOrder: 2,
    lessonSlug: "scanf-basics",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入两个整数（不要打印任何提示语），然后输出两行：

- 第一行：它们的**和**
- 第二行：它们的**积**

例如输入 \`3 4\`，输出应该是：
\`\`\`
7
12
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int a, b;

    scanf("%d %d", &a, &b);
    /* 在这里输出和与积 */
    return 0;
}
`,
    stdin: "3 4",
    hints: [
      "读两个数：`scanf(\"%d %d\", &a, &b);` —— 每个变量都要有自己的 &。",
      "和是 `a + b`，积是 `a * b`；每个 printf 结尾记得写 \\n。",
    ],
    referenceAnswer: "用两个 printf 分别输出 a + b 和 a * b。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int a, b;

    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    printf("%d\\n", a * b);
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["7\n12"] },
  },
  {
    id: "ch02-scanf-basics-q3",
    chapterOrder: 2,
    lessonSlug: "scanf-basics",
    kind: "FILL",
    difficulty: 1,
    prompt: "下面这句想读入一个整数存进 `n`，但它漏了东西，导致程序运行时会出错或读到垃圾值。漏的是什么？\n\n```c\nscanf(\"%d\", n);\n```",
    hints: ["scanf 要的是「数据放到哪」，而不是「数据叫什么」。", "是一个运算符。"],
    referenceAnswer: "漏了取地址符 `&`，应写成 `scanf(\"%d\", &n);`",
    xp: 8,
    validator: { blanks: [["&", "&运算符", "取地址符", "取地址运算符", "& 运算符"]] },
  },

  // ── 2.4 标识符、关键字与注释 ─────────────────────────────────────
  {
    id: "ch02-identifiers-and-comments-q1",
    chapterOrder: 2,
    lessonSlug: "identifiers-and-comments",
    kind: "MCQ",
    difficulty: 1,
    prompt: "下面哪个**是合法的 C 标识符**（可以用作变量名）？",
    hints: [
      "标识符只能由字母、数字、下划线组成，且不能以数字开头。",
      "另外，C 的关键字（如 int、return）被语言占用了，不能当变量名。",
    ],
    referenceAnswer: "`second_place` 合法；`2ndPlace` 以数字开头、`second-place` 含减号、`int` 是关键字。",
    xp: 5,
    validator: {
      options: ["2ndPlace", "second-place", "second_place", "int"],
      correct: 2,
    },
  },
  {
    id: "ch02-identifiers-and-comments-q2",
    chapterOrder: 2,
    lessonSlug: "identifiers-and-comments",
    kind: "FILL",
    difficulty: 2,
    prompt: "两种注释的区别：`//` 只能注释到本行末尾，而 `/* ... */` 可以跨（____）注释。",
    hints: ["想想 `/*` 和 `*/` 之间能不能换行。"],
    referenceAnswer: "可以跨**多行**（`/*` 到 `*/` 之间的换行也算在注释里）。",
    xp: 8,
    validator: { blanks: [["多行", "行", "多行注释", "很多行"]] },
  },

  // ── 2.5 代码的排版与风格 ─────────────────────────────────────────
  {
    id: "ch02-layout-and-style-q1",
    chapterOrder: 2,
    lessonSlug: "layout-and-style",
    kind: "MCQ",
    difficulty: 2,
    prompt: "关于缩进和空行，下面哪一句是对的？",
    hints: ["编译器只关心分号和花括号，不关心空格。"],
    referenceAnswer:
      "缩进和空行不影响程序运行（编译器会忽略），但它们是给人看的——排版乱的代码，出错时你自己都找不到。",
    xp: 5,
    validator: {
      options: [
        "缩进是语法要求，缩错了编译不过",
        "缩进和空行不影响编译结果，但直接影响你能否快速看懂和排查代码",
        "缩进越多越好，显得专业",
        "C 语言规定必须用 4 个空格，用 Tab 会报错",
      ],
      correct: 1,
    },
  },

  // ── 2.6 动手：把公式写成程序 ─────────────────────────────────────
  {
    id: "ch02-lab-first-calculator-q1",
    chapterOrder: 2,
    lessonSlug: "lab-first-calculator",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入一个摄氏温度（整数），输出对应的华氏温度，**保留 1 位小数**。

公式：华氏 = 摄氏 × 9 ÷ 5 + 32

输入 \`37\`，输出 \`98.6\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int c;

    scanf("%d", &c);
    /* 注意：要让结果带小数，参与运算的数里必须有小数 */
    return 0;
}
`,
    stdin: "37",
    hints: [
      "`c * 9 / 5` 里全是整数，结果会被截断成整数——这正是本题的陷阱。",
      "把 9 写成 9.0（或把 c 强制转成 double），除法就会保留小数。",
      '输出用 `printf("%.1f\\n", ...)`。',
    ],
    referenceAnswer:
      "关键是把运算变成浮点：`double f = c * 9.0 / 5 + 32;` 然后 `printf(\"%.1f\\n\", f);`",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int c;
    double f;

    scanf("%d", &c);
    f = c * 9.0 / 5 + 32;
    printf("%.1f\\n", f);
    return 0;
}
`,
    xp: 15,
    validator: { expectedStdoutAny: ["98.6"] },
  },
  {
    id: "ch02-lab-first-calculator-q2",
    chapterOrder: 2,
    lessonSlug: "lab-first-calculator",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `和上一题同一个公式，但这个程序用的是整数运算。它输出什么？为什么和上一题的答案不一样？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int c = 37;

    printf("%d\\n", c * 9 / 5 + 32);
    return 0;
}
\`\`\``,
    hints: [
      "先算 `c * 9`，再除以 5——注意每一步的结果都还是整数。",
      "333 ÷ 5 在整数世界里等于多少？",
    ],
    referenceAnswer:
      "输出 `98`。`37 * 9 = 333`，而 `333 / 5` 在整数除法里等于 66（丢掉小数部分），66 + 32 = 98。所以「数值算对了」和「结果算对了」是两件事。",
    xp: 10,
    validator: { expected: "98" },
  },
  {
    id: "ch02-lab-first-calculator-q3",
    chapterOrder: 2,
    lessonSlug: "lab-first-calculator",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入一个圆的半径（整数），输出它的面积，**保留 2 位小数**。

圆周率取 \`3.14159\`，面积 = π × r × r

输入 \`2\`，输出 \`12.57\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int r;

    scanf("%d", &r);
    /* 输出面积 */
    return 0;
}
`,
    stdin: "2",
    hints: [
      "π 要写成小数形式：`3.14159`。",
      "面积用 double 存：`double s = 3.14159 * r * r;`",
      '输出 `printf("%.2f\\n", s);`',
    ],
    referenceAnswer: "`double s = 3.14159 * r * r;` 然后按两位小数输出。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int r;
    double s;

    scanf("%d", &r);
    s = 3.14159 * r * r;
    printf("%.2f\\n", s);
    return 0;
}
`,
    xp: 15,
    validator: { expectedStdoutAny: ["12.57"] },
  },
];

export const CHAPTER_02_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
