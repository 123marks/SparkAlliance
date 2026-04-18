#!/usr/bin/env bash
# ============================================================
# setup-ai-secrets.sh —— 一键推送星火助手所需的 AI 服务密钥
# ============================================================
# 作用：把 NVIDIA_API_KEY / NVIDIA_BASE_URL / SPARK_MODEL_* 等密钥
#       安全地推送到 Supabase Edge Function Secrets。
#
# 安全：
#   • 本脚本不把 API Key 写到任何代码文件里
#   • 从 supabase/.env.local 读取（该文件已被 .gitignore 排除）
#   • 只通过 `supabase secrets set` 命令直接传给 Supabase 后端
#   • Key 在服务端加密存储、不对前端暴露
#
# 使用：
#   1. 确保本机已安装 Supabase CLI
#   2. 在 supabase/.env.local 填好 NVIDIA_API_KEY（模板已自动生成）
#   3. 在项目根目录运行：
#        bash scripts/setup-ai-secrets.sh
#   或者直接传环境变量：
#        NVIDIA_API_KEY=nvapi-xxxxx bash scripts/setup-ai-secrets.sh
# ============================================================

set -e

ENV_FILE="${ENV_FILE:-supabase/.env.local}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"

BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
MAGENTA='\033[35m'
RESET='\033[0m'

step()  { echo -e "\n${CYAN}==>${RESET} ${BOLD}$1${RESET}"; }
ok()    { echo -e "    ${GREEN}+${RESET} $1"; }
warn()  { echo -e "    ${YELLOW}!${RESET} $1"; }
err()   { echo -e "    ${RED}x${RESET} $1"; }

echo
echo -e "${MAGENTA}===============================================${RESET}"
echo -e "${MAGENTA}  星火助手 - AI 密钥一键配置 v11               ${RESET}"
echo -e "${MAGENTA}===============================================${RESET}"

# -----------------------------------------------------------
# 1) 读取 .env.local
# -----------------------------------------------------------
declare -A ENV_MAP
if [ -f "$ENV_FILE" ]; then
    step "读取密钥文件: $ENV_FILE"
    while IFS='=' read -r key value; do
        key=$(echo "$key" | xargs)
        [ -z "$key" ] && continue
        case "$key" in \#*) continue ;; esac
        value="${value%\"}"
        value="${value#\"}"
        value=$(echo "$value" | xargs)
        ENV_MAP["$key"]="$value"
    done < "$ENV_FILE"
    ok "已解析 ${#ENV_MAP[@]} 个变量"
else
    warn "未找到 $ENV_FILE，将使用交互式输入"
fi

# -----------------------------------------------------------
# 2) 检查 Supabase CLI
# -----------------------------------------------------------
step "检查 Supabase CLI"
if ! command -v supabase >/dev/null 2>&1; then
    err "未检测到 Supabase CLI"
    echo "    macOS:  brew install supabase/tap/supabase"
    echo "    Linux:  npm install -g supabase"
    exit 1
fi
ok "Supabase CLI: $(supabase --version)"

# -----------------------------------------------------------
# 3) 获取 NVIDIA_API_KEY
# -----------------------------------------------------------
step "获取 NVIDIA API 密钥"
API_KEY="${NVIDIA_API_KEY:-}"
if [ -z "$API_KEY" ] && [ -n "${ENV_MAP[NVIDIA_API_KEY]:-}" ]; then
    API_KEY="${ENV_MAP[NVIDIA_API_KEY]}"
    ok "从 $ENV_FILE 读取（长度 ${#API_KEY}）"
fi
if [ -z "$API_KEY" ]; then
    echo "    获取 Key: https://build.nvidia.com/explore/discover - 选任意模型 - Get API Key"
    read -r -s -p "    请输入 NVIDIA_API_KEY（nvapi- 开头）: " API_KEY
    echo
fi
if [ -z "$API_KEY" ]; then
    err "NVIDIA_API_KEY 为空，无法继续"
    exit 1
fi
case "$API_KEY" in
    nvapi-*) ok "已接收 Key（长度 ${#API_KEY}，已脱敏不显示）" ;;
    *) warn "Key 不以 nvapi- 开头，请确认（脚本会继续）" ;;
esac

BASE_URL="${NVIDIA_BASE_URL:-${ENV_MAP[NVIDIA_BASE_URL]:-https://integrate.api.nvidia.com/v1}}"

# -----------------------------------------------------------
# 4) 检查项目链接
# -----------------------------------------------------------
step "检查 Supabase 项目链接"
if ! supabase status >/dev/null 2>&1; then
    warn "项目未链接"
    read -r -p "    请输入 Supabase 项目 Ref: " PROJECT_REF
    supabase link --project-ref "$PROJECT_REF"
fi
ok "项目已链接"

# -----------------------------------------------------------
# 5) 推送 Secrets
# -----------------------------------------------------------
step "推送 Edge Function Secrets"
supabase secrets set "NVIDIA_API_KEY=$API_KEY" >/dev/null
ok "NVIDIA_API_KEY 已设置"
supabase secrets set "NVIDIA_BASE_URL=$BASE_URL" >/dev/null
ok "NVIDIA_BASE_URL = $BASE_URL"

OPTIONAL_KEYS=(
    SPARK_MODEL_DEFAULT
    SPARK_MODEL_THINKING
    SPARK_MODEL_FAST
    SPARK_FALLBACK_DEFAULT
    SPARK_FALLBACK_THINKING
    SPARK_FALLBACK_FAST
    SPARK_GENERAL_MODEL
    SPARK_GENERAL_FALLBACK
    NVIDIA_EMBED_MODEL
)

for key in "${OPTIONAL_KEYS[@]}"; do
    val="${ENV_MAP[$key]:-}"
    if [ -n "$val" ]; then
        supabase secrets set "$key=$val" >/dev/null 2>&1 && ok "$key = $val" || warn "$key 推送失败"
    fi
done

# -----------------------------------------------------------
# 6) 部署 Edge Functions
# -----------------------------------------------------------
if [ "$SKIP_DEPLOY" != "1" ]; then
    step "重新部署 assistant-chat Edge Function"
    supabase functions deploy assistant-chat
    ok "assistant-chat 已部署"

    for fn in spark-ai-general tarot-reading spark-rag ai-schedule-import; do
        if [ -d "supabase/functions/$fn" ]; then
            supabase functions deploy "$fn" >/dev/null 2>&1 && ok "$fn 已同步部署" || warn "$fn 部署失败"
        fi
    done
else
    warn "已跳过部署（SKIP_DEPLOY=1）"
fi

unset API_KEY

echo
echo -e "${GREEN}===============================================${RESET}"
echo -e "${GREEN}  [OK] 配置完成！星火助手 AI 已就绪            ${RESET}"
echo -e "${GREEN}===============================================${RESET}"
echo
echo -e "${CYAN}下一步：${RESET}"
echo "  1) 启动前端：cd frontend && npm run dev"
echo "  2) 登录 -> 打开 /app/chat -> 发送一条测试消息"
echo "  3) 切换顶栏 3 模式（均衡 / 深度思考 / 极速）验证"
echo "  4) 查看 Supabase Dashboard -> Edge Functions -> Logs 确认无错误"
echo
echo -e "${YELLOW}安全提醒：${RESET}"
echo "  • supabase/.env.local 已被 .gitignore 排除，不会进入 git 历史"
echo "  • 如果 Key 曾在对话中暴露，建议到 NVIDIA 控制台 rotate 一次"
echo
