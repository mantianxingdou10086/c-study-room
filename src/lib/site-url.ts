/**
 * 站点根地址（带协议，无尾斜杠）。
 *
 * 三处需要绝对地址：sitemap、robots、以及 layout 的 metadataBase（相对 OG 图/canonical 要它）。
 * 抽成一个函数，避免三份各自漂移。
 *
 * 优先级：显式配置 > 平台注入的部署域名 > 本地开发。
 *   - `VERCEL_URL`：Vercel 注入，**部署实例**的域名（形如 xxx.vercel.app），
 *     不带协议，所以要自己拼 https://
 *   - `URL`：Netlify 注入，站点主域名，**已经带协议**（形如 https://xxx.netlify.app）
 * 绑了自有域名后应当显式设 NEXT_PUBLIC_SITE_URL —— 平台注入的值会随部署变化，
 * 不适合当 canonical / sitemap 的长期地址。
 *
 * 为什么要认两家：以前只认 VERCEL_URL，迁到 Netlify 后没有 NEXT_PUBLIC_SITE_URL
 * 就会一路退回 http://localhost:3100，把 sitemap.xml / robots.txt / OG 图全写坏
 * ——而且因为这几个页面是构建期静态生成的，线上看不出来，只有 SEO 悄悄坏掉。
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3100";
  return raw.replace(/\/$/, "");
}
