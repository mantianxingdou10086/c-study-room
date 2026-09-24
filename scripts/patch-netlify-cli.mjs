/**
 * 给 Netlify CLI 的 blob 上传步骤打重试补丁。
 *
 * ## 为什么需要
 *
 * `netlify deploy` 会把构建产出的 blob（Next 预渲染页面的 ISR 缓存条目）上传到
 * 部署存储。这一步是先向 api.netlify.com 换一个**签名 URL**，再往那个 URL PUT ——
 * 而签名 URL 指向 **AWS us-east-2** 的存储端点。
 *
 * 从本机（校园网）到那批 AWS IP 的连接会**间歇性超时**：
 *
 *   TypeError: fetch failed
 *     cause: ConnectTimeoutError (attempted addresses: 3.128.150.182:443,
 *            3.149.111.211:443, 77.112.105.195:443, ... timeout: 10000ms)
 *
 * 实测 28 个 blob 里 27 成功、1 超时。而 @netlify/build 的实现是：
 *
 *   catch (error) { stopQueue = true; throw error; }
 *
 * 即**任何一个** blob 失败就中止整个部署 —— 于是一个连接超时会让整次
 * `netlify deploy` 失败，且错误被吞成空对象 `{}`，极难排查。
 *
 * ## 补丁做了什么
 *
 * 只改一处：把单个 blob 的 `blobStore.set` 包进「最多 6 次、递增退避」的重试。
 * 其余逻辑（并发数、失败即停、错误上报）全部保持原样。
 *
 * ## 什么时候会失效
 *
 * 这是对**全局 npm 包内部文件**的补丁。`npm i -g netlify-cli` 升级 CLI 后会
 * 被覆盖 —— 那时重新跑一次本脚本即可（脚本是幂等的，已打过会跳过）。
 * 部署报 "Failed while uploading blobs to deploy store" 时也重跑一次。
 *
 * 用法：node scripts/patch-netlify-cli.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const MARKER = "[Hermes patch]";

const TARGET_REL = join(
  "netlify-cli",
  "node_modules",
  "@netlify",
  "build",
  "lib",
  "plugins_core",
  "blobs_upload",
  "index.js",
);

const ORIGINAL = `                const { key, contentPath, metadataPath } = next.value;
                try {
                    const { data, metadata } = await getFileWithMetadata(key, contentPath, metadataPath);
                    await blobStore.set(key, new Blob([data]), { metadata });
                }
                catch (error) {
                    stopQueue = true;
                    throw error;
                }`;

const PATCHED = `                const { key, contentPath, metadataPath } = next.value;
                try {
                    const { data, metadata } = await getFileWithMetadata(key, contentPath, metadataPath);
                    // ${MARKER} 本机到部署存储（AWS us-east-2 签名 URL）的连接会间歇性
                    // 超时，而上游实现是「一个失败就中止整个部署」。这里加重试。
                    let lastError;
                    for (let attempt = 1; attempt <= 6; attempt++) {
                        try {
                            await blobStore.set(key, new Blob([data]), { metadata });
                            lastError = undefined;
                            break;
                        }
                        catch (err) {
                            lastError = err;
                            if (attempt < 6) {
                                await new Promise((r) => setTimeout(r, 1000 * attempt));
                            }
                        }
                    }
                    if (lastError) {
                        throw lastError;
                    }
                }
                catch (error) {
                    stopQueue = true;
                    throw error;
                }`;

function resolveTarget() {
  const candidates = [];
  try {
    const root = execSync("npm root -g", { encoding: "utf8", shell: true }).trim();
    candidates.push(join(root, TARGET_REL));
  } catch {
    // npm 不可用时退回默认全局前缀
  }
  candidates.push(join(process.env.LOCALAPPDATA ?? "", "hermes", "node", "node_modules", TARGET_REL));
  const hit = candidates.find((p) => p && existsSync(p));
  if (!hit) {
    throw new Error(
      "找不到 netlify-cli 的 blobs_upload 文件。确认 netlify-cli 是全局安装的（npm i -g netlify-cli）。",
    );
  }
  return hit;
}

const target = resolveTarget();
const source = readFileSync(target, "utf8");

if (source.includes(MARKER)) {
  console.log(`✅ 已经打过补丁，跳过：\n   ${target}`);
  process.exit(0);
}

if (!source.includes(ORIGINAL)) {
  throw new Error(
    `补丁锚点对不上（CLI 版本可能变了）：\n   ${target}\n` +
      "请检查该文件里 blobs_upload 的 coreStep 实现，更新本脚本的 ORIGINAL 片段。",
  );
}

writeFileSync(target, source.replace(ORIGINAL, PATCHED));
console.log(`✅ 已给 blob 上传加上重试：\n   ${target}`);
console.log("   （升级 netlify-cli 后需要重新运行本脚本）");
