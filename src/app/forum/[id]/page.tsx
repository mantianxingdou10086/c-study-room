import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CHAPTERS } from "@/lib/content";
import { formatDateTime, relativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReplyForm } from "@/components/forum/reply-form";
import { AcceptReplyButton } from "@/components/forum/accept-reply-button";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: post ? post.title : "帖子" };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      chapterSlug: true,
      lessonSlug: true,
      solvedReplyId: true,
      createdAt: true,
      authorId: true,
      author: { select: { username: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          parentId: true,
          isAccepted: true,
          createdAt: true,
          authorId: true,
          author: { select: { username: true } },
        },
      },
    },
  });
  if (!post) notFound();

  // 类型收窄进不了下面 ReplyCard 的闭包（函数声明会被提升），所以先固定成非空局部变量
  const postData = post;
  const postId = postData.id;
  const solvedReplyId = postData.solvedReplyId;

  const isOwner = userId === post.authorId;
  const chapter = post.chapterSlug
    ? CHAPTERS.find((c) => c.slug === post.chapterSlug)
    : undefined;

  // 一层楼中楼：顶层回复 + 挂在它下面的子回复
  const topLevel = post.replies.filter((r) => !r.parentId);
  const childrenOf = (replyId: string) =>
    post.replies.filter((r) => r.parentId === replyId);

  function ReplyCard({
    reply,
    nested = false,
  }: {
    reply: (typeof postData.replies)[number];
    nested?: boolean;
  }) {
    const accepted = reply.isAccepted || solvedReplyId === reply.id;
    return (
      <div
        id={`r-${reply.id}`}
        className={cn(
          "rounded-xl border p-4",
          accepted ? "border-success/40 bg-success-soft" : "border-border bg-surface",
          nested && "ml-4 sm:ml-8",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-subtle-foreground">
          <span className="font-medium text-foreground">{reply.author.username}</span>
          <span>·</span>
          <span title={formatDateTime(reply.createdAt)}>
            {relativeTime(reply.createdAt)}
          </span>
          {accepted && (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" />
              已采纳
            </Badge>
          )}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{reply.body}</p>

        {userId ? (
          <>
            <ReplyForm postId={postId} parentId={reply.id} variant="inline" />
            {isOwner && !accepted && (
              <div className="mt-2">
                <AcceptReplyButton replyId={reply.id} />
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/forum"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        回讨论区
      </Link>

      <article className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{post.title}</h1>
          {post.solvedReplyId && (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" />
              已解决
            </Badge>
          )}
          {chapter && (
            <Link href={`/forum?chapter=${chapter.slug}`}>
              <Badge>第 {chapter.order} 章</Badge>
            </Link>
          )}
        </div>
        <p className="mt-2 text-xs text-subtle-foreground">
          {post.author.username} · 发表于 {formatDateTime(post.createdAt)}
        </p>
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
        </div>
      </article>

      {/* 回复列表 */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">
          {post.replies.length} 条回复
        </h2>

        <div className="mt-3 space-y-3">
          {topLevel.length === 0 && (
            <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm text-muted-foreground">
              还没有人回复。如果你知道答案，帮个忙？
            </p>
          )}
          {topLevel.map((reply) => (
            <div key={reply.id} className="space-y-3">
              <ReplyCard reply={reply} />
              {childrenOf(reply.id).map((child) => (
                <ReplyCard key={child.id} reply={child} nested />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 顶层回复框 */}
      <section className="mt-8 border-t border-border pt-6">
        {userId ? (
          <ReplyForm postId={post.id} variant="top" />
        ) : (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-5 text-sm">
              <span className="text-muted-foreground">登录后可以回复这个帖子。</span>
              <Link
                href="/login"
                className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                去登录
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
