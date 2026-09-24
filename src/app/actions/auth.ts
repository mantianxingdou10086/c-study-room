"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import {
  type AuthFormState,
  loginSchema,
  registerSchema,
  toFieldErrors,
} from "@/lib/validation/auth";

/** bcrypt 代价因子。10 在纯 JS 实现下约 100ms，足够挡住离线爆破又不拖慢登录 */
const BCRYPT_ROUNDS = 10;

/** Prisma 的唯一约束冲突错误码 */
function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

/**
 * 登录。
 *
 * ⚠️ 关键点：`signIn` 成功时会**抛出 NEXT_REDIRECT**（重定向也是靠抛异常实现的）。
 * 所以只能捕获 AuthError，其他异常必须原样抛出去 —— 否则登录成功却停在原地，
 * 而且没有任何报错，极难查。
 */
export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: toFieldErrors(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/learn",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      // 不区分"邮箱不存在"和"密码错误"，避免被用来枚举已注册邮箱
      return {
        error:
          error.type === "CredentialsSignin"
            ? "邮箱或密码不正确"
            : "登录失败，请稍后再试",
      };
    }
    throw error;
  }
}

/**
 * 注册，成功后自动登录。
 */
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { email, username, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    await prisma.user.create({ data: { email, username, passwordHash } });
  } catch (e) {
    if (isUniqueViolation(e)) {
      // 唯一约束同时管邮箱和用户名，分不清是哪个 —— 提示里两个都提一下
      return { error: "这个邮箱或用户名已经被注册了，换一个试试" };
    }
    console.error("[register] 创建用户失败", e);
    return { error: "注册失败，请稍后再试" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/learn" });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "账号已创建，但自动登录没成功，请手动登录一次" };
    }
    throw error;
  }
}

/** 退出登录 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
