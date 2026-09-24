import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * robots.txt。
 *
 * 允许抓取内容页；禁止抓取**个人化页面**（进度、设置）和登录/注册 ——
 * 它们要么需要登录（抓到的是重定向），要么内容对搜索引擎毫无意义。
 * 注意 robots.txt 只是约定，不是访问控制；真正的权限控制靠服务端鉴权。
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/progress", "/settings", "/login", "/register", "/api/", "/dev/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
