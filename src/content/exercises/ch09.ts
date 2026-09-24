/**
 * 第 9 章题库（15 题）。
 *
 * 这一章的题围绕四件事出：
 *  1. 函数的定义与调用（把重复代码抽走，main 只剩「调用」）
 *  2. 值传递：C 永远传副本，改形参不影响调用方的变量
 *  3. return 的语义（一执行就结束）与非 void 函数忘写 return 的后果
 *  4. 数组传参传的是首元素地址（改到原件、长度要另外传）+ 递归的终止条件
 */
import { exerciseSchema, type Exercise } from "@/lib/content/schema";

const raw: Exercise[] = [
  // ── 9.1 为什么需要函数 ───────────────────────────────────────────
  {
    id: "ch09-define-and-call-q1",
    chapterOrder: 9,
    lessonSlug: "define-and-call",
    kind: "MCQ",
    difficulty: 1,
    prompt:
      "同一个「计算面积」的公式在一个程序里出现了三遍。下面哪种改法最符合「用函数控制复杂度」？",
    hints: [
      "函数的价值是：公式只写一遍，调用处只写一个名字。",
      "注意区分「让代码变短」和「让规则只有一个来源」——只有后者能让以后改动只改一处。",
    ],
    referenceAnswer:
      "把三处都换成一个函数调用，公式只写在函数体里。这样规则只有一个来源：以后公式改了只改一处，三处调用同时生效。改成全局变量只是让三处共享同一份数据，重复的代码还在，还引入了隐式耦合；压成一行、加注释都没有消除重复。",
    xp: 5,
    validator: {
      options: [
        "把三处都换成一个函数调用，公式只写在函数体里一次",
        "把公式里用到的变量改成全局变量，让三处共用",
        "把三处重复的代码压缩成一行写完，减少代码行数",
        "在三处各加一行注释，说明它们用的是同一个公式",
      ],
      correct: 0,
    },
  },
  {
    id: "ch09-define-and-call-q2",
    chapterOrder: 9,
    lessonSlug: "define-and-call",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `这个程序先定义了一个打印分隔线的函数，然后在 \`main\` 里调用了它两次。它输出什么？

\`\`\`c
#include <stdio.h>

void print_line(void)
{
    printf("----\\n");
}

int main(void)
{
    print_line();
    printf("hello\\n");
    print_line();
    return 0;
}
\`\`\``,
    hints: [
      "函数调用就是「把函数体里的代码在这里执行一遍」，执行完回到调用的下一行继续。",
      "两次调用打印的是同样的内容，中间夹着 `main` 里自己那句 `hello`。",
    ],
    referenceAnswer:
      "输出三行：`----`、`hello`、`----`。`print_line` 的返回类型是 `void`，它只负责打印、不交回值，所以两次调用各打一行分隔线；`hello` 是 `main` 里自己打的，位置在两次调用之间。",
    xp: 8,
    validator: { expected: "----\nhello\n----" },
  },

  // ── 9.2 参数传递：值传递的真相 ───────────────────────────────────
  {
    id: "ch09-pass-by-value-q1",
    chapterOrder: 9,
    lessonSlug: "pass-by-value",
    kind: "MCQ",
    difficulty: 2,
    prompt:
      "把交换两个变量的动作写成了函数 `void swap(int a, int b)`（函数体里用临时变量把 `a` 和 `b` 换过来）。在 `main` 里写 `int x = 1; int y = 2; swap(x, y);` 之后，`printf(\"%d %d\\n\", x, y)` 打印什么？",
    hints: [
      "想想函数里的 `a`、`b` 到底是什么：它们是 `x`、`y` 本身，还是它们的副本？",
      "函数里那次交换确实成功了——问题在于它交换的是谁。",
    ],
    referenceAnswer:
      "打印 `1 2`。C 的参数传递是值传递：`swap` 拿到的 `a`、`b` 是 `x`、`y` 的副本，函数里交换的是这两个副本，调用方的 `x`、`y` 一点没动。想让交换真的生效，必须让函数拿到变量的地址（第 11 章讲指针时再做）。",
    xp: 5,
    validator: {
      options: ["`1 2`", "`2 1`", "`1 1`", "`2 2`"],
      correct: 0,
    },
  },
  {
    id: "ch09-pass-by-value-q2",
    chapterOrder: 9,
    lessonSlug: "pass-by-value",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "C 语言的参数传递方式叫（1）____：调用函数时，实参的值被复制一份交给形参。所以在函数内部修改形参的值（2）____改变调用方变量的值（填「会」或「不会」）。",
    hints: [
      "「复制一份交给形参」这句话本身就在提示这个术语的名字——传的是什么？",
      "函数里操作的是副本，副本随函数结束一起消失。",
    ],
    referenceAnswer:
      "（1）值传递（也叫传值调用）；（2）不会。调用函数时，实参的值被复制一份交给形参，函数体里读写的都是这份副本；副本在函数结束时消失，调用方的变量不受任何影响。这也是 `swap(x, y)` 看起来「没生效」的原因。",
    xp: 8,
    validator: {
      blanks: [
        [
          "值传递",
          "传值",
          "按值传递",
          "传值调用",
          "值传递调用",
          "按值调用",
          "值调用",
          "值拷贝",
          "值传递方式", "传值方式", "按值传参", "值传参", "传参",
          "call by value",
        ],
        ["不会", "不会改变", "不影响", "不会影响", "不改变", "不会变", "不可能", "否", "no"],
      ],
    },
  },
  {
    id: "ch09-pass-by-value-q3",
    chapterOrder: 9,
    lessonSlug: "pass-by-value",
    kind: "OUTPUT",
    difficulty: 3,
    prompt: `函数在内部把形参加 1 并打印，回到 \`main\` 之后再打印原来那个变量。这个程序输出什么？

\`\`\`c
#include <stdio.h>

void add_one(int n)
{
    n = n + 1;
    printf("in %d\\n", n);
}

int main(void)
{
    int x = 10;

    add_one(x);
    printf("out %d\\n", x);
    return 0;
}
\`\`\``,
    hints: [
      "`add_one` 里的 `n` 是 `x` 的副本，`n = n + 1` 改的是副本。",
      "函数里打印的是副本的新值，`main` 里打印的是原件——两者的值不一定相同。",
    ],
    referenceAnswer:
      "输出两行：`in 11` 和 `out 10`。`add_one` 的形参 `n` 是 `x` 的副本，函数里把副本加到 11 并打印出来，所以第一行是 `in 11`；函数结束副本消失，`main` 里的 `x` 还是原来的 10，所以第二行是 `out 10`。看到「函数里改了、外面没变」就是值传递的直接证据。",
    xp: 8,
    validator: { expected: "in 11\nout 10" },
  },

  // ── 9.3 返回值与 return ─────────────────────────────────────────
  {
    id: "ch09-return-and-void-q1",
    chapterOrder: 9,
    lessonSlug: "return-and-void",
    kind: "MCQ",
    difficulty: 2,
    prompt: "一个函数执行到 `return` 语句之后，函数体里剩下的语句会怎样？",
    hints: [
      "`return` 不只是「交回一个值」，它还是函数的一个出口。",
      "回想第 6 章循环里的 `break`：它跳出的只是循环，而 `return` 跳出的范围更大。",
    ],
    referenceAnswer:
      "立刻结束这个函数，剩下的语句不再执行。`return` 执行时会做两件事：把值交给调用方、结束当前函数。所以它常被用来「提前退出」——先处理特殊情况，处理完直接返回，把主流程留在函数末尾。这和循环里的 `break` 很像，区别是 `return` 结束的是整个函数。",
    xp: 5,
    validator: {
      options: [
        "继续执行完函数体里剩下的语句，最后再返回",
        "立刻结束这个函数，剩下的语句不再执行",
        "只跳过 `return` 后面紧挨着的那一条语句",
        "编译报错，因为 `return` 必须是函数体的最后一条语句",
      ],
      correct: 1,
    },
  },
  {
    id: "ch09-return-and-void-q2",
    chapterOrder: 9,
    lessonSlug: "return-and-void",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "一个声明为 `int f(void)` 的函数，如果有一条执行路径没有走到 `return`，调用方拿到的返回值是（____）。",
    hints: [
      "C 标准对这种「走到末尾却没返回」的情况不作任何保证。",
      "实际运行时，返回值通常落在存返回值的那个地方，里面留着上一次运算的残留内容。",
    ],
    referenceAnswer:
      "垃圾值（不确定的值、随机值）。C 标准对「非 void 函数没写 return 就走到末尾」这件事不作保证：实际运行时返回值通常来自存返回值的那个位置，里面是上一次运算留下的内容，所以是个荒唐的数，甚至每次运行都不同。判据：调用方拿到的结果莫名其妙，而函数里算得没错——就去检查那条没写 `return` 的路径。",
    xp: 5,
    validator: {
      blanks: [
        [
          "垃圾值",
          "垃圾数据",
          "垃圾",
          "不确定的值",
          "不确定值",
          "未定义的值",
          "不确定的垃圾值",
          "随机值",
          "随机的值",
          "无法预料的值", "不可预料的值", "无意义的值", "没有意义的值",
          "垃圾数据", "未定义",
          "不确定",
        ],
      ],
    },
  },

  // ── 9.4 数组作为参数 ─────────────────────────────────────────────
  {
    id: "ch09-arrays-as-arguments-q1",
    chapterOrder: 9,
    lessonSlug: "arrays-as-arguments",
    kind: "MCQ",
    difficulty: 2,
    prompt:
      "函数写成 `void f(int a[], int n)`，在函数体里执行 `a[0] = 99;`。调用方传进来的那个数组会怎样？",
    hints: [
      "数组传参时，复制过去的东西不是整个数组，而是「数组从哪儿开始」这个信息。",
      "想想 `a[i]` 和调用方数组的 `a[i]` 是不是同一块内存。",
    ],
    referenceAnswer:
      "调用方数组的第一个元素会变成 99。数组传参传的是首元素的地址，函数里的 `a[i]` 和调用方的 `a[i]` 指向同一块内存，所以函数里改元素就是改原件。注意这只是数组的特例：普通的 `int` 参数仍然是值传递，改形参影响不了调用方。",
    xp: 5,
    validator: {
      options: [
        "不受影响——数组传参也是值传递，函数拿到的是整个数组的副本",
        "`a[0]` 变成 99——传进去的是首元素地址，函数改的就是原数组",
        "数组会被自动复制一份，函数结束后再写回原数组",
        "编译错误：数组不能直接作为函数参数",
      ],
      correct: 1,
    },
  },
  {
    id: "ch09-arrays-as-arguments-q2",
    chapterOrder: 9,
    lessonSlug: "arrays-as-arguments",
    kind: "CODE",
    difficulty: 2,
    prompt: `写一个函数 \`void add_all(int a[], int n, int k)\`，把数组里每个元素都加上 \`k\`。在 \`main\` 里定义 \`int a[4] = {1, 2, 3, 4};\`，调用 \`add_all(a, 4, 10)\`，然后把数组的每个元素**各打印一行**。

期望输出：

\`\`\`
11
12
13
14
\`\`\``,
    starterCode: `#include <stdio.h>

void add_all(int a[], int n, int k)
{
    /* 用循环把 a[0] 到 a[n-1] 的每个元素都加上 k */
}

int main(void)
{
    int a[4] = {1, 2, 3, 4};
    int i;

    add_all(a, 4, 10);
    /* 把数组的每个元素各打印一行 */
    return 0;
}
`,
    hints: [
      "形参要写成 `int a[], int n` 两样：`a` 是首元素地址，`n` 是长度——函数里算不出长度，只能传进来。",
      "函数体里写 `for (i = 0; i < n; i++) { a[i] = a[i] + k; }`，这里的 `a[i]` 就是调用方数组的元素，改完不需要 return。",
    ],
    referenceAnswer:
      "函数体里用一个循环：`for (i = 0; i < n; i++) { a[i] = a[i] + k; }`。因为数组参数传的是首元素地址，改 `a[i]` 就是改调用方的元素，所以这个函数不需要返回值（返回类型是 `void`）；`main` 里改完之后直接读原数组就是新值 11、12、13、14。",
    referenceCode: `#include <stdio.h>

void add_all(int a[], int n, int k)
{
    int i;

    for (i = 0; i < n; i++) {
        a[i] = a[i] + k;
    }
}

int main(void)
{
    int a[4] = {1, 2, 3, 4};
    int i;

    add_all(a, 4, 10);
    for (i = 0; i < 4; i++) {
        printf("%d\\n", a[i]);
    }
    return 0;
}
`,
    xp: 10,
    validator: { expectedStdoutAny: ["11\n12\n13\n14"] },
  },

  // ── 9.5 作用域与递归入门 ─────────────────────────────────────────
  {
    id: "ch09-scope-and-recursion-q1",
    chapterOrder: 9,
    lessonSlug: "scope-and-recursion",
    kind: "MCQ",
    difficulty: 3,
    prompt: "递归函数里的「终止条件」（也叫基准情形）是干什么用的？",
    hints: [
      "递归由两件事组成：自己调用自己，和一件「不用再调用自己」的情况。",
      "想想如果每次调用都还要再调一次自己，内存里会发生什么。",
    ],
    referenceAnswer:
      "终止条件负责让递归停下来：满足它时直接返回一个确定的值，不再调用自己。递归函数必须同时具备两件事——「自己调用自己」和「一个能停下来的条件」。只有前者就是无限递归，每调用一层都要占一块栈空间，很快把栈用光，程序崩溃（栈溢出）。它跟「跑得更快」没关系，也不是用来声明返回类型的。",
    xp: 8,
    validator: {
      options: [
        "让函数运行得更快，少调用几次自己",
        "在某种情况下直接返回、不再调用自己——没有它递归就停不下来",
        "声明这个函数要交回什么类型的值",
        "防止形参被函数体修改",
      ],
      correct: 1,
    },
  },
  {
    id: "ch09-scope-and-recursion-q2",
    chapterOrder: 9,
    lessonSlug: "scope-and-recursion",
    kind: "FILL",
    difficulty: 2,
    prompt:
      "递归函数如果没有终止条件，就会不停地调用自己；每调用一层都要占用一块内存，最终把（____）用完，程序崩溃——这种情况叫栈溢出。",
    hints: [
      "每调用一次函数，都要在内存里为这一层留一块地方（放参数、局部变量和返回地址）。",
      "这些一块叠一块的内存区域，名字和「先进后出的那摞盘子」是同一个词。",
    ],
    referenceAnswer:
      "栈（调用栈、栈空间）。每次函数调用都要在栈上分配一块空间（栈帧）来放参数、局部变量和返回地址；递归没有终止条件时，这些栈帧一层层压进去、永远不弹出，栈空间被耗尽就崩溃。判据：程序启动后几秒内直接退出、一行输出都没有，先怀疑递归的终止条件写错了。",
    xp: 8,
    validator: {
      blanks: [
        ["栈", "栈空间", "调用栈", "函数调用栈", "栈内存", "栈区", "系统栈", "stack"],
      ],
    },
  },
  {
    id: "ch09-scope-and-recursion-q3",
    chapterOrder: 9,
    lessonSlug: "scope-and-recursion",
    kind: "CODE",
    difficulty: 3,
    prompt: `用**递归**写一个函数 \`int fact(int n)\`，交回 n 的阶乘（\`fact(5)\` 是 5 × 4 × 3 × 2 × 1）。读入一个整数 n（保证在 1 到 10 之间），打印它的阶乘。

输入 \`5\`，期望输出：

\`\`\`
120
\`\`\``,
    starterCode: `#include <stdio.h>

int fact(int n)
{
    /* 终止条件：n 小于等于 1 时直接交回 1；否则交回 n 乘上 fact(n - 1) */
}

int main(void)
{
    int n;

    scanf("%d", &n);
    /* 打印 n 的阶乘 */
    return 0;
}
`,
    stdin: "5",
    hints: [
      "递归函数必须先写出「不用再调用自己」的那种情况：`n <= 1` 时直接 `return 1;`。",
      "剩下的情况写 `return n * fact(n - 1);`——把「n 的阶乘」拆成「n 乘上 n-1 的阶乘」，参数每次都在变小，才能走到终止条件。",
    ],
    referenceAnswer:
      "函数体两段：`if (n <= 1) { return 1; }` 和 `return n * fact(n - 1);`。终止条件是整个递归的出口：`fact(5)` 一层层展开成 5 × 4 × 3 × 2 × 1，最底层的 `fact(1)` 命中终止条件交回 1，各层再把乘积依次交回上去，结果是 120。10 的阶乘是 3628800，`int` 装得下。",
    referenceCode: `#include <stdio.h>

int fact(int n)
{
    if (n <= 1) {
        return 1;
    }
    return n * fact(n - 1);
}

int main(void)
{
    int n;

    scanf("%d", &n);
    printf("%d\\n", fact(n));
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["120"] },
  },

  // ── 9.6 动手：写一个自己的小工具库 ───────────────────────────────
  {
    id: "ch09-lab-toolbox-q1",
    chapterOrder: 9,
    lessonSlug: "lab-toolbox",
    kind: "MCQ",
    difficulty: 2,
    prompt: "把重复出现的代码抽成函数之后，`main` 函数应该变成什么样？",
    hints: [
      "`main` 的角色更像一张「目录」：它说明这个程序一共做了哪几件事。",
      "判断抽得好不好，看的不是代码总行数，而是 `main` 能不能一眼读完。",
    ],
    referenceAnswer:
      "`main` 应该只剩变量声明、输入输出和若干次函数调用，短到一眼能读完——它说明「做了哪几件事」，每件事的细节都收在各自的函数里。如果 `main` 和以前一样长，说明只是把代码挪了个位置、没有真正把细节藏起来。抽函数不会让程序变长，也不该取消 `main`：程序仍然从 `main` 开始执行。",
    xp: 5,
    validator: {
      options: [
        "只剩变量声明、输入输出和几次函数调用，一眼能读完",
        "和以前一样长——抽函数只是把代码换了个位置",
        "更长了，因为函数定义都要写在 `main` 里面",
        "不需要 `main` 了，改成直接调用那些函数",
      ],
      correct: 0,
    },
  },
  {
    id: "ch09-lab-toolbox-q2",
    chapterOrder: 9,
    lessonSlug: "lab-toolbox",
    kind: "OUTPUT",
    difficulty: 2,
    prompt: `这个小工具库里有两个函数，一个算平方、一个算立方。程序输出什么？

\`\`\`c
#include <stdio.h>

int square(int n)
{
    return n * n;
}

int cube(int n)
{
    return n * n * n;
}

int main(void)
{
    printf("%d %d\\n", square(4), cube(3));
    return 0;
}
\`\`\``,
    hints: [
      "`square(4)` 是 4 × 4，`cube(3)` 是 3 × 3 × 3。",
      "两个函数调用写在同一个 `printf` 里，按顺序各算出一个值，依次填进格式串。",
    ],
    referenceAnswer:
      "输出 `16 27`。`square(4)` 交回 16，`cube(3)` 交回 27，两个结果按位置依次填进 `%d %d`。注意函数名和参数已经说明了意图：`square(4)` 比 `4 * 4` 更好读，`cube(3)` 比 `3 * 3 * 3` 更不容易写错。",
    xp: 8,
    validator: { expected: "16 27" },
  },
  {
    id: "ch09-lab-toolbox-q3",
    chapterOrder: 9,
    lessonSlug: "lab-toolbox",
    kind: "CODE",
    difficulty: 3,
    prompt: `写一个小工具库，把两件事各做成一个函数，\`main\` 里只做「读入 → 调用 → 打印」：

- \`int digit_sum(int n)\`：交回 n 的各位数字之和（\`17\` 就是 \`1 + 7\`）。
- \`int is_prime(int n)\`：n 是素数交回 1，否则交回 0。

读入一个整数 n，先打印各位数字之和，再打印一行：是素数输出 \`prime\`，否则输出 \`composite\`。

输入 \`17\`，期望输出：

\`\`\`
8
prime
\`\`\``,
    starterCode: `#include <stdio.h>

int digit_sum(int n);
int is_prime(int n);

int main(void)
{
    int n;

    scanf("%d", &n);
    /* 先打印各位数字之和，再打印 prime 或 composite */
    return 0;
}

int digit_sum(int n)
{
    /* 用 % 10 取末位、/ 10 扔掉末位，把每一位加起来 */
}

int is_prime(int n)
{
    /* 从 2 试到根号 n；别忘了 n 小于 2 时直接交回 0 */
}
`,
    stdin: "17",
    hints: [
      "`digit_sum` 用一个 `while (n > 0)` 循环：`s = s + n % 10;` 之后 `n = n / 10;`，累加变量要先赋初值 0。",
      "`is_prime` 开头写 `if (n < 2) { return 0; }`，然后 `for (i = 2; i * i <= n; i++)`，只要 `n % i == 0` 就 `return 0`，循环走完才 `return 1`。",
      "`main` 里只有三件事：`scanf` 读入、`printf` 打印 `digit_sum(n)`、用 `if (is_prime(n))` 决定打印 `prime` 还是 `composite`。",
    ],
    referenceAnswer:
      "两个函数各自独立：`digit_sum` 用 `n % 10` 取末位、`n / 10` 扔掉末位循环累加（形参是副本，把 `n` 除到 0 不影响 `main`）；`is_prime` 先挡掉 `n < 2` 的情况（否则 1 会被误判成素数），再从 2 试到根号 n，找到约数就返回 0。`main` 里不出现 `%` 和 `while`——所有「怎么算」的细节都在函数里。输入 17 时，各位数字之和是 8，17 是素数，所以输出 `8` 和 `prime`。",
    referenceCode: `#include <stdio.h>

int digit_sum(int n)
{
    int s = 0;

    while (n > 0) {
        s = s + n % 10;
        n = n / 10;
    }
    return s;
}

int is_prime(int n)
{
    int i;

    if (n < 2) {
        return 0;
    }
    for (i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            return 0;
        }
    }
    return 1;
}

int main(void)
{
    int n;

    scanf("%d", &n);
    printf("%d\\n", digit_sum(n));
    if (is_prime(n)) {
        printf("prime\\n");
    } else {
        printf("composite\\n");
    }
    return 0;
}
`,
    xp: 12,
    validator: { expectedStdoutAny: ["8\nprime"] },
  },
];

export const CHAPTER_09_EXERCISES: Exercise[] = raw.map((e) =>
  exerciseSchema.parse(e),
);
