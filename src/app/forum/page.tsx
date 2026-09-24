import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MessageSquare, PenLine, Plus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CHAPTERS } from "@/lib/content";
import { relativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PostForm } from "@/components/forum/post-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "讨论区",
  description: "按章节提问、贴代码、互相解答。被楼主采纳的回答会标记出来。",
};

/** 每页帖子数 */
const PAGE_SIZE = 20;

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; chapter?: string }>;
}) {
  const { page: pageParam, chapter } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const where = chapter ? { chapterSlug: chapter } : {};

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { lastReplyAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        chapterSlug: true,
        solvedReplyId: true,
        views: true,
        createdAt: true,
        lastReplyAt: true,
        author: { select: { username: true } },
        _count: { select: { replies: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chapterOf = (slug: string | null) =>
    slug ? CHAPTERS.find((c) => c.slug === slug) : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">讨论区</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            卡住的时候问出来 —— 把代码、报错、和你的猜测写全，答案会来得快得多。
            被楼主采纳的回答会标出来。
          </p>
        </div>
        <Badge tone="primary">共 {total} 个帖子</Badge>
      </header>

      {chapter && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          只看「{chapterOf(chapter)?.title ?? chapter}」的帖子
          <Link href="/forum" className="text-primary underline underline-offset-2">
            看全部
          </Link>
        </p>
      )}

      {/* 发帖区 */}
      <Card className="mt-6">
        <CardContent className="p-5">
          {userId ? (
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Plus className="h-4 w-4 text-primary" />
                发新帖
              </summary>
              <div className="mt-4">
                <PostForm />
              </div>
            </details>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <PenLine className="h-4 w-4 text-subtle-foreground" />
              <span className="text-muted-foreground">登录后可以发帖和回复。</span>
              <Link
                href="/login"
                className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                去登录
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 帖子列表 */}
      <div className="mt-4 space-y-2">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="mx-auto h-6 w-6 text-subtle-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {chapter ? "这一章还没有人提问。" : "还没有帖子。"}
                学到卡住的地方，就发第一个。
              </p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => {
            const ch = chapterOf(post.chapterSlug);
            return (
              <Link
                key={post.id}
                href={`/forum/${post.id}`}
                className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-muted"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 flex-1 font-medium tracking-tight">
                    {post.title}
                  </h2>
                  {post.solvedReplyId && (
                    <Badge tone="success">
                      <CheckCircle2 className="h-3 w-3" />
                      已解决
                    </Badge>
                  )}
                  {ch && <Badge>第 {ch.order} 章</Badge>}
                </div>
                <div
                  className={cn(
                    "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle-foreground",
                  )}
                >
                  <span>{post.author.username}</span>
                  <span>·</span>
                  <span>{relativeTime(post.lastReplyAt)}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {post._count.replies} 条回复
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* 翻页 */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/forum?page=${page - 1}${chapter ? `&chapter=${chapter}` : ""}`}
              className="text-primary underline underline-offset-2"
            >
              上一页
            </Link>
          ) : (
            <span />
          )}
          <span className="text-subtle-foreground tabular-nums">
            第 {page} / {totalPages} 页
          </span>
          {page < totalPages ? (
            <Link
              href={`/forum?page=${page + 1}${chapter ? `&chapter=${chapter}` : ""}`}
              className="text-primary underline underline-offset-2"
            >
              下一页
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
