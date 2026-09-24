/**
 * 第 8 章题库（15 题）。
 *
 * 这一章的题围绕三件事出：
 *  1. 下标从 0 开始、最后一个合法下标是「长度减 1」，遍历用 `i < N`
 *  2. 初始化列表会把没写到的元素补 0，而 C 从不检查下标越界
 *  3. 二维数组是「数组的数组」，以及「先假设第一个是答案」的求最值套路
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 8.1 一维数组的定义与遍历 ─────────────────────────────────────
  {
    id: "ch08-one-dimensional-q1",
    chapterOrder: 8,
    lessonSlug: "one-dimensional",
    kind: "MCQ",
    difficulty: 1,
    prompt: "数组 `int a[5];` 一共有 5 个元素。要访问它的**第 3 个**元素，应该写哪个表达式？",
    hints: [
      "下标表示的不是「第几个」，而是「离开头几个位置」。",
      "第 1 个元素离开头 0 个位置，第 2 个离开头 1 个位置。",
    ],
    referenceAnswer:
      "`a[2]`。下标从 0 开始：第 1 个是 `a[0]`、第 2 个是 `a[1]`、第 3 个是 `a[2]`，规律是「第 k 个元素的下标是 k-1」，最后一个（第 5 个）元素的下标是 4。`a[3]` 拿到的是第 4 个元素；`a(2)` 是函数调用的写法，数组不能用圆括号访问。",
    xp: 5,
    validator: {
      options: ["`a[3]`", "`a[2]`", "`a[1]`", "`a(2)`"],
      correct: 1,
    },
  },
  {
    id: "ch08-one-dimensional-q2",
    chapterOrder: 8,
    lessonSlug: "one-dimensional",
    kind: "MCQ",
    difficulty: 2,
    prompt: "下面哪个循环能把长度为 `N` 的数组 `a` 的每个元素**刚好**访问一遍？",
    hints: [
      "合法下标从 0 开始，到 N-1 结束。",
      "把循环的最后一次代进去算一下下标，看它是不是等于 N。",
    ],
    referenceAnswer:
      "`for (i = 0; i < N; i++)`。它让 `i` 取 0 到 N-1，正好是全部合法下标。`i <= N` 会多走一次，那一次的下标等于 N，是越界；`i = 1; i <= N` 从第 2 个元素开始，最后同样多走一次；`i < N - 1` 少走一轮，会漏掉最后一个元素（这种错不报错，只是结果偏小）。",
    xp: 5,
    validator: {
      options: [
        "`for (i = 0; i <= N; i++)`",
        "`for (i = 1; i <= N; i++)`",
        "`for (i = 0; i < N; i++)`",
        "`for (i = 0; i < N - 1; i++)`",
      ],
      correct: 2,
    },
  },
  {
    id: "ch08-one-dimensional-q3",
    chapterOrder: 8,
    lessonSlug: "one-dimensional",
    kind: "FILL",
    difficulty: 1,
    prompt:
      "`int a[10];` 定义了一个长度为 10 的数组。它的合法下标从（1）____ 开始，最后一个合法下标是（2）____。",
    hints: [
      "下标表示「离开头几个位置」，第一个元素离开头 0 个位置。",
      "最后一个合法下标永远等于「长度减 1」。",
    ],
    referenceAnswer:
      "（1）0；（2）9。下标从 0 开始，长度 10 的数组下标是 0 到 9，所以最后一个合法下标 = 长度 - 1。写成 `a[10]` 就已经越界了——C 不会拦住它。",
    xp: 5,
    validator: { blanks: [["0", "零"], ["9", "九"]] },
  },
  {
    id: "ch08-one-dimensional-q4",
    chapterOrder: 8,
    lessonSlug: "one-dimensional",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序先打印数组的每个元素（用空格隔开），再打印它们的和。它输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int a[4] = {2, 5, 1, 8};
    int i, sum = 0;

    for (i = 0; i < 4; i++) {
        sum = sum + a[i];
        if (i > 0) {
            printf(" ");
        }
        printf("%d", a[i]);
    }
    printf("\\n");
    printf("sum=%d\\n", sum);
    return 0;
}
\`\`\``,
    hints: [
      "循环里先累加、再打印，所以打印顺序就是下标顺序 0、1、2、3。",
      "`if (i > 0)` 只在第 2 个元素之后才打印空格，所以数字之间恰好一个空格，开头没有空格。",
      "和是 2 + 5 + 1 + 8。",
    ],
    referenceAnswer:
      "两行：第一行 `2 5 1 8`，第二行 `sum=16`。循环按下标 0 到 3 打印，`if (i > 0)` 让空格只出现在数字之间；`sum` 依次加上 2、5、1、8 得到 16。",
    xp: 8,
    validator: { expected: "2 5 1 8\nsum=16" },
  },

  // ── 8.2 初始化与越界 ─────────────────────────────────────────────
  {
    id: "ch08-initialization-bounds-q1",
    chapterOrder: 8,
    lessonSlug: "initialization-bounds",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`int a[5] = {1, 2};` 这一行执行之后，`a[4]` 的值是多少？",
    hints: [
      "初始化列表里只写了两个值，剩下三个位置会怎样？",
      "「写了初始化列表」和「完全没初始化」是两件不同的事。",
    ],
    referenceAnswer:
      "`0`。只要写了初始化列表，**没写到的元素会被自动补 0**，所以 `a[2]`、`a[3]`、`a[4]` 都是 0。只有完全没写初始化列表（`int a[5];`）时，元素里才是不能读的不确定值。列表里的元素个数可以少于长度，但不能多于长度。",
    xp: 5,
    validator: {
      options: [
        "0——没写到的元素会被自动补 0",
        "不确定的垃圾值——内存里原来剩下的东西",
        "2——会重复最后一个写出来的值",
        "编译错误——初始化列表的元素个数必须和长度一致",
      ],
      correct: 0,
    },
  },
  {
    id: "ch08-initialization-bounds-q2",
    chapterOrder: 8,
    lessonSlug: "initialization-bounds",
    kind: "FILL",
    difficulty: 1,
    prompt: "要把一个长度为 10 的数组的所有元素一次性清零，最短的写法是 `int a[10] = {（____）};`。",
    hints: [
      "不需要写 10 个值——没写到的位置会自动补成同一个数。",
      "问的是补的那个数是什么。",
    ],
    referenceAnswer:
      "填 `0`。列表里只写一个 0，剩下 9 个位置自动补 0，于是整个数组都是 0——这是 C 里最常用的清零写法。注意别写成 `{1}`：那会把 `a[0]` 设成 1、其余为 0。",
    xp: 5,
    validator: { blanks: [["0", "零"]] },
  },
  {
    id: "ch08-initialization-bounds-q3",
    chapterOrder: 8,
    lessonSlug: "initialization-bounds",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int a[5] = {10, 20};

    printf("%d %d %d\\n", a[0], a[1], a[2]);
    printf("%d\\n", (int)(sizeof(a) / sizeof(a[0])));
    return 0;
}
\`\`\``,
    hints: [
      "初始化列表只写了 10 和 20，后面三个位置会补 0。",
      "第二行的表达式是「整个数组的字节数 ÷ 单个元素的字节数」，得到的是元素个数。",
    ],
    referenceAnswer:
      "两行：第一行 `10 20 0`，第二行 `5`。`a[2]` 没在初始化列表里出现，所以是 0；`sizeof(a) / sizeof(a[0])` 是数组长度，也就是 5——这说明「部分初始化」不等于「没初始化」。",
    xp: 8,
    validator: { expected: "10 20 0\n5" },
  },

  // ── 8.3 二维数组 ─────────────────────────────────────────────────
  {
    id: "ch08-two-dimensional-q1",
    chapterOrder: 8,
    lessonSlug: "two-dimensional",
    kind: "MCQ",
    difficulty: 2,
    prompt: "`int m[3][4];` 里，`m[1]` 表示什么？",
    hints: [
      "二维数组是「数组的数组」：`m` 的每个元素本身又是一个数组。",
      "想一下 `m[1]` 里还剩几个位置没被下标指定。",
    ],
    referenceAnswer:
      "第 2 行的整行——它本身是一个长度为 4 的整数数组。`m` 的元素类型不是 `int`，而是「长度为 4 的整数数组」，所以 `m[1]` 拿出来的是整行；要再往里拿一个具体的数，得写第二个中括号，比如 `m[1][0]`。行下标 0 到 2，所以 `m[1]` 是第 2 行。",
    xp: 5,
    validator: {
      options: [
        "第 1 行第 1 列的那个元素",
        "第 2 行的整行——它本身是一个长度为 4 的整数数组",
        "第 1 列的全部 3 个元素",
        "一个整数，等于第 2 行所有元素的和",
      ],
      correct: 1,
    },
  },
  {
    id: "ch08-two-dimensional-q2",
    chapterOrder: 8,
    lessonSlug: "two-dimensional",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `这个程序按列遍历一个 2 行 3 列的矩阵，把每一列的和打印成一行。它输出什么？

\`\`\`c
#include <stdio.h>

int main(void)
{
    int m[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int i, j, sum;

    for (j = 0; j < 3; j++) {
        sum = 0;
        for (i = 0; i < 2; i++) {
            sum = sum + m[i][j];
        }
        printf("%d\\n", sum);
    }
    return 0;
}
\`\`\``,
    hints: [
      "外层循环是 `j`（列），内层是 `i`（行）——所以是「一列一列地加」。",
      "第 0 列是 `m[0][0]` 和 `m[1][0]`，也就是 1 和 4。",
      "`sum = 0;` 写在外层循环里，每换一列都重新开始累加。",
    ],
    referenceAnswer:
      "三行：`5`、`7`、`9`。第 0 列是 1 + 4 = 5，第 1 列是 2 + 5 = 7，第 2 列是 3 + 6 = 9。注意内外层循环的角色：外层 `j` 走列、内层 `i` 走行，和「按行遍历」的写法正好相反。",
    xp: 8,
    validator: { expected: "5\n7\n9" },
  },
  {
    id: "ch08-two-dimensional-q3",
    chapterOrder: 8,
    lessonSlug: "two-dimensional",
    kind: "CODE",
    difficulty: 2,
    prompt: `用一个二维数组存 3 名学生、每人 2 门课的成绩，输出每名学生的总分（一行一个数字）。

数组已经给你了：

\`\`\`c
int score[3][2] = {{80, 90}, {70, 60}, {100, 50}};
\`\`\`

期望输出：

\`\`\`
170
130
150
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int score[3][2] = {{80, 90}, {70, 60}, {100, 50}};
    int i, j, total;

    /* 对每个学生：把他那两门课的成绩加起来，打印一行总分 */
    return 0;
}
`,
    hints: [
      "外层循环走学生（行），内层循环走课程（列）。",
      "`total` 要在外层循环里清零、内层循环里累加，否则总分会被前一个学生带过来。",
    ],
    referenceAnswer:
      "外层 `i` 走 3 个学生，内层 `j` 走 2 门课，`total` 在外层循环里清零、在内层循环里累加 `score[i][j]`。第 1 个学生 80 + 90 = 170，第 2 个 70 + 60 = 130，第 3 个 100 + 50 = 150。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int score[3][2] = {{80, 90}, {70, 60}, {100, 50}};
    int i, j, total;

    for (i = 0; i < 3; i++) {
        total = 0;
        for (j = 0; j < 2; j++) {
            total = total + score[i][j];
        }
        printf("%d\\n", total);
    }
    return 0;
}
`,
    xp: 10,
    validator: { expectedStdoutAny: ["170\n130\n150"] },
  },

  // ── 8.4 动手：统计与矩阵转置 ─────────────────────────────────────
  {
    id: "ch08-lab-stats-and-matrix-q1",
    chapterOrder: 8,
    lessonSlug: "lab-stats-and-matrix",
    kind: "MCQ",
    difficulty: 2,
    prompt: "在长度为 `n` 的数组 `a` 里求**最小值**，下面哪种做法是对的？",
    hints: [
      "先想一想：如果数组里的数全是负数，初值 0 会怎么样？",
      "最可靠的初值，是来自数组本身的一个值。",
    ],
    referenceAnswer:
      "`min = a[0];`，然后从下标 1（或 0）开始逐个比较更新。这样 `min` 一定在数据里，对全是负数、全是小数的数据都成立。初值写 0 在数据全为正数时看着没问题，一旦全是负数就会得到「最小值是 0」这种不在数据里的答案；写一个「够大的数」（比如 1000000）只是把风险推给了「万一数据比它更大」；`a[n]` 更是直接越界——长度 n 的合法下标只到 n-1。",
    xp: 8,
    validator: {
      options: [
        "`min = 0;`——最小值不可能比 0 更小",
        "`min = a[0];`，然后从下标 1 开始逐个比较更新",
        "`min = 1000000;`——找一个够大的数当起点",
        "`min = a[n];`——用数组最后一个元素当起点",
      ],
      correct: 1,
    },
  },
  {
    id: "ch08-lab-stats-and-matrix-q2",
    chapterOrder: 8,
    lessonSlug: "lab-stats-and-matrix",
    kind: "MCQ",
    difficulty: 2,
    prompt:
      "`sum` 是 8 个整数的和（118），`n` 是 `int` 类型的 8。执行 `double avg = sum / n;` 之后，`avg` 里是什么？",
    hints: [
      "除法的两边都是整数时，会按什么规则算？",
      "赋给 `double` 这个动作发生在除法**之后**。",
    ],
    referenceAnswer:
      "`14`——整数除法算出的商，小数部分已经丢掉了。两个 `int` 相除，C 会先按整数除法算出结果（118 / 8 = 14），再把这个整数存进 `double`，所以 `avg` 是 14.0，而不是 14.75。要得到小数，得让除法本身按浮点做：`(double)sum / n` 或者 `sum / 8.0`。",
    xp: 5,
    validator: {
      options: [
        "14.75——正确的平均值",
        "14.0——整数除法先把小数丢掉了，再存进 double 也补不回来",
        "编译错误——double 变量不能接两个 int 相除的结果",
        "14.75，但被四舍五入成了 15",
      ],
      correct: 1,
    },
  },
  {
    id: "ch08-lab-stats-and-matrix-q3",
    chapterOrder: 8,
    lessonSlug: "lab-stats-and-matrix",
    kind: "FILL",
    difficulty: 2,
    prompt: "把一个 3 行 4 列的矩阵转置，得到的矩阵是（1）____ 行（2）____ 列。",
    hints: [
      "转置就是把行列互换：原来的行变成结果的列。",
      "原来的 3 行会变成结果的 3 列。",
    ],
    referenceAnswer:
      "（1）4 行；（2）3 列。转置把「第 i 行第 j 列」搬到「第 j 行第 i 列」，所以行数变成原来的列数、列数变成原来的行数。写代码时这也是 `int b[C][R];` 的原因——两个长度换了位置。",
    xp: 8,
    validator: { blanks: [["4", "四"], ["3", "三"]] },
  },
  {
    id: "ch08-lab-stats-and-matrix-q4",
    chapterOrder: 8,
    lessonSlug: "lab-stats-and-matrix",
    kind: "CODE",
    difficulty: 2,
    prompt: `读入 8 个整数，输出四行：总和、最大值、最小值、平均值（保留两位小数）。

输入 \`12 7 25 3 19 8 14 30\`，期望输出：

\`\`\`
118
30
3
14.75
\`\`\``,
    starterCode: `#include <stdio.h>

#define N 8

int main(void)
{
    int a[N];
    int i, sum, max, min;

    for (i = 0; i < N; i++) {
        scanf("%d", &a[i]);
    }

    /* 先假设 a[0] 既是最大值也是最小值，再遍历一遍：求和、比大、比小 */
    return 0;
}
`,
    stdin: "12 7 25 3 19 8 14 30",
    hints: [
      "`max` 和 `min` 的初值都要取 `a[0]`，不能取 0——数据里可能有负数。",
      "三件事可以在同一个循环里做：`sum = sum + a[i];`，再两个 `if` 分别更新 `max` 和 `min`。",
      "平均值要用 `(double)sum / N`，否则整数除法会把小数丢掉。",
    ],
    referenceAnswer:
      "读入用一个 `for` 循环；`sum = 0; max = a[0]; min = a[0];` 三个准备动作放在循环外；循环里同时累加、比大、比小；最后四行输出，平均值写成 `printf(\"%.2f\\n\", (double)sum / N);`。这组数据的总和是 118、最大 30、最小 3、平均 14.75。",
    referenceCode: `#include <stdio.h>

#define N 8

int main(void)
{
    int a[N];
    int i, sum, max, min;

    for (i = 0; i < N; i++) {
        scanf("%d", &a[i]);
    }

    sum = 0;
    max = a[0];
    min = a[0];

    for (i = 0; i < N; i++) {
        sum = sum + a[i];
        if (a[i] > max) {
            max = a[i];
        }
        if (a[i] < min) {
            min = a[i];
        }
    }

    printf("%d\\n", sum);
    printf("%d\\n", max);
    printf("%d\\n", min);
    printf("%.2f\\n", (double)sum / N);
    return 0;
}
`,
    xp: 12,
    validator: {
      expectedStdoutAny: ["118\n30\n3\n14.75"],
      floatTolerance: 0.01,
    },
  },
  {
    id: "ch08-lab-stats-and-matrix-q5",
    chapterOrder: 8,
    lessonSlug: "lab-stats-and-matrix",
    kind: "CODE",
    difficulty: 3,
    prompt: `把下面的 2 行 3 列矩阵转置后输出：结果有 3 行，每行两个数，数字之间用一个空格隔开。

\`\`\`c
int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
\`\`\`

期望输出：

\`\`\`
1 4
2 5
3 6
\`\`\``,
    starterCode: `#include <stdio.h>

#define R 2
#define C 3

int main(void)
{
    int a[R][C] = {{1, 2, 3}, {4, 5, 6}};
    int i, j;

    /* 结果有 C 行 R 列：第 j 行是原矩阵第 j 列的所有元素 */
    return 0;
}
`,
    hints: [
      "转置的规律是 `b[j][i] = a[i][j]`——两个下标换位置。",
      "外层循环走结果的 3 行（对应原来的列），内层循环走每行的 2 个数（对应原来的行）。",
      "也可以直接写 `printf(\"%d %d\\n\", a[0][j], a[1][j]);`，外层只留一个走列的循环。",
    ],
    referenceAnswer:
      "外层 `j` 走 3 列、内层 `i` 走 2 行，打印 `a[i][j]`：第 0 行输出 `a[0][0]` 和 `a[1][0]`（1 和 4），第 1 行是 2 和 5，第 2 行是 3 和 6。关键点是下标换位置——原矩阵的第 j 列变成了结果的第 j 行。",
    referenceCode: `#include <stdio.h>

#define R 2
#define C 3

int main(void)
{
    int a[R][C] = {{1, 2, 3}, {4, 5, 6}};
    int i, j;

    for (j = 0; j < C; j++) {
        for (i = 0; i < R; i++) {
            printf("%d", a[i][j]);
            if (i < R - 1) {
                printf(" ");
            }
        }
        printf("\\n");
    }
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["1 4\n2 5\n3 6"] },
  },
];

export const CHAPTER_08_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
