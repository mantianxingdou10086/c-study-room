import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 配色对比度测试（WCAG 2.1）。
 *
 * 为什么值得为它写测试：第一版把 `--subtle-foreground` 定成 #94a3b8，
 * 在浅底上只有 2.41:1 —— 视觉复核时被指出"辅助文字偏浅"，
 * 这种问题肉眼很难量化，但公式一算就露馅。改色板时让测试来当守门员。
 *
 * 阈值：正常文字 4.5:1（AA），元信息/装饰 3:1（AA 大字号与 UI 组件）。
 */

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** 取出某个选择器块里的 CSS 变量 */
function varsOf(selector: string): Record<string, string> {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g");
  const out: Record<string, string> = {};
  for (const block of CSS.matchAll(re)) {
    for (const line of block[1].split("\n")) {
      const m = /^\s*(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(line);
      if (m) out[m[1]] = m[2];
    }
  }
  return out;
}

function toRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** WCAG 相对亮度 */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const LIGHT = varsOf(":root");
const DARK = varsOf(".dark");

const THEMES: [string, Record<string, string>][] = [
  ["浅色", LIGHT],
  ["深色", DARK],
];

describe("配色对比度（WCAG AA）", () => {
  it("两个主题的令牌都解析出来了（否则这个测试是空转）", () => {
    for (const [name, v] of THEMES) {
      expect(Object.keys(v).length, `${name}主题解析到的变量太少`).toBeGreaterThan(12);
      expect(v["--foreground"], `${name} 缺 --foreground`).toBeTruthy();
      expect(v["--background"], `${name} 缺 --background`).toBeTruthy();
    }
  });

  it("正文文字 ≥ 7:1", () => {
    for (const [name, v] of THEMES) {
      const r = contrast(v["--foreground"], v["--background"]);
      console.log(`${name}：正文/底色 = ${r.toFixed(2)}:1`);
      expect(r, `${name}主题正文对比度不足`).toBeGreaterThanOrEqual(7);
    }
  });

  it("辅助文字 ≥ 4.5:1", () => {
    for (const [name, v] of THEMES) {
      const r = contrast(v["--muted-foreground"], v["--background"]);
      console.log(`${name}：辅助文字/底色 = ${r.toFixed(2)}:1`);
      expect(r, `${name}主题辅助文字对比度不足`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("元信息文字 ≥ 4.5:1（浅色）与 ≥ 3:1（深色，深底上的小字更难做）", () => {
    const light = contrast(LIGHT["--subtle-foreground"], LIGHT["--background"]);
    const dark = contrast(DARK["--subtle-foreground"], DARK["--background"]);
    console.log(`浅色：元信息 = ${light.toFixed(2)}:1 ；深色：元信息 = ${dark.toFixed(2)}:1`);
    expect(light).toBeGreaterThanOrEqual(4.5);
    expect(dark).toBeGreaterThanOrEqual(3);
  });

  it("主按钮：文字/按钮底色 ≥ 4.5:1", () => {
    for (const [name, v] of THEMES) {
      const r = contrast(v["--primary-foreground"], v["--primary"]);
      console.log(`${name}：主按钮文字 = ${r.toFixed(2)}:1`);
      expect(r, `${name}主题主按钮对比度不足`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("链接色（primary）在卡片底色上 ≥ 4.5:1", () => {
    for (const [name, v] of THEMES) {
      const r = contrast(v["--primary"], v["--surface"]);
      console.log(`${name}：链接/卡片 = ${r.toFixed(2)}:1`);
      expect(r, `${name}主题链接色对比度不足`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("错误/成功/警告提示色在各自浅底上 ≥ 4.5:1", () => {
    for (const [name, v] of THEMES) {
      const danger = contrast(v["--danger"], v["--danger-soft"]);
      const success = contrast(v["--success"], v["--success-soft"]);
      const warning = contrast(v["--warning"], v["--warning-soft"]);
      console.log(
        `${name}：错误 = ${danger.toFixed(2)}:1 ；成功 = ${success.toFixed(2)}:1 ；警告 = ${warning.toFixed(2)}:1`,
      );
      expect(danger, `${name}主题错误色对比度不足`).toBeGreaterThanOrEqual(4.5);
      expect(success, `${name}主题成功色对比度不足`).toBeGreaterThanOrEqual(4.5);
      expect(warning, `${name}主题警告色对比度不足`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("语义色当文字用在代码区底色上也够清楚（超时/报错就显示在那儿）", () => {
    for (const [name, v] of THEMES) {
      for (const key of ["--danger", "--warning"]) {
        const r = contrast(v[key], v["--code-bg"]);
        console.log(`${name}：${key} / 代码区底色 = ${r.toFixed(2)}:1`);
        expect(r, `${name}主题 ${key} 在代码区底色上对比度不足`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
