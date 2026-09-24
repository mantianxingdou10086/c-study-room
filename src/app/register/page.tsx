import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "注册",
  description: "创建一个账号，开始跟着 K.N.King 的思路从零把 C 语言啃下来。",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/learn");

  return (
    <AuthShell
      title="创建账号"
      subtitle="注册后可以记录进度、做题、在论坛提问"
    >
      <RegisterForm />
    </AuthShell>
  );
}
