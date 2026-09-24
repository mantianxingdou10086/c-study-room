/**
 * 第 6 章题库（15 题）。
 *
 * 这一章的题围绕四件事出：
 *  1. 循环能不能停下来——初始化 / 条件 / 推进，三件事缺一不可
 *  2. 三种循环的适用场景（次数已知用 for、至少一次用 do-while、其余用 while）
 *  3. break 与 continue 的差别，以及它们只作用于最内层
 *  4. 嵌套循环的执行次数，和「能提前结束就不要硬跑到底」的价值
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 6.1 while：先判断再执行 ──────────────────────────────────────
  {
    id: "ch06-while-q1",
    chapterOrder: 6,
    lessonSlug: "while",
    kind: "MCQ",
    difficulty: 1,
    prompt: `下面这段循环会怎么运行？

\`\`\`c
int i = 0;

while (i < 3) {
    printf("%d", i);
}
\`\`\``,
    hints: [
      "把循环体从上到下读一遍：里面有没有哪一行会改变 i 的值？",
      "条件 i < 3 里用的变量是 i。如果 i 一直是 0，这个条件会怎样？",
    ],
    referenceAnswer:
      "死循环。循环体里只打印 i，没有任何语句修改 i，所以 `i < 3` 永远成立，程序会不停地打印 0。要让循环结束，循环体里必须有一个语句在推进循环变量，比如 `i++`。",
    xp: 5,
    validator: {
      options: [
        "打印 012，然后正常结束",
        "打印一次 0 就结束",
        "死循环：i 一直是 0，条件永远成立",
        "编译错误：循环体里必须写 i++",
      ],
      correct: 2,
    },
  },
  {
    id: "ch06-while-q2",
    chapterOrder: 6,
    lessonSlug: "while",
    kind: "FILL",
    difficulty: 2,
    prompt: `下面这个 while 循环想打印 1 2 3 4 5 （每个数后面跟一个空格）。
请按 (1) (2) (3) 的顺序，补全三处空缺。`,
    starterCode: `int i = ____;          /* (1) 初始化 */

while (i ____ 5) {     /* (2) 循环条件 */
    printf("%d ", i);
    ____;              /* (3) 推进 */
}`,
    hints: [
      "想让 1 也能进循环，起点就得是 1；想让 5 通过条件，条件里必须允许「等于 5」。",
      "推进语句的作用是让 i 一步步变大，最后把条件顶破。",
    ],
    referenceAnswer:
      "(1) 1；(2) <=；(3) i++。条件是 `i <= 5`，所以 5 也能进循环体；每轮 `i++` 把 i 从 1 推到 6，条件才不成立，循环结束。",
    xp: 8,
    validator: {
      blanks: [
        ["1"],
        ["<=", "=<", "<= 5", "<=5", "i <= 5", "i<=5", "小于等于", "小于或等于"],
        ["i++", "++i", "i = i + 1", "i+=1", "i += 1", "i=i+1"],
      ],
    },
  },
  {
    id: "ch06-while-q3",
    chapterOrder: 6,
    lessonSlug: "while",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int n = 0;
    int i = 5;

    while (i > 0) {
        n = n + i;
        i--;
    }
    printf("%d\\n", n);
    return 0;
}
\`\`\``,
    hints: [
      "把每一轮的 i 列出来：5、4、3、2、1。n 从 0 开始，每轮加上当前的 i。",
      "i 减到 0 的时候，条件 i > 0 不成立，循环结束——0 不会被加进去。",
    ],
    referenceAnswer:
      "输出 `15`。循环把 5 + 4 + 3 + 2 + 1 累加进 n：n 依次变成 5、9、12、14、15，此时 i 变成 0，条件不成立，循环结束。",
    xp: 8,
    validator: { expected: "15" },
  },

  // ── 6.2 do-while 与 for ─────────────────────────────────────────
  {
    id: "ch06-do-while-and-for-q1",
    chapterOrder: 6,
    lessonSlug: "do-while-and-for",
    kind: "MCQ",
    difficulty: 2,
    prompt: `下面这个 do-while 循环输出什么？

\`\`\`c
int i = 10;

do {
    printf("%d", i);
    i++;
} while (i < 5);
\`\`\``,
    hints: [
      "do-while 是「先执行一遍循环体，再去判断条件」。",
      "第一遍执行完，i 已经变成 11，这时才第一次检查条件。",
    ],
    referenceAnswer:
      "输出 `10`。do-while 先执行循环体再判断条件，所以条件虽然一开始就不成立，循环体仍然跑过一次——这就是它和 while 的唯一区别，也是「至少执行一次」场景选它的理由。",
    xp: 5,
    validator: {
      options: [
        "什么都不打印，因为 i < 5 一开始就是假",
        "打印 10（循环体至少执行一次）",
        "一直打印，停不下来",
        "编译错误：do-while 的条件不允许一开始为假",
      ],
      correct: 1,
    },
  },
  {
    id: "ch06-do-while-and-for-q2",
    chapterOrder: 6,
    lessonSlug: "do-while-and-for",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个 for 循环输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int sum = 0;
    int i;

    for (i = 2; i <= 8; i += 2) {
        sum += i;
    }
    printf("%d\\n", sum);
    return 0;
}
\`\`\``,
    hints: [
      "推进语句是 i += 2，所以 i 依次取 2、4、6、8。",
      "注意 i = 10 时条件 i <= 8 不成立，10 不会被加进去。",
    ],
    referenceAnswer: "输出 `20`。i 依次是 2、4、6、8，sum 累加得到 2 + 4 + 6 + 8 = 20。",
    xp: 8,
    validator: { expected: "20" },
  },
  {
    id: "ch06-do-while-and-for-q3",
    chapterOrder: 6,
    lessonSlug: "do-while-and-for",
    kind: "FILL",
    difficulty: 1,
    prompt: `按场景挑循环，把三种情况补全（填循环的名字）：

（1）次数在写代码时就已经知道——用 ____；
（2）循环体至少要执行一次（比如输入校验）——用 ____；
（3）跑到条件不成立为止，次数事先说不清——用 ____。`,
    hints: [
      "「从 1 打印到 100」这种题，答案在题目里就写着呢。",
      "输入校验必须先把输入读进来一次，才知道对不对。",
    ],
    referenceAnswer:
      "(1) for；(2) do-while；(3) while。三种循环可以互相改写，但按场景选对的那个，读代码的人会少想一步。",
    xp: 5,
    validator: {
      blanks: [
        ["for", "for 循环"],
        ["do-while", "do while", "do…while", "do-while 循环", "dowhile"],
        ["while", "while 循环"],
      ],
    },
  },

  // ── 6.3 break 与 continue ───────────────────────────────────────
  {
    id: "ch06-break-continue-q1",
    chapterOrder: 6,
    lessonSlug: "break-continue",
    kind: "MCQ",
    difficulty: 2,
    prompt: `下面这段循环打印出什么？

\`\`\`c
int i;

for (i = 1; i <= 5; i++) {
    if (i == 3) {
        break;
    }
    printf("%d ", i);
}
\`\`\``,
    hints: [
      "break 一执行，整个循环立刻结束，后面的轮次都不再发生。",
      "i 等于 3 的那一轮，是先判断再决定打不打印——顺序很重要。",
    ],
    referenceAnswer:
      "打印 `1 2 `。i 走到 3 时执行 break，循环整个结束，所以 3、4、5 都不会被打印。注意 break 在 printf 之前，所以这一轮的 3 也没打印。",
    xp: 5,
    validator: {
      options: ["1 2 3 4 5 ", "1 2 ", "1 2 4 5 ", "什么都不打印"],
      correct: 1,
    },
  },
  {
    id: "ch06-break-continue-q2",
    chapterOrder: 6,
    lessonSlug: "break-continue",
    kind: "MCQ",
    difficulty: 2,
    prompt: `把上题里的 break 换成 continue，现在打印出什么？

\`\`\`c
int i;

for (i = 1; i <= 5; i++) {
    if (i == 3) {
        continue;
    }
    printf("%d ", i);
}
\`\`\``,
    hints: [
      "continue 不结束循环，只是放弃本轮剩下的语句。",
      "i 等于 3 时跳过 printf，然后 i++ 照样执行，循环继续。",
    ],
    referenceAnswer:
      "打印 `1 2 4 5 `。continue 只跳过 i 等于 3 的那一轮，循环总共还是跑 5 轮，只是其中一轮什么都没打印。",
    xp: 8,
    validator: {
      options: ["1 2 3 4 5 ", "1 2 ", "1 2 4 5 ", "1 2 4 "],
      correct: 2,
    },
  },
  {
    id: "ch06-break-continue-q3",
    chapterOrder: 6,
    lessonSlug: "break-continue",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `下面这个嵌套循环输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int i, j;

    for (i = 1; i <= 3; i++) {
        for (j = 1; j <= 3; j++) {
            if (j == 2) {
                break;
            }
            printf("%d%d ", i, j);
        }
    }
    printf("\\n");
    return 0;
}
\`\`\``,
    hints: [
      "break 在**内层**循环里，所以它只能打断内层，外层照跑三轮。",
      "内层每轮都在 j 等于 1 时打印一次，j 等于 2 时就被 break 打断了。",
      "每轮打印的内容是 i 和 j 拼在一起：11、21、31。",
    ],
    referenceAnswer:
      "输出 `11 21 31 `。内层在 j = 2 时 break，所以每个外层轮次只打印了 j = 1 的那一次；外层不受影响，跑了 3 轮，共三组。",
    xp: 10,
    validator: { expected: "11 21 31" },
  },

  // ── 6.4 嵌套循环与死循环排查 ─────────────────────────────────────
  {
    id: "ch06-nested-loops-q1",
    chapterOrder: 6,
    lessonSlug: "nested-loops",
    kind: "MCQ",
    difficulty: 2,
    prompt: `下面这段代码里，count++ 一共执行了多少次？

\`\`\`c
int i, j;
int count = 0;

for (i = 1; i <= 4; i++) {
    for (j = 1; j <= 3; j++) {
        count++;
    }
}
\`\`\``,
    hints: [
      "外层每走一轮，内层都要从头到尾完整跑一遍。",
      "总次数是两层次数的乘积，不是相加。",
    ],
    referenceAnswer:
      "12 次。外层跑 4 轮，每轮内层跑 3 次，4 × 3 = 12。把两个次数相加（4 + 3 = 7）是这道题最常见的错法。",
    xp: 5,
    validator: {
      options: ["3 次", "4 次", "7 次", "12 次"],
      correct: 3,
    },
  },
  {
    id: "ch06-nested-loops-q2",
    chapterOrder: 6,
    lessonSlug: "nested-loops",
    kind: "MCQ",
    difficulty: 3,
    prompt: `下面这段代码输出什么形状？

\`\`\`c
int i, j;

for (i = 1; i <= 3; i++) {
    for (j = 1; j <= i; j++) {
        printf("#");
    }
    printf("\\n");
}
\`\`\``,
    hints: [
      "内层的上界是 i，而 i 每轮都在变大，所以每行打印的 # 个数不一样。",
      "换行写在外层循环里，所以每一轮结束才换一次行。",
    ],
    referenceAnswer:
      "三行：第一行 1 个 #、第二行 2 个、第三行 3 个（左对齐的三角形）。内层的终点由外层变量 i 决定，所以每轮的次数都不同；换行在外层，保证每轮只换一次行。",
    xp: 8,
    validator: {
      options: [
        "三行，每行都是 3 个 #",
        "一行 6 个 #",
        "三行，依次是 1 个、2 个、3 个 #（左对齐三角形）",
        "死循环，因为内层用到了外层的变量",
      ],
      correct: 2,
    },
  },
  {
    id: "ch06-nested-loops-q3",
    chapterOrder: 6,
    lessonSlug: "nested-loops",
    kind: "FILL",
    difficulty: 2,
    prompt: `一个嵌套循环里，外层跑 3 次、内层每轮跑 4 次。请补全三处：

（1）内层的循环体一共执行 ____ 次；
（2）负责「第几轮」的是 ____ 循环；
（3）程序卡住不动时，第一件要检查的事是：循环条件里用到的 ____ 有没有真的在变。`,
    hints: [
      "外层每走一步，内层都要完整走一遍——所以是乘法不是加法。",
      "想想「哪一层在数轮次」，哪一层在数「这一轮里的第几个」。",
    ],
    referenceAnswer:
      "(1) 12（3 × 4）；(2) 外层；(3) 循环变量。外层管第几轮、内层管这一轮做什么；循环停不下来，绝大多数情况是循环变量没有被修改。",
    xp: 8,
    validator: {
      blanks: [
        ["12", "12 次"],
        ["外层", "外层的", "最外层", "最外面那层", "外", "外循环", "外层循环", "外面的循环"],
        [
          "循环变量",
          "循环变量的值",
          "变量",
          "变量的值",
          "循环变量 i",
          "循环变量i",
          "i",
          "判断条件里的变量",
          "条件里的变量",
        ],
      ],
    },
  },

  // ── 6.5 动手：素数判断与猜数字 ───────────────────────────────────
  {
    id: "ch06-lab-prime-and-guess-q1",
    chapterOrder: 6,
    lessonSlug: "lab-prime-and-guess",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入一个整数 n，判断它是不是素数：是就输出「n 是素数」，不是就输出「n 不是素数」。

输入 \`97\`，输出 \`97 是素数\`。

要求：找到因子后**立刻结束循环**（用 break），不要硬试到 n - 1。`,
    starterCode: `#include <stdio.h>

int main(void)
{
    int n, i;
    int isPrime = 1;

    scanf("%d", &n);
    /* 先处理 n < 2 的情况（1、0、负数都不是素数） */
    /* 再用 2、3、4…… 试除，找到一个因子就把 isPrime 改成 0 并 break */
    /* 最后按 isPrime 输出「n 是素数」或「n 不是素数」 */
    return 0;
}
`,
    stdin: "97",
    hints: [
      "先假设它是素数：`int isPrime = 1;`，找到因子时改成 0。",
      "试除的上界用 `i * i <= n` 就够——如果 n 有因子，必然有一个不超过它的平方根。",
      "找到因子后写 `break;`，循环立刻结束。最后用 if/else 输出两种结论。",
    ],
    referenceAnswer:
      "先假设是素数，再逐个试除；只要 `n % i == 0` 就说明不是素数，设 `isPrime = 0` 并 break。注意 `n < 2` 要单独处理，否则输入 1 时循环一次都不跑，会被误判成素数。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int n, i;
    int isPrime = 1;

    scanf("%d", &n);
    if (n < 2) {
        isPrime = 0;
    } else {
        for (i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                isPrime = 0;
                break;
            }
        }
    }
    if (isPrime) {
        printf("%d 是素数\\n", n);
    } else {
        printf("%d 不是素数\\n", n);
    }
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["97 是素数"] },
  },
  {
    id: "ch06-lab-prime-and-guess-q2",
    chapterOrder: 6,
    lessonSlug: "lab-prime-and-guess",
    kind: "CODE",
    difficulty: 2,
    prompt: `猜数字：答案固定为 42（不用随机数）。反复读入猜测，直到猜中为止：

- 猜小了：输出「太小了」
- 猜大了：输出「太大了」
- 猜中：输出「猜对了：42」并结束程序

输入 \`10 50 42\`，输出三行：

\`\`\`
太小了
太大了
猜对了：42
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int secret = 42;
    int guess;

    /* 反复 scanf 读入 guess，按大小提示，猜中时输出并结束 */
    return 0;
}
`,
    stdin: "10 50 42",
    hints: [
      "「一直读到某件事发生为止」用 `while (1)`，靠 break 退出。",
      "三个分支的顺序：先判相等（猜中就该结束了），再判小了 / 大了。",
      "输出格式：`printf(\"太小了\\n\");` —— 猜中那行要带数字：`printf(\"猜对了：%d\\n\", guess);`",
    ],
    referenceAnswer:
      "用 `while (1)` 做无限循环，循环体里先 `scanf` 读一个猜测，再判断：相等就打印并 break，小于 42 打印「太小了」，否则打印「太大了」。写 `while (1)` 时一定要能指出那条 break，否则就是死循环。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int secret = 42;
    int guess;

    while (1) {
        scanf("%d", &guess);
        if (guess == secret) {
            printf("猜对了：%d\\n", guess);
            break;
        }
        if (guess < secret) {
            printf("太小了\\n");
        } else {
            printf("太大了\\n");
        }
    }
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["太小了\n太大了\n猜对了：42"] },
  },
  {
    id: "ch06-lab-prime-and-guess-q3",
    chapterOrder: 6,
    lessonSlug: "lab-prime-and-guess",
    kind: "CODE",
    difficulty: 3,
    prompt: `读入一个整数 n，统计 1 到 n 之间一共有多少个素数，输出这个个数。

输入 \`20\`，输出 \`8\`（2、3、5、7、11、13、17、19）。

提示：这是嵌套循环——外层遍历 2 到 n 的每个数，内层判断它是不是素数。`,
    starterCode: `#include <stdio.h>

int main(void)
{
    int n, i, j;
    int count = 0;

    scanf("%d", &n);
    /* 外层：i 从 2 走到 n */
    /* 内层：判断 i 是不是素数（找到因子就 break） */
    /* 是素数就把 count 加一 */
    printf("%d\\n", count);
    return 0;
}
`,
    stdin: "20",
    hints: [
      "外层的循环变量用 i，内层用 j——两个循环变量必须是不同的名字。",
      "每个 i 都要重新假设一次「它是素数」：在循环体开头写 `int isPrime = 1;`。",
      "内层找到因子就 `isPrime = 0; break;`；内层跑完后，如果 isPrime 还是 1，就 `count++`。",
    ],
    referenceAnswer:
      "外层遍历 2 到 n，内层用试除法判断当前数是不是素数（`j * j <= i`，找到因子就 break）；每轮结束时 isPrime 仍为 1 就让 count 加一。这就是「嵌套循环 + 提前结束」的组合。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int n, i, j;
    int count = 0;

    scanf("%d", &n);
    for (i = 2; i <= n; i++) {
        int isPrime = 1;

        for (j = 2; j * j <= i; j++) {
            if (i % j == 0) {
                isPrime = 0;
                break;
            }
        }
        if (isPrime) {
            count++;
        }
    }
    printf("%d\\n", count);
    return 0;
}
`,
    xp: 15,
    validator: { expectedStdoutAny: ["8"] },
  },
];

export const CHAPTER_06_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
