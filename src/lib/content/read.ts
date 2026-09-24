import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Lesson } from "@/lib/content/schema";

/**
 * 读取讲义 MDX 源码（只在服务端跑）。
 *
 * ⚠️ 路径必须**静态地锚定在 content/ 子目录**：如果写成
 * `join(process.cwd(), relPath)` 这种完全动态的路径，Turbopack 会认为
 * 「可能访问项目里任何文件」，于是把整个项目（包括 public/toolchain 那 140MB）
 * 都打进服务端产物。实测构建警告见 docs/content-pipeline.md。
 */
const CONTENT_DIR = "content";

export function lessonFileName(lesson: Lesson): string {
  return `${String(lesson.order).padStart(2, "0")}-${lesson.slug}.mdx`;
}

export async function readLessonMdx(
  chapterSlug: string,
  fileName: string,
): Promise<string> {
  return readFile(join(process.cwd(), CONTENT_DIR, chapterSlug, fileName), "utf8");
}

export async function lessonMdxExists(
  chapterSlug: string,
  fileName: string,
): Promise<boolean> {
  try {
    await readLessonMdx(chapterSlug, fileName);
    return true;
  } catch {
    return false;
  }
}
