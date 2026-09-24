/**
 * 把 Next 构建产物里的**符号链接**替换成实体副本。
 *
 * ## 为什么必须做这一步（否则线上动态路由全 500）
 *
 * `next build` 会为被外部化的包（serverExternalPackages）在 `.next/node_modules/`
 * 下生成**绝对路径**符号链接：
 *
 *   .next/node_modules/@prisma/client-2c3a283f134fdcb6
 *     -> D:\C语言自学网站创作\web\node_modules\@prisma\client
 *   .next/node_modules/pg-587764f78a6c7a9c
 *     -> D:\C语言自学网站创作\web\node_modules\pg
 *   .next/node_modules/shiki-43d062b67f27bbdc
 *     -> D:\C语言自学网站创作\web\node_modules\shiki
 *
 * 而 `@netlify/plugin-nextjs` 复制 node_modules 时用的是
 * `cp(..., { verbatimSymlinks: true })` —— **照抄链接文本**，不做解引用。
 * 于是这些 `D:\...` 绝对路径被原样打包上传。运行时在 Linux 容器里是
 * `/var/task/...`，链接指向不存在的 Windows 路径，require 直接失败：
 *
 *   Failed to load external module @prisma/client-2c3a283f134fdcb6:
 *     Error: Cannot find module '@prisma/client-2c3a283f134fdcb6'
 *
 * 症状是**所有依赖数据库的动态路由 500**（/login、/forum、/progress、/settings、
 * /api/keepalive…），而纯静态路由正常 —— 静态页由 CDN 直接发，不进服务端处理器。
 * 这个症状极具误导性：环境变量、blob 上下文、函数注册形态全都是正常的。
 *
 * ## 为什么在构建命令里做，而不是给插件打补丁
 *
 * 插件内部有两处会保留/重建符号链接（`cp` 的 `verbatimSymlinks`，以及
 * `recreateNodeModuleSymlinks`），打补丁要同时改两处，而且插件一升级就失效。
 * 改成在 `next build` **之后**、插件 `onPostBuild` 复制**之前**把链接换成实体
 * 副本：插件照常复制，但复制到的是真文件。与插件版本完全无关。
 *
 * ## 为什么不用 fs.cpSync（重要）
 *
 * **本机上 `fs.cpSync` / `fs.cp` 在源路径含非 ASCII 字符时会直接崩溃**
 * （`D:\C语言自学网站创作\...` → 进程异常退出 0xC0000409，无任何错误信息）。
 * 实测同样两个目录，纯 ASCII 路径正常、含中文的源路径必崩。
 * 所以这里用 `readdirSync` + `copyFileSync` 手写递归 —— 走的是另一条底层实现，
 * 在本目录下稳定（npm 自己也是这么干的，所以 npm 一直没问题）。
 *
 * 用法（已接进 netlify.toml 的 build.command）：
 *   npm run build && node scripts/deref-next-symlinks.mjs
 */
import { lstatSync, readlinkSync, readdirSync, mkdirSync, copyFileSync, realpathSync, rmSync, renameSync, existsSync } from "node:fs";
import { join, dirname, isAbsolute, resolve } from "node:path";

/**
 * 需要处理的目录（相对项目根）。
 *
 * ⚠️ 关键是第一个：`output: "standalone"` 会额外生成一份 `.next/standalone/`，
 * 而 @netlify/plugin-nextjs **复制的正是它**：
 *
 *   const srcDir = join(ctx.standaloneDir, ctx.nextDistDir);   // dist/build/content/server.js
 *
 * 只修 `.next/node_modules` 是**没用的** —— 插件根本不读那里，线上照旧 500。
 * 这个坑我踩过一次：脚本报告"替换 3 个"全部成功，但部署后动态路由依然 500。
 */
const ROOTS = [
  join(".next", "standalone"),
  join(".next", "node_modules"),
];

/**
 * 手写递归复制（不使用 fs.cp*，见文件头注释）。
 * 遇到符号链接就解引用，把真实内容复制过去。
 */
function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isSymbolicLink()) {
      copyTree(realpathSync(from), to);
    } else if (entry.isDirectory()) {
      copyTree(from, to);
    } else {
      copyFileSync(from, to);
    }
  }
}

/** 递归收集所有符号链接；不进入符号链接内部，避免循环 */
function collectSymlinks(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (lstatSync(full).isSymbolicLink()) {
      out.push(full);
      continue;
    }
    if (entry.isDirectory()) {
      collectSymlinks(full, out);
    }
  }
  return out;
}

/** 删除一个符号链接本身（不碰它的目标） */
function removeLink(link) {
  try {
    rmSync(link, { force: true });
  } catch {
    // Windows 上指向目录的链接有时 rm 不行，退回 rename 再删
    const trash = `${link}.__deref_trash`;
    renameSync(link, trash);
    rmSync(trash, { recursive: true, force: true });
  }
}

let replaced = 0;
let removed = 0;
let failed = 0;
let total = 0;

for (const root of ROOTS) {
  if (!existsSync(root)) {
    console.log(`  ${root} 不存在，跳过（还没构建？）`);
    continue;
  }

  const links = collectSymlinks(root);
  total += links.length;
  console.log(`  ${root}: 发现 ${links.length} 个符号链接`);

  for (const link of links) {
    const target = readlinkSync(link);
    const resolved = isAbsolute(target) ? target : resolve(dirname(link), target);

    if (!existsSync(resolved)) {
      removeLink(link);
      removed += 1;
      console.log(`    ⚠️  目标不存在，已删除死链: ${link}`);
      continue;
    }

    // 先复制到临时位置，再换掉链接 —— 避免中途失败留下"链接没了、副本也没有"的状态
    const staging = `${link}.__deref_staging`;
    try {
      rmSync(staging, { recursive: true, force: true });
      copyTree(resolved, staging);
      removeLink(link);
      renameSync(staging, link);
      replaced += 1;
      console.log(`    ✅ ${link}  → 实体副本（原指向 ${target}）`);
    } catch (e) {
      failed += 1;
      rmSync(staging, { recursive: true, force: true });
      console.error(`    ❌ ${link} 处理失败: ${e.code ?? ""} ${e.message}`);
    }
  }
}

console.log(
  `\n完成：共 ${total} 个符号链接 —— 替换 ${replaced} 个，删除死链 ${removed} 个，失败 ${failed} 个。`,
);
if (failed > 0) {
  console.error("⚠️  有链接处理失败，线上动态路由很可能仍然 500。");
  process.exitCode = 1;
}
