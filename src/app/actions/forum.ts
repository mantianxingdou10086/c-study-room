"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  collectFieldErrors,
  postSchema,
  replySchema,
  type ForumFormState,
} from "@/lib/validation/forum";

/** 发新帖：成功后跳到帖子详情页 */
export async function createPost(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "请先登录后再发帖" };

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    chapterSlug: formData.get("chapterSlug") ?? undefined,
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  const slug = parsed.data.chapterSlug?.trim();
  const post = await prisma.post.create({
    data: {
      authorId: session.user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      chapterSlug: slug && slug.length > 0 ? slug : null,
    },
    select: { id: true },
  });

  revalidatePath("/forum");
  // 直接进帖子详情，让发帖人看到自己的帖子已经在了
  redirect(`/forum/${post.id}`);
}

/** 回复：成功后回到原帖（锚点定位到这条回复） */
export async function createReply(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "请先登录后再回复" };

  const parsed = replySchema.safeParse({
    postId: formData.get("postId"),
    parentId: formData.get("parentId") ?? undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true },
  });
  if (!post) return { error: "帖子不存在" };

  const parentId = parsed.data.parentId?.trim();
  if (parentId) {
    // 只允许挂在本帖的回复下，避免跨帖串楼
    const parent = await prisma.reply.findUnique({
      where: { id: parentId },
      select: { postId: true },
    });
    if (!parent || parent.postId !== post.id) {
      return { error: "要回复的那条不在本帖里" };
    }
  }

  const reply = await prisma.reply.create({
    data: {
      postId: post.id,
      authorId: session.user.id,
      parentId: parentId && parentId.length > 0 ? parentId : null,
      body: parsed.data.body,
    },
    select: { id: true },
  });

  // 有新回复 → 更新排序时间，帖子才会浮到列表前面
  await prisma.post.update({
    where: { id: post.id },
    data: { lastReplyAt: new Date() },
  });

  revalidatePath("/forum");
  revalidatePath(`/forum/${post.id}`);
  redirect(`/forum/${post.id}#r-${reply.id}`);
}

/**
 * 采纳某条回复为答案。
 *
 * 权限：**只有楼主能采纳**（服务端判定，不看前端传什么）。
 * 采纳是问答论坛的闭环终点——没有它，好答案会被后来的楼层淹没。
 */
export async function acceptReply(
  replyId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "请先登录" };

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: { id: true, postId: true, post: { select: { authorId: true } } },
  });
  if (!reply) return { ok: false, error: "回复不存在" };
  if (reply.post.authorId !== session.user.id) {
    return { ok: false, error: "只有楼主能采纳答案" };
  }

  await prisma.$transaction([
    prisma.reply.update({ where: { id: replyId }, data: { isAccepted: true } }),
    prisma.post.update({
      where: { id: reply.postId },
      data: { solvedReplyId: replyId },
    }),
  ]);

  revalidatePath("/forum");
  revalidatePath(`/forum/${reply.postId}`);
  return { ok: true };
}
