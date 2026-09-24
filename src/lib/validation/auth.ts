import { z } from "zod";

/**
 * 登录/注册的校验规则（前后端共用同一套，避免"前端放过、后端拒绝"的不一致）。
 *
 * 为什么不用 `z.email()` / `z.string().email()`：
 * 这两个 API 在 zod 3→4 之间搬过家（方法形式被标记为弃用、顶层形式是新写法），
 * 而本项目跨版本升级时不想被这种事绊住 —— 用最基础的 `.refine()` 显式写规则，
 * 任何 zod 版本都跑得动。
 */

/** 邮箱：先 trim + 转小写（避免 "A@b.com " 和 "a@b.com" 被当成两个账号） */
export const emailField = z
  .string()
  .trim()
  .min(1, "请输入邮箱")
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "邮箱格式看起来不对")
  .transform((v) => v.toLowerCase());

/** 用户名：允许中文、字母、数字、下划线、连字符 */
export const usernameField = z
  .string()
  .trim()
  .min(2, "用户名至少 2 个字符")
  .max(20, "用户名最多 20 个字符")
  .refine(
    (v) => /^[\p{L}\p{N}_-]+$/u.test(v),
    "用户名只能用中文、字母、数字、下划线或连字符",
  );

/**
 * 密码：至少 8 位。
 *
 * 上限按 **字节** 算（72 字节），不是字符数 —— 因为 bcrypt 只处理前 72 字节，
 * 超出的部分会被**静默忽略**：如果按字符数限制，一个 30 字的中文密码
 * （90 字节）就会被悄悄截断，用户以为设了长密码其实只生效了前 24 个字。
 */
export const passwordField = z
  .string()
  .min(8, "密码至少 8 位")
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "密码太长了（中文一个字占 3 字节，最多约 24 个汉字）",
  );

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "请输入密码"),
});

export const registerSchema = z
  .object({
    email: emailField,
    username: usernameField,
    password: passwordField,
    confirm: z.string().min(1, "请再输入一次密码"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "两次输入的密码不一致",
    path: ["confirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** 表单状态：server action 的返回值，交给 useActionState 渲染 */
export type AuthFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export const EMPTY_AUTH_STATE: AuthFormState = { error: null };

/** 把 zod 的 issues 压成「字段 → 第一条错误」，表单里每个字段只显示一条 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
