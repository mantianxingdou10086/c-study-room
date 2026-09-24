import type { DefaultSession } from "next-auth";

/**
 * 给 Session / JWT 补上我们自己塞进去的字段（见 src/auth.ts 的 callbacks）。
 * 没有这个声明，`session.user.id` 在 TS 里是 undefined 类型。
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
  }
}
