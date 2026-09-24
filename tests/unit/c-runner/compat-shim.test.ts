import { describe, expect, it } from "vitest";
import { applyCppCompatShim } from "@/lib/c-runner/jscpp-engine";

/**
 * 兼容改写必须"改得准、说得明"：
 * 改错了会静默跑出错误结果（比报错更糟），不告诉用户改了就是欺骗。
 */
describe("JSCPP 的 C→C++ 兼容改写", () => {
  it("把 main(void) 改写成 main()", () => {
    const { code, notes } = applyCppCompatShim(
      `int main(void) { return 0; }`,
    );
    expect(code).toBe(`int main() { return 0; }`);
    expect(notes).toHaveLength(1);
  });

  it("把自定义函数的 (void) 也改写", () => {
    const { code } = applyCppCompatShim(
      `int f(void);\nint f(void) { return 1; }`,
    );
    expect(code).toBe(`int f();\nint f() { return 1; }`);
  });

  it("改写函数指针的 (void)", () => {
    const { code } = applyCppCompatShim(`int (*fp)(void);`);
    expect(code).toBe(`int (*fp)();`);
  });

  it("不碰强制类型转换 (void) expr", () => {
    const { code, notes } = applyCppCompatShim(`(void) printf("x");`);
    expect(code).toBe(`(void) printf("x");`);
    expect(notes).toHaveLength(0);
  });

  it("没有 (void) 时不产生任何改动与提示", () => {
    const src = `int main() { printf("hi\\n"); return 0; }`;
    const { code, notes } = applyCppCompatShim(src);
    expect(code).toBe(src);
    expect(notes).toHaveLength(0);
  });

  it("只改参数列表本身，不碰别处的格式", () => {
    const src = `int  main (  void  )\n{\n    return 0;\n}\n`;
    const { code } = applyCppCompatShim(src);
    // 参数列表被压成 ()，其余缩进/空行原样保留
    expect(code).toBe(`int  main ()\n{\n    return 0;\n}\n`);
  });
});
