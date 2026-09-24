import Link from "next/link";
import { ArrowRight, BookOpen, Code2, MessagesSquare, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContinueLearningCard } from "@/components/learn/continue-card";
import { PARTS, contentStats, getFirstLesson, lessonHref } from "@/lib/content";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/utils";

/** 五阶段学习路径（与实施计划 §2.6 一致；数字来自书的结构，不是编造的统计数据） */
const STAGES = [
  { name: "C 入门", chapters: "第 1~3 章", detail: "环境、第一个程序、变量与类型、格式化输入输出" },
  { name: "基本构件", chapters: "第 4~7 章", detail: "表达式、选择语句、循环、基本类型" },
  { name: "组织数据与逻辑", chapters: "第 8~10 章", detail: "数组、函数、程序结构" },
  { name: "指针与抽象", chapters: "第 11~17 章", detail: "指针、字符串、预处理器、结构体、指针高级应用" },
  { name: "工程与标准库", chapters: "第 18~28 章", detail: "声明、程序设计、底层编程、标准库与附加特性" },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "课程按书的结构划分",
    body: "28 章、五个阶段，每节课 15~25 分钟：一句话结论 → 可运行示例 → 规则拆解 → 常见坑 → 随堂检测。",
  },
  {
    icon: Code2,
    title: "浏览器里直接跑 C",
    body: "不用装编译器，点一下就能编译运行。写错了会告诉你错在哪一行，而不是丢一段英文报错。",
  },
  {
    icon: Trophy,
    title: "进度与成就有存档",
    body: "登录后自动记录学到哪一节、做过哪些题，换电脑也在。经验值、连续打卡、徽章让你看得见自己在前进。",
  },
  {
    icon: MessagesSquare,
    title: "卡住了有人答",
    body: "论坛可以按章节提问，答得好会被楼主采纳；课时页底部一键带着上下文去提问。",
  },
];

/**
 * 首页「继续学习」卡片的静态兜底值（构建期算好，作 props 传给客户端组件）。
 *
 * 卡片必须是客户端组件 —— 进度的唯一来源是 `/api/progress`，
 * 在首页里 `await auth()` 会把静态页变成动态渲染。所以静态的部分在这里定型，
 * 用户自己的数据由卡片异步取回后补上。
 */
const STATS = contentStats();
const FIRST_LESSON = getFirstLesson();
const FIRST_CHAPTER_LABEL = `第 ${FIRST_LESSON.chapter.order} 章 · ${
  PARTS.find((p) => p.id === FIRST_LESSON.chapter.part)?.name ?? ""
}`;
const FIRST_LESSON_HREF = lessonHref(FIRST_LESSON.chapter, FIRST_LESSON.lesson);

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      {/* Hero */}
      <section className="grid gap-8 py-14 md:grid-cols-[1.4fr_1fr] md:items-center md:py-20">
        <div>
          <Badge tone="primary">零基础友好 · 正在建设中</Badge>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {SITE_NAME}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            {SITE_TAGLINE}。这里没有「三分钟精通」，只有一条走得完的路线、
            一个随时能跑的编译器，和一份不会丢的学习存档。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/learn">
                从第 1 章开始
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/playground">
                <Code2 className="h-4 w-4" />
                先跑一段 C 试试
              </Link>
            </Button>
          </div>
          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">课程规模</dt>
              <dd className="font-medium tabular-nums">28 章 · 5 阶段</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">单节时长</dt>
              <dd className="font-medium tabular-nums">15~25 分钟</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">运行方式</dt>
              <dd className="font-medium">浏览器内编译</dd>
            </div>
          </dl>
        </div>

        {/* 继续学习卡片：自己取 /api/progress，登录后不再出现登录/注册入口 */}
        <ContinueLearningCard
          totalLessons={STATS.lessonsReady}
          firstChapterLabel={FIRST_CHAPTER_LABEL}
          firstLessonHref={FIRST_LESSON_HREF}
        />
      </section>

      {/* 学习路径 */}
      <section aria-labelledby="path-heading" className="py-6">
        <h2 id="path-heading" className="text-xl font-semibold tracking-tight">
          五个阶段，一条路线
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          按 K.N.King 的教学顺序组织：先把语法用起来，再理解指针与内存，最后回到工程与标准库。
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((stage, i) => (
            <li key={stage.name}>
              <Card className="h-full">
                <CardContent className="p-5">
                  <span className="text-xs font-medium text-primary tabular-nums">
                    阶段 {i + 1}
                  </span>
                  <h3 className="mt-1.5 font-semibold tracking-tight">{stage.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{stage.chapters}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {stage.detail}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* 功能 */}
      <section aria-labelledby="feature-heading" className="py-12">
        <h2 id="feature-heading" className="text-xl font-semibold tracking-tight">
          这个站点会提供什么
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="flex gap-4 p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <f.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
