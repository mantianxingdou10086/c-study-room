/**
 * 第 4 章题库（15 题）。
 *
 * 这一章的题围绕四件事出：
 *  1. 整数除法与取余的真实结果（1 / 2 是 0，17 % 5 是 2）
 *  2. 优先级与结合性（乘除先算、同级从左往右）
 *  3. 赋值运算符与自增自减（i++ 与 ++i 的区别只在表达式里才看得见）
 *  4. 隐式转换与强制转换（结果往精度高的那边走，想改就写 (类型名)）
 *
 * 五节动手课（最后一节）的题额外练一件事：用 % 10 与 / 10 拆开整数的每一位。
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 4.1 算术运算符与整数除法 ──────────────────────────────────────
  {
    id: "ch04-arithmetic-q1",
    chapterOrder: 4,
    lessonSlug: "arithmetic",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`printf(\"%d\\n\", 7 / 2 * 2);` 会输出什么？",
    hints: [
      "`/` 和 `*` 是同一级，从左往右算。",
      "先算 `7 / 2`，这时除号两边都是 int。",
    ],
    referenceAnswer:
      "输出 `6`。`7 / 2` 是两个 int 相除，结果是 3（不是 3.5）；再乘 2 得 6。如果先按 7 / 2 = 3.5 算再乘 2，就会误以为答案是 7。",
    xp: 5,
    validator: {
      options: ["6", "7", "6.5", "编译错误：整数除法不能连乘"],
      correct: 0,
    },
  },
  {
    id: "ch04-arithmetic-q2",
    chapterOrder: 4,
    lessonSlug: "arithmetic",
    kind: "FILL",
    difficulty: 1,
    prompt:
      "`17 / 5` 的结果是（1）____，`17 % 5` 的结果是（2）____。",
    hints: [
      "先想 5 乘 3 等于 15，再看 17 比 15 多多少。",
      "`/` 回答「能装下几份」，`%` 回答「还剩多少」。",
    ],
    referenceAnswer:
      "`17 / 5` 是 `3`（整数除法向零截断，小数部分直接丢掉）；`17 % 5` 是 `2`（余数）。两者满足 `17 == 5 * 3 + 2`，这就是检验算得对不对的办法。",
    xp: 8,
    validator: { blanks: [["3"], ["2"]] },
  },
  {
    id: "ch04-arithmetic-q3",
    chapterOrder: 4,
    lessonSlug: "arithmetic",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `把 17 个苹果平均分给 5 个人：一人能分到几个，还剩几个？下面这段程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int total = 17;
    int people = 5;

    printf("%d %d\\n", total / people, total % people);
    return 0;
}
\`\`\``,
    hints: [
      "第一个 `%d` 对应 `total / people`，第二个对应 `total % people`。",
      "`/` 给出一人能分到的整数个数，`%` 给出剩下几个。",
    ],
    referenceAnswer:
      "输出 `3 2`。17 除以 5 得 3 余 2——整数除法不会给出 3.4，它只保留整数部分。",
    xp: 8,
    validator: { expected: "3 2" },
  },

  // ── 4.2 优先级与结合性 ────────────────────────────────────────────
  {
    id: "ch04-precedence-q1",
    chapterOrder: 4,
    lessonSlug: "precedence",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`2 + 3 * 4 - 6 / 3` 的结果是多少？",
    hints: [
      "先圈出 `*` 和 `/` 的部分，它们先算。",
      "算完乘除之后，剩下的 `+` 和 `-` 同级，从左往右算。",
    ],
    referenceAnswer:
      "结果是 `12`。先算 `3 * 4 = 12`、`6 / 3 = 2`，式子变成 `2 + 12 - 2 = 12`。严格从左到右会得到 4，先把 2 + 3 加起来会得到 18——这两个干扰项都是真实会犯的错。",
    xp: 5,
    validator: {
      options: [
        "12（乘除先算，再从左往右算加减）",
        "4（严格从左到右依次计算）",
        "18（先把 2 + 3 算出来）",
        "编译错误：一行里运算符太多",
      ],
      correct: 0,
    },
  },
  {
    id: "ch04-precedence-q2",
    chapterOrder: 4,
    lessonSlug: "precedence",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "`100 / 10 / 2` 的结果是（1）____，因为同级运算符的结合方向是（2）____。",
    hints: [
      "两个 `/` 是同一级，所以由结合方向决定谁先算。",
      "先算最左边那一对，看看得到多少。",
    ],
    referenceAnswer:
      "结果是 `5`。`/` 同级且左结合：先 `100 / 10 = 10`，再 `10 / 2 = 5`。如果从右往左算会得到 `100 / 5 = 20`。",
    xp: 8,
    validator: { blanks: [["5"], ["从左到右", "从左往右", "从左向右", "从左至右", "自左向右", "左", "左结合"]] },
  },
  {
    id: "ch04-precedence-q3",
    chapterOrder: 4,
    lessonSlug: "precedence",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `同一个式子，加不加括号结果不同。下面这段程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int a = 2, b = 3, c = 4;

    printf("%d\\n", a + b * c);
    printf("%d\\n", (a + b) * c);
    return 0;
}
\`\`\``,
    hints: [
      "第一行没有括号：`b * c` 先算，再加上 a。",
      "第二行有括号：先算 `a + b`，再乘 c。",
    ],
    referenceAnswer:
      "输出两行：`14` 和 `20`。`2 + 3 * 4` 是 2 + 12 = 14；`(2 + 3) * 4` 是 5 * 4 = 20。一对括号就把结果改了 6。",
    xp: 8,
    validator: { expected: "14\n20" },
  },

  // ── 4.3 赋值运算符与自增自减 ──────────────────────────────────────
  {
    id: "ch04-assignment-operators-q1",
    chapterOrder: 4,
    lessonSlug: "assignment-operators",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`int i = 5; int j = i++;` 执行完，`i` 和 `j` 各是多少？",
    hints: [
      "`++` 写在变量后面，叫后置自增。",
      "后置自增：表达式的值取的是「加之前」的那个值。",
    ],
    referenceAnswer:
      "`i` 是 6，`j` 是 5。后置 `i++` 先把旧值 5 交给 j，然后 i 自己加 1。所以 j 拿到的是 5——自增确实发生了，只是发生在赋值之后。",
    xp: 5,
    validator: {
      options: [
        "i = 6，j = 5（先赋值，再加）",
        "i = 6，j = 6（先加，再赋值）",
        "i = 5，j = 5（i 根本没变）",
        "i = 5，j = 6（i 变了但 j 拿到新值）",
      ],
      correct: 0,
    },
  },
  {
    id: "ch04-assignment-operators-q2",
    chapterOrder: 4,
    lessonSlug: "assignment-operators",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "`int n = 7;` 之后依次执行 `n *= 2;` 和 `n -= 4;`，此时 `n` 是（1）____。另外，`x += 1;` 完全等价于（2）____。",
    hints: [
      "`n *= 2` 就是 `n = n * 2`，`n -= 4` 就是 `n = n - 4`，一步一步算。",
      "第二个空是那个被简写掉的原形。",
    ],
    referenceAnswer:
      "`n` 是 `10`：先 `7 * 2 = 14`，再 `14 - 4 = 10`。`x += 1;` 等价于 `x = x + 1;`——复合赋值只是把左边的变量名省了一遍。",
    xp: 8,
    validator: {
      blanks: [
        ["10"],
        ["x = x + 1", "x=x+1", "x = x+1", "x= x + 1", "x = 1 + x", "x = x + 1;"],
      ],
    },
  },
  {
    id: "ch04-assignment-operators-q3",
    chapterOrder: 4,
    lessonSlug: "assignment-operators",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `前置与后置各来一次，下面这段程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int i = 3;
    int a = i++;
    int b = ++i;

    printf("%d %d %d\\n", i, a, b);
    return 0;
}
\`\`\``,
    hints: [
      "`a = i++`：先赋值（a 拿 3），i 再变 4。",
      "`b = ++i`：i 先加 1 变成 5，再把 5 交给 b。",
    ],
    referenceAnswer:
      "输出 `5 3 5`。第一步后 i 是 4、a 是 3；第二步前置自增让 i 先变 5，再把 5 赋给 b。所以三个值是 i=5、a=3、b=5。",
    xp: 8,
    validator: { expected: "5 3 5" },
  },

  // ── 4.4 表达式里的类型转换 ────────────────────────────────────────
  {
    id: "ch04-type-conversion-q1",
    chapterOrder: 4,
    lessonSlug: "type-conversion",
    kind: "MCQ",
    difficulty: 1,
    prompt: "`printf(\"%d\\n\", (int)2.9);` 会输出什么？",
    hints: [
      "`(int)` 是强制转换，把右边的值换成 int。",
      "double 转 int 会丢掉小数部分，注意它不是四舍五入。",
    ],
    referenceAnswer:
      "输出 `2`。`(int)` 是向零截断：小数部分直接抹掉，所以 2.9 变成 2，而不是 3。想四舍五入得自己加 0.5 再转换。",
    xp: 5,
    validator: {
      options: ["2", "3", "2.9", "编译错误：类型不匹配"],
      correct: 0,
    },
  },
  {
    id: "ch04-type-conversion-q2",
    chapterOrder: 4,
    lessonSlug: "type-conversion",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`int n = 5;` 时，`printf(\"%.1f\\n\", n / 2);` 输出什么？",
    hints: [
      "先看除号两边：`n` 是 int，`2` 也是 int。",
      "转换发生在「算」的时候，不在「打印」的时候。",
    ],
    referenceAnswer:
      "输出 `2.0`。`n / 2` 两边都是 int，先按整数除法得到 2，然后才被 `%.1f` 当成浮点打印成 `2.0`。想得到 2.5，必须让运算里出现浮点数（`n / 2.0` 或 `(double)n / 2`）。",
    xp: 8,
    validator: {
      options: ["2.0", "2.5", "3.0", "一个垃圾值"],
      correct: 0,
    },
  },
  {
    id: "ch04-type-conversion-q3",
    chapterOrder: 4,
    lessonSlug: "type-conversion",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入两个整数（空格分隔），输出它们的**真实除法结果**，保留 2 位小数。

输入 \`7 2\`，输出 \`3.50\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int a, b;

    scanf("%d %d", &a, &b);
    /* 直接写 a / b 是整数除法，小数会丢；想办法让运算按浮点做 */
    return 0;
}
`,
    stdin: "7 2",
    hints: [
      "`a / b` 两边都是 int，结果是整数——7 / 2 会得到 3。",
      "让参与运算的第一个数变成 double：`(double)a / b`，或者写成 `a / 2.0` 那种形式。",
      '输出用 `printf("%.2f\\n", ...)`。',
    ],
    referenceAnswer:
      "`printf(\"%.2f\\n\", (double)a / b);`。强制转换写在除号左边的那个数上，整条式子就变成浮点运算；写在括号外（`(double)(a / b)`）就来不及了。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int a, b;

    scanf("%d %d", &a, &b);
    printf("%.2f\\n", (double)a / b);
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["3.50"] },
  },

  // ── 4.5 动手：算校验位 ───────────────────────────────────────────
  {
    id: "ch04-lab-check-digit-q1",
    chapterOrder: 4,
    lessonSlug: "lab-check-digit",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入一个 3 位整数，把它拆成三位数字，输出三者的和。

输入 \`527\`，输出 \`14\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int n;

    scanf("%d", &n);
    /* 百位：n / 100；十位：n / 10 % 10；个位：n % 10 */
    return 0;
}
`,
    stdin: "527",
    hints: [
      "个位用 `n % 10`；去掉个位用 `n / 10`。",
      "十位可以先把末位去掉再取余：`n / 10 % 10`。",
      "百位就是把末两位都去掉：`n / 100`。",
    ],
    referenceAnswer:
      "`printf(\"%d\\n\", n / 100 + n / 10 % 10 + n % 10);`。5 + 2 + 7 = 14。`/` 和 `%` 同级、左结合，所以 `n / 10 % 10` 是先除再取余，正好拿到十位。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int n;

    scanf("%d", &n);
    printf("%d\\n", n / 100 + n / 10 % 10 + n % 10);
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["14"] },
  },
  {
    id: "ch04-lab-check-digit-q2",
    chapterOrder: 4,
    lessonSlug: "lab-check-digit",
    kind: "CODE",
    difficulty: 3,
    prompt: `读入一个 6 位整数，从右往左取出每一位：最右边那位乘 1，往左依次乘 2、3、4、5、6，
全部加起来得到加权和 \`sum\`；校验位 = \`(10 - sum % 10) % 10\`。
输出 \`sum\` 和校验位，中间用一个空格分开。

输入 \`314159\`，输出 \`61 9\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int n, d, sum, check;

    scanf("%d", &n);
    sum = 0;

    /* 没有循环，把下面这两步手写 6 遍，每次乘的权重加 1：
       d = n % 10;  n = n / 10;  sum = sum + d * 权重; */

    /* 再算校验位并输出 */
    return 0;
}
`,
    stdin: "314159",
    hints: [
      "取末位是 `d = n % 10;`，扔掉末位是 `n = n / 10;`——两步一组，顺序不能反。",
      "重复 6 次，第 i 次写 `sum = sum + d * i;`（i 从 1 到 6）。",
      "校验位：`check = (10 - sum % 10) % 10;`，最后 `printf(\"%d %d\\n\", sum, check);`。",
    ],
    referenceAnswer:
      "6 组「取末位、扔末位、按权重累加」之后得到 sum = 9 + 10 + 3 + 16 + 5 + 18 = 61，校验位是 `(10 - 61 % 10) % 10` = 9。最外面那个 `% 10` 是为了让「加权和是 10 的整数倍」时校验位落在 0 上。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int n, d, sum, check;

    scanf("%d", &n);
    sum = 0;

    d = n % 10;  n = n / 10;  sum = sum + d * 1;
    d = n % 10;  n = n / 10;  sum = sum + d * 2;
    d = n % 10;  n = n / 10;  sum = sum + d * 3;
    d = n % 10;  n = n / 10;  sum = sum + d * 4;
    d = n % 10;  n = n / 10;  sum = sum + d * 5;
    d = n % 10;  n = n / 10;  sum = sum + d * 6;

    check = (10 - sum % 10) % 10;
    printf("%d %d\\n", sum, check);
    return 0;
}
`,
    xp: 15,
    validator: { expectedStdoutAny: ["61 9"] },
  },
  {
    id: "ch04-lab-check-digit-q3",
    chapterOrder: 4,
    lessonSlug: "lab-check-digit",
    kind: "MCQ",
    difficulty: 2,
    prompt:
      "`int n = 407;` 想取出它的**十位数字**（也就是 0），应该写哪一个表达式？",
    hints: [
      "`n % 10` 拿到的是末位（个位）。",
      "先把个位扔掉，再对结果取余，拿到的就是十位。",
    ],
    referenceAnswer:
      "`n / 10 % 10`。`n / 10` 先把个位扔掉得到 40，再 `% 10` 取出末位得到 0。`/` 与 `%` 同级、左结合，所以这两个操作天然按「先除后取余」的顺序执行。",
    xp: 5,
    validator: {
      options: ["n % 10", "n / 10", "n / 10 % 10", "n % 100"],
      correct: 2,
    },
  },
];

export const CHAPTER_04_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
