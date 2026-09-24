#!/usr/bin/env bash
# 干净地起一个生产服务：先杀掉占用端口的旧进程，再构建，再启动。
#
# 为什么需要这个脚本：这个坑被踩了 5 次 ——
#   `next build` 会重写 .next，而**已经跑着的 `next start` 不会自动跟上**：
#   它继续按旧构建的内存清单提供服务，于是静态 chunk 全 500、新页面不存在，
#   浏览器里看起来就像"代码坏了"。更坑的是第二次 `next start` 会因端口被占
#   **静默退出**（EADDRINUSE），你以为服务重启了，其实还是旧的。
#
# 用法：bash scripts/serve.sh [端口，默认 3100]
set -u

PORT="${1:-3100}"
cd "$(dirname "$0")/.." || exit 1

echo "==> 释放端口 $PORT"
powershell -NoProfile -Command \
  "Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id \$_ -Force }" \
  2>/dev/null
sleep 2
if netstat -ano | grep ":$PORT " | grep -q LISTENING; then
  echo "!! 端口 $PORT 仍被占用，先手动处理"
  exit 1
fi

echo "==> 构建"
npm run build 2>&1 | grep -E "✓ Compiled|Failed|error|Generating static pages using 17 workers \(29" || true

echo "==> 启动（Ctrl-C 结束）"
exec npx next start -p "$PORT"
