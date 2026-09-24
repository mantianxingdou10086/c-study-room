/**
 * 第 7 章题库（15 题）。
 *
 * 这一章的题围绕四件事出：
 *  1. 整数类型的宽度是平台相关的（sizeof 问出来、stdint.h 锁死）
 *  2. 浮点是近似值（0.1 + 0.2 != 0.3、比较要用误差范围）
 *  3. char 是小整数（'A' 是 65、字符可以直接做算术）
 *  4. 强制转换改的是「怎么解释这串比特」（截断不是四舍五入）
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 7.1 整数类型与取值范围 ───────────────────────────────────────
  {
    id: "ch07-integer-types-q1",
    chapterOrder: 7,
    lessonSlug: "integer-types",
    kind: "MCQ",
    difficulty: 1,
    prompt: "在一台 `int` 占 4 字节的机器上，`int` 能表示的最大正数是多少？",
    hints: [
      "4 字节就是 32 位，其中要拿出 1 位来表示正负号。",
      "剩下 31 位全填 1，就是最大值：2 的 31 次方减 1。",
    ],
    referenceAnswer:
      "`2147483647`（2 的 31 次方减 1）。`65535` 是 `unsigned short` 的最大值，`32767` 是 `short` 的最大值，`4294967295` 是 `unsigned int` 的最大值——有符号类型要留一位给符号，所以最大值只有无符号的一半。",
    xp: 5,
    validator: {
      options: ["65535", "32767", "2147483647", "4294967295"],
      correct: 2,
    },
  },
  {
    id: "ch07-integer-types-q2",
    chapterOrder: 7,
    lessonSlug: "integer-types",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序在本站运行器（32 位 WebAssembly）上输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    printf("%d %d\\n", (int)sizeof(short), (int)sizeof(int));
    return 0;
}
\`\`\``,
    hints: [
      "`sizeof` 给出的是字节数，先用 `(int)` 转成整数再打印。",
      "C 标准只要求 `short` 至少 2 字节、`int` 至少 2 字节，但常见平台上 `int` 都是 4 字节。",
    ],
    referenceAnswer:
      "输出 `2 4`。`short` 是 2 字节，`int` 是 4 字节——这也解释了为什么 `short` 只能存到 32767，而 `int` 能存到 21 亿。",
    xp: 8,
    validator: { expected: "2 4" },
  },
  {
    id: "ch07-integer-types-q3",
    chapterOrder: 7,
    lessonSlug: "integer-types",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "在 4 字节 `int` 的机器上：`int` 能表示的最大值是（1）____；`unsigned int` 能表示的最大值是（2）____。",
    hints: [
      "有符号类型留了 1 位给符号，无符号类型把 32 位全部用来表示数值。",
      "两个答案分别是 2 的 31 次方减 1 和 2 的 32 次方减 1。",
    ],
    referenceAnswer:
      "（1）2147483647（2 的 31 次方减 1）；（2）4294967295（2 的 32 次方减 1）。无符号多出来的那一位，正好让最大值翻倍再多一点。",
    xp: 8,
    validator: {
      blanks: [
        ["2147483647", "2^31-1", "2**31-1", "INT_MAX"],
        ["4294967295", "2^32-1", "2**32-1", "UINT_MAX"],
      ],
    },
  },

  // ── 7.2 浮点类型与精度陷阱 ───────────────────────────────────────
  {
    id: "ch07-floating-types-q1",
    chapterOrder: 7,
    lessonSlug: "floating-types",
    kind: "MCQ",
    difficulty: 2,
    prompt: "要判断两个 `double` 变量 `a`、`b` 是否「相等」，下面哪种做法是对的？",
    hints: [
      "浮点数存的是近似值，两个「应该相等」的结果往往只差最后几位。",
      "所以不能问「是否完全相等」，要问「差是否足够小」。",
    ],
    referenceAnswer:
      "先算出 `a - b` 的绝对值，再判断它是否小于一个很小的误差范围（比如 `1e-9`）。直接写 `a == b` 几乎一定不成立——`0.1 + 0.2` 就不等于 `0.3`；转成 `int` 会把小数部分全丢掉，误差更大；乘一个大数也不会消除误差。",
    xp: 5,
    validator: {
      options: [
        "`if (a == b)` —— 直接比较",
        "把 a 和 b 都转成 int 再比",
        "先算 `a - b` 的绝对值，判断它是否小于一个很小的误差范围",
        "把 a 和 b 都乘以 1000000 再比较",
      ],
      correct: 2,
    },
  },
  {
    id: "ch07-floating-types-q2",
    chapterOrder: 7,
    lessonSlug: "floating-types",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "比较两个浮点数 a、b 时，正确做法是判断它们之差的（____）是否小于一个很小的误差范围。",
    hints: [
      "差值可能是负的，而负数一定小于误差范围——直接比的话判断会永远成立。",
      "所以要先把这个差值变成非负数，这个操作叫什么？",
    ],
    referenceAnswer:
      "绝对值。先算 `a - b` 的绝对值（自己写一行 `if (d < 0) d = -d;` 就行，本站运行器不带 `math.h`），再判断它是否小于 `1e-9` 这类误差范围。少了这一步，负数会让判断永远成立。",
    xp: 8,
    validator: {
      blanks: [["绝对值", "abs", "差的绝对值", "绝对差", "差值绝对值", "|a-b|", "|a - b|"]],
    },
  },
  {
    id: "ch07-floating-types-q3",
    chapterOrder: 7,
    lessonSlug: "floating-types",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `把 0.1 累加十次，再和 1.0 比较，把比较的结果打印出来。这个程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    double sum = 0.0;
    int i;

    for (i = 0; i < 10; i++) {
        sum += 0.1;
    }
    printf("%d\\n", sum == 1.0);
    return 0;
}
\`\`\``,
    hints: [
      "0.1 在二进制里是无限循环小数，存进 double 的时候已经被截断了。",
      "十个近似值相加，误差会积累——结果并不是精确的 1.0，而是非常接近它的另一个数，所以比较结果是 0（假）。",
    ],
    referenceAnswer:
      "输出 `0`。`sum == 1.0` 这个比较的结果是假，打印出来就是 0。0.1 在二进制里写不完，double 里存的是它的近似值；累加十次之后得到的是 0.9999999999999999 这样的数，和 1.0 差一点点。这正是「比较浮点数要用误差范围」的原因。",
    xp: 8,
    validator: { expected: "0" },
  },

  // ── 7.3 字符类型与字符运算 ───────────────────────────────────────
  {
    id: "ch07-char-type-q1",
    chapterOrder: 7,
    lessonSlug: "char-type",
    kind: "MCQ",
    difficulty: 2,
    prompt:
      "已知 `'a' - 'A'` 等于 32。如果 `ch` 里存的是一个小写字母，要把它变成对应的大写字母，应该写什么？",
    hints: [
      "小写字母的编码比大写字母大：`'a'` 是 97，`'A'` 是 65。",
      "要变小，就得减。",
    ],
    referenceAnswer:
      "`ch - 32`（更清楚的写法是 `ch - 'a' + 'A'`）。小写字母的编码比大写大 32，所以减去 32 就得到大写；反过来加大写变小写。写成 `ch - 'a' + 'A'` 能自己说明意图，也避免写死魔数 32。",
    xp: 5,
    validator: {
      options: ["`ch + 32`", "`ch - 32`", "`ch * 32`", "`ch / 32`"],
      correct: 1,
    },
  },
  {
    id: "ch07-char-type-q2",
    chapterOrder: 7,
    lessonSlug: "char-type",
    kind: "FILL",
    difficulty: 1,
    prompt:
      "在 ASCII 里：字符 `'A'` 的编码是（1）____，字符 `'a'` 的编码是（2）____，两者相差 32。",
    hints: [
      "数字字符 `'0'` 是 48，而且数字、大写、小写三段各自是连续的。",
      "大写字母从 65 开始，小写字母从 97 开始。",
    ],
    referenceAnswer: "（1）65；（2）97。相差 32 是 ASCII 的设计，也是大小写转换可以靠加减 32 完成的原因。",
    xp: 5,
    validator: { blanks: [["65"], ["97"]] },
  },
  {
    id: "ch07-char-type-q3",
    chapterOrder: 7,
    lessonSlug: "char-type",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `同一个字符变量，一个用 %c 打、一个用 %d 打。程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    char ch = 'a';

    printf("%c %d\\n", ch, ch - 'a' + 'A');
    return 0;
}
\`\`\``,
    hints: [
      "`ch` 里存的是 `'a'`，`%c` 把它按字符解释，所以第一个位置是 `a`。",
      "第二个位置是算术结果：`'a' - 'a'` 是 0，再加 `'A'`（也就是 65），得到一个整数。",
    ],
    referenceAnswer:
      "输出 `a 65`。第一个 `%c` 把 `'a'` 显示成字符；第二个表达式算的是 `97 - 97 + 65`，结果是整数 65，用 `%d` 打出来就是 65——同一个值 65，用 `%c` 看是 `A`，用 `%d` 看是 65。",
    xp: 8,
    validator: { expected: "a 65" },
  },

  // ── 7.4 sizeof、强制转换与 typedef ───────────────────────────────
  {
    id: "ch07-sizeof-and-casts-q1",
    chapterOrder: 7,
    lessonSlug: "sizeof-and-casts",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`sizeof(int)` 这个结果是在什么时候确定的？",
    hints: [
      "`sizeof` 要的是「这个类型占多少字节」，而类型在编译期就已经完全确定。",
      "想想为什么 `sizeof(x++)` 不会改变 x 的值——那个 `x++` 根本没被执行。",
    ],
    referenceAnswer:
      "编译期就确定了。编译器只需要知道类型是什么，不需要真的对表达式求值，所以 `sizeof` 不产生任何运行时开销，写在它里面的表达式也不会被执行。",
    xp: 5,
    validator: {
      options: [
        "程序运行时，每次执行到这一句都要重新算一次",
        "编译的时候就确定了，运行时没有额外开销",
        "程序启动时由操作系统决定",
        "由 CPU 在运行时根据当前负载决定",
      ],
      correct: 1,
    },
  },
  {
    id: "ch07-sizeof-and-casts-q2",
    chapterOrder: 7,
    lessonSlug: "sizeof-and-casts",
    kind: "MCQ",
    difficulty: 2,
    prompt: "执行 `double x = 3.99; int n = (int)x;` 之后，`n` 的值是多少？",
    hints: [
      "浮点转整数不是四舍五入，而是直接丢掉小数部分。",
      "想想负数：`(int)-3.99` 得到的是 -4 还是 -3？",
    ],
    referenceAnswer:
      "`3`。浮点转整数是**截断**（丢掉小数部分，向零取整），不是四舍五入。想要四舍五入必须自己写 `(int)(x + 0.5)`。负数同理：`(int)-3.99` 是 -3，不是 -4。",
    xp: 5,
    validator: {
      options: ["4（四舍五入）", "3（截断，向零取整）", "3.99", "编译错误"],
      correct: 1,
    },
  },
  {
    id: "ch07-sizeof-and-casts-q3",
    chapterOrder: 7,
    lessonSlug: "sizeof-and-casts",
    kind: "CODE",
    difficulty: 2,
    prompt: `用 \`sizeof\` 查一下三种基本类型各占多少字节，输出一行，格式固定为：

\`\`\`
int=4 char=1 double=8
\`\`\`

（用本站统一的写法 \`(int)sizeof(...)\` 配 \`%d\` 打印。）`,
    starterCode: `#include <stdio.h>

int main(void)
{
    /* 用 sizeof 取 int、char、double 的字节数，按 int=? char=? double=? 输出 */
    return 0;
}
`,
    hints: [
      "`sizeof(char)` 一定是 1——这是 C 标准唯一写死的字节数。",
      "格式串要写成 `\"int=%d char=%d double=%d\\\\n\"`，三个参数依次是三个 `(int)sizeof(...)`。",
    ],
    referenceAnswer:
      "一个 printf 就够：`printf(\"int=%d char=%d double=%d\\n\", (int)sizeof(int), (int)sizeof(char), (int)sizeof(double));`。在 32 位平台上得到 `int=4 char=1 double=8`。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    printf("int=%d char=%d double=%d\\n",
           (int)sizeof(int), (int)sizeof(char), (int)sizeof(double));
    return 0;
}
`,
    xp: 10,
    validator: { expectedStdoutAny: ["int=4 char=1 double=8"] },
  },

  // ── 7.5 动手：亲眼看到整数溢出 ───────────────────────────────────
  {
    id: "ch07-lab-overflow-q1",
    chapterOrder: 7,
    lessonSlug: "lab-overflow",
    kind: "MCQ",
    difficulty: 3,
    prompt:
      "在 `int` 最大值为 2147483647 的机器上，执行 `int x = 2147483647; x = x + 1;` 之后，`x` 的值最可能是？",
    hints: [
      "32 位能表示的位模式是有限的，超出范围后只能「回绕」。",
      "正数最大值再加 1，会跳到负数的最小值。",
    ],
    referenceAnswer:
      "`-2147483648`。实际编译器几乎都让它按补码回绕，但要注意：**有符号溢出在 C 标准里是未定义行为**，标准并没有保证这个结果；而无符号溢出（比如 `unsigned int` 从 4294967295 加 1 变成 0）才是标准明确规定的。所以选类型时不能靠「它反正会回绕」来偷懒。",
    xp: 8,
    validator: {
      options: [
        "2147483648",
        "-2147483648（实际编译器大多这样回绕）",
        "0",
        "程序会崩溃并报错",
      ],
      correct: 1,
    },
  },
  {
    id: "ch07-lab-overflow-q2",
    chapterOrder: 7,
    lessonSlug: "lab-overflow",
    kind: "CODE",
    difficulty: 2,
    prompt: `让一个 \`unsigned int\` 从它的最大值再加 1，把加之前和加之后的值各打印一行。

期望输出：

\`\`\`
4294967295
0
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    unsigned int u = 4294967295u;

    printf("%u\\n", u);
    /* 让 u 再加 1，然后把新的值也打印出来 */
    return 0;
}
`,
    hints: [
      "字面量后面那个 `u` 表示「这是 unsigned int 常量」——`4294967295` 超出了 `int` 的范围，不加后缀会有警告。",
      "无符号类型的转换说明用 `%u`，不是 `%d`。",
    ],
    referenceAnswer:
      "`u = u + 1;` 之后再 `printf(\"%u\\n\", u);`。无符号运算按模 2 的 32 次方计算，所以最大值加 1 会回绕成 0——这是标准保证的行为，不是错误。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    unsigned int u = 4294967295u;

    printf("%u\\n", u);
    u = u + 1;
    printf("%u\\n", u);
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["4294967295\n0"] },
  },
  {
    id: "ch07-lab-overflow-q3",
    chapterOrder: 7,
    lessonSlug: "lab-overflow",
    kind: "CODE",
    difficulty: 3,
    prompt: `读入一个整数 n（可能大到 50000），输出 n 的平方。

直接用 \`int\` 算会溢出——请选一个装得下的类型。

输入 \`50000\`，期望输出：

\`\`\`
2500000000
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int n;

    scanf("%d", &n);
    /* 50000 的平方是 25 亿，超过了 int 的上限，用 unsigned int 来算 */
    return 0;
}
`,
    stdin: "50000",
    hints: [
      "50000 的平方是 2500000000，比 `int` 的最大值 2147483647 大一点——正好溢出。",
      "`unsigned int` 的最大值是 4294967295，装得下 25 亿。用 `(unsigned int)n * (unsigned int)n` 算，再用 `%u` 打印。",
    ],
    referenceAnswer:
      "把两个乘数都转成 `unsigned int` 再相乘：`printf(\"%u\\n\", (unsigned int)n * (unsigned int)n);`。这里的关键不是「怎么算」，而是**先估算最大值再选类型**：2500000000 超过了 `int` 的上限，所以 `int` 从一开始就不该被选。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int n;

    scanf("%d", &n);
    printf("%u\\n", (unsigned int)n * (unsigned int)n);
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["2500000000"] },
  },
];

export const CHAPTER_07_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
