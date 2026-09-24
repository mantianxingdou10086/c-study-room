import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "node_modules";
const rootPkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const allow = new Set(
  Object.keys(rootPkg.allowScripts ?? {}).map((s) => s.split("@").slice(0, -1).join("@") || s),
);

async function dirs(p) {
  try {
    const e = await readdir(p, { withFileTypes: true });
    return e.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

const hits = [];
async function scan(base, prefix) {
  for (const name of await dirs(base)) {
    if (name === ".bin" || name.startsWith(".")) continue;
    const full = join(base, name);
    const sub = prefix ? `${prefix}/${name}` : name;
    if (name.startsWith("@")) {
      await scan(full, sub);
      continue;
    }
    try {
      const pkg = JSON.parse(await readFile(join(full, "package.json"), "utf8"));
      const bad = [];
      for (const k of ["preinstall", "install", "postinstall"]) {
        if (pkg.scripts?.[k]) bad.push(`${k}: ${pkg.scripts[k]}`);
      }
      if (bad.length) hits.push({ pkg: pkg.name ?? sub, blocked: !allow.has(pkg.name ?? sub), bad });
    } catch {}
  }
}

await scan(ROOT, "");
console.log(`allowScripts 白名单条目: ${[...allow].join(", ")}\n`);
for (const h of hits) {
  console.log(`${h.blocked ? "❌ 被拦" : "✅ 已放行"}  ${h.pkg}`);
  for (const b of h.bad) console.log(`       ${b}`);
}
console.log(`\n共 ${hits.length} 个包带安装脚本，其中 ${hits.filter((h) => h.blocked).length} 个不在白名单`);