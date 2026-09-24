#!/usr/bin/env bash
# 诊断 Prisma 引擎的 P1001：逐一试不同的 sslmode / 不同端点。
# 用法：bash scripts/try-prisma-ssl.sh
set -u

DIRECT=$(grep '^DIRECT_URL=' .env.local | sed 's/^DIRECT_URL="//; s/"$//')
DATABASE=$(grep '^DATABASE_URL=' .env.local | sed 's/^DATABASE_URL="//; s/"$//')
REF=$(echo "$DIRECT" | sed -E 's#.*postgres\.([a-z0-9]+):.*#\1#')
PW=$(echo "$DIRECT" | sed -E 's#.*:[^:]*@.*##; s#.*//[^:]+:([^@]+)@.*#\1#')

echo "ref = $REF"
echo

try() {
  local label="$1"; shift
  local url="$1"
  local out
  out=$(echo "select 1 as ok;" | npx prisma db execute --stdin --url "$url" 2>&1)
  if echo "$out" | grep -q "P1001\|Error"; then
    echo "❌ $label"
    echo "$out" | grep -E "P1001|Error|error|not found|authentication" | head -3 | sed 's/^/     /'
  else
    echo "✅ $label"
    echo "$out" | tail -3 | sed 's/^/     /'
  fi
  echo
}

BASE_POOLER="postgresql://postgres.${REF}:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
BASE_DIRECT="postgresql://postgres:${PW}@db.${REF}.supabase.co:5432/postgres"

echo "— 会话模式 pooler（5432）—"
try "无 sslmode"                  "${BASE_POOLER}"
try "sslmode=require"             "${BASE_POOLER}?sslmode=require"
try "sslmode=no-verify"           "${BASE_POOLER}?sslmode=no-verify"
try "sslmode=disable"             "${BASE_POOLER}?sslmode=disable"

echo "— 直连（IPv6）—"
try "无 sslmode"                  "${BASE_DIRECT}"
try "sslmode=require"             "${BASE_DIRECT}?sslmode=require"

echo "— 事务模式 pooler（6543）—"
try "sslmode=require"             "$(echo "$DATABASE" | sed 's/?.*//')?sslmode=require"
