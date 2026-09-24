import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHAPTERS, CHAPTER_BY_ORDER } from "@/content/curriculum";
import { LESSONS, lessonsOfChapter } from "@/content/lessons";
import { EXERCISES, EXERCISE_BY_ID } from "@/content/exercises";
import { CONTENT_READY_CHAPTERS, EXERCISES_READY_CHAPTERS } from "@/content/status";
import { lessonMdxPath, type McqValidator } from "@/lib/content/schema";

const ROOT = process.cwd();
const mdxExists = (p: string) => existsSync(join(ROOT, p));

/**
 * 内容完整性测试。
 * 目的：把"手写数据里的低级错误"变成构建期就能发现的问题，
 * 而不是等用户点开某一节课看到 500。
 */
describe("课程骨架完整性", () => {
  it("28 章齐全、序号连续、slug 唯一", () => {
    expect(CHAPTERS).toHaveLength(28);
    const orders = CHAPTERS.map((c) => c.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    expect(new Set(CHAPTERS.map((c) => c.slug)).size).toBe(28);
  });

  it("每章的 PDF 页码区间合法（from < to）", () => {
    for (const c of CHAPTERS) {
      expect(c.pdfFrom, `${c.slug} 的 pdfFrom 应小于 pdfTo`).toBeLessThan(c.pdfTo);
    }
  });

  it("前 10 章（MVP 范围）标记为 available，11~28 章未上线", () => {
    for (const c of CHAPTERS) {
      expect(c.available, `${c.slug} 的 available 标记`).toBe(c.order <= 10);
    }
  });

  it("每个 available 的章节都有课时，且课时序号从 1 连续", () => {
    for (const c of CHAPTERS.filter((x) => x.available)) {
      const ls = lessonsOfChapter(c.order);
      expect(ls.length, `${c.slug} 应有课时`).toBeGreaterThanOrEqual(3);
      expect(ls.map((l) => l.order)).toEqual(ls.map((_, i) => i + 1));
    }
  });

  it("课时 slug 在本章内唯一", () => {
    for (const c of CHAPTERS) {
      const ls = lessonsOfChapter(c.order);
      expect(new Set(ls.map((l) => l.slug)).size, `${c.slug} 的课时 slug 有重复`).toBe(
        ls.length,
      );
    }
  });

  it(`前 ${CONTENT_READY_CHAPTERS} 章的每个课时都有对应的 MDX 讲义文件`, () => {
    const missing: string[] = [];
    for (const c of CHAPTERS.filter((x) => x.order <= CONTENT_READY_CHAPTERS)) {
      for (const l of lessonsOfChapter(c.order)) {
        const p = lessonMdxPath(c.slug, l);
        if (!mdxExists(p)) missing.push(`${c.slug}/${l.slug} → 缺 ${p}`);
      }
    }
    expect(missing, `缺少讲义文件：\n${missing.join("\n")}`).toEqual([]);
  });

  it("磁盘上没有孤儿 MDX（每个 MDX 都能对应到声明的课时）", () => {
    const declared = new Set(
      CHAPTERS.flatMap((c) => lessonsOfChapter(c.order).map((l) => lessonMdxPath(c.slug, l))),
    );
    // 只检查前 10 章目录（后续章节的目录还没建）
    const orphans: string[] = [];
    for (const c of CHAPTERS) {
      const dir = join(ROOT, "content", c.slug);
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".mdx")) continue;
        const p = `content/${c.slug}/${f}`;
        if (!declared.has(p)) orphans.push(p);
      }
    }
    expect(orphans, `孤儿讲义文件（没有对应的课时声明）：\n${orphans.join("\n")}`).toEqual([]);
  });
});

describe("题库完整性", () => {
  it("题目 id 全局唯一", () => {
    expect(EXERCISE_BY_ID.size).toBe(EXERCISES.length);
  });

  it("每道题都指向存在的章节与课时", () => {
    for (const e of EXERCISES) {
      const ch = CHAPTER_BY_ORDER.get(e.chapterOrder);
      expect(ch, `${e.id} 的 chapterOrder=${e.chapterOrder} 不存在`).toBeDefined();
      if (e.lessonSlug) {
        const ok = LESSONS.some(
          (l) => l.chapterOrder === e.chapterOrder && l.slug === e.lessonSlug,
        );
        expect(ok, `${e.id} 指向的课时 ${e.lessonSlug} 不存在`).toBe(true);
      }
    }
  });

  it("选择题的正确项下标在选项范围内", () => {
    for (const e of EXERCISES.filter((x) => x.kind === "MCQ")) {
      const v = e.validator as McqValidator;
      expect(v.correct, `${e.id} 的 correct 越界`).toBeLessThan(v.options.length);
      expect(v.correct).toBeGreaterThanOrEqual(0);
      expect(new Set(v.options).size, `${e.id} 有重复选项`).toBe(v.options.length);
    }
  });

  it("每题都有提示，且代码题都有可运行的参考答案", () => {
    for (const e of EXERCISES) {
      expect(e.hints.length, `${e.id} 缺少提示`).toBeGreaterThanOrEqual(1);
      if (e.kind === "CODE") {
        expect(e.referenceCode, `${e.id} 缺少 referenceCode`).toBeTruthy();
        expect(e.starterCode, `${e.id} 缺少 starterCode`).toBeTruthy();
      }
    }
  });

  it("OUTPUT 题的题干必须恰好含一个可运行的 C 代码块（这样答案才能被真编译器验证）", () => {
    const bad: string[] = [];
    for (const e of EXERCISES.filter((x) => x.kind === "OUTPUT")) {
      const blocks = [...e.prompt.matchAll(/```c\n([\s\S]*?)```/g)].map((m) => m[1]);
      const runnable = blocks.filter((b) => /int\s+main\s*\(/.test(b));
      if (runnable.length !== 1) {
        bad.push(`${e.id}: 找到 ${runnable.length} 个可运行代码块（应为 1）`);
      }
    }
    expect(bad, `这些 OUTPUT 题的题干不符合约定：\n${bad.join("\n")}`).toEqual([]);
  });

  it(`前 ${EXERCISES_READY_CHAPTERS} 章每章至少 10 题，且四种题型都有`, () => {
    for (const c of CHAPTERS.filter((x) => x.order <= EXERCISES_READY_CHAPTERS)) {
      const es = EXERCISES.filter((e) => e.chapterOrder === c.order);
      expect(es.length, `${c.slug} 题目太少`).toBeGreaterThanOrEqual(10);
      const kinds = new Set(es.map((e) => e.kind));
      for (const k of ["MCQ", "FILL", "OUTPUT", "CODE"]) {
        expect(kinds.has(k as never), `${c.slug} 缺少 ${k} 题型`).toBe(true);
      }
    }
  });
});

/**
 * 讲义 ↔ 题库的交叉一致性。
 *
 * 这一条守的是一个**只有打开页面才会发现的错**：讲义里写 `<Quiz id="ch04-arithmetic-q9" />`，
 * 而题库里没有这个 id（写错了、改名了、删题忘改讲义）——页面上只会显示「题目不存在」，
 * 构建、类型检查、其它测试全都不报错。所以必须有一条断言盯着。
 */
describe("讲义与题库的交叉一致性", () => {
  const quizIdsInMdx = (mdx: string): string[] =>
    [...mdx.matchAll(/<Quiz\s+id="([^"]+)"\s*\/>/g)].map((m) => m[1]);

  it(`前 ${CONTENT_READY_CHAPTERS} 章的讲义里，每个 <Quiz id> 都能在题库里找到`, () => {
    const bad: string[] = [];
    for (const c of CHAPTERS.filter((x) => x.order <= CONTENT_READY_CHAPTERS)) {
      for (const l of lessonsOfChapter(c.order)) {
        const p = lessonMdxPath(c.slug, l);
        if (!mdxExists(p)) continue;
        const mdx = readFileSync(join(ROOT, p), "utf8");
        for (const id of quizIdsInMdx(mdx)) {
          if (!EXERCISE_BY_ID.has(id)) bad.push(`${p} → 引用了不存在的题目 ${id}`);
        }
      }
    }
    expect(bad, `讲义引用了题库里没有的题目：\n${bad.join("\n")}`).toEqual([]);
  });

  it(`前 ${CONTENT_READY_CHAPTERS} 章的每节讲义都至少有 1 道随堂检测`, () => {
    const empty: string[] = [];
    for (const c of CHAPTERS.filter((x) => x.order <= CONTENT_READY_CHAPTERS)) {
      for (const l of lessonsOfChapter(c.order)) {
        const p = lessonMdxPath(c.slug, l);
        if (!mdxExists(p)) continue;
        if (quizIdsInMdx(readFileSync(join(ROOT, p), "utf8")).length === 0) {
          empty.push(p);
        }
      }
    }
    expect(empty, `这些讲义没有随堂检测：\n${empty.join("\n")}`).toEqual([]);
  });

  it("每道题的 lessonSlug（若填了）在本章讲义里真的被引用过", () => {
    const bad: string[] = [];
    for (const e of EXERCISES.filter((x) => x.chapterOrder <= CONTENT_READY_CHAPTERS)) {
      const c = CHAPTER_BY_ORDER.get(e.chapterOrder)!;
      const l = lessonsOfChapter(c.order).find((x) => x.slug === e.lessonSlug);
      if (!l) continue; // 没填 lessonSlug 或指向整章练习，前面已有断言管
      const p = lessonMdxPath(c.slug, l);
      if (!mdxExists(p)) continue;
      const ids = quizIdsInMdx(readFileSync(join(ROOT, p), "utf8"));
      // 允许「题库里的题多于讲义里挂的」——讲义每节只挂 2~3 道随堂题是刻意的
      if (ids.length > 0 && !ids.some((id) => id.startsWith(`ch${String(c.order).padStart(2, "0")}-${l.slug}-q`))) {
        bad.push(`${e.id} 属于课时 ${l.slug}，但那一节的讲义没引用该课时的任何题目`);
      }
    }
    expect(bad, `课时与题目对不上：\n${bad.join("\n")}`).toEqual([]);
  });
});
