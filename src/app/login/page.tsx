import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "登录",
  description: "登录后学习进度会存在服务器上，换设备也能接着学。",
};

export default async function LoginPage() {
  // 已登录的人不该看到登录页
  const session = await auth();
  if (session?.user) redirect("/learn");

  return (
    <AuthShell
      title="登录"
      subtitle="登录后进度会存在服务器上，换浏览器、换设备都能接着学"
    >
      <LoginForm />
    </AuthShell>
  );
}
