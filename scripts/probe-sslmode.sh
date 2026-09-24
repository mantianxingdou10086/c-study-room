#!/usr/bin/env bash
# 用探针配置试不同的 sslmode，找出 Prisma 引擎能连上的那一种。
# 用法：bash scripts/probe-sslmode.sh
set -u

DIRECT=$(grep '^DIRECT_URL=' .env.local | sed 's/^DIRECT_URL="//; s/"$//')
BASE="${DIRECT%%\?*}"   # 去掉原有查询参数

probe() {
  local label="$1"
  local url="$2"
  local out
  out=$(echo "select 1 as ok;" | PROBE_URL="$url" npx prisma db execute --config prisma.probe.config.ts --stdin 2>&1)
  if echo "$out" | grep -qi "error\|P1001"; then
    echo "❌ $label"
    echo "$out" | grep -iE "error|P1001|not found|authentication|self.signed|certificate|SSL" | head -2 | sed 's/^/     /'
  else
    echo "✅ $label"
  fi
}

echo "— 会话模式 pooler（5432）—"
probe "无参数"          "$BASE"
probe "sslmode=require" "$BASE?sslmode=require"
probe "sslmode=prefer"  "$BASE?sslmode=prefer"
probe "sslmode=disable" "$BASE?sslmode=disable"

# 直连（IPv6）
REF=$(echo "$BASE" | sed -E 's#.*postgres\.([a-z0-9]+):.*#\1#')
PW=$(echo "$BASE" | sed -E 's#.*//[^:]+:([^@]+)@.*#\1#')
DIRECTBASE="postgresql://postgres:${PW}@db.${REF}.supabase.co:5432/postgres"

echo
echo "— 直连 db.${REF}.supabase.co:5432（IPv6）—"
probe "无参数"          "$DIRECTBASE"
probe "sslmode=require" "$DIRECTBASE?sslmode=require"
