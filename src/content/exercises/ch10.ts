/**
 * 第 10 章题库（15 题）。
 *
 * 这一章的题围绕四件事出：
 *  1. 局部变量与全局变量的作用域和生命周期（用完就没了 vs 整个程序活着）
 *  2. 块作用域与变量遮蔽（内层同名变量遮住外层，这是 bug 的高发区）
 *  3. 单文件程序的惯例顺序：包含 → 宏 → 类型 → 函数原型 → main → 各函数实现
 *  4. 重构的第一步是给已有逻辑起名字、排位置，行为一个字都不许变
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 10.1 局部变量与全局变量 ─────────────────────────────────────
  {
    id: "ch10-local-and-global-q1",
    chapterOrder: 10,
    lessonSlug: "local-and-global",
    kind: "MCQ",
    difficulty: 1,
    prompt: "关于局部变量和全局变量，下面哪一句是对的？",
    hints: [
      "先分清两件事：谁能看见这个变量（作用域），和它什么时候出生、什么时候消失（生命周期）。",
      "局部变量定义在函数里面，全局变量定义在所有函数外面——位置决定了这两件事。",
    ],
    referenceAnswer:
      "局部变量在函数返回后就失效了，全局变量在整个程序运行期间都存在。局部变量的存储空间随函数调用而建立、随函数返回而收回；全局变量在程序启动时就分配好，活到程序结束。所以「全局变量每次调用重新创建」是错的；「作用域都是整个程序」也错，局部变量出了自己的块就看不见了；局部变量本来就应该定义在函数里面，定义到外面去那就成了全局变量。",
    xp: 5,
    validator: {
      options: [
        "全局变量在每次函数调用时都会被重新创建一次",
        "局部变量在函数返回后就失效了，全局变量在整个程序运行期间都存在",
        "两者的作用域都是整个程序，只是初始值不同",
        "局部变量必须定义在所有函数之外",
      ],
      correct: 1,
    },
  },
  {
    id: "ch10-local-and-global-q2",
    chapterOrder: 10,
    lessonSlug: "local-and-global",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "全局变量如果没有显式写初始值，会被自动初始化为（1）____；局部变量如果没有写初始值，它的值是（2）____。",
    hints: [
      "全局变量的存储空间在程序启动时就准备好了，C 标准规定它会被清零。",
      "局部变量的存储空间是函数被调用时才腾出来的，里面可能还留着上一个函数用过的内容。",
    ],
    referenceAnswer:
      "（1）0（`double` 全局变量则是 0.0）；（2）不确定的值——通常说成「垃圾值」。全局变量被自动清零是 C 标准保证的；局部变量没有这个待遇，读一个没初始化的局部变量会读到一段来历不明的内存内容。所以累加变量在使用前必须自己写 `= 0`，不要依赖运气。",
    xp: 8,
    validator: {
      blanks: [
        ["0", "零", "0（零）", "0.0", "零值"],
        [
          "不确定",
          "不确定的值",
          "不确定值",
          "垃圾值",
          "垃圾",
          "随机值",
          "随机的值",
          "未知",
          "不可预测",
          "未定义",
          "未定义的值",
          "未定义值",
          "没有定义", "未初始化", "任意值", "垃圾数据", "不可预料", "无法预料",
        ],
      ],
    },
  },
  {
    id: "ch10-local-and-global-q3",
    chapterOrder: 10,
    lessonSlug: "local-and-global",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序输出什么？

\`\`\`c
#include <stdio.h>

int total = 0;

void add(int n)
{
    total = total + n;
}

int main(void)
{
    add(3);
    add(4);
    add(5);
    printf("%d\\n", total);
    return 0;
}
\`\`\``,
    hints: [
      "`total` 定义在所有函数之外，所以三次调用用的是同一个变量，不是三个。",
      "把三次调用加的数排一排：3、4、5，它们会一路累加，而不是每次都从 0 开始。",
    ],
    referenceAnswer:
      "输出 `12`。`total` 是全局变量，`add` 里那句 `total = total + n;` 改的就是它，三次调用分别把 3、4、5 加到同一个变量上，3 + 4 + 5 = 12。假如把 `total` 改成写在 `add` 里面的局部变量，每次调用都会从 0 开始，`main` 最后读到的一定是 0——这就是「用完就没了」和「整个程序活着」的差别。",
    xp: 8,
    validator: { expected: "12" },
  },

  // ── 10.2 块与作用域规则 ─────────────────────────────────────────
  {
    id: "ch10-blocks-and-scope-q1",
    chapterOrder: 10,
    lessonSlug: "blocks-and-scope",
    kind: "MCQ",
    difficulty: 2,
    prompt:
      "文件开头写了全局的 `int x = 1;`，而 `main` 的第一行又写了 `int x = 2;`。那么在 `main` 里打印 `x`，会打印出什么？",
    hints: [
      "编译器找一个名字时，是从最内层开始往外找，找到第一个同名的就用它，不再继续往外找。",
      "`main` 里的 `int x = 2;` 是离打印那一行最近的一个 `x`。",
    ],
    referenceAnswer:
      "打印 `2`。`main` 里声明了一个新的局部变量 `x`，它把全局的 `x` 遮住了（这就是遮蔽）。全局那个 `x` 并没有消失，只是在这段代码里「看不见」了；出了 `main`，它还是 1。同名不是错误，C 允许这样写——但正因为允许，遮蔽才是 bug 的高发区。",
    xp: 5,
    validator: {
      options: [
        "1 —— 全局变量的优先级更高",
        "2 —— 局部的 `x` 遮住了全局的 `x`",
        "3 —— 两个值会相加",
        "编译错误 —— 不允许和全局变量同名",
      ],
      correct: 1,
    },
  },
  {
    id: "ch10-blocks-and-scope-q2",
    chapterOrder: 10,
    lessonSlug: "blocks-and-scope",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "一个变量的作用域由（1）____ 划出来；在内层块里声明一个和外层同名的变量，让这个名字在内层指向内层的变量，这种做法叫（2）____。",
    hints: [
      "函数体、`if` 后面的代码、`for` 的循环体，它们的外面都包着同一对符号。",
      "「外层的那个被挡住了，名字暂时指向内层」——中文教材通常用「遮」或「屏」开头的一个词。",
    ],
    referenceAnswer:
      "（1）花括号（一对 `{` 和 `}`）；（2）遮蔽（也叫屏蔽）。块就是一对花括号包起来的一段代码，变量的作用域从声明那一行开始、到这个块结束为止。名字的查找规则是由内向外：找到第一个同名的就用它，所以内层声明的变量会遮住外层的同名变量，直到离开这个块为止。",
    xp: 8,
    validator: {
      blanks: [
        [
          "花括号",
          "大括号",
          "一对花括号",
          "一对大括号",
          "花括号对",
          "大括号对",
          "{}",
          "{ }",
          "{",
          "括号",
        ],
        ["遮蔽", "屏蔽", "遮住", "遮挡", "覆盖", "隐藏", "掩盖", "shadowing", "shadow", "影子",
          "名字遮蔽", "变量遮蔽", "局部遮蔽",],
      ],
    },
  },
  {
    id: "ch10-blocks-and-scope-q3",
    chapterOrder: 10,
    lessonSlug: "blocks-and-scope",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `同一段程序里有三个叫 x 的变量。它输出什么？

\`\`\`c
#include <stdio.h>

int x = 1;

int main(void)
{
    int x = 2;

    printf("%d\\n", x);
    {
        int x = 3;
        printf("%d\\n", x);
    }
    printf("%d\\n", x);
    return 0;
}
\`\`\``,
    hints: [
      "每次打印时，先问自己：这一行所在的最内层块里，有没有一个叫 `x` 的变量？有，用的就是它。",
      "全局的 1 从来没有被打印过——它被 `main` 里的 `x` 遮住了，而内层块的 3 只活在那一对花括号里。",
    ],
    referenceAnswer:
      "输出三行：`2`、`3`、`2`。第一次打印在 `main` 的块里，最近的 `x` 是局部的 2；进入内层块后，块里声明的 `x = 3` 把局部的 2 也遮住了，所以第二次打印 3；出了内层块，局部的 `x` 重新可见，第三次又打印 2。全局的 `x = 1` 从头到尾没被打印过——它被遮了两层。注意：块里的 `int x = 3;` 是又造了一个新变量，不是给外层的 `x` 赋值，所以外层那个从头到尾都是 2。",
    xp: 8,
    validator: { expected: "2\n3\n2" },
  },
  {
    id: "ch10-blocks-and-scope-q4",
    chapterOrder: 10,
    lessonSlug: "blocks-and-scope",
    kind: "CODE",
    difficulty: 2,
    prompt: `写一个程序，亲眼确认一次遮蔽：

1. 在 \`main\` 里声明 \`int n = 10;\`，打印它；
2. 进入一个单独的花括号块，在块里声明同名的 \`int n = 20;\`，打印它；
3. 出了块之后，再打印一次外面的那个 \`n\`。

期望输出三行：

\`\`\`
10
20
10
\`\`\``,
    starterCode: `#include <stdio.h>

int main(void)
{
    int n = 10;

    printf("%d\\n", n);
    /* 在这里写一对花括号：块里声明同名的 int n = 20; 并打印它 */
    /* 出了块，再打印一次外面的 n */
    return 0;
}
`,
    hints: [
      "第 2 步的那对花括号可以单独写，不需要挂在 `if` 或 `for` 后面——它唯一的作用就是划出一块作用域。",
      "三行打印分别是：块外、块内、块外。第三行打印的是 `main` 里那个 `n`，它一直没被改过。",
    ],
    referenceAnswer:
      "关键在于：块里的 `int n = 20;` 声明的是**另一个变量**，不是给外面的 `n` 赋值。所以第三行打印的还是 10——外面的 `n` 从头到尾没被碰过。如果想让外面的 `n` 变，就必须写 `n = 20;`（不带 `int`），那才是赋值。",
    referenceCode: `#include <stdio.h>

int main(void)
{
    int n = 10;

    printf("%d\\n", n);
    {
        int n = 20;

        printf("%d\\n", n);
    }
    printf("%d\\n", n);
    return 0;
}
`,
    xp: 10,
    validator: { expectedStdoutAny: ["10\n20\n10"] },
  },

  // ── 10.3 把单文件程序排好序 ─────────────────────────────────────
  {
    id: "ch10-organizing-one-file-q1",
    chapterOrder: 10,
    lessonSlug: "organizing-one-file",
    kind: "MCQ",
    difficulty: 1,
    prompt: "单文件程序的惯例顺序是下面哪一种？",
    hints: [
      "编译器自上而下扫一遍：它读到某一行时，只认识这一行之前出现过的东西。顺序要顺着这条规则来。",
      "最上面是「目录」（要用什么、有哪些常量），中间是提纲（`main`），下面是细节（各函数实现）。",
    ],
    referenceAnswer:
      "包含 → 宏 → 类型 → 函数原型 → `main` → 各函数实现。顶部三行是这份文件的目录，`main` 是提纲，具体实现放最后。这样读代码的人从上往下读一遍就够：想知道某一步怎么算，再往下翻一次，不用回头找。",
    xp: 5,
    validator: {
      options: [
        "`main` → 宏 → 函数原型 → 包含 → 各函数实现",
        "包含 → 宏 → 类型 → 函数原型 → `main` → 各函数实现",
        "各函数实现 → `main` → 函数原型 → 宏 → 包含",
        "函数原型 → 包含 → `main` → 宏 → 类型",
      ],
      correct: 1,
    },
  },
  {
    id: "ch10-organizing-one-file-q2",
    chapterOrder: 10,
    lessonSlug: "organizing-one-file",
    kind: "MCQ",
    difficulty: 2,
    prompt: "把函数原型写在 `main` 之前，主要是为了解决什么问题？",
    hints: [
      "函数实现被放到了 `main` 后面，可 `main` 里要调用它们——编译器读到调用那一行时还没见过这些名字。",
      "原型给的信息是：函数名、参数类型、返回类型。",
    ],
    referenceAnswer:
      "让 `main` 里可以先调用一个定义在文件后面的函数：编译器在调用点就见过这条原型，知道要几个什么类型的参数、返回什么。它和运行速度、内存占用都无关；有原型也不会让函数可以省掉 `return`。这也是「把 `main` 放前面、实现放后面」这种排法的代价，而原型正好把这个代价抵掉了。",
    xp: 5,
    validator: {
      options: [
        "让程序运行得更快",
        "让 `main` 里可以先调用一个定义在文件后面的函数，编译器在调用点就知道它的参数和返回类型",
        "让函数可以省略 `return`",
        "减少程序占用的内存",
      ],
      correct: 1,
    },
  },
  {
    id: "ch10-organizing-one-file-q3",
    chapterOrder: 10,
    lessonSlug: "organizing-one-file",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "单文件程序的惯例顺序是：包含头文件 → 定义（1）____ → 定义类型 → 写函数（2）____ → 写 `main` → 写各函数的实现。",
    hints: [
      "第一处是那些用 `#define` 写出来的常量，比如 `#define COUNT 3`。",
      "第二处是「函数定义的第一行加一个分号」，它没有函数体，只是预告。",
    ],
    referenceAnswer:
      "（1）宏（宏定义，例如 `#define COUNT 3`）；（2）函数原型（也叫函数声明，例如 `int sum_of(int a, int b);`）。前三段合起来是文件的目录，原型让下面的 `main` 能调用还没出现的函数，实现放在最后当细节。",
    xp: 8,
    validator: {
      blanks: [
        ["宏", "宏定义", "常量宏", "宏常量", "常量", "符号常量", "#define", "define"],
        ["原型", "函数原型", "原型声明", "函数声明", "声明", "函数原型声明", "函数的原型", "函数原型（声明）"],
      ],
    },
  },

  // ── 10.4 动手：把一个大程序整理干净 ─────────────────────────────
  {
    id: "ch10-lab-split-program-q1",
    chapterOrder: 10,
    lessonSlug: "lab-split-program",
    kind: "MCQ",
    difficulty: 2,
    prompt: "要把一个又长又乱、但结果正确的 `main` 整理干净，第一步应该做什么？",
    hints: [
      "先想清楚：这次整理要保证什么不变？",
      "改算法、换缩进、把变量改成全局——这三件事里哪些会改变程序的行为？",
    ],
    referenceAnswer:
      "先给已有逻辑起好名字、拆成函数、按惯例顺序摆好，并保持行为完全不变。重构的第一步是「起名字、排位置」，不是改逻辑。换成更快的算法是改行为；把局部变量都改成全局变量会让耦合变重，还可能被遮蔽；缩进是最后顺手做的事，和结构无关。",
    xp: 5,
    validator: {
      options: [
        "先把算法换成更快的写法，顺便整理格式",
        "先给已有逻辑起好名字、拆成函数、按惯例顺序摆好，保持行为完全不变",
        "先把 `main` 里的变量都改成全局变量，方便函数之间共享",
        "先把缩进从 4 空格改成 2 空格，让代码短一点",
      ],
      correct: 1,
    },
  },
  {
    id: "ch10-lab-split-program-q2",
    chapterOrder: 10,
    lessonSlug: "lab-split-program",
    kind: "MCQ",
    difficulty: 1,
    prompt: "整理代码时说的「重构」，指的是下面哪一件事？",
    hints: [
      "「重构」这个词的重点在两个词上：外部行为、内部结构。",
      "想一想：整理前后各跑一遍，输出应该一样还是应该不一样？",
    ],
    referenceAnswer:
      "在不改变程序外部行为的前提下，改善代码的内部结构。判断标准很硬：整理前后各跑一遍，输出必须逐字相同——只要有一个字符不同（比如平均分从 80 变成 80.67），那就不叫重构，而是改了程序行为。加功能、拆成多文件编译、把变量名改短，都不是重构的定义。",
    xp: 5,
    validator: {
      options: [
        "在不改变程序外部行为的前提下，改善代码的内部结构",
        "给程序加新功能",
        "把单文件程序拆成多个文件编译",
        "把所有变量名改短，让代码行数变少",
      ],
      correct: 0,
    },
  },
  {
    id: "ch10-lab-split-program-q3",
    chapterOrder: 10,
    lessonSlug: "lab-split-program",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `下面这个程序里 \`best\` 是全局变量，但它其实只被 \`main\` 用到。程序输出什么？

\`\`\`c
#include <stdio.h>

int best;

int pick(int a, int b)
{
    if (a > b) {
        return a;
    }
    return b;
}

int main(void)
{
    best = pick(12, 30);
    best = pick(best, 21);
    printf("best = %d\\n", best);
    return 0;
}
\`\`\`

（追问：把 \`best\` 改成 \`main\` 里的局部变量，输出会变吗？）`,
    hints: [
      "`pick` 返回两个参数里较大的那个，它自己不碰 `best`。",
      "第一次 `pick(12, 30)` 得到 30，第二次拿这个结果去和 21 比。",
    ],
    referenceAnswer:
      "输出 `best = 30`。第一次 `pick(12, 30)` 返回 30，`best` 变成 30；第二次 `pick(30, 21)` 返回 30，`best` 还是 30。追问的答案是：**不会变**。`best` 只在 `main` 里被写、也只在 `main` 里被读，所以它本来就该是 `main` 的局部变量——把它从全局改成局部是典型的整理动作，输出一个字都不会变（`pick` 是通过参数和返回值交换数据的，本来就不依赖全局变量）。",
    xp: 8,
    validator: { expected: "best = 30" },
  },
  {
    id: "ch10-lab-split-program-q4",
    chapterOrder: 10,
    lessonSlug: "lab-split-program",
    kind: "CODE",
    difficulty: 3,
    prompt: `按单文件程序的惯例顺序写一个「成绩报告」程序：三个分数是 70、85、100，输出总分、平均分、最高分。

输出格式固定为：

\`\`\`
total = 255
average = 85
best = 100
\`\`\`

要求：

1. 用 \`#define COUNT 3\` 表示分数个数，平均分用 \`(a + b + c) / COUNT\` 算（整数除法）；
2. 用 \`typedef int score_t;\` 给分数起一个类型名；
3. 求总分、求平均、求最高写成三个函数，**原型写在 \`main\` 之前**，实现写在 \`main\` 之后；
4. 不许用全局变量。`,
    starterCode: `#include <stdio.h>

#define COUNT 3

typedef int score_t;

/* 在这里写三个函数的原型 */

int main(void)
{
    score_t s1 = 70, s2 = 85, s3 = 100;

    /* 在这里用三个函数分别打印总分、平均分、最高分 */
    return 0;
}

/* 在这里写三个函数的实现 */
`,
    hints: [
      "三个函数的形状是一样的：三个 `score_t` 进去，一个 `int`（或 `score_t`）出来。原型就是把定义的第一行抄一遍再加个分号。",
      "求最高的函数里先假设 `a` 最大，再用两个 `if` 依次和 `b`、`c` 比。",
      "平均分那一行是整数除法：255 / 3 = 85。别写成 `3.0`，那会打出小数。",
    ],
    referenceAnswer:
      "顺序照惯例来：包含 → 宏（`COUNT`）→ 类型（`score_t`）→ 三个原型 → `main`（只有三行打印）→ 三个实现。平均分用 `(a + b + c) / COUNT`，是整数除法，255 / 3 正好是 85。三个函数都不依赖任何外部变量，所以这个文件里一个全局变量都不需要。",
    referenceCode: `#include <stdio.h>

#define COUNT 3

typedef int score_t;

int sum_of(score_t a, score_t b, score_t c);
int average_of(score_t a, score_t b, score_t c);
score_t max_of(score_t a, score_t b, score_t c);

int main(void)
{
    score_t s1 = 70, s2 = 85, s3 = 100;

    printf("total = %d\\n", sum_of(s1, s2, s3));
    printf("average = %d\\n", average_of(s1, s2, s3));
    printf("best = %d\\n", max_of(s1, s2, s3));
    return 0;
}

int sum_of(score_t a, score_t b, score_t c)
{
    return a + b + c;
}

int average_of(score_t a, score_t b, score_t c)
{
    return (a + b + c) / COUNT;
}

score_t max_of(score_t a, score_t b, score_t c)
{
    score_t best = a;

    if (b > best) {
        best = b;
    }
    if (c > best) {
        best = c;
    }
    return best;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["total = 255\naverage = 85\nbest = 100"] },
  },
  {
    id: "ch10-lab-split-program-q5",
    chapterOrder: 10,
    lessonSlug: "lab-split-program",
    kind: "CODE",
    difficulty: 3,
    prompt: `读入一个整数 n（1 到 9 之间），输出一个 n 行 n 列的星号正方形。

输入 \`3\`，期望输出：

\`\`\`
***
***
***
\`\`\`

要求把两件事分别写成函数，原型写在 \`main\` 之前：

1. \`print_row(n)\`：打印一行 n 个星号，末尾换行；
2. \`print_square(n)\`：调用 \`print_row\` 打印 n 行。

\`main\` 里只负责读入 n 和调用 \`print_square\`。`,
    starterCode: `#include <stdio.h>

/* 在这里写两个函数的原型 */

int main(void)
{
    int n;

    scanf("%d", &n);
    /* 在这里调用 print_square */
    return 0;
}

/* 在这里写两个函数的实现：print_row 打印一行星号，print_square 打印 n 行 */
`,
    stdin: "3",
    hints: [
      "`print_row` 里用一个循环打印 n 个 `*`，循环结束后再单独 `printf(\"\\\\n\")` 换行——换行只做一次，不能写在循环里。",
      "`print_square` 里也是循环 n 次，每次调用一次 `print_row(n)`。这样重复的打印逻辑只写了一遍。",
    ],
    referenceAnswer:
      "两个函数都只需要一个 `int` 参数、都不返回东西，所以返回类型是 `void`。`print_row` 用 `for (i = 0; i < n; i++) printf(\"*\");` 再补一个换行；`print_square` 用 `for (i = 0; i < n; i++) print_row(n);`。这个练习的重点不是循环，而是**把重复的动作抽成一个有名字的函数**，并且按惯例把原型放在 `main` 之前。",
    referenceCode: `#include <stdio.h>

void print_row(int n);
void print_square(int n);

int main(void)
{
    int n;

    scanf("%d", &n);
    print_square(n);
    return 0;
}

void print_row(int n)
{
    int i;

    for (i = 0; i < n; i++) {
        printf("*");
    }
    printf("\\n");
}

void print_square(int n)
{
    int i;

    for (i = 0; i < n; i++) {
        print_row(n);
    }
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["***\n***\n***"] },
  },
];

export const CHAPTER_10_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
