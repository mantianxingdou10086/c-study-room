/**
 * 把 Wasmer registry 里的 clang 工具链抓到本地并自托管。
 *
 * 为什么要自托管：让浏览器在运行时只依赖我们自己的域名，
 * 而不是每次冷启动都去 registry.wasmer.io（国内访问不稳、且多一次跨境下载）。
 *
 * 用法：node scripts/fetch-toolchain.mjs
 * 产物：.cache/toolchain/clang.pkg（105.6 MB，原始，**不部署**）
 *       public/toolchain/clang.pkg.gz（33.9 MB，浏览器用 DecompressionStream 解压）
 *       public/toolchain/meta.json（体积与校验信息，便于前端展示"要下多少"）
 *
 * 为什么原始包放在 .cache/ 而不是 public/：
 *   浏览器只取 `.gz`（src 里搜不到对原始包的引用），原始包纯粹是生成 .gz
 *   和算 sha256 的中间产物。但它只要躺在 public/ 里，Netlify 构建就会把它
 *   复制进发布目录 .netlify/static/，**每次部署白传 106 MB**（发布体积
 *   146 MB 里有 106 MB 是它）。挪到 .cache/ 后发布体积降到 ~40 MB。
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { join } from "node:path";
import { Wasmer } from "@wasmer/sdk/node";

const OUT_DIR = join(process.cwd(), "public", "toolchain");
const CACHE_DIR = join(process.cwd(), ".cache", "wasmer");
// 原始包（105 MB）放 .cache/，不进 public/ —— 见文件头注释，它只用于生成 .gz
const PKG_DIR = join(process.cwd(), ".cache", "toolchain");
const PKG = join(PKG_DIR, "clang.pkg");
const PKG_GZ = join(OUT_DIR, "clang.pkg.gz");

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function findCachedPackage() {
  const dir = join(CACHE_DIR, "cache-v1", "packages");
  if (!(await exists(dir))) return null;
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(dir);
  const bin = files.find((f) => f.endsWith(".bin"));
  return bin ? join(dir, bin) : null;
}

await mkdir(OUT_DIR, { recursive: true });
await mkdir(PKG_DIR, { recursive: true });

if (await exists(PKG)) {
  console.log(`已存在 ${PKG}，跳过下载（删除它可强制重新抓取）`);
} else {
  let cached = await findCachedPackage();
  if (!cached) {
    console.log("本地缓存里没有 clang 包，开始从 registry.wasmer.io 拉取（约 105 MB，可能要 1~3 分钟）…");
    const wasmer = new Wasmer({ cache: { directory: CACHE_DIR } });
    const sandbox = await wasmer.sandboxes.create({
      packages: ["clang/clang"],
      onPackageProgress: (p) => {
        if (p.download?.percent != null) {
          process.stdout.write(`\r  下载中 ${p.download.percent.toFixed(0)}%`);
        }
      },
    });
    await sandbox.close();
    await wasmer.close();
    process.stdout.write("\n");
    cached = await findCachedPackage();
  }
  if (!cached) throw new Error("拉取失败：缓存目录里找不到包体");
  const bytes = await readFile(cached);
  await writeFile(PKG, bytes);
  console.log(`已写入 ${PKG}（${(bytes.length / 1048576).toFixed(1)} MB）`);
}

if (!(await exists(PKG_GZ))) {
  console.log("生成 gzip 版本（浏览器端用 DecompressionStream 解压，可省 ~2/3 流量）…");
  await pipeline(createReadStream(PKG), createGzip({ level: 6 }), createWriteStream(PKG_GZ));
}

const raw = (await stat(PKG)).size;
const gz = (await stat(PKG_GZ)).size;
const sha256 = createHash("sha256").update(await readFile(PKG)).digest("hex");

await writeFile(
  join(OUT_DIR, "meta.json"),
  JSON.stringify(
    {
      name: "clang/clang",
      clangVersion: "16.0.0",
      target: "wasm32-unknown-wasi",
      rawBytes: raw,
      gzipBytes: gz,
      sha256,
      fetchedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log(
  `\n完成：\n  原始 ${(raw / 1048576).toFixed(1)} MB\n  gzip ${(gz / 1048576).toFixed(1)} MB\n  sha256 ${sha256.slice(0, 16)}…`,
);
