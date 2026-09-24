import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Auth.js v5 配置。
 *
 * 为什么用 JWT 会话而不是数据库会话：
 * 我们只用「邮箱 + 密码」这一种登录方式，不需要 OAuth 的账号关联，
 * 所以不需要 Prisma adapter；JWT 存在 cookie 里，每次请求只解码不查库，
 * 省一次数据库往返。用户身份变更（改密码/封禁）的即时性要求在这个场景不重要。
 *
 * ⚠️ 这里会 import Prisma，所以**不能**被 Edge Runtime 的 middleware 引用。
 * 本项目因此不做 middleware 级保护，改为在需要的页面里 `await auth()` 判断
 * （见 src/app/progress/page.tsx）—— 少一层拆分，也少一个 edge/Node 兼容坑。
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // 本地开发端口不固定（3000/3100 都用过），且没设 AUTH_URL，
  // 需要信任 Host 头才能正确推断回调地址
  trustHost: true,

  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },

      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, username: true, passwordHash: true },
        });

        // 用户不存在时也走一次 bcrypt.compare，让"用户不存在"和"密码错误"
        // 的耗时接近，避免通过响应时间探测某个邮箱是否已注册
        const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const ok = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !ok) return null;

        return { id: user.id, email: user.email, name: user.username };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.name ?? "";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.username = (token.username as string) ?? "";
      }
      return session;
    },
  },
});
