# 内容管道：讲义怎么写、怎么加一章、踩过哪些坑

> M3 的交付说明。看这份文档就能自己往仓库里加一章内容，不用问人。

---

## 1. 内容存在哪、为什么

**课程内容 100% 存在仓库里，是唯一事实来源；数据库只存用户的动态数据**（进度、提交、帖子、徽章授予）。

| | 位置 | 谁改 | 为什么 |
|---|---|---|---|
| 章节骨架 | `src/content/curriculum.ts` | 开发者 | 28 章元数据，改动极少 |
| 课时列表 | `src/content/lessons.ts` | 开发者 | 每章 4~6 节，含时长/XP/一句话结论 |
| 讲义正文 | `content/<chapter-slug>/<order>-<lesson-slug>.mdx` | 开发者 | 长文本，必须能进 git、能 diff、能 review |
| 题库 | `src/content/exercises/chNN.ts` | 开发者 | 结构化数据 + 可运行参考解，要被测试消费 |
| 交付进度 | `src/content/status.ts` | 开发者 | `CONTENT_READY_CHAPTERS` 一改，测试就知道该盯哪几章 |
| 学习进度 / 提交 / 帖子 | **PostgreSQL** | 用户行为产生 | 这些才是动态数据 |

**相对原计划的一处简化（已记录）：** 原计划要把 Chapter/Lesson/Exercise 也 seed 进数据库。实际做下来没必要——
内容反正只在仓库里改，进库只会多出一套"仓库 ↔ 数据库"的同步维护，还要处理 id 漂移。
现在 `Submission` 用**字符串 id**（如 `ch04-03-q2`）引用题目，不做外键，简单且够用。

---

## 2. ⚠️ 坑一：next-mdx-remote 会静默丢掉 JSX 表达式

**这是整个 M3 里最费时间的一个问题**，因为它的表现是"讲义里的代码块全空、目标列表不显示"，而不是报错。

同一段 MDX，两条编译路径的实测对照：

| 编译路径 | 传给组件的 props |
|---|---|
| `@mdx-js/mdx` 的 `evaluate` | `s=string \| n=number \| arr=Array(2) \| children=string` ✅ |
| `next-mdx-remote/rsc` 的 `compileMDX` | `s=string \| children=string` ❌ 表达式被吃掉 |

也就是说 `<Goals items={["a","b"]} />` 的 `items` 变成 `undefined`，
`<TryIt>{\`code\`}</TryIt>` 的 children 变成空 —— **不报错，只是内容消失**。

**结论：直接用 `@mdx-js/mdx`。** 少一层封装、行为可预测。回归测试在
`tests/unit/content/mdx-pipeline.test.tsx`（6 条，专门盯着表达式传递与代码高亮）。

---

## 3. ⚠️ 坑二：动态文件路径会让 Turbopack 打包整个项目

一开始 `readLessonMdx(relPath)` 写成了：

```ts
readFile(join(process.cwd(), relPath), "utf8")   // ❌ relPath 完全动态
```

构建时警告：

```
Warning: Dynamic filesystem access causes tracing of the whole project
Static analysis determined that this filesystem access causes the whole project to be traced
and included in the output. ... leads to all source files (including the public folder)
to be deployed as part of the server code.
```

我们的 `public/` 里有 **140 MB** 的工具链（`clang.pkg` + `clang.pkg.gz` + wasmer 运行时）。
一旦被算进服务端产物，部署体积和构建时间都会炸。

**正确写法**——把路径**静态锚定**到 `content/` 子目录：

```ts
const CONTENT_DIR = "content";
readFile(join(process.cwd(), CONTENT_DIR, chapterSlug, fileName), "utf8")  // ✅
```

---

## 4. 讲义怎么组织（统一的 5 段式）

每节课都按同一个骨架写，学生读到第三节就形成预期，认知负担最低：

1. `<Goals items={[...]} />` — 学完能做到什么（动词开头）
2. `<KeyPoint>` — **一句话结论**（与课时数据里的 `takeaway` 呼应）
3. 正文拆解 — 用 `##` 分节，配合 `<Callout>` / `<Pitfall>` / 表格
4. `<TryIt>` — 至少一个"点一下就能跑"的例子
5. `<Quiz id="..." />` ×2~4 — 随堂检测（题干、提示、判分都在题库数据里）
6. `<BookRef pages="..." />` — 只给原书 PDF 页码，不给原文

**可用组件（受控词汇表，都定义在 `src/components/learn/mdx-components.tsx`）：**

| 组件 | 用途 | 注意 |
|---|---|---|
| `<Goals items={string[]} />` | 学习目标 | 必须是数组表达式 |
| `<KeyPoint>` | 一句话结论 | 每节最多一个 |
| `<Callout type="tip\|info\|warn" title="...">` | 提示/补充/注意 | 三种语气别混用 |
| `<Pitfall title="...">` | 常见坑 | 全站统一用红色系，学生一眼认出 |
| `<TryIt stdin="...">{\`代码\`}</TryIt>` | 可运行示例 | 代码用模板字符串；`stdin` 决定是否显示输入框 |
| `<Quiz id="chNN-xx-qN" />` | 随堂检测 | id 必须在题库里存在，否则显示"题目不存在" |
| `<BookRef pages="22~27" note="..." />` | 延伸阅读 | 页码取自 `curriculum.ts` 的 `pdfFrom/pdfTo` |
| 标准 markdown | 表格、列表、粗体、行内代码 | 见下面的两条禁令 |

**两条硬性约定：**

1. **标题里不要写行内代码或强调**。目录（TOC）的锚点是从**源码文本**算出来的，
   而标题 id 是从**渲染后的文本**算出来的；标题里带 `` ` `` 或 `**` 会让两者不一致，锚点就跳错了。
   （`tests/unit/content/mdx-pipeline.test.tsx` 里有专门一条盯着锚点。）
2. **正文里所有含 `{`、`<`、`#` 的片段都要用反引号包起来**。MDX 会把 `{` 当表达式、把 `<stdio.h>` 当 JSX 标签——
   不包反引号会直接编译失败或内容消失。

---

## 5. 怎么加一章（操作清单）

假设要写第 4 章：

1. **课时列表**：在 `src/content/lessons.ts` 里补 `chapterOrder: 4` 的课时（每章 4~6 节，一节只讲一件事）。
2. **讲义正文**：建目录 `content/ch04-expressions/`，按 `01-<lesson-slug>.mdx`、`02-...` 命名。
   > 文件名必须与 `lessons.ts` 里的 `order` + `slug` 一致——`lessonFileName()` 就是这么拼的。
3. **题库**：新建 `src/content/exercises/ch04.ts`，导出 `CHAPTER_04_EXERCISES`，然后在 `exercises/index.ts` 里加进汇总数组。
   每章 12~18 题，四种题型都要有（`MCQ` 40% / `OUTPUT` 20% / `FILL` 20% / `CODE` 20%）。
4. **代码题必须有 `referenceCode`**：完整可编译的参考解。集成测试会用真 clang 编译运行它，
   断言 stdout 命中 `expectedStdoutAny`——**期望输出必须是跑出来的，不许手写猜**。
5. **推进度**：把 `src/content/status.ts` 里的 `CONTENT_READY_CHAPTERS` / `EXERCISES_READY_CHAPTERS` 改成 `4`。
   改完测试会自动开始检查第 4 章：缺 MDX 文件、题型不全、题目太少，都会失败。
6. **跑验证**：
   ```bash
   npx vitest run                 # 完整性 + MDX 管道 + 判分器 + 引擎契约
   npx vitest run tests/integration   # 真 clang 编译运行每道代码题的参考解
   npx playwright test tests/e2e/learn.spec.ts
   ```

---

## 6. 当前交付进度

`CONTENT_READY_CHAPTERS = 10`，`EXERCISES_READY_CHAPTERS = 10` —— **MVP 范围（第 1~10 章）全部交付**。

| 章 | 课时 | 讲义 | 题库 | 说明 |
|---|---|---|---|---|
| 1 C 语言概述 | 4 | ✅ 4/4 | ✅ 12 题 | **样板章**：5 段式、TryIt、4 种题型 |
| 2 C 语言基本概念 | 6 | ✅ 6/6 | ✅ 15 题 | 含一组「整数除法」对照实验（同一公式 int vs double） |
| 3 格式化输入/输出 | 5 | ✅ 5/5 | ✅ 15 题 | 宽度/精度、scanf 的真实行为、五个经典坑 |
| 4 表达式 | 5 | ✅ 5/5 | ✅ 15 题 | 整数除法、优先级、自增自减、隐式转换；动手课是「算校验位」 |
| 5 选择语句 | 5 | ✅ 5/5 | ✅ 15 题 | 真假、多路分支顺序、短路求值、switch 的穿透 |
| 6 循环 | 5 | ✅ 5/5 | ✅ 15 题 | 三种循环的选择、break/continue、嵌套与死循环排查 |
| 7 基本类型 | 5 | ✅ 5/5 | ✅ 15 题 | 取值范围、浮点误差、char 是整数、sizeof/强制转换、溢出 |
| 8 数组 | 4 | ✅ 4/4 | ✅ 15 题 | 下标与遍历、越界不报错、二维数组、统计与矩阵转置 |
| 9 函数 | 6 | ✅ 6/6 | ✅ 15 题 | 值传递的真相、return、数组作参数、作用域与递归入门 |
| 10 程序结构 | 4 | ✅ 4/4 | ✅ 15 题 | 局部/全局、块作用域与遮蔽、单文件惯例排序、动手重构 |
| 11~28 | — | ⬜ | ⬜ | 骨架已列，标记「即将上线」 |

合计 **49 节课 / 1150 分钟（约 19.2 小时）/ 590 XP** 全部写完：**49 节讲义 / 147 道题**，
覆盖「C 入门」（1~3 章）、「基本构件」（4~7 章）、「组织数据与逻辑」（8~10 章）三个阶段。

### 答案的机器验证（这一节很重要）

题库里有两类题的答案是**可以自动验证**的，测试会真的编译运行它们：

| 题型 | 怎么验证 | 数量 |
|---|---|---|
| `CODE` | 跑 `referenceCode`（完整参考解），断言 stdout 命中 `expectedStdoutAny` | 29 |
| `OUTPUT` | 从题干里抽出**唯一那个带 main 的 ```c 代码块**直接跑，断言 stdout 等于 `expected` | 30 |

合计 **59 道题（占全部 147 题的 40%）的答案由真编译器验证**——
「标准答案写错」这件事在构建期就会变成红灯，而不是让学生被误判。

后者依赖一条**题干约定**（已由完整性测试强制）：OUTPUT 题的题干必须恰好含一个可运行的 C 代码块。

命令：`npx vitest run tests/integration`（实测 **60 通过 / 1 跳过** = 59 道题 + 1 条"两类题都存在"）

> ⚠️ 这个测试**必须离线跑**。它用 `wasmer.packages.load(.cache/toolchain/clang.pkg 的字节)`，
> 而不是 `packages: ["clang/clang"]`——后者要先去 registry.wasmer.io 解析包名，国内网络直接
> `fetch failed`，整个文件会在 beforeAll 就挂掉，**所有用例全体 skip**，看起来像「没写测试」。
> 实测踩过一次，已改成读本地包（和线上自托管的是同一个包，验证结果一致）。

**已知可改进项（不阻塞）：**
- 题干里的代码块目前用等宽字体直接渲染，没有语法高亮。题干是 TS 字符串，要高亮得在服务端编译它——
  留到做题库页时一起处理（那时题干会统一走 MDX 管道）。
- 目录（右栏）没有滚动高亮（scroll spy）。纯前端小事。
- `MCQ` 与 `FILL` 的答案是人工写的，无法自动验证——所以这两类题**必须写清推理依据**（`referenceAnswer`），
  让读的人（和未来的我）能自己判断对错。**FILL 是精确匹配**（规范化后等于候选之一），
  所以候选表要写宽，同义说法都得列上——这是唯一的人工复核点。
- 讲义里引用的 `<Quiz id>` 与题库的对应关系现在有测试盯着了
  （`integrity.test.ts` 的「讲义与题库的交叉一致性」三条），加章节时不用再靠肉眼核对。
- **第 1~6 章的讲义比第 7~10 章短**：按「去掉代码块后的中文字数」量，第 1~6 章普遍在 390~700，
  第 7~10 章在 690~1350（全站中位 696）。不影响正确性，但如果你在意全站读起来节奏一致，
  这是一次单独的补写任务。
