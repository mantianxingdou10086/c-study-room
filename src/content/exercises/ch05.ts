/**
 * 第 5 章题库（15 题）。
 *
 * 这一章的题围绕四件事出：
 *  1. 真假判断规则（0 是假、非 0 是真；关系运算给出 1/0）——包括 = 与 == 的混用
 *  2. 多路分支的顺序（最特殊 → 最一般；死代码；悬挂 else）
 *  3. 短路求值的两面（`n != 0 && 100 / n` 的省事，`++i` 被跳过的埋雷）
 *  4. switch 的穿透与适用范围，以及条件表达式
 *
 * 边界题（成绩等级、闰年）刻意用 90、1900 这类「正好卡在边界上」的输入，
 * 因为这一章真正难的地方不是语法，是「谁先判断」。
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 5.1 关系运算与真假 ──────────────────────────────────────────
  {
    id: "ch05-booleans-and-relations-q1",
    chapterOrder: 5,
    lessonSlug: "booleans-and-relations",
    kind: "MCQ",
    difficulty: 2,
    prompt:
      "`int x = -1;` 然后执行 `if (x) printf(\"真\\n\"); else printf(\"假\\n\");`，输出什么？",
    hints: [
      "`if` 后面括号里要的是「一个值」，它只关心这个值是不是 0。",
      "把 -1 和 0 比一下：它等于 0 吗？",
    ],
    referenceAnswer:
      "输出「真」。C 判断真假只看「是不是 0」：0 是假，其它任何值都是真，-1 也不例外。这里没有「负数算假」这种规则。",
    xp: 5,
    validator: {
      options: ["真", "假", "什么都不输出", "编译错误：C 里没有布尔类型"],
      correct: 0,
    },
  },
  {
    id: "ch05-booleans-and-relations-q2",
    chapterOrder: 5,
    lessonSlug: "booleans-and-relations",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int a = 7, b = 7;

    printf("%d %d %d\\n", a > b, a == b, a != b);
    return 0;
}
\`\`\``,
    hints: [
      "关系运算的结果不是「真/假」两个字，而是两个整数之一。",
      "`a` 和 `b` 都是 7：`a > b` 不成立，`a == b` 成立，`a != b` 也不成立。",
    ],
    referenceAnswer:
      "输出 `0 1 0`。三个关系表达式依次求值：7 > 7 为假得 0，7 == 7 为真得 1，7 != 7 为假得 0。两个数相等时，只有 `==` 给 1。",
    xp: 8,
    validator: { expected: "0 1 0" },
  },
  {
    id: "ch05-booleans-and-relations-q3",
    chapterOrder: 5,
    lessonSlug: "booleans-and-relations",
    kind: "FILL",
    difficulty: 1,
    prompt:
      "关系表达式的值只有两个整数：条件成立时是（1）____，不成立时是（2）____。",
    hints: ["`printf(\"%d\\n\", 5 > 3)` 打印出来的就是这两个值之一。"],
    referenceAnswer:
      "成立得 1，不成立得 0。所以 `if (x)` 实际上是在问「x 是不是 0」——这也是为什么 `-1` 在 if 里算真。",
    xp: 5,
    validator: {
      blanks: [["1"], ["0"]],
    },
  },

  // ── 5.2 if、else if 与 else ─────────────────────────────────────
  {
    id: "ch05-if-else-q1",
    chapterOrder: 5,
    lessonSlug: "if-else",
    kind: "MCQ",
    difficulty: 2,
    prompt: `\`int score = 95;\` 然后执行：

\`\`\`c
if (score >= 60)
    printf("及格\\n");
else if (score >= 90)
    printf("优秀\\n");
\`\`\`

输出什么？`,
    hints: [
      "程序从上往下判断，命中一个分支以后，后面的分支就不再看了。",
      "95 先满足哪个条件？",
    ],
    referenceAnswer:
      "输出「及格」。第一个条件 `score >= 60` 就成立，程序进入这个分支后跳过了后面的 `else if`——虽然 95 也满足 `>= 90`。所以条件要从最特殊（`>= 90`）写到最一般（`>= 60`）。",
    xp: 5,
    validator: {
      options: ["及格", "优秀", "及格 优秀", "什么都不输出"],
      correct: 0,
    },
  },
  {
    id: "ch05-if-else-q2",
    chapterOrder: 5,
    lessonSlug: "if-else",
    kind: "MCQ",
    difficulty: 3,
    prompt: `下面这段代码里，\`else\` 和哪个 \`if\` 配对？

\`\`\`c
if (a > 0)
    if (b > 0)
        printf("A\\n");
else
    printf("B\\n");
\`\`\``,
    hints: [
      "C 编译器不看缩进，它只看 `else` 前面最近的那个、还没配对的 `if`。",
      "想让它配外层，唯一的办法是用花括号把内层 `if` 包起来。",
    ],
    referenceAnswer:
      "和最近的 `if (b > 0)` 配对。这就是「悬挂 else」问题：缩进只是给人看的，编译器按「就近配对」规则走。想让 else 配外层 `if (a > 0)`，必须写成 `if (a > 0) { if (b > 0) ... } else ...`。",
    xp: 8,
    validator: {
      options: [
        "和最近的 `if (b > 0)` 配对（缩进不影响配对）",
        "和外层的 `if (a > 0)` 配对",
        "由缩进决定：else 和谁对齐就配谁",
        "编译错误，必须加花括号",
      ],
      correct: 0,
    },
  },
  {
    id: "ch05-if-else-q3",
    chapterOrder: 5,
    lessonSlug: "if-else",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "把比较写成 `if (x = 5)`（少了一个等号）之后，条件（____），因为赋值表达式的值就是被赋进去的那个 5，而 5 是非 0 的。",
    hints: ["`=` 是赋值，`==` 才是比较。", "非 0 在 if 里算真还是算假？"],
    referenceAnswer:
      "永远为真（恒为真）。`x = 5` 先把 5 赋给 x，整个表达式的值也是 5，非 0 即真——所以这个分支无论如何都会进。这也是很多团队规定「常量写左边」的原因：`if (5 = x)` 会直接编译报错，错误当场暴露。",
    xp: 8,
    validator: {
      blanks: [
        [
          "永远为真", "恒为真", "总是为真", "永远成立", "恒成立", "一直为真",
          "永远是真的", "都为真", "总为真", "恒真", "永远真", "永真",
          "一直成立", "总是成立", "真",
        ],
      ],
    },
  },

  // ── 5.3 逻辑运算符与短路求值 ─────────────────────────────────────
  {
    id: "ch05-logical-operators-q1",
    chapterOrder: 5,
    lessonSlug: "logical-operators",
    kind: "MCQ",
    difficulty: 3,
    prompt:
      "`int i = 0;` 然后执行 `if (i != 0 && 10 / i > 1) printf(\"A\\n\"); else printf(\"B\\n\");`，输出什么？",
    hints: [
      "`&&` 的左边是假时，整个表达式一定是假——右边还有必要算吗？",
      "注意判断顺序：`i != 0` 写在 `&&` 的左边。",
    ],
    referenceAnswer:
      "输出 `B`。`i != 0` 为假，`&&` 直接短路，右边的 `10 / i` 根本不执行，所以不会除零崩溃。如果把两个条件调换位置，`10 / i` 会先算，程序就会因除零而挂掉。",
    xp: 8,
    validator: {
      options: [
        "B —— 左边不成立，右边不执行，不会除零",
        "A —— 10 / 0 会被当成 0 处理",
        "程序崩溃（除零）",
        "编译错误：&& 两边必须是布尔值",
      ],
      correct: 0,
    },
  },
  {
    id: "ch05-logical-operators-q2",
    chapterOrder: 5,
    lessonSlug: "logical-operators",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `下面这个程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int i = 0;

    if (i != 0 && ++i > 0)
        printf("A i=%d\\n", i);
    else
        printf("B i=%d\\n", i);
    return 0;
}
\`\`\``,
    hints: [
      "`++i` 写在 `&&` 的右边。",
      "短路发生时，右边的 `++i` 有没有机会执行？`i` 还是原来的值吗？",
    ],
    referenceAnswer:
      "输出 `B i=0`。左边 `i != 0` 为假，`&&` 短路，`++i` 没有被执行，所以 i 还是 0。副作用被短路跳过，是这类 bug 最常见的来源——代码里明明写着 `++i`，运行时它就是没发生。",
    xp: 8,
    validator: { expected: "B i=0" },
  },
  {
    id: "ch05-logical-operators-q3",
    chapterOrder: 5,
    lessonSlug: "logical-operators",
    kind: "CODE",
    difficulty: 3,
    prompt: `读入一个整数 \`n\`：如果 \`n\` 不等于 0 **并且** \`100 / n\` 大于 5，输出 \`big\`；否则输出 \`small\`。

输入 \`0\`，期望输出 \`small\`（提示：两个条件谁写在左边，决定了程序会不会崩）。`,
    starterCode: `#include <stdio.h>

int main(void)
{
    int n;

    scanf("%d", &n);
    /* 先排除 n == 0，再去做除法 */
    return 0;
}
`,
    stdin: "0",
    hints: [
      "把 `n != 0` 写在 `&&` 的左边，让短路帮你挡住除零。",
      "如果把 `100 / n > 5` 写在左边，n 为 0 时程序会直接挂掉，什么都打印不出来。",
      '两个分支各打印一行，别忘行尾的换行：`printf("small\\n");`',
    ],
    referenceAnswer:
      "`if (n != 0 && 100 / n > 5)` —— 顺序是关键：`n != 0` 为假时 `&&` 短路，右边的除法不会执行，所以输入 0 得到 `small` 而不是崩溃。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int n;

    scanf("%d", &n);
    if (n != 0 && 100 / n > 5)
        printf("big\\n");
    else
        printf("small\\n");
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["small"] },
  },

  // ── 5.4 switch 与条件表达式 ─────────────────────────────────────
  {
    id: "ch05-switch-and-conditional-q1",
    chapterOrder: 5,
    lessonSlug: "switch-and-conditional",
    kind: "MCQ",
    difficulty: 2,
    prompt: `\`int n = 2;\` 然后执行：

\`\`\`c
switch (n) {
case 1:
    printf("一");
case 2:
    printf("二");
case 3:
    printf("三");
}
\`\`\`

输出什么？`,
    hints: [
      "`case` 只是「跳转的入口」，不是「只执行这一段」。",
      "从 `case 2` 进去以后，程序会一直往下走，直到遇到 `break` 或者 switch 结束。",
    ],
    referenceAnswer:
      "输出 `二三`。程序从 `case 2` 进入后继续往下执行 `case 3` 里的语句——这叫穿透（fallthrough）。每个分支末尾的 `break` 就是用来挡住它的。",
    xp: 5,
    validator: {
      options: ["二三", "二", "一二三", "编译错误：case 后面必须有 break"],
      correct: 0,
    },
  },
  {
    id: "ch05-switch-and-conditional-q2",
    chapterOrder: 5,
    lessonSlug: "switch-and-conditional",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "`switch` 后面的控制表达式必须是（1）____ 类型；每个 `case` 后面只能跟一个（2）____，所以写不出 `case 90.5:` 或 `case >= 90:` 这样的分支。",
    hints: [
      "switch 做的事是「拿一个值去和每个 case 比是否相等」。",
      "浮点数和区间都不行，只能是写死的整数或字符。",
    ],
    referenceAnswer:
      "整数（整型）/ 常量。switch 只能按「值相等」跳转，不能按范围判断；要判范围就得用 `if / else if`。",
    xp: 8,
    validator: {
      blanks: [
        ["整数", "整型", "整数类型", "int", "整型类型"],
        [
          "常量", "常量表达式", "整数值", "整数常量", "常量值", "确定的常量",
          "整数常量表达式", "字符", "字符常量", "枚举", "枚举常量", "编译期常量",
        ],
      ],
    },
  },
  {
    id: "ch05-switch-and-conditional-q3",
    chapterOrder: 5,
    lessonSlug: "switch-and-conditional",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int a = 3, b = 8;

    printf("%d\\n", a > b ? a : b);
    return 0;
}
\`\`\``,
    hints: [
      "`条件 ? 值1 : 值2`：条件成立取值1，否则取值2。",
      "`3 > 8` 成立吗？不成立就取冒号后面那个。",
    ],
    referenceAnswer:
      "输出 `8`。`a > b` 为假，条件表达式取 `:` 后面的 `b`。它等价于「在两个值里选一个」的 if-else，只是能直接写进表达式里。",
    xp: 8,
    validator: { expected: "8" },
  },

  // ── 5.5 动手：成绩等级与闰年判断 ────────────────────────────────
  {
    id: "ch05-lab-grade-and-leap-year-q1",
    chapterOrder: 5,
    lessonSlug: "lab-grade-and-leap-year",
    kind: "MCQ",
    difficulty: 3,
    prompt: `下面这段判断 1900 年的代码输出什么？

\`\`\`c
int y = 1900;

if (y % 4 == 0)
    printf("闰年\\n");
else if (y % 400 == 0)
    printf("闰年\\n");
else
    printf("平年\\n");
\`\`\``,
    hints: [
      "先算清楚：1900 能被 4 整除吗？能被 100 整除吗？能被 400 整除吗？",
      "闰年的完整规则是「能被 400 整除，或者能被 4 整除但不能被 100 整除」——顺序会改变结果。",
    ],
    referenceAnswer:
      "输出「闰年」，但这个结果是错的：1900 是平年。`1900 % 4 == 0` 先命中，程序就跳过了后面所有分支，永远没机会检查「被 100 整除且不被 400 整除」这个例外。正确写法是把 `y % 400 == 0` 放在最前面，`y % 100 == 0` 排在 `y % 4 == 0` 前面。",
    xp: 8,
    validator: {
      options: [
        "闰年 —— 但 1900 实际是平年，因为 `% 4 == 0` 被放在了最前面",
        "平年 —— 这段代码是对的",
        "闰年 —— 1900 确实是闰年",
        "编译错误：`%` 不能用在 if 的条件里",
      ],
      correct: 0,
    },
  },
  {
    id: "ch05-lab-grade-and-leap-year-q2",
    chapterOrder: 5,
    lessonSlug: "lab-grade-and-leap-year",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入一个整数成绩（0~100），输出它的等级：90 及以上 \`A\`、80~89 \`B\`、70~79 \`C\`、60~69 \`D\`、60 以下 \`F\`。

输入 \`85\`，输出 \`B\`。`,
    starterCode: `#include <stdio.h>

int main(void)
{
    int score;

    scanf("%d", &score);
    /* 从最特殊（>= 90）写到最一般（>= 60），最后用 else 兜底 */
    return 0;
}
`,
    stdin: "85",
    hints: [
      "每个分支只写下界：`score >= 90`、`score >= 80`……上界由前一个分支挡住。",
      "每个分支只打印一个字母加换行符，比如 `printf(\"B\\n\");`。",
      "顺序写反（比如先判 `score >= 60`）的话，后面的分支就永远进不去了。",
    ],
    referenceAnswer:
      "从高到低依次判断，最后 `else` 兜底：`if (score >= 90) ... else if (score >= 80) ... else if (score >= 70) ... else if (score >= 60) ... else printf(\"F\\n\");`。85 落到 `>= 80` 那一档，所以输出 `B`。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int score;

    scanf("%d", &score);
    if (score >= 90)
        printf("A\\n");
    else if (score >= 80)
        printf("B\\n");
    else if (score >= 70)
        printf("C\\n");
    else if (score >= 60)
        printf("D\\n");
    else
        printf("F\\n");
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["B"] },
  },
  {
    id: "ch05-lab-grade-and-leap-year-q3",
    chapterOrder: 5,
    lessonSlug: "lab-grade-and-leap-year",
    kind: "CODE",
    difficulty: 3,
    prompt: `读入一个年份，判断它是不是闰年：是就输出 \`yes\`，否则输出 \`no\`。

输入 \`1900\`，输出 \`no\`。

闰年规则：能被 400 整除，或者能被 4 整除但不能被 100 整除。`,
    starterCode: `#include <stdio.h>

int main(void)
{
    int y;

    scanf("%d", &y);
    /* 先判 % 400，再判 % 100，最后才轮到 % 4 */
    return 0;
}
`,
    stdin: "1900",
    hints: [
      "第一个分支判 `y % 400 == 0`（2000 这种整百年份）。",
      "第二个分支判 `y % 100 == 0`：能被 100 整除又不被 400 整除 → 平年，这就是 1900 的位置。",
      "最后再判 `y % 4 == 0`；剩下的都是平年。",
    ],
    referenceAnswer:
      "顺序是全部的关键：`y % 400 == 0` → yes；`y % 100 == 0` → no；`y % 4 == 0` → yes；否则 no。1900 能被 4 整除，但先撞上 `% 100 == 0` 那一档，所以输出 `no`。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int y;

    scanf("%d", &y);
    if (y % 400 == 0)
        printf("yes\\n");
    else if (y % 100 == 0)
        printf("no\\n");
    else if (y % 4 == 0)
        printf("yes\\n");
    else
        printf("no\\n");
    return 0;
}
`,
    xp: 15,
    validator: { expectedStdoutAny: ["no"] },
  },
];

export const CHAPTER_05_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
