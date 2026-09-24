import { z } from "zod";

/**
 * 论坛的校验规则（前后端共用）。
 *
 * 长度限制不是形式主义：正文直接渲染在页面里，不设上限的话
 * 一条 10 万字的帖子能把列表页拖垮；标题过长会破坏布局。
 */
export const postSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, "标题至少 4 个字，说清是什么问题")
    .max(80, "标题最多 80 个字"),
  body: z
    .string()
    .trim()
    .min(8, "内容至少 8 个字——把问题说清楚，别人才答得上来")
    .max(8000, "内容最多 8000 字"),
  /** 可选：关联到某一章（课时页的"关于本节我有疑问"入口会带上） */
  chapterSlug: z.string().trim().max(60).optional(),
});

export const replySchema = z.object({
  postId: z.string().min(1),
  /** 一级楼中楼：指向父回复 */
  parentId: z.string().min(1).optional(),
  body: z
    .string()
    .trim()
    .min(2, "回复至少 2 个字")
    .max(4000, "回复最多 4000 字"),
});

export type ForumFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export const EMPTY_FORUM_STATE: ForumFormState = { error: null };

/** 把 zod 的 issues 压成「字段 → 第一条错误」，表单逐项显示 */
export function collectFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
