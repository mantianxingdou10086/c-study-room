"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { EMPTY_AUTH_STATE } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";

/** 单个字段：标签 + 输入框 + 错误提示（错误用 aria-describedby 关联，读屏能听到） */
function Field({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  error,
  hint,
  required = true,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const [show, setShow] = React.useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {!required && (
          <span className="ml-1 text-xs text-subtle-foreground">（可选）</span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword && show ? "text" : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full rounded-lg border bg-surface px-3 text-sm",
            "placeholder:text-subtle-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
            error ? "border-danger" : "border-border",
            isPassword && "pr-10",
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "隐藏密码" : "显示密码"}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-subtle-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** 整体错误条（账号密码不匹配这类"不属于某个字段"的错误） */
function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      data-testid="form-error"
      className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, EMPTY_AUTH_STATE);
  const fe = state.fieldErrors ?? {};
  const ready = useHydrated();

  return (
    <form action={action} data-hydrated={ready ? "true" : undefined} className="grid gap-4">
      <FormError message={state.error} />
      <Field
        id="email"
        label="邮箱"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={fe.email}
      />
      <Field
        id="password"
        label="密码"
        type="password"
        autoComplete="current-password"
        error={fe.password}
      />

      <Button
        type="submit"
        size="lg"
        disabled={pending || !ready}
        className="mt-1 w-full"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "登录中…" : ready ? "登录" : "加载中…"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        还没有账号？
        <Link href="/register" className="ml-1 font-medium text-primary hover:underline">
          注册一个
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(
    registerAction,
    EMPTY_AUTH_STATE,
  );
  const fe = state.fieldErrors ?? {};
  const ready = useHydrated();

  return (
    <form action={action} data-hydrated={ready ? "true" : undefined} className="grid gap-4">
      <FormError message={state.error} />
      <Field
        id="email"
        label="邮箱"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={fe.email}
        hint="用来登录，不会公开"
      />
      <Field
        id="username"
        label="用户名"
        autoComplete="username"
        placeholder="显示在论坛和排行榜上"
        error={fe.username}
        hint="2~20 个字符，可用中文、字母、数字、下划线"
      />
      <Field
        id="password"
        label="密码"
        type="password"
        autoComplete="new-password"
        error={fe.password}
        hint="至少 8 位"
      />
      <Field
        id="confirm"
        label="确认密码"
        type="password"
        autoComplete="new-password"
        error={fe.confirm}
      />

      <Button
        type="submit"
        size="lg"
        disabled={pending || !ready}
        className="mt-1 w-full"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "创建中…" : ready ? "创建账号" : "加载中…"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        已经有账号了？
        <Link href="/login" className="ml-1 font-medium text-primary hover:underline">
          直接登录
        </Link>
      </p>
    </form>
  );
}
