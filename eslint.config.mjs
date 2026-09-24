import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 自托管的第三方运行时（@wasmer/sdk 原样拷贝）与 clang 工具链：
    // 不是我们的代码，lint 它们只会淹没有效信号
    "public/**",
    // 测试与工具产物
    "screenshots/**",
    "test-results/**",
    "playwright-report/**",
    "coverage/**",
    ".cache/**",
    // Netlify 的部署产物（`netlify deploy` 生成）：里面是打包后的 chunk，
    // 不 ignore 的话一次 lint 会多出上万条来自压缩代码的告警，把有效信号淹掉
    ".netlify/**",
  ]),
  {
    // scripts/ 下的 .cjs 是**给裸 node 跑**的 CommonJS 脚本，require 是它唯一的写法。
    // 用 TypeScript 的 ESM 规则去管它们没有意义，只会留下一条永远修不掉的假错误。
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
