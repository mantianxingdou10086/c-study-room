"use client";

import * as React from "react";

/**
 * 是否已完成 hydration。
 *
 * 为什么需要它：在 React 接管之前，`<form action={serverAction}>` 还只是个普通表单，
 * 点提交会走**浏览器原生 POST**（提交到当前 URL）——用户看到页面刷新一下、输入全丢，
 * 而服务端什么都没发生，没有任何报错，极难排查。
 * （实测：e2e 里第一次点击就静默失效，服务端日志干干净净。）
 *
 * 用 `useSyncExternalStore` 而不是 `useEffect + setState`：
 * 后者会触发 react-hooks/set-state-in-effect 规则，而且 useSyncExternalStore
 * 本来就是 React 为"服务端快照 ≠ 客户端快照"准备的正确工具。
 * 服务端快照返回 false（渲染成禁用），客户端接管后返回 true。
 */
const noopSubscribe = () => () => {};

export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
