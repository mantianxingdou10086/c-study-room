import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-links";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-semibold">{SITE_NAME}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {SITE_TAGLINE}
          </p>
        </div>
        <nav aria-label="页脚导航">
          <p className="text-sm font-medium">学习</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {NAV_ITEMS.slice(1, 5).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-medium">说明</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            学习内容按 K.N.King《C 语言程序设计：现代方法》的教学顺序自行编写，
            非官方配套材料，正文与习题均为原创。
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-subtle-foreground">
          仅用于个人学习交流 · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
