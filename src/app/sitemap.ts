import type { MetadataRoute } from "next";
import { allLessonRoutes, CHAPTERS } from "@/lib/content";
import { EXERCISES } from "@/content/exercises";
import { siteUrl } from "@/lib/site-url";

/**
 * 站点地图。
 *
 * 为什么不收录题库详情页（/exercises/[id]）：
 * 那一页**未登录时只渲染登录引导**，题干和选项都不在匿名 HTML 里
 * （判题在服务端、答案不下发，这是刻意的）。搜索引擎抓到的就是一句"请登录"，
 * 属于薄内容，收录反而拉低整站质量。题库列表页收录就够了。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  const top: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/exercises`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/playground`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const lessons: MetadataRoute.Sitemap = allLessonRoutes().map(({ chapter, lesson }) => ({
    url: `${base}/learn/${chapter}/${lesson}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // 课程地图上的章节锚点，方便直接搜到某一章
  const chapters: MetadataRoute.Sitemap = CHAPTERS.filter((c) => c.available).map((c) => ({
    url: `${base}/learn#part-${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.3,
  }));

  void EXERCISES; // 见上方注释：题库详情页刻意不收录

  return [...top, ...lessons, ...chapters];
}
