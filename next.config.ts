import type { NextConfig } from "next";

/**
 * 注意：`@wasmer/sdk` 的 WASIX 执行需要页面处于 cross-origin isolated 状态
 * （它用 SharedArrayBuffer 与 worker 通信），因此必须下发 COOP/COEP。
 * 副作用：跨源资源需要带 CORP 头才能加载——本站所有资源都是自己的，不受影响。
 * 参考：node_modules/@wasmer/sdk/README.md「Browser」一节
 */
const crossOriginIsolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: crossOriginIsolation,
      },
      {
        // 自托管的编译器包：一年不变，让浏览器/CDN 放心长期缓存
        source: "/toolchain/:path*",
        headers: [
          ...crossOriginIsolation,
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
