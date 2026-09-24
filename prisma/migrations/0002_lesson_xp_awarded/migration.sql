-- 给 LessonProgress 加 xpAwarded 字段
--
-- 为什么手写而不是用 `prisma migrate diff --from-migrations`：
-- 那个方向需要把已有迁移应用到一个**影子数据库**才能算出当前状态，
-- 而 Supabase 免费版没有建库权限（详见 docs/database-setup.md §3.1）。
--
-- 验证方式（反方向不需要影子库）：
--   npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
-- 输出为空即表示线上库结构与 schema 完全一致。

ALTER TABLE "LessonProgress" ADD COLUMN "xpAwarded" BOOLEAN NOT NULL DEFAULT false;
