/**
 * 内容交付进度。
 *
 * `CONTENT_READY_CHAPTERS` 表示「前 N 章的讲义与题库已经写完」。
 * 内容完整性测试会据此断言：前 N 章的每个课时都必须有对应的 MDX 文件。
 * 每写完一章就把它 +1 —— 让"还差什么"变成一个会失败的测试，而不是靠记忆。
 */
export const CONTENT_READY_CHAPTERS = 10;

/** 已交付题库的章（题库可以比讲义先/后完成，分开记录） */
export const EXERCISES_READY_CHAPTERS = 10;
